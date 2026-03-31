import express from 'express';
import pool from '../database/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all tasks with filters
router.get('/', requireAuth, async (req, res) => {
  try {
    const { quarter_id, owner_id, status, priority, category, search, is_okr } = req.query;
    
    let query = `
      SELECT t.*, 
             u.name as owner_name, u.email as owner_email, u.avatar as owner_avatar,
             q.year, q.quarter
      FROM tasks t
      LEFT JOIN users u ON t.owner_id = u.id
      LEFT JOIN quarters q ON t.quarter_id = q.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (quarter_id) {
      query += ` AND t.quarter_id = $${paramCount++}`;
      params.push(quarter_id);
    }
    if (owner_id) {
      query += ` AND t.owner_id = $${paramCount++}`;
      params.push(owner_id);
    }
    if (status && status !== 'All') {
      query += ` AND t.status = $${paramCount++}`;
      params.push(status);
    }
    if (priority && priority !== 'All') {
      query += ` AND t.priority = $${paramCount++}`;
      params.push(priority);
    }
    if (category && category !== 'All') {
      query += ` AND t.category = $${paramCount++}`;
      params.push(category);
    }
    if (search) {
      query += ` AND t.name ILIKE $${paramCount++}`;
      params.push(`%${search}%`);
    }
    if (is_okr !== undefined && is_okr !== null && is_okr !== '') {
      const isOkrInt = (is_okr === '1' || is_okr === 1 || is_okr === 'true' || is_okr === true) ? 1 : 0;
      query += ` AND t.is_okr = $${paramCount++}`;
      params.push(isOkrInt);
    }

    query += ` ORDER BY 
      CASE WHEN t.due_date < CURRENT_DATE AND t.status != 'Completed' THEN 0 ELSE 1 END,
      t.due_date ASC,
      t.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get single task
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
              u.name as owner_name, u.email as owner_email, u.avatar as owner_avatar,
              q.year, q.quarter
       FROM tasks t
       LEFT JOIN users u ON t.owner_id = u.id
       LEFT JOIN quarters q ON t.quarter_id = q.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task
router.post('/', requireAuth, async (req, res) => {
  try {
    const body = req.body;
    const { quarter_id, owner_id, name, category, priority, due_date, status, performance, notes, linked_department } = body;

    if (!name || !quarter_id) {
      return res.status(400).json({ error: 'Name and quarter_id are required' });
    }

    // Handle is_okr - convert to integer (0 or 1)
    let isOkrValue = 0;
    if ('is_okr' in body) {
      const isOkrRaw = body.is_okr;
      // Accept true, 'true', 1, '1', or any truthy value as 1, everything else as 0
      isOkrValue = (isOkrRaw === true || isOkrRaw === 'true' || isOkrRaw === 1 || isOkrRaw === '1') ? 1 : 0;
    }
    
    console.log('CREATE TASK - is_okr raw:', body.is_okr, 'type:', typeof body.is_okr, 'converted:', isOkrValue);
    
    const result = await pool.query(
      `INSERT INTO tasks (quarter_id, owner_id, name, category, priority, due_date, status, performance, notes, is_okr, created_by, linked_department)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        quarter_id, 
        owner_id || null, 
        name, 
        category || null, 
        priority || 'Medium', 
        due_date || null, 
        status || 'Not Started', 
        performance || null, 
        notes || null, 
        isOkrValue, 
        req.session.user.id,
        linked_department || null
      ]
    );

    console.log('CREATE TASK RESULT - is_okr:', result.rows[0].is_okr);
    res.status(201).json({ task: result.rows[0] });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const body = req.body;
    
    console.log('UPDATE TASK - Task ID:', taskId);
    console.log('UPDATE TASK - Full body:', JSON.stringify(body, null, 2));
    console.log('UPDATE TASK - is_okr in body?', 'is_okr' in body);
    console.log('UPDATE TASK - is_okr value:', body.is_okr, 'type:', typeof body.is_okr);
    
    // Build update object - only include fields that are actually being updated
    const updates = {};
    const allowedFields = ['name', 'category', 'priority', 'due_date', 'status', 'performance', 'notes', 'owner_id', 'quarter_id', 'is_okr', 'linked_department'];
    
    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'is_okr') {
          // Convert is_okr to integer (0 or 1) - handle all cases
          const value = body[field];
          // Accept true, 'true', 1, '1', or any truthy value as 1, everything else as 0
          updates[field] = (value === true || value === 'true' || value === 1 || value === '1') ? 1 : 0;
          console.log('UPDATE TASK - is_okr conversion:', value, '->', updates[field]);
        } else {
          updates[field] = body[field];
        }
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    console.log('UPDATE TASK - Updates object:', JSON.stringify(updates, null, 2));
    console.log('UPDATE TASK - is_okr in updates?', 'is_okr' in updates);
    if ('is_okr' in updates) {
      console.log('UPDATE TASK - is_okr value in updates:', updates.is_okr, 'type:', typeof updates.is_okr);
    }
    
    // Build SQL query dynamically
    const setClauses = [];
    const values = [];
    let paramIndex = 1;
    
    // Sort entries to ensure consistent order (is_okr should be included)
    const sortedEntries = Object.entries(updates).sort((a, b) => a[0].localeCompare(b[0]));
    
    for (const [key, value] of sortedEntries) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      console.log(`UPDATE TASK - Adding ${key} = $${paramIndex} with value:`, value, 'type:', typeof value);
      paramIndex++;
    }
    
    // Add updated_at
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add WHERE clause
    values.push(taskId);
    const whereClause = `WHERE id = $${paramIndex}`;
    
    const query = `UPDATE tasks SET ${setClauses.join(', ')} ${whereClause} RETURNING *`;
    
    console.log('UPDATE TASK - Final SQL Query:', query);
    console.log('UPDATE TASK - Final Values Array:', JSON.stringify(values, null, 2));
    console.log('UPDATE TASK - Values array length:', values.length);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    console.log('UPDATE TASK - Result row:', JSON.stringify(result.rows[0], null, 2));
    console.log('UPDATE TASK - Result is_okr:', result.rows[0].is_okr, 'type:', typeof result.rows[0].is_okr);
    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Error updating task:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update task', details: error.message });
  }
});

// Delete task
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get task statistics
router.get('/stats/overview', requireAuth, async (req, res) => {
  try {
    const { quarter_id, owner_id } = req.query;
    
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (quarter_id) {
      query += ` AND quarter_id = $${paramCount++}`;
      params.push(quarter_id);
    }
    if (owner_id) {
      query += ` AND owner_id = $${paramCount++}`;
      params.push(owner_id);
    }

    const result = await pool.query(query, params);
    const tasks = result.rows;

    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'Completed').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      notStarted: tasks.filter(t => t.status === 'Not Started').length,
      overdue: tasks.filter(t => {
        if (!t.due_date || t.status === 'Completed') return false;
        return new Date(t.due_date) < new Date();
      }).length,
      byPriority: {
        Critical: tasks.filter(t => t.priority === 'Critical').length,
        High: tasks.filter(t => t.priority === 'High').length,
        Medium: tasks.filter(t => t.priority === 'Medium').length,
        Low: tasks.filter(t => t.priority === 'Low').length
      },
      byPerformance: {
        green: tasks.filter(t => t.performance === 'green').length,
        yellow: tasks.filter(t => t.performance === 'yellow').length,
        red: tasks.filter(t => t.performance === 'red').length
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
