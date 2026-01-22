const mongoose = require('mongoose');

const TodoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [1, 'Title must be at least 1 character'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  done: {
    type: Boolean,
    default: false
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
  },
  dueTime: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    index: true
  },
  category: {
    type: String,
    enum: ['homework', 'exam', 'project', 'reading', 'practice', 'review', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  estimatedMinutes: {
    type: Number,
    min: 0,
    default: 30
  },
  actualMinutes: {
    type: Number,
    min: 0,
    default: 0
  },
  subtasks: [{
    title: { type: String, required: true, maxlength: 100 },
    done: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  }],
  reminder: {
    enabled: { type: Boolean, default: false },
    time: { type: Date },
    sent: { type: Boolean, default: false }
  },
  notes: {
    type: String,
    maxlength: 500
  },
  completedAt: {
    type: Date
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: function() { return this.isRecurring; }
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
TodoSchema.index({ user: 1, date: 1 });
TodoSchema.index({ user: 1, done: 1 });
TodoSchema.index({ user: 1, subjectId: 1 });
TodoSchema.index({ user: 1, priority: 1 });

// Update completedAt when marking as done
TodoSchema.pre('save', function() {
  if (this.isModified('done') && this.done && !this.completedAt) {
    this.completedAt = Date.now();
  }
  if (this.isModified('done') && !this.done) {
    this.completedAt = null;
  }
});

// Calculate completion percentage
TodoSchema.methods.getCompletionPercentage = function() {
  if (!this.subtasks || this.subtasks.length === 0) {
    return this.done ? 100 : 0;
  }
  const completed = this.subtasks.filter(st => st.done).length;
  return Math.round((completed / this.subtasks.length) * 100);
};

module.exports = mongoose.model('Todo', TodoSchema);
