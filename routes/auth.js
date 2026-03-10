import express from 'express';
import passport from '../config/auth.js';
import pool from '../database/db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Microsoft OAuth login
router.get('/microsoft', (req, res, next) => {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.MICROSOFT_TENANT_ID) {
    return res.status(400).json({
      error: 'Microsoft OAuth not configured',
      message: 'Please configure MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID in your .env file and restart the server'
    });
  }
  passport.authenticate('microsoft', {
    prompt: 'select_account'
  })(req, res, next);
});

// Microsoft OAuth callback
router.get('/microsoft/callback', (req, res, next) => {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.MICROSOFT_TENANT_ID) {
    return res.status(400).json({
      error: 'Microsoft OAuth not configured',
      message: 'Please configure MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID in your .env file and restart the server'
    });
  }
  passport.authenticate('microsoft', { failureRedirect: '/login?error=auth_failed' })(req, res, next);
}, async (req, res) => {
    try {
      const { microsoftId, email, name } = req.user;
      
      // Check if user exists
      const userResult = await pool.query(
        'SELECT * FROM users WHERE microsoft_id = $1 OR email = $2',
        [microsoftId, email]
      );

      let user;
      if (userResult.rows.length > 0) {
        // Update existing user
        user = userResult.rows[0];
        await pool.query(
          'UPDATE users SET microsoft_id = $1, name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [microsoftId, name, user.id]
        );
      } else {
        // Create new user (if invited or auto-create)
        const avatar = name ? name.charAt(0).toUpperCase() : '?';
        const result = await pool.query(
          `INSERT INTO users (microsoft_id, email, name, avatar, role, is_active, invitation_accepted_at)
           VALUES ($1, $2, $3, $4, 'user', true, CURRENT_TIMESTAMP)
           RETURNING *`,
          [microsoftId, email, name, avatar]
        );
        user = result.rows[0];
      }

      // Set user in session
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };

      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`);
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect('/login?error=server_error');
    }
  }
);

// Logout
router.post('/logout', (req, res) => {
  // Clear session data first
  if (req.session) {
    req.session.user = null;
    req.session.userId = null;
  }
  
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      // Still return success even if destroy fails
    }
    
    // Clear passport session if it exists (wrap in try-catch to avoid Microsoft OAuth errors)
    if (req.logout) {
      try {
        req.logout((logoutErr) => {
          if (logoutErr) {
            console.error('Passport logout error:', logoutErr);
            // Continue anyway - session is already destroyed
          }
          res.json({ success: true, message: 'Logged out successfully' });
        });
      } catch (logoutErr) {
        console.error('Logout error:', logoutErr);
        // Still return success - session is destroyed
        res.json({ success: true, message: 'Logged out successfully' });
      }
    } else {
      res.json({ success: true, message: 'Logged out successfully' });
    }
  });
});

// Local login (username/password)
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Authentication failed' });
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
      // Store user in session
      req.session.user = user;
      req.session.userId = user.id;
      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
        }
        res.json({ success: true, user });
      });
    });
  })(req, res, next);
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, name, department } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username || '']
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = name ? name.charAt(0).toUpperCase() : '?';

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, username, password, name, department, avatar, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 'user', true)
       RETURNING id, email, name, department, avatar, role`,
      [email, username || null, hashedPassword, name, department || null, avatar]
    );

    const user = result.rows[0];

    // Auto-login after registration
    req.logIn({ id: user.id, email: user.email, name: user.name, role: user.role }, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Registration successful but login failed' });
      }
      // Store user in session
      req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role };
      req.session.userId = user.id;
      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
        }
        res.status(201).json({ success: true, user });
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get current user
router.get('/me', (req, res) => {
  // Check both passport session and our custom session
  if (req.isAuthenticated() || req.session.user) {
    const user = req.session.user || req.user;
    if (user) {
      return res.json({ user });
    }
  }
  res.status(401).json({ error: 'Not authenticated' });
});

// Accept invitation (for users who received email invitation)
router.get('/accept-invitation', async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.redirect('/login?error=invalid_token');
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE invitation_token = $1 AND invitation_sent_at > NOW() - INTERVAL \'7 days\'',
      [token]
    );

    if (result.rows.length === 0) {
      return res.redirect('/login?error=invalid_or_expired_token');
    }

    const user = result.rows[0];
    
    // Mark invitation as accepted
    await pool.query(
      'UPDATE users SET invitation_accepted_at = CURRENT_TIMESTAMP, invitation_token = NULL WHERE id = $1',
      [user.id]
    );

    // Redirect to Microsoft login
    res.redirect('/auth/microsoft');
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.redirect('/login?error=server_error');
  }
});

export default router;
