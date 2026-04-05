const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Trust proxy (required for Render, Heroku, etc.)
app.set('trust proxy', 1);

// CORS — supports comma-separated origins in FRONTEND_URL
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:4200')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, same-origin)
    if (!origin) return callback(null, true);
    // Wildcard passthrough
    if (allowedOrigins.includes('*')) return callback(null, true);
    // Exact match check
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Blocked — return null (not an Error) so Express doesn't 500
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Handle preflight OPTIONS requests explicitly for all routes (Express 5 syntax)
app.options('(.*)', cors(corsOptions));
app.use(cors(corsOptions));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected - EduFocus Database'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Import Routes
const authRoutes = require('./routes/auth');
const subjectRoutes = require('./routes/subjects');
const dayPlanRoutes = require('./routes/dayPlans');
const todoRoutes = require('./routes/todos');
const sessionRoutes = require('./routes/sessions');
const statsRoutes = require('./routes/stats');
const aiRoutes = require('./routes/ai');
const notesRoutes = require('./routes/notes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/day-plans', dayPlanRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notes', notesRoutes);

// Health check endpoint (useful for Render)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Welcome Route
app.get('/', (req, res) => {
  res.json({
    message: '🎓 EduFocus API - Premium Study Planner',
    version: '2.0.0',
    status: 'Active',
    endpoints: {
      auth: '/api/auth',
      subjects: '/api/subjects',
      dayPlans: '/api/day-plans',
      todos: '/api/todos',
      sessions: '/api/sessions',
      stats: '/api/stats',
      ai: '/api/ai',
      notes: '/api/notes'
    }
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong!'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { error: err.message })
  });
});

// Start Server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`🚀 EduFocus Server running on port ${PORT}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
