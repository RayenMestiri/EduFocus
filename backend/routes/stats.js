const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Subject = require('../models/Subject');
const StudySession = require('../models/StudySession');
const DayPlan = require('../models/DayPlan');
const Todo = require('../models/Todo');
const { protect } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// GET user profile with stats
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        preferences: user.preferences,
        stats: user.stats,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
});

// GET dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = startOfWeek.toISOString().split('T')[0];
    
    // Get user with stats
    const user = await User.findById(req.user._id);
    
    // Today's stats
    const todayPlan = await DayPlan.findOne({ 
      user: req.user._id, 
      date: today 
    });
    const todayTodos = await Todo.find({ 
      user: req.user._id, 
      date: today 
    });
    const todaySessions = await StudySession.find({ 
      user: req.user._id, 
      date: today,
      completed: true
    });
    
    // Week stats
    const weekSessions = await StudySession.find({
      user: req.user._id,
      date: { $gte: weekStart, $lte: today },
      completed: true
    });
    
    // Subject stats
    const subjects = await Subject.find({ 
      user: req.user._id,
      isArchived: false
    });
    
    const weekMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);
    const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);
    
    res.json({
      success: true,
      data: {
        user: {
          stats: user.stats,
          streak: user.stats.streak,
          longestStreak: user.stats.longestStreak,
          dailyGoal: user.preferences.studySettings.dailyGoal
        },
        today: {
          date: today,
          plannedMinutes: todayPlan ? todayPlan.totalGoalMinutes : 0,
          studiedMinutes: todayMinutes,
          totalTasks: todayTodos.length,
          completedTasks: todayTodos.filter(t => t.done).length,
          sessions: todaySessions.length,
          mood: todayPlan?.mood,
          productivity: todayPlan?.productivity
        },
        week: {
          totalMinutes: weekMinutes,
          totalSessions: weekSessions.length,
          averagePerDay: Math.round(weekMinutes / 7),
          mostStudiedDay: this.getMostStudiedDay(weekSessions)
        },
        subjects: subjects.map(s => ({
          id: s._id,
          name: s.name,
          color: s.color,
          icon: s.icon,
          totalMinutes: s.stats.totalStudyMinutes,
          totalSessions: s.stats.totalSessions,
          lastStudied: s.stats.lastStudied
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
});

// GET weekly stats
router.get('/weekly', async (req, res) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const weekStart = startOfWeek.toISOString().split('T')[0];
    const weekEnd = new Date(today);
    weekEnd.setDate(startOfWeek.getDate() + 6);
    const endDate = weekEnd.toISOString().split('T')[0];
    
    const sessions = await StudySession.find({
      user: req.user._id,
      date: { $gte: weekStart, $lte: endDate },
      completed: true
    }).populate('subjectId');
    
    const dayPlans = await DayPlan.find({
      user: req.user._id,
      date: { $gte: weekStart, $lte: endDate }
    });
    
    // Group by day
    const dailyStats = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySessions = sessions.filter(s => s.date === dateStr);
      const dayPlan = dayPlans.find(p => p.date === dateStr);
      
      dailyStats[dateStr] = {
        date: dateStr,
        dayName: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        studiedMinutes: daySessions.reduce((sum, s) => sum + s.duration, 0),
        sessions: daySessions.length,
        goalMinutes: dayPlan?.totalGoalMinutes || 0,
        mood: dayPlan?.mood,
        productivity: dayPlan?.productivity
      };
    }
    
    res.json({
      success: true,
      data: dailyStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching weekly stats',
      error: error.message
    });
  }
});

// GET monthly stats
router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const sessions = await StudySession.find({
      user: req.user._id,
      date: { $gte: startDate, $lte: endDate },
      completed: true
    }).populate('subjectId');
    
    const dayPlans = await DayPlan.find({
      user: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    });
    
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalGoalMinutes = dayPlans.reduce((sum, p) => sum + p.totalGoalMinutes, 0);
    
    // Group by subject
    const subjectStats = {};
    sessions.forEach(session => {
      const subjectId = session.subjectId._id.toString();
      if (!subjectStats[subjectId]) {
        subjectStats[subjectId] = {
          subject: session.subjectId,
          minutes: 0,
          sessions: 0
        };
      }
      subjectStats[subjectId].minutes += session.duration;
      subjectStats[subjectId].sessions += 1;
    });
    
    res.json({
      success: true,
      data: {
        period: `${year}-${month}`,
        totalMinutes,
        totalGoalMinutes,
        totalSessions: sessions.length,
        studyDays: dayPlans.filter(p => p.totalStudiedMinutes > 0).length,
        averagePerDay: Math.round(totalMinutes / new Date(year, month, 0).getDate()),
        subjects: Object.values(subjectStats),
        dailyData: this.groupByDay(sessions, dayPlans)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly stats',
      error: error.message
    });
  }
});

// GET subject analytics
router.get('/subjects/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
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
    
    const filter = {
      user: req.user._id,
      subjectId: id,
      completed: true
    };
    
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }
    
    const sessions = await StudySession.find(filter);
    const todos = await Todo.find({ 
      user: req.user._id, 
      subjectId: id 
    });
    
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const avgFocusLevel = sessions.reduce((sum, s) => sum + (s.focusLevel || 0), 0) / sessions.length;
    
    res.json({
      success: true,
      data: {
        subject: {
          id: subject._id,
          name: subject.name,
          color: subject.color,
          icon: subject.icon,
          category: subject.category,
          difficulty: subject.difficulty
        },
        stats: subject.stats,
        analytics: {
          totalMinutes,
          totalSessions: sessions.length,
          averageFocusLevel: avgFocusLevel || 0,
          averageSessionLength: totalMinutes / sessions.length || 0,
          totalTasks: todos.length,
          completedTasks: todos.filter(t => t.done).length,
          completionRate: todos.length > 0 ? (todos.filter(t => t.done).length / todos.length) * 100 : 0
        },
        recentSessions: sessions.slice(0, 10)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subject analytics',
      error: error.message
    });
  }
});

// Helper functions
function getMostStudiedDay(sessions) {
  const dayCount = {};
  sessions.forEach(s => {
    dayCount[s.date] = (dayCount[s.date] || 0) + s.duration;
  });
  
  let maxDay = null;
  let maxMinutes = 0;
  Object.entries(dayCount).forEach(([date, minutes]) => {
    if (minutes > maxMinutes) {
      maxMinutes = minutes;
      maxDay = date;
    }
  });
  
  return { date: maxDay, minutes: maxMinutes };
}

function groupByDay(sessions, dayPlans) {
  const grouped = {};
  
  sessions.forEach(session => {
    if (!grouped[session.date]) {
      grouped[session.date] = {
        studiedMinutes: 0,
        sessions: 0
      };
    }
    grouped[session.date].studiedMinutes += session.duration;
    grouped[session.date].sessions += 1;
  });
  
  dayPlans.forEach(plan => {
    if (!grouped[plan.date]) {
      grouped[plan.date] = {
        studiedMinutes: 0,
        sessions: 0
      };
    }
    grouped[plan.date].goalMinutes = plan.totalGoalMinutes;
  });
  
  return grouped;
}

module.exports = router;
