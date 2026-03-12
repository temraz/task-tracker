import express from 'express';
import pool from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { sendInvitationEmail } from '../config/email.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get all users (authenticated users can see basic info, admin sees more)
router.get('/', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.session.user?.role === 'admin';
    
    if (isAdmin) {
      // Admin sees all details
      const result = await pool.query(
        'SELECT id, email, name, department, avatar, role, is_active, created_at, invitation_sent_at, invitation_accepted_at FROM users ORDER BY created_at DESC'
      );
      res.json({ users: result.rows });
    } else {
      // Regular users see basic info for team overview
      const result = await pool.query(
        'SELECT id, name, department, avatar FROM users WHERE is_active = true ORDER BY name ASC'
      );
      res.json({ users: result.rows });
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, department, avatar, role, is_active FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user and send invitation (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, name, department, role = 'user' } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const avatar = name ? name.charAt(0).toUpperCase() : '?';
    const invitationToken = uuidv4();

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, name, department, avatar, role, invitation_token, invitation_sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [email, name, department || null, avatar, role, invitationToken]
    );

    const user = result.rows[0];

    // Send invitation email
    const emailResult = await sendInvitationEmail(email, name, invitationToken);
    
    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error);
      // User is created, but email failed - we can still return success
    }

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
        avatar: user.avatar,
        role: user.role
      },
      invitationSent: emailResult.success
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only, or user updating themselves)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, email, department, role, username, password } = req.body;
    const userId = parseInt(req.params.id);
    const currentUser = req.session.user;

    // Check if user can update (admin or self)
    if (currentUser.role !== 'admin' && currentUser.id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this user' });
    }

    // Only admin can change role, email, username, and password
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (email && currentUser.role === 'admin') {
      // Check if email is already taken by another user
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use by another user' });
      }
      updateFields.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (username !== undefined && currentUser.role === 'admin') {
      // Check if username is already taken by another user
      if (username) {
        const usernameCheck = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
        if (usernameCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Username already in use by another user' });
        }
      }
      updateFields.push(`username = $${paramCount++}`);
      values.push(username || null);
    }
    if (password) {
      // Allow users to change their own password, or admins to change any password
      if (currentUser.role === 'admin' || currentUser.id === userId) {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push(`password = $${paramCount++}`);
        values.push(hashedPassword);
      } else {
        return res.status(403).json({ error: 'Not authorized to change password for this user' });
      }
    }
    if (department !== undefined) {
      updateFields.push(`department = $${paramCount++}`);
      values.push(department);
    }
    if (role && currentUser.role === 'admin') {
      updateFields.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Resend invitation (admin only)
router.post('/:id/resend-invitation', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    // Generate new invitation token
    const invitationToken = uuidv4();
    await pool.query(
      'UPDATE users SET invitation_token = $1, invitation_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
      [invitationToken, user.id]
    );

    // Send invitation email
    const emailResult = await sendInvitationEmail(user.email, user.name, invitationToken);
    
    res.json({
      success: emailResult.success,
      message: emailResult.success ? 'Invitation sent successfully' : 'Failed to send invitation email'
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({ error: 'Failed to resend invitation' });
  }
});

export default router;
