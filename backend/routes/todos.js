const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');
const { protect } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// GET todos by date
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    const todos = await Todo.find({ 
      date,
      user: req.user._id 
    })
      .populate('subjectId')
      .sort({ order: 1, priority: -1, createdAt: -1 });
    
    res.json({
      success: true,
      data: todos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching todos',
      error: error.message
    });
  }
});

// GET all todos with filters
router.get('/', async (req, res) => {
  try {
    const { date, priority, category, done, subjectId } = req.query;
    const filter = { user: req.user._id };
    
    if (date) filter.date = date;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (done !== undefined) filter.done = done === 'true';
    if (subjectId) filter.subjectId = subjectId;
    
    const todos = await Todo.find(filter)
      .populate('subjectId')
      .sort({ order: 1, priority: -1, createdAt: -1 });
    
    res.json({
      success: true,
      data: todos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching todos',
      error: error.message
    });
  }
});

// POST create todo
router.post('/', async (req, res) => {
  try {
    const { 
      title, 
      description,
      date, 
      dueTime,
      priority, 
      subjectId,
      category,
      tags,
      estimatedMinutes,
      subtasks,
      notes,
      isRecurring,
      recurringPattern
    } = req.body;
    
    const todo = new Todo({
      user: req.user._id,
      title,
      description,
      date,
      dueTime,
      priority: priority || 'medium',
      subjectId,
      category: category || 'other',
      tags: tags || [],
      estimatedMinutes: estimatedMinutes || 30,
      subtasks: subtasks || [],
      notes,
      isRecurring: isRecurring || false,
      recurringPattern
    });
    
    await todo.save();
    await todo.populate('subjectId');
    
    res.status(201).json({
      success: true,
      message: 'Todo created successfully',
      data: todo
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating todo',
      error: error.message
    });
  }
});

// PUT update todo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const todo = await Todo.findOneAndUpdate(
      { _id: id, user: req.user._id },
      updates,
      { new: true, runValidators: true }
    ).populate('subjectId');
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Todo updated successfully',
      data: todo
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating todo',
      error: error.message
    });
  }
});

// PATCH toggle todo status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    const todo = await Todo.findOne({ 
      _id: id,
      user: req.user._id 
    });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    todo.done = !todo.done;
    await todo.save();
    await todo.populate('subjectId');
    
    res.json({
      success: true,
      message: 'Todo status updated',
      data: todo
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error toggling todo',
      error: error.message
    });
  }
});

// PATCH toggle subtask
router.patch('/:id/subtask/:subtaskId/toggle', async (req, res) => {
  try {
    const { id, subtaskId } = req.params;
    
    const todo = await Todo.findOne({ 
      _id: id,
      user: req.user._id 
    });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    const subtask = todo.subtasks.id(subtaskId);
    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: 'Subtask not found'
      });
    }
    
    subtask.done = !subtask.done;
    await todo.save();
    await todo.populate('subjectId');
    
    res.json({
      success: true,
      message: 'Subtask status updated',
      data: todo
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error toggling subtask',
      error: error.message
    });
  }
});

// PATCH reorder todos
router.patch('/reorder', async (req, res) => {
  try {
    const { todos } = req.body; // Array of { id, order }
    
    const updates = todos.map(({ id, order }) => 
      Todo.findOneAndUpdate(
        { _id: id, user: req.user._id },
        { order },
        { new: true }
      )
    );
    
    await Promise.all(updates);
    
    res.json({
      success: true,
      message: 'Todos reordered successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error reordering todos',
      error: error.message
    });
  }
});

// DELETE todo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const todo = await Todo.findOneAndDelete({ 
      _id: id,
      user: req.user._id 
    });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Todo deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error deleting todo',
      error: error.message
    });
  }
});

module.exports = router;
