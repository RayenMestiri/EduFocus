const express = require('express');
const router = express.Router();
const DayPlan = require('../models/DayPlan');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// GET day plan by date
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    let dayPlan = await DayPlan.findOne({ 
      date,
      user: req.user._id 
    }).populate('subjects.subjectId');
    
    // Create empty plan if doesn't exist
    if (!dayPlan) {
      dayPlan = new DayPlan({
        user: req.user._id,
        date,
        subjects: []
      });
      await dayPlan.save();
    }
    
    res.json({
      success: true,
      data: dayPlan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching day plan',
      error: error.message
    });
  }
});

// GET day plans for date range
router.get('/range/:startDate/:endDate', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    const dayPlans = await DayPlan.find({
      user: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    })
      .populate('subjects.subjectId')
      .sort({ date: 1 });
    
    res.json({
      success: true,
      data: dayPlans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching day plans',
      error: error.message
    });
  }
});

// POST/PUT save day plan
router.post('/', async (req, res) => {
  try {
    const { date, subjects, notes, mood, productivity, achievements } = req.body;
    
    let dayPlan = await DayPlan.findOne({ 
      date,
      user: req.user._id 
    });
    
    if (dayPlan) {
      dayPlan.subjects = subjects;
      if (notes !== undefined) dayPlan.notes = notes;
      if (mood) dayPlan.mood = mood;
      if (productivity) dayPlan.productivity = productivity;
      if (achievements) dayPlan.achievements = achievements;
      await dayPlan.save();
    } else {
      dayPlan = new DayPlan({
        user: req.user._id,
        date,
        subjects,
        notes,
        mood,
        productivity,
        achievements
      });
      await dayPlan.save();
    }
    
    // Populate subject details
    dayPlan = await DayPlan.findById(dayPlan._id).populate('subjects.subjectId');
    
    res.json({
      success: true,
      message: 'Day plan saved successfully',
      data: dayPlan
    });
  } catch (error) {
    console.error('❌ Error saving day plan:', error);
    console.error('❌ Request body:', req.body);
    
    let errorMessage = 'Error saving day plan';
    let validationDetails = null;
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError' && error.errors) {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      errorMessage = validationErrors.join(', ');
      validationDetails = Object.keys(error.errors);
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(400).json({
      success: false,
      message: 'Error saving day plan',
      error: errorMessage,
      details: validationDetails
    });
  }
});

// PATCH update studied minutes
router.patch('/:date/subject/:subjectId', async (req, res) => {
  try {
    const { date, subjectId } = req.params;
    const { studiedMinutes } = req.body;
    
    // DEBUG: Log the received value
    console.log(`🔍 Backend received updateStudiedTime: date=${date}, subjectId=${subjectId}, studiedMinutes=${studiedMinutes} (type: ${typeof studiedMinutes})`);
    
    const dayPlan = await DayPlan.findOne({ 
      date,
      user: req.user._id 
    });
    
    if (!dayPlan) {
      return res.status(404).json({
        success: false,
        message: 'Day plan not found'
      });
    }
    
    const subjectPlan = dayPlan.subjects.find(
      s => s.subjectId.toString() === subjectId
    );
    
    if (!subjectPlan) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found in day plan'
      });
    }
    
    // Calculate the difference (new minutes added)
    const previousMinutes = subjectPlan.studiedMinutes || 0;
    const minutesAdded = studiedMinutes - previousMinutes;
    
    console.log(`📊 Backend update: previous=${previousMinutes}min, new=${studiedMinutes}min, added=${minutesAdded}min`);
    
    // Replace with the new total (frontend already calculates the sum)
    subjectPlan.studiedMinutes = studiedMinutes;
    await dayPlan.save();
    
    // Update subject stats with only the NEW minutes
    if (minutesAdded > 0) {
      const subject = await Subject.findById(subjectId);
      if (subject) {
        await subject.updateStats(minutesAdded);
      }
    }
    
    // Populate and return
    const updatedPlan = await DayPlan.findById(dayPlan._id).populate('subjects.subjectId');
    
    res.json({
      success: true,
      message: 'Studied time updated',
      data: updatedPlan
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating studied time',
      error: error.message
    });
  }
});

// POST add session to subject
router.post('/:date/subject/:subjectId/session', async (req, res) => {
  try {
    const { date, subjectId } = req.params;
    const { startTime, endTime, duration, completed, note } = req.body;
    
    const dayPlan = await DayPlan.findOne({ 
      date,
      user: req.user._id 
    });
    
    if (!dayPlan) {
      return res.status(404).json({
        success: false,
        message: 'Day plan not found'
      });
    }
    
    const sessionData = {
      startTime,
      endTime,
      duration,
      completed: completed || false,
      note,
      completedAt: completed ? Date.now() : undefined
    };
    
    await dayPlan.addSession(subjectId, sessionData);
    
    // Update user stats if completed
    if (completed) {
      const user = await User.findById(req.user._id);
      await user.updateStudyStats(duration);
    }
    
    const updatedPlan = await DayPlan.findById(dayPlan._id).populate('subjects.subjectId');
    
    res.json({
      success: true,
      message: 'Session added successfully',
      data: updatedPlan
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error adding session',
      error: error.message
    });
  }
});

// PATCH update day plan mood and productivity
router.patch('/:date/reflection', async (req, res) => {
  try {
    const { date } = req.params;
    const { mood, productivity, notes, achievements } = req.body;
    
    const dayPlan = await DayPlan.findOneAndUpdate(
      { date, user: req.user._id },
      { mood, productivity, notes, achievements },
      { new: true }
    ).populate('subjects.subjectId');
    
    if (!dayPlan) {
      return res.status(404).json({
        success: false,
        message: 'Day plan not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Reflection saved successfully',
      data: dayPlan
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error saving reflection',
      error: error.message
    });
  }
});

module.exports = router;
