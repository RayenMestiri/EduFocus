# EduFocus Frontend (Angular 18)

Modern student productivity frontend built with Angular standalone components, Signals, Tailwind utilities, GSAP animations, Three.js effects, FullCalendar, and SweetAlert2.

## Main features

### Home landing page
- Full hero experience with Three.js animated particles and GSAP motion reveals.
- Multi-section marketing page (features, workflow steps, testimonials, CTA).
- Theme-aligned visual system matching login/register design language.

### Authentication experience
- Premium login and register layouts with dual-theme support.
- Improved validation and UX messaging.
- Register flow with password strength checks and terms acceptance.
- Login autofill readability fixes for saved credentials.
- Forgot-password modal flow (UI-driven).

### Dashboard
- Subject management and daily tracking.
- Task (todo) workflow with premium UI updates, including white-mode polish.
- Theme-aware task alerts using centralized SweetAlert configuration.
- Pomodoro timer with focus/break cycles, celebration flows, and session tracking.
- Timer settings persistence to local storage and backend user preferences.
- Optional YouTube relaxation audio during break sessions.

### AI Study Assistant
- Local strategic coaching engine based on daily/weekly context.
- Multi-factor reasoning: progress, trend, task pressure, and subject priority.
- Structured coaching output with diagnostic + causal analysis + plan + next action.

### Day Planner and Notes
- Calendar planning interface via FullCalendar.
- Rich notes module with categories, tags, pin/archive, color, and optional password protection.

## Routing

Defined in `src/app/app.routes.ts`:

- `/` -> Home
- `/login` -> Login
- `/register` -> Register
- `/dashboard` -> Protected Dashboard
- `/planner` -> Day Planner
- `/notes` -> Protected Notes

## Tech stack

- Angular 18.2 (standalone components)
- RxJS + Angular Signals
- Tailwind CSS
- GSAP + ScrollTrigger
- Three.js
- FullCalendar
- SweetAlert2

## Local development

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm start
```

Default URL:

```text
http://localhost:4200
```

Build:

```bash
npm run build
```

Tests:

```bash
npm test
```

## Notes

- Frontend API URL should point to the backend running at `http://localhost:5000`.
- If production build fails due CSS bundle budgets, adjust Angular budget values in `angular.json`.
