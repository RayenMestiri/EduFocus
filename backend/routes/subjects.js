const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// GET all subjects for logged in user
router.get('/', async (req, res) => {
  try {
    const { includeArchived } = req.query;
    const filter = { user: req.user._id };
    
    if (!includeArchived || includeArchived === 'false') {
      filter.isArchived = false;
    }
    
    const subjects = await Subject.find(filter).sort({ order: 1, createdAt: -1 });
    res.json({
      success: true,
      data: subjects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subjects',
      error: error.message
    });
  }
});

// GET subject by ID with stats
router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findOne({ 
      _id: req.params.id,
      user: req.user._id 
    });
    
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }
    
    res.json({
      success: true,
      data: subject
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subject',
      error: error.message
    });
  }
});

// POST create new subject
router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon, category, difficulty, goals, resources } = req.body;
    
    const subject = new Subject({
      user: req.user._id,
      name,
      description,
      color: color || '#ffd700',
      icon: icon || '📚',
      category: category || 'other',
      difficulty: difficulty || 'medium',
      goals: goals || { weeklyMinutes: 0, dailyMinutes: 0 },
      resources: resources || []
    });
    
    await subject.save();
    
    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: subject
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating subject',
      error: error.message
    });
  }
});

// PUT update subject
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const subject = await Subject.findOneAndUpdate(
      { _id: id, user: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Subject updated successfully',
      data: subject
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating subject',
      error: error.message
    });
  }
});

// PATCH update subject stats
router.patch('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const { minutes } = req.body;
    
    const subject = await Subject.findOne({ 
      _id: id,
      user: req.user._id 
    });
    
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }
    
    await subject.updateStats(minutes);
    
    res.json({
      success: true,
      message: 'Subject stats updated',
      data: subject
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating stats',
      error: error.message
    });
  }
});

// PATCH archive/unarchive subject
router.patch('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const { isArchived } = req.body;
    
    const subject = await Subject.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { isArchived },
      { new: true }
    );
    
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }
    
    res.json({
      success: true,
      message: `Subject ${isArchived ? 'archived' : 'unarchived'} successfully`,
      data: subject
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating subject',
      error: error.message
    });
  }
});

// PATCH reorder subjects
router.patch('/reorder', async (req, res) => {
  try {
    const { subjects } = req.body; // Array of { id, order }
    
    const updates = subjects.map(({ id, order }) => 
      Subject.findOneAndUpdate(
        { _id: id, user: req.user._id },
        { order },
        { new: true }
      )
    );
    
    await Promise.all(updates);
    
    res.json({
      success: true,
      message: 'Subjects reordered successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error reordering subjects',
      error: error.message
    });
  }
});

// DELETE subject
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const subject = await Subject.findOneAndDelete({ 
      _id: id,
      user: req.user._id 
    });
    
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Subject deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error deleting subject',
      error: error.message
    });
  }
});

module.exports = router;
