const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  avatar: {
    type: String,
    default: 'https://res.cloudinary.com/dmdhy6rj8/image/upload/v1/default-avatar.png'
  },
  role: {
    type: String,
    enum: ['user', 'premium', 'admin'],
    default: 'user'
  },
  preferences: {
    theme: {
      type: String,
      enum: ['dark', 'light', 'auto'],
      default: 'dark'
    },
    language: {
      type: String,
      enum: ['en', 'fr', 'es', 'ar'],
      default: 'fr'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      studyReminders: { type: Boolean, default: true }
    },
    studySettings: {
      pomodoroLength: { type: Number, default: 25, min: 5, max: 60 },
      shortBreak: { type: Number, default: 5, min: 1, max: 15 },
      longBreak: { type: Number, default: 15, min: 5, max: 30 },
      dailyGoal: { type: Number, default: 120, min: 0 }
    }
  },
  stats: {
    totalStudyMinutes: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastStudyDate: { type: Date }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
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

// Index for faster queries
UserSchema.index({ email: 1 });
UserSchema.index({ createdAt: -1 });

// Hash password before saving
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Update lastLogin
UserSchema.methods.updateLastLogin = function() {
  this.lastLogin = Date.now();
  return this.save();
};

// Compare password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update study stats
UserSchema.methods.updateStudyStats = function(minutes) {
  this.stats.totalStudyMinutes += minutes;
  this.stats.totalSessions += 1;
  
  // Update streak
  const today = new Date().setHours(0, 0, 0, 0);
  const lastStudy = this.stats.lastStudyDate ? new Date(this.stats.lastStudyDate).setHours(0, 0, 0, 0) : null;
  
  if (!lastStudy || today - lastStudy > 86400000) { // More than 1 day
    if (today - lastStudy === 86400000) { // Exactly 1 day
      this.stats.streak += 1;
    } else {
      this.stats.streak = 1;
    }
  }
  
  this.stats.longestStreak = Math.max(this.stats.streak, this.stats.longestStreak);
  this.stats.lastStudyDate = Date.now();
  
  return this.save();
};

module.exports = mongoose.model('User', UserSchema);
