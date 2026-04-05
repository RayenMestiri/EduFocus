# EduFocus API Documentation v2.0

## Base URL
```
http://localhost:5000/api
```

## Authentication
All routes (except auth/register and auth/login) require Bearer token in Authorization header:
```
Authorization: Bearer <your_token>
```

---

## 🔐 Auth and Preferences API

### POST /auth/register
Register account.

### POST /auth/login
Login and return token + user.

### GET /auth/me
Get current authenticated user profile.

### POST /auth/award-points
Award points to current user.
```json
{
  "points": 25
}
```

### GET /auth/timer-settings
Get persisted timer settings from user preferences.

### PUT /auth/timer-settings
Update timer settings.
```json
{
  "pomodoroLength": 25,
  "shortBreak": 5,
  "longBreak": 15,
  "sessionsBeforeLongBreak": 4,
  "autoStartBreaks": false,
  "autoStartFocus": false,
  "dailySessionsGoal": 6,
  "relaxationAudioUrl": "https://www.youtube.com/watch?v=..."
}
```

### GET /auth/session-goal
Get daily session goal.

### PUT /auth/session-goal
Update daily session goal.
```json
{
  "dailySessionsGoal": 6
}
```

---

## 📚 Subjects API

### GET /subjects
Get all subjects (excluding archived by default)
- Query: `?includeArchived=true` to include archived subjects
- Response: Array of subject objects

### GET /subjects/:id
Get single subject with full details

### POST /subjects
Create new subject
```json
{
  "name": "Mathematics",
  "description": "Advanced calculus and algebra",
  "color": "#ffd700",
  "icon": "📐",
  "category": "math",
  "difficulty": "hard",
  "goals": {
    "weeklyMinutes": 300,
    "dailyMinutes": 60
  },
  "resources": [
    {
      "title": "Khan Academy Calculus",
      "url": "https://...",
      "type": "video"
    }
  ]
}
```

### PUT /subjects/:id
Update subject (all fields optional)

### PATCH /subjects/:id/stats
Update subject statistics
```json
{
  "minutes": 30
}
```

### PATCH /subjects/:id/archive
Archive or unarchive subject
```json
{
  "isArchived": true
}
```

### PATCH /subjects/reorder
Reorder subjects
```json
{
  "subjects": [
    { "id": "...", "order": 1 },
    { "id": "...", "order": 2 }
  ]
}
```

### DELETE /subjects/:id
Delete subject permanently

---

## 📅 Day Plans API

### GET /day-plans/:date
Get day plan for specific date (YYYY-MM-DD)
- Auto-creates empty plan if doesn't exist

### GET /day-plans/range/:startDate/:endDate
Get all day plans in date range

### POST /day-plans
Create or update day plan
```json
{
  "date": "2026-01-22",
  "subjects": [
    {
      "subjectId": "...",
      "goalMinutes": 90,
      "studiedMinutes": 0,
      "priority": "high",
      "sessions": []
    }
  ],
  "notes": "Focus on calculus today",
  "mood": "good",
  "productivity": 4
}
```

### PATCH /day-plans/:date/subject/:subjectId
Update studied minutes for specific subject

### POST /day-plans/:date/subject/:subjectId/session
Add study session to subject
```json
{
  "startTime": "09:00",
  "endTime": "10:30",
  "duration": 90,
  "completed": true,
  "note": "Completed chapter 5"
}
```

### PATCH /day-plans/:date/reflection
Save daily reflection
```json
{
  "mood": "excellent",
  "productivity": 5,
  "notes": "Very productive day!",
  "achievements": ["Finished calculus chapter", "30min extra study"]
}
```

---

## ✅ Todos API

### GET /todos/:date
Get all todos for specific date

### GET /todos
Get todos with filters
- Query params: `?date=2026-01-22&priority=high&category=homework&done=false&subjectId=...`

### POST /todos
Create new todo
```json
{
  "title": "Complete math homework",
  "description": "Chapter 5 exercises",
  "date": "2026-01-22",
  "dueTime": "18:00",
  "priority": "high",
  "subjectId": "...",
  "category": "homework",
  "tags": ["urgent", "exam-prep"],
  "estimatedMinutes": 45,
  "subtasks": [
    { "title": "Read theory", "done": false, "order": 1 },
    { "title": "Solve exercises", "done": false, "order": 2 }
  ],
  "notes": "Focus on problem 15",
  "isRecurring": false
}
```

### PUT /todos/:id
Update todo (all fields)

### PATCH /todos/:id/toggle
Toggle todo done status

### PATCH /todos/:id/subtask/:subtaskId/toggle
Toggle subtask done status

### PATCH /todos/reorder
Reorder todos
```json
{
  "todos": [
    { "id": "...", "order": 1 },
    { "id": "...", "order": 2 }
  ]
}
```

### DELETE /todos/:id
Delete todo

---

## 🎯 Study Sessions API

### GET /sessions
Get sessions with filters
- Query: `?date=2026-01-22&subjectId=...&type=pomodoro&completed=true`
- Or date range: `?startDate=2026-01-15&endDate=2026-01-22`

### GET /sessions/:id
Get single session details

### POST /sessions
Create completed session
```json
{
  "subjectId": "...",
  "date": "2026-01-22",
  "startTime": "2026-01-22T09:00:00Z",
  "endTime": "2026-01-22T09:25:00Z",
  "type": "pomodoro",
  "focusLevel": 4,
  "notes": "Good concentration",
  "tags": ["morning", "productive"],
  "todoRefs": ["..."],
  "interruptions": 1
}
```

### POST /sessions/start
Start new study session
```json
{
  "subjectId": "...",
  "type": "regular",
  "tags": ["morning"]
}
```

### PATCH /sessions/end/:id
End active session
```json
{
  "focusLevel": 5,
  "notes": "Excellent session",
  "interruptions": 0
}
```

### GET /sessions/active/current
Get currently active session (if any)

### PUT /sessions/:id
Update session

### DELETE /sessions/:id
Delete session

---

## 📝 Notes API

All notes endpoints are protected.

### GET /notes
Get notes with optional filters.
- Query examples: `?category=summary`, `?subject=<id>`, `?isPinned=true`, `?search=keyword`, `?tag=revision`

### GET /notes/tags
Get all distinct tags for current user.

### POST /notes
Create note.
```json
{
  "title": "Electromagnetism summary",
  "content": "<p>Rich text content</p>",
  "contentText": "plain text index",
  "color": "#6366f1",
  "subject": "<subjectId>",
  "tags": ["physics", "exam"],
  "category": "summary",
  "isPinned": false,
  "hasPassword": true,
  "password": "secret123"
}
```

### PUT /notes/:id
Update note.

### DELETE /notes/:id
Delete note.

### PATCH /notes/:id/pin
Toggle pin state.

### PATCH /notes/:id/archive
Toggle archive state.

### PATCH /notes/:id/color
Update note color.

### POST /notes/:id/verify-password
Verify note password for locked notes.

---

## 🤖 AI API

### GET /ai
Health/info endpoint for AI assistant route.

### POST /ai/study-advice
Generate study advice from dashboard context and optional user question.
```json
{
  "context": {
    "todayGoalMinutes": 180,
    "todayStudiedMinutes": 95,
    "completedTodos": 2,
    "totalTodos": 5,
    "subjectBreakdown": []
  },
  "question": "Donne-moi une stratégie pour finir ma journée",
  "history": []
}
```

Response contains:
- `source`: `gemini` or `fallback`
- `advice`: generated coaching text

---

## 📊 Stats & Analytics API

### GET /stats/profile
Get user profile with stats
- Returns: user info, preferences, study stats, streak

### GET /stats/dashboard
Get comprehensive dashboard data
- Returns: today stats, week stats, subject stats, streak info

### GET /stats/weekly
Get current week statistics
- Returns: Daily breakdown with studied minutes, sessions, goals, mood, productivity

### GET /stats/monthly/:year/:month
Get monthly statistics
- Example: `/stats/monthly/2026/1`
- Returns: Total stats, daily data, subject breakdown

### GET /stats/subjects/:id/analytics
Get detailed analytics for specific subject
- Query: `?startDate=2026-01-01&endDate=2026-01-31`
- Returns: Subject stats, analytics, recent sessions, task completion rate

---

## 📋 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical error details"
}
```

---

## 🔐 Auth Endpoints

See **Auth and Preferences API** above for the complete auth surface, including:

- register/login/me
- points endpoint
- timer settings persistence
- daily session goal endpoints

---

## 🎨 Enums & Constants

### Priority Levels
- `low`, `medium`, `high`, `urgent`

### Categories
- `homework`, `exam`, `project`, `reading`, `practice`, `review`, `other`

### Session Types
- `pomodoro`, `regular`, `break`, `review`

### Subject Categories
- `science`, `math`, `language`, `art`, `technology`, `social`, `other`

### Difficulty
- `easy`, `medium`, `hard`

### Mood
- `excellent`, `good`, `neutral`, `bad`, `terrible`

### Productivity (1-5)
Rating from 1 (lowest) to 5 (highest)

---

## 🚀 New Features in v2.0

✅ **Flexible Schemas** - All models support rich metadata
✅ **Study Sessions** - Complete session tracking with focus levels
✅ **Analytics Dashboard** - Comprehensive stats and insights
✅ **Subtasks** - Break todos into smaller tasks
✅ **Resources** - Attach learning materials to subjects
✅ **Mood & Productivity** - Daily reflection tracking
✅ **Streak System** - Gamification with study streaks
✅ **Achievements** - Track milestones and accomplishments
✅ **Recurring Tasks** - Daily, weekly, monthly patterns
✅ **Tags System** - Organize todos and sessions with tags
✅ **Archive** - Archive subjects without deleting
✅ **Reordering** - Custom order for subjects and todos
✅ **User Preferences** - Pomodoro settings, notifications, theme
✅ **Focus Tracking** - Rate concentration during sessions
✅ **Goals** - Daily and weekly goals per subject
✅ **Notes Module API** - Rich notes with tags, archive/pin, password verification
✅ **AI Study Advice API** - Gemini-backed advice with deterministic fallback
✅ **Timer Preferences Sync** - Pomodoro/session goal + relaxation audio URL persistence

---

## 📱 Frontend Integration Tips

1. **Real-time Updates**: Poll `/sessions/active/current` for timer
2. **Dashboard**: Use `/stats/dashboard` for main view
3. **Calendar**: Use `/day-plans/range/:start/:end` for week/month view
4. **Analytics**: Use `/stats/weekly` and `/stats/monthly` for charts
5. **Subject Details**: Use `/stats/subjects/:id/analytics` for deep dive
6. **Notes Workspace**: Use `/notes` with filters and `/notes/tags` for chips
7. **AI Advice**: Use `/ai/study-advice` with dashboard context for coaching

---

## 🛠️ Development

Backend now includes:
- Input validation on all routes
- Automatic stat updates on study sessions
- Cascade updates (session → subject stats → user stats)
- Smart defaults for optional fields
- Index optimization for fast queries
