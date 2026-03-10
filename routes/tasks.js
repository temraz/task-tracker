import express from 'express';
import pool from '../database/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all tasks with filters
router.get('/', requireAuth, async (req, res) => {
  try {
    const { quarter_id, owner_id, status, priority, category, search } = req.query;
    
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
    const { quarter_id, owner_id, name, category, priority, due_date, status, performance, notes } = req.body;

    if (!name || !quarter_id) {
      return res.status(400).json({ error: 'Name and quarter_id are required' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (quarter_id, owner_id, name, category, priority, due_date, status, performance, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [quarter_id, owner_id || null, name, category || null, priority || 'Medium', due_date || null, status || 'Not Started', performance || null, notes || null, req.session.user.id]
    );

    res.status(201).json({ task: result.rows[0] });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, category, priority, due_date, status, performance, notes, owner_id, quarter_id } = req.body;
    
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (category !== undefined) {
      updateFields.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (priority !== undefined) {
      updateFields.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    if (due_date !== undefined) {
      updateFields.push(`due_date = $${paramCount++}`);
      values.push(due_date);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (performance !== undefined) {
      updateFields.push(`performance = $${paramCount++}`);
      values.push(performance);
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramCount++}`);
      values.push(notes);
    }
    if (owner_id !== undefined) {
      updateFields.push(`owner_id = $${paramCount++}`);
      values.push(owner_id);
    }
    if (quarter_id !== undefined) {
      updateFields.push(`quarter_id = $${paramCount++}`);
      values.push(quarter_id);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE tasks SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
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
