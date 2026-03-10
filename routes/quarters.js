import express from 'express';
import pool from '../database/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all quarters
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM quarters ORDER BY year DESC, quarter DESC'
    );
    res.json({ quarters: result.rows });
  } catch (error) {
    console.error('Error fetching quarters:', error);
    res.status(500).json({ error: 'Failed to fetch quarters' });
  }
});

// Get current quarter (fiscal year starts June 30)
router.get('/current', requireAuth, async (req, res) => {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const month = today.getMonth() + 1; // 1-12
    const day = today.getDate();
    
    // Fiscal year starts June 30
    // Q1: June 30 - September 29
    // Q2: September 30 - December 29
    // Q3: December 30 - March 30
    // Q4: March 31 - June 29
    
    let fiscalYear, quarter, startDate, endDate;
    
    if ((month === 6 && day >= 30) || (month >= 7 && month <= 9) || (month === 9 && day <= 29)) {
      // Q1: June 30 - September 29
      fiscalYear = currentYear;
      quarter = 1;
      startDate = new Date(currentYear, 5, 30); // June 30 (month is 0-indexed)
      endDate = new Date(currentYear, 8, 29); // September 29
    } else if ((month === 9 && day >= 30) || (month >= 10 && month <= 12) || (month === 12 && day <= 29)) {
      // Q2: September 30 - December 29
      fiscalYear = currentYear;
      quarter = 2;
      startDate = new Date(currentYear, 8, 30); // September 30
      endDate = new Date(currentYear, 11, 29); // December 29
    } else if ((month === 12 && day >= 30) || month === 1 || month === 2 || (month === 3 && day <= 30)) {
      // Q3: December 30 - March 30
      if (month === 12 && day >= 30) {
        fiscalYear = currentYear;
      } else {
        fiscalYear = currentYear - 1; // Q3 spans across year boundary
      }
      quarter = 3;
      startDate = new Date(fiscalYear, 11, 30); // December 30
      endDate = new Date(fiscalYear + 1, 2, 30); // March 30 of next year
    } else {
      // Q4: March 31 - June 29
      fiscalYear = currentYear - 1; // Q4 is in the previous fiscal year
      quarter = 4;
      startDate = new Date(fiscalYear + 1, 2, 31); // March 31
      endDate = new Date(fiscalYear + 1, 5, 29); // June 29
    }

    const result = await pool.query(
      'SELECT * FROM quarters WHERE year = $1 AND quarter = $2',
      [fiscalYear, quarter]
    );

    if (result.rows.length === 0) {
      // Create current quarter if it doesn't exist
      const createResult = await pool.query(
        `INSERT INTO quarters (year, quarter, start_date, end_date, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [fiscalYear, quarter, startDate, endDate]
      );
      return res.json({ quarter: createResult.rows[0] });
    }

    res.json({ quarter: result.rows[0] });
  } catch (error) {
    console.error('Error fetching current quarter:', error);
    res.status(500).json({ error: 'Failed to fetch current quarter' });
  }
});

// Get single quarter
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quarters WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quarter not found' });
    }
    res.json({ quarter: result.rows[0] });
  } catch (error) {
    console.error('Error fetching quarter:', error);
    res.status(500).json({ error: 'Failed to fetch quarter' });
  }
});

// Create quarter (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { year, quarter, start_date, end_date } = req.body;

    if (!year || !quarter || !start_date || !end_date) {
      return res.status(400).json({ error: 'Year, quarter, start_date, and end_date are required' });
    }

    if (quarter < 1 || quarter > 4) {
      return res.status(400).json({ error: 'Quarter must be between 1 and 4' });
    }

    const result = await pool.query(
      `INSERT INTO quarters (year, quarter, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [year, quarter, start_date, end_date]
    );

    res.status(201).json({ quarter: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Quarter for this year already exists' });
    }
    console.error('Error creating quarter:', error);
    res.status(500).json({ error: 'Failed to create quarter' });
  }
});

// Update quarter (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date, is_active } = req.body;
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (start_date) {
      updateFields.push(`start_date = $${paramCount++}`);
      values.push(start_date);
    }
    if (end_date) {
      updateFields.push(`end_date = $${paramCount++}`);
      values.push(end_date);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE quarters SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quarter not found' });
    }

    res.json({ quarter: result.rows[0] });
  } catch (error) {
    console.error('Error updating quarter:', error);
    res.status(500).json({ error: 'Failed to update quarter' });
  }
});

// Delete quarter (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Check if quarter has tasks
    const tasksCheck = await pool.query('SELECT COUNT(*) as count FROM tasks WHERE quarter_id = $1', [req.params.id]);
    if (parseInt(tasksCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete quarter with existing tasks. Please delete or move tasks first.' });
    }

    const result = await pool.query('DELETE FROM quarters WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quarter not found' });
    }

    res.json({ success: true, message: 'Quarter deleted successfully', quarter: result.rows[0] });
  } catch (error) {
    console.error('Error deleting quarter:', error);
    res.status(500).json({ error: 'Failed to delete quarter' });
  }
});

// Bulk create quarters for a fiscal year (admin only)
router.post('/bulk', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { fiscalYear } = req.body;

    if (!fiscalYear || typeof fiscalYear !== 'number') {
      return res.status(400).json({ error: 'Fiscal year (number) is required' });
    }

    // Check if quarters already exist for this fiscal year
    const existingCheck = await pool.query(
      'SELECT quarter FROM quarters WHERE year = $1',
      [fiscalYear]
    );
    
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: `Quarters for fiscal year ${fiscalYear} already exist. Quarters: ${existingCheck.rows.map(r => `Q${r.quarter}`).join(', ')}` 
      });
    }

    // Create all 4 quarters for the fiscal year
    const quarters = [
      { quarter: 1, start: new Date(fiscalYear, 5, 30), end: new Date(fiscalYear, 8, 29) }, // Q1: June 30 - Sept 29
      { quarter: 2, start: new Date(fiscalYear, 8, 30), end: new Date(fiscalYear, 11, 29) }, // Q2: Sept 30 - Dec 29
      { quarter: 3, start: new Date(fiscalYear, 11, 30), end: new Date(fiscalYear + 1, 2, 30) }, // Q3: Dec 30 - Mar 30
      { quarter: 4, start: new Date(fiscalYear + 1, 2, 31), end: new Date(fiscalYear + 1, 5, 29) } // Q4: Mar 31 - June 29
    ];

    const createdQuarters = [];
    for (const q of quarters) {
      const result = await pool.query(
        `INSERT INTO quarters (year, quarter, start_date, end_date, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [fiscalYear, q.quarter, q.start, q.end]
      );
      createdQuarters.push(result.rows[0]);
    }

    res.status(201).json({ 
      success: true, 
      message: `Created all 4 quarters for fiscal year ${fiscalYear}`,
      quarters: createdQuarters 
    });
  } catch (error) {
    console.error('Error bulk creating quarters:', error);
    res.status(500).json({ error: 'Failed to create quarters' });
  }
});

// Bulk delete quarters for a fiscal year (admin only)
router.delete('/year/:year', requireAuth, requireAdmin, async (req, res) => {
  try {
    const year = parseInt(req.params.year);

    // First, check if any quarters exist for this year
    const quartersCheck = await pool.query(
      'SELECT id, quarter FROM quarters WHERE year = $1',
      [year]
    );
    
    if (quartersCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: `No quarters found for fiscal year ${year}` 
      });
    }

    // Check if any of these quarters have tasks
    const quarterIds = quartersCheck.rows.map(q => q.id);
    const tasksCheck = await pool.query(
      `SELECT COUNT(*) as count, 
              STRING_AGG(DISTINCT q.quarter::text, ', ') as quarters_with_tasks
       FROM tasks t 
       INNER JOIN quarters q ON t.quarter_id = q.id 
       WHERE q.id = ANY($1::int[])`,
      [quarterIds]
    );
    
    const taskCount = parseInt(tasksCheck.rows[0].count);
    if (taskCount > 0) {
      const quartersWithTasks = tasksCheck.rows[0].quarters_with_tasks;
      return res.status(400).json({ 
        error: `Cannot delete quarters for fiscal year ${year}. There are ${taskCount} task(s) in quarter(s) Q${quartersWithTasks}. Please delete or move these tasks first.` 
      });
    }

    const result = await pool.query(
      'DELETE FROM quarters WHERE year = $1 RETURNING *',
      [year]
    );

    res.json({ 
      success: true, 
      message: `Deleted ${result.rows.length} quarter(s) for fiscal year ${year}`,
      deletedQuarters: result.rows 
    });
  } catch (error) {
    console.error('Error bulk deleting quarters:', error);
    res.status(500).json({ error: 'Failed to delete quarters' });
  }
});

export default router;
