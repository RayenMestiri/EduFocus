const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const StudyPack = require('../models/StudyPack');
const QuizAttempt = require('../models/QuizAttempt');
const { protect } = require('../middleware/auth');

// ============================================================
// PUBLIC ROUTES (no auth required)
// ============================================================

// @desc    Get a public study pack by ID
// @route   GET /api/study-packs/public/:id
router.get('/public/:id', async (req, res) => {
  try {
    const pack = await StudyPack.findById(req.params.id);
    if (!pack || !pack.isPublic) {
      return res.status(404).json({ success: false, message: 'Pack d\'étude public non trouvé ou privé' });
    }
    res.json({ success: true, data: pack });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du pack public', error: error.message });
  }
});

// Protect all other routes
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
        color: n.color || '#E0F2FE',
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
        state: f.state || 'new',
        repetitions: f.repetitions ?? 0,
        interval: f.interval ?? 0,
        easeFactor: f.easeFactor ?? 2.5,
        dueDate: f.dueDate ? new Date(f.dueDate) : null,
        lastReviewed: f.lastReviewed ? new Date(f.lastReviewed) : null,
        lapses: f.lapses ?? 0,
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

// @desc    Clone a public study pack to user's library
// @route   POST /api/study-packs/clone/:id
router.post('/clone/:id', async (req, res) => {
  try {
    const originalPack = await StudyPack.findById(req.params.id);
    if (!originalPack) {
      return res.status(404).json({ success: false, message: 'Pack d\'étude d\'origine non trouvé' });
    }

    // Only allow cloning if it is public OR if the current user is the owner
    if (!originalPack.isPublic && originalPack.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Vous n\'avez pas la permission de cloner ce pack d\'étude privé' });
    }

    // Deep copy notes, flashcards, QCMs, cheatsheets, and exercises with new UUIDs
    const notes = (originalPack.notes || []).map(n => ({
      id: crypto.randomUUID(),
      title: n.title,
      content: n.content,
      tags: n.tags,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const flashcards = (originalPack.flashcards || []).map(f => ({
      id: crypto.randomUUID(),
      front: f.front,
      back: f.back,
      code: f.code,
      difficulty: null,
      state: 'new',
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      dueDate: null,
      lastReviewed: null,
      lapses: 0,
      createdAt: new Date()
    }));

    const qcm = (originalPack.qcm || []).map(q => ({
      id: crypto.randomUUID(),
      question: q.question,
      type: q.type,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      trapNote: q.trapNote,
      topic: q.topic,
      createdAt: new Date()
    }));

    const cheatsheets = (originalPack.cheatsheets || []).map(cs => ({
      id: crypto.randomUUID(),
      title: cs.title,
      category: cs.category,
      items: (cs.items || []).map(item => ({ key: item.key, value: item.value })),
      codeSample: cs.codeSample,
      createdAt: new Date()
    }));

    const exercises = (originalPack.exercises || []).map(ex => ({
      id: crypto.randomUUID(),
      title: ex.title,
      description: ex.description,
      schemaContext: ex.schemaContext,
      task: ex.task,
      correctSolution: ex.correctSolution,
      solutionNote: ex.solutionNote,
      createdAt: new Date()
    }));

    const clonedPack = await StudyPack.create({
      user: req.user._id,
      title: originalPack.title,
      subject: originalPack.subject,
      description: originalPack.description || '',
      notes,
      flashcards,
      qcm,
      cheatsheets,
      exercises,
      progress: 0,
      streak: 0,
      isPublic: false
    });

    res.status(201).json({ success: true, data: clonedPack });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors du clonage du pack', error: error.message });
  }
});

// @desc    Get aggregated SRS statistics across all user packs
// @route   GET /api/study-packs/srs-stats
router.get('/srs-stats', async (req, res) => {
  try {
    const packs = await StudyPack.find({ user: req.user._id });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalFlashcards = 0;
    let newCount = 0;
    let learningCount = 0;
    let reviewCount = 0;
    let masteredCount = 0;
    let dueTodayCount = 0;
    let overdueCount = 0;
    let totalReviewed = 0; // cards that have been reviewed at least once
    let totalLapses = 0;
    let reviewsLast7Days = 0;
    let reviewsLast30Days = 0;

    for (const pack of packs) {
      for (const card of (pack.flashcards || [])) {
        totalFlashcards++;

        const state = card.state || 'new';
        if (state === 'new') newCount++;
        else if (state === 'learning') learningCount++;
        else if (state === 'review') reviewCount++;
        else if (state === 'mastered') masteredCount++;

        // Due / Overdue
        if (state !== 'new' && card.dueDate) {
          const due = new Date(card.dueDate);
          if (due < startOfToday) {
            overdueCount++;
          } else if (due >= startOfToday && due <= endOfToday) {
            dueTodayCount++;
          }
        }
        if (state === 'new' || state === 'learning') {
          dueTodayCount++; // new and learning cards are always "due"
        }

        // Retention tracking
        if (card.lastReviewed) {
          totalReviewed++;
          totalLapses += (card.lapses || 0);
          const lastReviewed = new Date(card.lastReviewed);
          if (lastReviewed >= sevenDaysAgo) reviewsLast7Days++;
          if (lastReviewed >= thirtyDaysAgo) reviewsLast30Days++;
        }
      }
    }

    // Retention rate: (reviewed - lapses) / reviewed * 100 (capped 0-100)
    const retentionRate = totalReviewed > 0
      ? Math.max(0, Math.min(100, Math.round(((totalReviewed - totalLapses) / totalReviewed) * 100)))
      : 0;

    res.json({
      success: true,
      data: {
        totalPacks: packs.length,
        totalFlashcards,
        new: newCount,
        learning: learningCount,
        review: reviewCount,
        mastered: masteredCount,
        dueToday: dueTodayCount,
        overdue: overdueCount,
        retentionRate,
        reviewsLast7Days,
        reviewsLast30Days,
        totalReviewed,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors du calcul des statistiques SRS', error: error.message });
  }
});

// ============================================================
// DYNAMIC /:id ROUTES — come after all static routes
// ============================================================

// @desc    Bulk delete multiple study packs
// @route   DELETE /api/study-packs/bulk
router.delete('/bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Veuillez fournir une liste d\'IDs à supprimer.' });
    }

    // Only delete packs that belong to the current user
    const result = await StudyPack.deleteMany({ _id: { $in: ids }, user: req.user._id });

    // Cascade delete quiz attempts for all deleted packs
    await QuizAttempt.deleteMany({ pack: { $in: ids }, user: req.user._id });

    res.json({ success: true, message: `${result.deletedCount} pack(s) supprimé(s) avec succès.`, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression des packs', error: error.message });
  }
});


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

    const { title, subject, description, progress, streak, isPublic, lastStudied, notes, flashcards, qcm, cheatsheets, exercises } = req.body;

    if (title !== undefined) pack.title = title;
    if (subject !== undefined) pack.subject = subject;
    if (description !== undefined) pack.description = description;
    if (progress !== undefined) pack.progress = progress;
    if (streak !== undefined) pack.streak = streak;
    if (isPublic !== undefined) pack.isPublic = isPublic;
    if (lastStudied !== undefined) pack.lastStudied = lastStudied ? new Date(lastStudied) : null;

    // Normalize sub-arrays to strip Mongoose internal fields and ensure clean IDs
    if (notes !== undefined) {
      pack.notes = notes.map(n => ({
        id: n.id || crypto.randomUUID(),
        title: n.title || '',
        content: n.content || '',
        tags: Array.isArray(n.tags) ? n.tags : [],
        isPinned: !!n.isPinned,
        color: n.color || '#E0F2FE',
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
        state: f.state || 'new',
        repetitions: f.repetitions ?? 0,
        interval: f.interval ?? 0,
        easeFactor: f.easeFactor ?? 2.5,
        dueDate: f.dueDate ? new Date(f.dueDate) : null,
        lastReviewed: f.lastReviewed ? new Date(f.lastReviewed) : null,
        lapses: f.lapses ?? 0,
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
