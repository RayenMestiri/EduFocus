const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));
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
    message: 'Something went wrong!',
    error: err.message
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 EduFocus Server running on port ${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
});

module.exports = app;
