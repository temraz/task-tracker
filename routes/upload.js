import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import pool from '../database/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Excel upload endpoint
router.post('/excel', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { quarter_id } = req.body;
    if (!quarter_id) {
      return res.status(400).json({ error: 'Quarter ID is required' });
    }

    // Read Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const worksheet = workbook.Sheets['Tasks'];
    
    if (!worksheet) {
      return res.status(400).json({ error: "Sheet named 'Tasks' not found. Please use the official template." });
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (rows.length < 2) {
      return res.status(400).json({ error: 'No data rows found in the Tasks sheet.' });
    }

    const PERF_MAP = { 'on track': 'green', 'at risk': 'yellow', 'off track': 'red' };
    
    const normStatus = (s) => {
      const v = String(s || '').trim().toLowerCase();
      if (v === 'completed') return 'Completed';
      if (v === 'in progress') return 'In Progress';
      return 'Not Started';
    };

    const normPriority = (s) => {
      const v = String(s || '').trim().toLowerCase();
      if (v === 'critical') return 'Critical';
      if (v === 'high') return 'High';
      if (v === 'low') return 'Low';
      return 'Medium';
    };

    // Identify columns by header names (case-insensitive)
    const header = rows[0].map(h => String(h || '').trim());
    const idx = (name, aliases=[]) => {
      const all = [name, ...aliases].map(s => s.toLowerCase());
      return header.findIndex(h => all.includes(h.toLowerCase()));
    };
    const cName = idx('Task');
    const cOwner = idx('Owner');
    const cCategory = idx('Category');
    const cPriority = idx('Priority');
    const cDue = idx('Due Date', ['Due']);
    const cStatus = idx('Status');
    const cPerf = idx('Performance');
    const cNotes = idx('Notes');
    const cLinkedDept = idx('Linked Department', ['Linked Dept', 'Department Linked']);
    const cOKR = idx('OKR', ['OKR Task', 'Is OKR']);
    
    // Step 1: Build owners dynamically from Owner column
    const ownerMap = {}; // name (lowercase) → owner object
    const ownerEmails = new Set();
    
    rows.slice(1).forEach((row) => {
      const ownerName = cOwner >= 0 ? String(row[cOwner] || '').trim() : '';
      if (ownerName && !ownerMap[ownerName.toLowerCase()]) {
        ownerMap[ownerName.toLowerCase()] = {
          name: ownerName,
          email: `${ownerName.toLowerCase().replace(/\s+/g, '.')}@classera.com`, // Generate email
          department: '—',
          avatar: ownerName[0].toUpperCase()
        };
        ownerEmails.add(ownerName.toLowerCase().replace(/\s+/g, '.') + '@classera.com');
      }
    });

    // Step 2: Create or get owners in database
    const createdOwners = {};
    for (const [key, ownerData] of Object.entries(ownerMap)) {
      // Check if user exists by email or name
      let userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1 OR name = $2',
        [ownerData.email, ownerData.name]
      );

      let user;
      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
      } else {
        // Create new user
        const avatar = ownerData.name ? ownerData.name.charAt(0).toUpperCase() : '?';
        const result = await pool.query(
          `INSERT INTO users (email, name, department, avatar, role, is_active)
           VALUES ($1, $2, $3, $4, 'user', true)
           RETURNING *`,
          [ownerData.email, ownerData.name, ownerData.department, avatar]
        );
        user = result.rows[0];
      }
      createdOwners[key] = user;
    }

    // Step 3: Build and create/update tasks
    const newTasks = [];
    const updatedTasks = [];
    let skipped = 0;

    for (const row of rows.slice(1)) {
      if (!row[0] && !row[1]) continue; // skip blank rows
      
      const name = cName >= 0 ? String(row[cName] || '').trim() : '';
      if (!name) {
        skipped++;
        continue;
      }

      const ownerName = cOwner >= 0 ? String(row[cOwner] || '').trim() : '';
      const owner = ownerName ? createdOwners[ownerName.toLowerCase()] : null;
      const category = cCategory >= 0 ? String(row[cCategory] || '').trim() : '';
      const priority = normPriority(cPriority >= 0 ? row[cPriority] : '');

      let due_date = null;
      if (cDue >= 0 && row[cDue]) {
        const d = row[cDue] instanceof Date ? row[cDue] : new Date(row[cDue]);
        if (!isNaN(d.getTime())) {
          due_date = d.toISOString().split('T')[0];
        }
      }

      const status = normStatus(cStatus >= 0 ? row[cStatus] : '');
      const perfRaw = String((cPerf >= 0 ? row[cPerf] : '') || '').trim().toLowerCase();
      const performance = PERF_MAP[perfRaw] || null;
      const notes = cNotes >= 0 ? (String(row[cNotes] || '').trim() || null) : null;
      const linked_department = cLinkedDept >= 0 ? (String(row[cLinkedDept] || '').trim() || null) : null;
      const okrRaw = cOKR >= 0 ? String(row[cOKR] || '').trim().toLowerCase() : '';
      const is_okr = (okrRaw === 'yes' || okrRaw === 'true' || okrRaw === '1') ? 1 : 0;

      try {
        // Check if task already exists (same name, owner, and quarter)
        const existingTask = await pool.query(
          `SELECT id FROM tasks 
           WHERE quarter_id = $1 
           AND owner_id = $2 
           AND LOWER(TRIM(name)) = LOWER(TRIM($3))`,
          [quarter_id, owner ? owner.id : null, name]
        );

        if (existingTask.rows.length > 0) {
          // Update existing task
          const taskId = existingTask.rows[0].id;
          const updateResult = await pool.query(
            `UPDATE tasks 
             SET category = $1, priority = $2, due_date = $3, status = $4, 
                 performance = $5, notes = $6, linked_department = $7, is_okr = $8, updated_at = CURRENT_TIMESTAMP
             WHERE id = $9
             RETURNING *`,
            [category || null, priority, due_date, status, performance, notes, linked_department, is_okr, taskId]
          );
          updatedTasks.push(updateResult.rows[0]);
        } else {
          // Create new task
          const taskResult = await pool.query(
            `INSERT INTO tasks (quarter_id, owner_id, name, category, priority, due_date, status, performance, notes, created_by, linked_department, is_okr)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [
              quarter_id,
              owner ? owner.id : null,
              name,
              category || null,
              priority,
              due_date,
              status,
              performance,
              notes,
              req.session.user?.id || null,
              linked_department,
              is_okr
            ]
          );
          newTasks.push(taskResult.rows[0]);
        }
      } catch (error) {
        console.error('Error processing task:', error);
        skipped++;
      }
    }

    const ownersCount = Object.keys(createdOwners).length;
    const ownersNew = Object.values(createdOwners).filter(u => {
      // Check if user was just created (has recent created_at)
      const created = new Date(u.created_at);
      const now = new Date();
      return (now - created) < 5000; // Created within last 5 seconds
    }).length;

    let message = `✅ `;
    if (newTasks.length > 0) {
      message += `${newTasks.length} new task${newTasks.length !== 1 ? 's' : ''} created`;
    }
    if (updatedTasks.length > 0) {
      if (newTasks.length > 0) message += ', ';
      message += `${updatedTasks.length} existing task${updatedTasks.length !== 1 ? 's' : ''} updated`;
    }
    if (ownersNew > 0) {
      message += `, ${ownersNew} new owner${ownersNew !== 1 ? 's' : ''} created`;
    }
    if (skipped > 0) {
      message += `, ${skipped} row${skipped !== 1 ? 's' : ''} skipped`;
    }

    res.json({
      success: true,
      message,
      tasksCreated: newTasks.length,
      tasksUpdated: updatedTasks.length,
      ownersCreated: ownersNew,
      ownersTotal: ownersCount,
      skipped
    });
  } catch (error) {
    console.error('Excel upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process Excel file' });
  }
});

export default router;
