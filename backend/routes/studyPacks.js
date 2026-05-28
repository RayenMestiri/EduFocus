const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const StudyPack = require('../models/StudyPack');
const QuizAttempt = require('../models/QuizAttempt');
const { protect } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// ============================================================
// STATIC ROUTES FIRST — must come before /:id wildcard routes
// ============================================================

// @desc    Get all study packs for the user
// @route   GET /api/study-packs
router.get('/', async (req, res) => {
  try {
    const packs = await StudyPack.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json({ success: true, data: packs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des packs', error: error.message });
  }
});

// @desc    Create a new study pack
// @route   POST /api/study-packs
router.post('/', async (req, res) => {
  try {
    const { title, subject, description } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ success: false, message: 'Veuillez renseigner le titre et la matière' });
    }

    const pack = await StudyPack.create({
      user: req.user._id,
      title,
      subject,
      description: description || '',
      notes: [],
      flashcards: [],
      qcm: [],
      cheatsheets: [],
      exercises: [],
      progress: 0,
      streak: 0
    });

    res.status(201).json({ success: true, data: pack });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la création du pack', error: error.message });
  }
});

// @desc    Bulk Import study packs  ← MUST BE BEFORE /:id
// @route   POST /api/study-packs/import
router.post('/import', async (req, res) => {
  try {
    const { packs } = req.body;
    if (!Array.isArray(packs)) {
      return res.status(400).json({ success: false, message: 'Le format d\'importation doit être un tableau de packs' });
    }

    const importedPacks = [];
    for (const packData of packs) {
      // Normalize notes
      const notes = (packData.notes || []).map(n => ({
        id: n.id || crypto.randomUUID(),
        title: n.title || 'Note Importée',
        content: n.content || '',
        tags: Array.isArray(n.tags) ? n.tags : [],
        isPinned: !!n.isPinned,
        createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
        updatedAt: n.updatedAt ? new Date(n.updatedAt) : new Date()
      }));

      // Normalize flashcards
      const flashcards = (packData.flashcards || []).map(f => ({
        id: f.id || crypto.randomUUID(),
        front: f.front || '',
        back: f.back || '',
        code: f.code || '',
        difficulty: f.difficulty || null,
        createdAt: f.createdAt ? new Date(f.createdAt) : new Date()
      }));

      // Normalize QCMs
      const qcm = (packData.qcm || []).map(q => ({
        id: q.id || crypto.randomUUID(),
        question: q.question || '',
        type: q.type || 'multiple-choice',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : '',
        explanation: q.explanation || '',
        trapNote: q.trapNote || '',
        topic: q.topic || 'Général',
        createdAt: q.createdAt ? new Date(q.createdAt) : new Date()
      }));

      // Normalize cheatsheets
      const cheatsheets = (packData.cheatsheets || []).map(cs => ({
        id: cs.id || crypto.randomUUID(),
        title: cs.title || '',
        category: cs.category || 'Général',
        items: Array.isArray(cs.items) ? cs.items.map(item => ({ key: item.key || '', value: item.value || '' })) : [],
        codeSample: cs.codeSample || '',
        createdAt: cs.createdAt ? new Date(cs.createdAt) : new Date()
      }));

      // Normalize exercises
      const exercises = (packData.exercises || []).map(ex => ({
        id: ex.id || crypto.randomUUID(),
        title: ex.title || '',
        description: ex.description || '',
        schemaContext: ex.schemaContext || '',
        task: ex.task || '',
        correctSolution: ex.correctSolution || '',
        solutionNote: ex.solutionNote || '',
        createdAt: ex.createdAt ? new Date(ex.createdAt) : new Date()
      }));

      const pack = await StudyPack.create({
        user: req.user._id,
        title: packData.title || 'Pack Importé',
        subject: packData.subject || 'Général',
        description: packData.description || '',
        notes,
        flashcards,
        qcm,
        cheatsheets,
        exercises,
        progress: packData.progress || 0,
        streak: packData.streak || 0
      });
      importedPacks.push(pack);
    }

    res.status(201).json({ success: true, data: importedPacks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de l\'importation des packs', error: error.message });
  }
});

// ============================================================
// DYNAMIC /:id ROUTES — come after all static routes
// ============================================================

// @desc    Get a single study pack by ID
// @route   GET /api/study-packs/:id
router.get('/:id', async (req, res) => {
  try {
    const pack = await StudyPack.findOne({ _id: req.params.id, user: req.user._id });
    if (!pack) {
      return res.status(404).json({ success: false, message: 'Pack d\'étude non trouvé' });
    }
    res.json({ success: true, data: pack });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du pack', error: error.message });
  }
});

// @desc    Update an existing study pack (full content arrays)
// @route   PUT /api/study-packs/:id
router.put('/:id', async (req, res) => {
  try {
    const pack = await StudyPack.findOne({ _id: req.params.id, user: req.user._id });
    if (!pack) {
      return res.status(404).json({ success: false, message: 'Pack d\'étude non trouvé' });
    }

    const { title, subject, description, progress, streak, notes, flashcards, qcm, cheatsheets, exercises } = req.body;

    if (title !== undefined) pack.title = title;
    if (subject !== undefined) pack.subject = subject;
    if (description !== undefined) pack.description = description;
    if (progress !== undefined) pack.progress = progress;
    if (streak !== undefined) pack.streak = streak;

    // Normalize sub-arrays to strip Mongoose internal fields and ensure clean IDs
    if (notes !== undefined) {
      pack.notes = notes.map(n => ({
        id: n.id || crypto.randomUUID(),
        title: n.title || '',
        content: n.content || '',
        tags: Array.isArray(n.tags) ? n.tags : [],
        isPinned: !!n.isPinned,
        createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
        updatedAt: n.updatedAt ? new Date(n.updatedAt) : new Date()
      }));
      pack.markModified('notes');
    }

    if (flashcards !== undefined) {
      pack.flashcards = flashcards.map(f => ({
        id: f.id || crypto.randomUUID(),
        front: f.front || '',
        back: f.back || '',
        code: f.code || '',
        difficulty: f.difficulty || null,
        createdAt: f.createdAt ? new Date(f.createdAt) : new Date()
      }));
      pack.markModified('flashcards');
    }

    if (qcm !== undefined) {
      pack.qcm = qcm.map(q => ({
        id: q.id || crypto.randomUUID(),
        question: q.question || '',
        type: q.type || 'multiple-choice',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : '',
        explanation: q.explanation || '',
        trapNote: q.trapNote || '',
        topic: q.topic || 'Général',
        createdAt: q.createdAt ? new Date(q.createdAt) : new Date()
      }));
      pack.markModified('qcm');
    }

    if (cheatsheets !== undefined) {
      pack.cheatsheets = cheatsheets.map(cs => ({
        id: cs.id || crypto.randomUUID(),
        title: cs.title || '',
        category: cs.category || 'Général',
        items: Array.isArray(cs.items) ? cs.items.map(item => ({ key: item.key || '', value: item.value || '' })) : [],
        codeSample: cs.codeSample || '',
        createdAt: cs.createdAt ? new Date(cs.createdAt) : new Date()
      }));
      pack.markModified('cheatsheets');
    }

    if (exercises !== undefined) {
      pack.exercises = exercises.map(ex => ({
        id: ex.id || crypto.randomUUID(),
        title: ex.title || '',
        description: ex.description || '',
        schemaContext: ex.schemaContext || '',
        task: ex.task || '',
        correctSolution: ex.correctSolution || '',
        solutionNote: ex.solutionNote || '',
        createdAt: ex.createdAt ? new Date(ex.createdAt) : new Date()
      }));
      pack.markModified('exercises');
    }

    await pack.save();
    res.json({ success: true, data: pack });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du pack', error: error.message });
  }
});

// @desc    Delete a study pack
// @route   DELETE /api/study-packs/:id
router.delete('/:id', async (req, res) => {
  try {
    const pack = await StudyPack.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!pack) {
      return res.status(404).json({ success: false, message: 'Pack d\'étude non trouvé' });
    }

    // Cascade delete all quiz attempts for this pack
    await QuizAttempt.deleteMany({ pack: req.params.id, user: req.user._id });

    res.json({ success: true, message: 'Pack d\'étude supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression du pack', error: error.message });
  }
});

// @desc    Save a QCM Quiz Attempt  ← MUST BE BEFORE /:id wildcard GET if using sub-paths
// @route   POST /api/study-packs/:id/attempts
router.post('/:id/attempts', async (req, res) => {
  try {
    const pack = await StudyPack.findOne({ _id: req.params.id, user: req.user._id });
    if (!pack) {
      return res.status(404).json({ success: false, message: 'Pack d\'étude non trouvé' });
    }

    const { score, totalQuestions, percentage, answers } = req.body;

    const attempt = await QuizAttempt.create({
      user: req.user._id,
      pack: pack._id,
      score: score || 0,
      totalQuestions: totalQuestions || 0,
      percentage: percentage || 0,
      answers: (answers || []).map(a => ({
        questionId: a.questionId || '',
        selectedAnswer: String(a.selectedAnswer || ''),
        isCorrect: !!a.isCorrect,
        topic: a.topic || 'Général'
      }))
    });

    res.status(201).json({ success: true, data: attempt });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement de l\'essai', error: error.message });
  }
});

// @desc    Get Quiz Attempts history for a study pack
// @route   GET /api/study-packs/:id/attempts
router.get('/:id/attempts', async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ pack: req.params.id, user: req.user._id }).sort({ completedAt: -1 });
    res.json({ success: true, data: attempts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'historique', error: error.message });
  }
});

module.exports = router;
