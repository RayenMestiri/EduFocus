const mongoose = require('mongoose');

const DayPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
  },
  subjects: [{
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    goalMinutes: {
      type: Number,
      required: true,
      default: 60,
      min: [5, 'Goal must be at least 5 minutes'],
      max: [1440, 'Goal cannot exceed 24 hours']
    },
    studiedMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    sessions: [{
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      duration: { type: Number, required: true },
      completed: { type: Boolean, default: false },
      note: { type: String, maxlength: 200 },
      completedAt: { type: Date }
    }],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }],
  totalGoalMinutes: {
    type: Number,
    default: 0
  },
  totalStudiedMinutes: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  mood: {
    type: String,
    enum: ['excellent', 'good', 'neutral', 'bad', 'terrible'],
    default: 'neutral'
  },
  productivity: {
    type: Number,
    min: 1,
    max: 5
  },
  achievements: [{
    type: String,
    maxlength: 100
  }],
  isCompleted: {
    type: Boolean,
    default: false
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

// Compound index for user + date
DayPlanSchema.index({ user: 1, date: 1 }, { unique: true });
DayPlanSchema.index({ user: 1, createdAt: -1 });

// Calculate totals before saving
DayPlanSchema.pre('save', function() {
  this.totalGoalMinutes = this.subjects.reduce((sum, s) => sum + s.goalMinutes, 0);
  this.totalStudiedMinutes = this.subjects.reduce((sum, s) => sum + s.studiedMinutes, 0);
  this.isCompleted = this.totalStudiedMinutes >= this.totalGoalMinutes;
});

// Add session method
DayPlanSchema.methods.addSession = function(subjectId, sessionData) {
  const subject = this.subjects.find(s => s.subjectId.toString() === subjectId.toString());
  if (subject) {
    subject.sessions.push(sessionData);
    subject.studiedMinutes += sessionData.duration;
  }
  return this.save();
};

module.exports = mongoose.model('DayPlan', DayPlanSchema);
