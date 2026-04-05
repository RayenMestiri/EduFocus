const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    default: ''
  },
  contentText: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#6366f1'
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    enum: ['lecture', 'summary', 'formula', 'vocabulary', 'exercise', 'mindmap', 'question', 'other'],
    default: 'other'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  hasPassword: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    select: false
  }
}, {
  timestamps: true
});

// Hash password before saving
noteSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Check password
noteSchema.methods.checkPassword = async function(candidatePassword) {
  const note = await mongoose.model('Note').findById(this._id).select('+password');
  if (!note || !note.password) return false;
  return bcrypt.compare(candidatePassword, note.password);
};

module.exports = mongoose.model('Note', noteSchema);
