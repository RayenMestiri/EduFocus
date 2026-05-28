const mongoose = require('mongoose');

const QuizAttemptAnswerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  selectedAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  topic: { type: String }
});

const QuizAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pack: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyPack',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  answers: [QuizAttemptAnswerSchema],
  completedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);
