# EduFocus - Premium Study Planner 🎓

## Project Overview
A professional study planner built with **Angular 18.2.0**, **MongoDB**, **Express.js**, and **Tailwind CSS**, featuring a premium gold/black theme and complete authentication system.

## Tech Stack
- **Frontend**: Angular 18.2.0 (Standalone Components, Signals)
- **Backend**: Node.js, Express.js, MongoDB Atlas
- **Styling**: Tailwind CSS v3 (Premium Gold/Black Theme)
- **Authentication**: JWT with HttpOnly tokens
- **UI**: SweetAlert2, Custom animations

## Features Implemented ✅

### 1. Authentication System
- **JWT-based authentication** with secure token storage
- **Login & Register** components with validation
- **Auth Guard** for route protection
- **HTTP Interceptor** for automatic token injection
- **AuthService** with Signals for reactive state

### 2. Services (Complete CRUD)
- **SubjectService**: Manage study subjects
- **DayPlanService**: Daily study planning
- **TodoService**: Task management
- All services protected with JWT authentication

### 3. Backend API (All Protected)
- **User Authentication** (register, login, getMe)
- **Subjects CRUD** with user ownership
- **Day Plans CRUD** with date-based queries
- **Todos CRUD** with priority levels
- MongoDB models with user references

### 4. Security Features
- Password hashing with bcryptjs
- JWT token validation middleware
- User-specific data isolation
- Protected routes on backend and frontend

## MongoDB Database
```
Database: edufocus
Connection: mongodb+srv://rayenmestiri08:pvcqCj4rviav7e1U@cluster0.9gjaw.mongodb.net/edufocus
```

### Collections:
- **users**: User accounts with authentication
- **subjects**: Study subjects (name, color, icon)
- **dayplans**: Daily study schedules with goal/studied minutes
- **todos**: Task list with priorities

## Installation & Setup

### Backend
```bash
cd backend
npm install
npm start
```
Server runs on: `http://localhost:5000`

### Frontend
```bash
cd frontend
npm install
npm start
```
App runs on: `http://localhost:4201`

## Environment Variables (.env)
```
MONGO_URI=mongodb+srv://rayenmestiri08:pvcqCj4rviav7e1U@cluster0.9gjaw.mongodb.net/edufocus
JWT_SECRET=edufocus_premium_secret_key_2026_secure_token
JWT_EXPIRE=30d
PORT=5000

# Cloudinary (For avatar upload - future feature)
CLOUDINARY_CLOUD_NAME=dmdhy6rj8
CLOUDINARY_API_KEY=398584552674536
CLOUDINARY_API_SECRET=nEeIiIcbaQQbjZe8wg8_QAo5KrQ
```

## Project Structure

### Frontend Structure
```
frontend/src/app/
├── components/
│   ├── login/           # Login page with SweetAlert2
│   ├── register/        # Registration page
│   └── dashboard/       # Main dashboard (to be completed)
├── services/
│   ├── auth.service.ts  # Authentication with Signals
│   ├── subject.service.ts
│   ├── day-plan.service.ts
│   └── todo.service.ts
├── guards/
│   └── auth.guard.ts    # Route protection
├── interceptors/
│   └── auth.interceptor.ts  # JWT token injection
└── app.routes.ts        # Routing configuration
```

### Backend Structure
```
backend/
├── models/
│   ├── User.js          # User schema with bcrypt
│   ├── Subject.js       # Subject schema
│   ├── DayPlan.js       # Daily plan schema
│   └── Todo.js          # Todo schema
├── routes/
│   ├── auth.js          # Auth endpoints
│   ├── subjects.js      # Subject CRUD (protected)
│   ├── dayPlans.js      # Day plan CRUD (protected)
│   └── todos.js         # Todo CRUD (protected)
├── middleware/
│   └── auth.js          # JWT verification
└── server.js            # Express server
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Subjects (All Protected)
- `GET /api/subjects` - Get all user subjects
- `POST /api/subjects` - Create subject
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject

### Day Plans (All Protected)
- `GET /api/day-plans/:date` - Get day plan by date
- `POST /api/day-plans` - Create/update day plan
- `PATCH /api/day-plans/:date/subject/:subjectId` - Update studied time

### Todos (All Protected)
- `GET /api/todos/:date` - Get todos by date
- `POST /api/todos` - Create todo
- `PATCH /api/todos/:id/toggle` - Toggle todo status
- `DELETE /api/todos/:id` - Delete todo

## Routes Configuration

### Angular Routes
```typescript
{ path: '', redirectTo: '/login', pathMatch: 'full' }
{ path: 'login', component: LoginComponent }
{ path: 'register', component: RegisterComponent }
{ path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] }
{ path: '**', redirectTo: '/login' }
```

## Color Theme (Premium Gold/Black)
```css
Primary Gold: #ffd700
Gold 500: #ffb300
Gold 600: #ff8f00
Black: #000000
Gray 900: #1a1a1a
Gray 800: #2d2d2d
```

## Next Steps (To Do)

### Dashboard Component
- [ ] Implement subject management UI
- [ ] Create day planning interface
- [ ] Add study timer with Pomodoro technique
- [ ] Build todo list interface
- [ ] Add statistics and progress tracking

### Advanced Features
- [ ] Cloudinary integration for avatar upload
- [ ] Add Lottie animations
- [ ] Implement calendar view
- [ ] Add study streak tracking
- [ ] Export study reports

### Enhancements
- [ ] Add dark/light mode toggle
- [ ] Implement notifications
- [ ] Add sound effects for timer
- [ ] Create mobile responsive design
- [ ] Add PWA support

## Testing Credentials
Register a new account or use the registration form to create your premium study account!

## Development Team
Built with ❤️ using modern web technologies

---
**EduFocus © 2024 - Premium Study Experience**
