const mongoose = require('mongoose');

const StudySessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0,
    min: 0
  },
  type: {
    type: String,
    enum: ['pomodoro', 'regular', 'break', 'review'],
    default: 'regular'
  },
  focusLevel: {
    type: Number,
    min: 1,
    max: 5
  },
  completed: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    maxlength: 500
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  todoRefs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Todo'
  }],
  interruptions: {
    type: Number,
    default: 0,
    min: 0
  },
  achievements: [{
    type: {
      type: String,
      enum: ['focus_master', 'speed_learner', 'consistency_king', 'marathon_runner']
    },
    earnedAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
StudySessionSchema.index({ user: 1, date: 1 });
StudySessionSchema.index({ user: 1, subjectId: 1 });
StudySessionSchema.index({ user: 1, startTime: -1 });

// Calculate duration on save
StudySessionSchema.pre('save', function() {
  if (this.endTime && this.startTime) {
    this.duration = Math.round((this.endTime - this.startTime) / 60000); // in minutes
    this.completed = true;
  }
});

// Static method to get user stats
StudySessionSchema.statics.getUserStats = async function(userId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
        completed: true
      }
    },
    {
      $group: {
        _id: '$subjectId',
        totalMinutes: { $sum: '$duration' },
        totalSessions: { $sum: 1 },
        avgFocusLevel: { $avg: '$focusLevel' }
      }
    },
    {
      $lookup: {
        from: 'subjects',
        localField: '_id',
        foreignField: '_id',
        as: 'subject'
      }
    }
  ]);
};

module.exports = mongoose.model('StudySession', StudySessionSchema);
