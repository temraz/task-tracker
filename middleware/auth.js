// Middleware to check if user is authenticated
export const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Middleware to check if user is admin
export const requireAdmin = (req, res, next) => {
  if (req.isAuthenticated() && (req.user?.role === 'admin' || req.session.user?.role === 'admin')) {
    return next();
  }
  res.status(403).json({ error: 'Admin access required' });
};

// Middleware to get current user from session
export const getCurrentUser = async (req, res, next) => {
  if (req.isAuthenticated()) {
    try {
      // Fetch full user data from database
      const db = req.app.get('db');
      const result = await db.query(
        'SELECT id, email, name, department, avatar, role, is_active FROM users WHERE id = $1',
        [req.user.id]
      );
      if (result.rows.length > 0) {
        req.currentUser = result.rows[0];
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  }
  next();
};
