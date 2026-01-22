const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    minlength: [1, 'Subject name must be at least 1 character'],
    maxlength: [50, 'Subject name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  color: {
    type: String,
    default: '#ffd700',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  icon: {
    type: String,
    default: '📚'
  },
  category: {
    type: String,
    enum: ['science', 'math', 'language', 'art', 'technology', 'social', 'other'],
    default: 'other'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  goals: {
    weeklyMinutes: { type: Number, default: 0, min: 0 },
    dailyMinutes: { type: Number, default: 0, min: 0 }
  },
  stats: {
    totalStudyMinutes: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    lastStudied: { type: Date },
    averageSessionLength: { type: Number, default: 0 }
  },
  resources: [{
    title: { type: String, required: true },
    url: { type: String },
    type: { type: String, enum: ['video', 'article', 'book', 'course', 'other'], default: 'other' }
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
SubjectSchema.index({ user: 1, createdAt: -1 });
SubjectSchema.index({ user: 1, isArchived: 1 });

// Update stats method
SubjectSchema.methods.updateStats = function(minutes) {
  this.stats.totalStudyMinutes += minutes;
  this.stats.totalSessions += 1;
  this.stats.lastStudied = Date.now();
  this.stats.averageSessionLength = this.stats.totalStudyMinutes / this.stats.totalSessions;
  return this.save();
};

module.exports = mongoose.model('Subject', SubjectSchema);
