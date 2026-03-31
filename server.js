import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from './config/auth.js';
import pool from './database/db.js';
import rateLimit from 'express-rate-limit';

// Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import quartersRoutes from './routes/quarters.js';
import tasksRoutes from './routes/tasks.js';
import commentsRoutes from './routes/comments.js';
import uploadRoutes from './routes/upload.js';
import exportRoutes from './routes/export.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting (optional - disabled by default)
// Enable by setting RATE_LIMIT_ENABLED=true
if (process.env.RATE_LIMIT_ENABLED === 'true') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL?.startsWith('https'),
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'classera.session'
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Make db pool available to routes
app.set('db', pool);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/quarters', quartersRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/export', exportRoutes);

// Serve static files (frontend)
app.use(express.static('public'));

// Catch-all for frontend routing
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Test database connection
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
});

export default app;
