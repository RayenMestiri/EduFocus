const mongoose = require('mongoose');

const NoteSubSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  tags: [{ type: String }],
  isPinned: { type: Boolean, default: false },
  color: { type: String, default: '#E0F2FE' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false, id: false });

const FlashcardSubSchema = new mongoose.Schema({
  id: { type: String, required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  code: { type: String },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard', null], default: null },
  // ── SRS / SM-2 metadata ──────────────────────────────────────────────────
  state: { type: String, enum: ['new', 'learning', 'review', 'mastered'], default: 'new' },
  repetitions: { type: Number, default: 0 },
  interval: { type: Number, default: 0 },
  easeFactor: { type: Number, default: 2.5 },
  dueDate: { type: Date, default: null },
  lastReviewed: { type: Date, default: null },
  lapses: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { _id: false, id: false });

const QCMSubSchema = new mongoose.Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  type: { type: String, enum: ['multiple-choice', 'true-false', 'fill-blanks'], default: 'multiple-choice' },
  options: [{ type: String }],
  correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
  explanation: { type: String },
  trapNote: { type: String },
  topic: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { _id: false, id: false });

const CheatsheetItemSchema = new mongoose.Schema({
  key: { type: String, required: true },
  value: { type: String, required: true }
}, { _id: false, id: false });

const CheatsheetSubSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  items: [CheatsheetItemSchema],
  codeSample: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { _id: false, id: false });

const ExerciseSubSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  schemaContext: { type: String },
  task: { type: String, required: true },
  correctSolution: { type: String, required: true },
  solutionNote: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { _id: false, id: false });

const StudyPackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Veuillez ajouter un titre'],
    trim: true,
    maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
  },
  subject: {
    type: String,
    required: [true, 'Veuillez ajouter une matière'],
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  progress: {
    type: Number,
    default: 0
  },
  streak: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  lastStudied: {
    type: Date,
    default: null
  },
  notes: [NoteSubSchema],
  flashcards: [FlashcardSubSchema],
  qcm: [QCMSubSchema],
  cheatsheets: [CheatsheetSubSchema],
  exercises: [ExerciseSubSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('StudyPack', StudyPackSchema);
