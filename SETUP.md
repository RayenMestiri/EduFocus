# EduFocus - Setup and Current Functionality

EduFocus is a full-stack study productivity platform with a modern Angular frontend and an Express/MongoDB backend.

## Stack

- Frontend: Angular 18 standalone components, Signals, Tailwind, SweetAlert2
- Motion/visuals: GSAP, ScrollTrigger, Three.js, FullCalendar
- Backend: Express + Mongoose
- Auth: JWT Bearer token

## What is currently implemented

### Core modules
- Authentication (login/register/me)
- Dashboard with subjects, todos, timer, sessions, statistics
- Day planner calendar workflow
- Notes module (tags, categories, pin/archive, color, password-protected notes)
- Home landing page with animated hero and themed sections

### Productivity and intelligence features
- Pomodoro focus/break system with configurable settings
- Timer settings sync (local + backend persistence)
- Daily session goal and streak/points related flows
- YouTube relaxation audio support during breaks
- AI assistant endpoint + frontend strategic coach reasoning panel

### UX and theme updates
- Premium login/register redesign with dual theme support
- Autofill readability fixes for login inputs
- Register password strength and terms validation flow
- White-mode task alert improvements
- Home page palette aligned with login/register theme language

## Project structure

```text
EduFocus/
	backend/
		models/
		routes/
			auth.js
			subjects.js
			dayPlans.js
			todos.js
			sessions.js
			stats.js
			ai.js
			notes.js
		middleware/
		server.js
	frontend/
		src/app/
			components/
				home/
				login/
				register/
				dashboard/
				day-planner/
				notes/
			services/
			guards/
			interceptors/
			app.routes.ts
```

## Run locally

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

or:

```bash
npm start
```

Backend default: http://localhost:5000

### 2) Frontend

```bash
cd frontend
npm install
npm start
```

Frontend default: http://localhost:4200

## Environment variables (backend)

Create `backend/.env` with:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/edufocus
JWT_SECRET=replace_with_secure_secret
JWT_EXPIRE=30d
PORT=5000
FRONTEND_URL=http://localhost:4200

# Optional AI provider key (for /api/ai/study-advice)
GEMINI_API_KEY=
```

## Frontend routes

```text
/           Home
/login      Login
/register   Register
/dashboard  Dashboard (protected)
/planner    Day Planner
/notes      Notes (protected)
```

## API surface (high level)

- /api/auth
- /api/subjects
- /api/day-plans
- /api/todos
- /api/sessions
- /api/stats
- /api/ai
- /api/notes

See backend/API_DOCUMENTATION.md for endpoint details.

## Notes for contributors

- Some production builds may fail on strict CSS bundle budgets before functional errors; adjust budgets in angular.json if needed.
- Keep theme changes consistent across Home, Login, Register, Dashboard task UI, and alerts.
