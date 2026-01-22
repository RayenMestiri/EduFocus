const express = require('express');
const router = express.Router();
const StudySession = require('../models/StudySession');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// GET all sessions with filters
router.get('/', async (req, res) => {
  try {
    const { date, subjectId, startDate, endDate, type, completed } = req.query;
    const filter = { user: req.user._id };
    
    if (date) filter.date = date;
    if (subjectId) filter.subjectId = subjectId;
    if (type) filter.type = type;
    if (completed !== undefined) filter.completed = completed === 'true';
    
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }
    
    const sessions = await StudySession.find(filter)
      .populate('subjectId')
      .populate('todoRefs')
      .sort({ startTime: -1 });
    
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions',
      error: error.message
    });
  }
});

// GET session by ID
router.get('/:id', async (req, res) => {
  try {
    const session = await StudySession.findOne({
      _id: req.params.id,
      user: req.user._id
    })
      .populate('subjectId')
      .populate('todoRefs');
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching session',
      error: error.message
    });
  }
});

// POST create new session
router.post('/', async (req, res) => {
  try {
    const {
      subjectId,
      date,
      startTime,
      endTime,
      type,
      focusLevel,
      notes,
      tags,
      todoRefs,
      interruptions
    } = req.body;
    
    const session = new StudySession({
      user: req.user._id,
      subjectId,
      date,
      startTime,
      endTime,
      type: type || 'regular',
      focusLevel,
      notes,
      tags: tags || [],
      todoRefs: todoRefs || [],
      interruptions: interruptions || 0
    });
    
    await session.save();
    await session.populate('subjectId');
    
    // Update subject stats if completed
    if (session.completed) {
      const subject = await Subject.findById(subjectId);
      if (subject) {
        await subject.updateStats(session.duration);
      }
      
      // Update user stats
      const user = await User.findById(req.user._id);
      await user.updateStudyStats(session.duration);
    }
    
    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: session
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating session',
      error: error.message
    });
  }
});

// POST start new session
router.post('/start', async (req, res) => {
  try {
    const { subjectId, type, tags } = req.body;
    
    // Check if there's an active session
    const activeSession = await StudySession.findOne({
      user: req.user._id,
      completed: false,
      endTime: null
    });
    
    if (activeSession) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active session',
        data: activeSession
      });
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    const session = new StudySession({
      user: req.user._id,
      subjectId,
      date: today,
      startTime: new Date(),
      type: type || 'regular',
      tags: tags || []
    });
    
    await session.save();
    await session.populate('subjectId');
    
    res.status(201).json({
      success: true,
      message: 'Session started successfully',
      data: session
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error starting session',
      error: error.message
    });
  }
});

// PATCH end active session
router.patch('/end/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { focusLevel, notes, interruptions } = req.body;
    
    const session = await StudySession.findOne({
      _id: id,
      user: req.user._id
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (session.completed) {
      return res.status(400).json({
        success: false,
        message: 'Session already completed'
      });
    }
    
    session.endTime = new Date();
    if (focusLevel) session.focusLevel = focusLevel;
    if (notes) session.notes = notes;
    if (interruptions !== undefined) session.interruptions = interruptions;
    
    await session.save();
    await session.populate('subjectId');
    
    // Update subject stats
    const subject = await Subject.findById(session.subjectId);
    if (subject) {
      await subject.updateStats(session.duration);
    }
    
    // Update user stats
    const user = await User.findById(req.user._id);
    await user.updateStudyStats(session.duration);
    
    res.json({
      success: true,
      message: 'Session ended successfully',
      data: session
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error ending session',
      error: error.message
    });
  }
});

// GET active session
router.get('/active/current', async (req, res) => {
  try {
    const activeSession = await StudySession.findOne({
      user: req.user._id,
      completed: false,
      endTime: null
    }).populate('subjectId');
    
    res.json({
      success: true,
      data: activeSession
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching active session',
      error: error.message
    });
  }
});

// PUT update session
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const session = await StudySession.findOneAndUpdate(
      { _id: id, user: req.user._id },
      updates,
      { new: true, runValidators: true }
    ).populate('subjectId');
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Session updated successfully',
      data: session
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating session',
      error: error.message
    });
  }
});

// DELETE session
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await StudySession.findOneAndDelete({
      _id: id,
      user: req.user._id
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error deleting session',
      error: error.message
    });
  }
});

module.exports = router;
