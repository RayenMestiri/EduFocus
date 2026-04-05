# Timer Persistence Implementation

## Scope

Timer preferences are persisted in two layers:

1. Local cache for instant UX (`localStorage`)
2. Backend user preferences for cross-session continuity (`/api/auth/timer-settings`)

This includes Pomodoro durations and related automation options, plus YouTube relaxation audio URL.

## Stored settings

Current persisted settings map to:

- `pomodoroLength`
- `shortBreak`
- `longBreak`
- `sessionsBeforeLongBreak`
- `autoStartBreaks`
- `autoStartFocus`
- `dailySessionsGoal`
- `relaxationAudioUrl`

## Frontend flow

Implemented in dashboard logic:

1. Initial load:
	- Read localStorage first for immediate values
	- Fetch backend timer settings and reconcile
2. Save settings:
	- Validate ranges client-side
	- Update localStorage immediately
	- Send PUT request to backend for persistence
3. Runtime use:
	- Timer start/reset pulls from current persisted settings
	- Break workflow uses `shortBreak` / `longBreak` / cycle values

## Backend flow

Auth routes support:

- `GET /api/auth/timer-settings`
- `PUT /api/auth/timer-settings`
- `GET /api/auth/session-goal`
- `PUT /api/auth/session-goal`

Validation is applied server-side for numeric bounds and boolean types.

## YouTube relaxation integration

`relaxationAudioUrl` is part of the same persisted settings object:

- Loaded with timer preferences
- Saved with timer preferences
- Used during relaxation breaks when valid

If unavailable or invalid, timer behavior continues without blocking focus/break flow.

## Reliability notes

- Local-first fallback keeps timer usable if API call fails.
- Backend sync guarantees settings survive device refresh and new sessions.
- Client and server both validate values to avoid invalid states.
