import express from 'express';
import pool from '../database/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get comments for a task
router.get('/task/:taskId', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name as user_name, u.avatar as user_avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.taskId]
    );
    res.json({ comments: result.rows });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create comment
router.post('/', requireAuth, async (req, res) => {
  try {
    const { task_id, text } = req.body;

    if (!task_id || !text) {
      return res.status(400).json({ error: 'Task ID and text are required' });
    }

    const result = await pool.query(
      `INSERT INTO comments (task_id, user_id, text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [task_id, req.session.user.id, text]
    );

    // Fetch with user info
    const commentResult = await pool.query(
      `SELECT c.*, u.name as user_name, u.avatar as user_avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ comment: commentResult.rows[0] });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Delete comment
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Check if user owns the comment
    const checkResult = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [req.params.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only allow deletion if user is the owner or admin
    if (checkResult.rows[0].user_id !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
