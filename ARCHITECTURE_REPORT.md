# EduFocus — Architecture Report

> Audit date: 2026-07-11 · Prepared before the Flutter + Node.js evolution.
> Scope: `backend/`, `frontend/`, environments, auth flow, AI integration, upload system.

---

## 1. Current Architecture

```
EduFocus/
├── backend/                  Node.js · Express 5 · Mongoose 9 · MongoDB Atlas
│   ├── server.js             App bootstrap, CORS, route mounting, error handler
│   ├── config/passport.js    Google OAuth 2.0 strategy (session used only for handshake)
│   ├── middleware/auth.js    JWT `protect` middleware + token signer
│   ├── models/               8 schemas: User, Subject, Todo, DayPlan, StudySession,
│   │                         Note, StudyPack (embeds notes/flashcards/QCM/cheatsheets/
│   │                         exercises + SM-2 SRS fields), QuizAttempt
│   ├── routes/               9 modules ≈ 70 REST endpoints under /api/*
│   └── services/             email.service.js (nodemailer, gmail/smtp)
└── frontend/                 Angular 18 · standalone components · signals
    ├── services/             One service per resource + offline/ (IndexedDB,
    │                         connectivity, sync-engine) + SRS engine + theme + i18n
    ├── interceptors/         Functional `authInterceptor` (Bearer token)
    ├── guards/               Route auth guard
    └── environments/         dev → http://localhost:5002 · prod → Render URL
```

**API surface** (all JSON, JWT Bearer):

| Domain | Base | Highlights |
|---|---|---|
| Auth | `/api/auth` | register, login, me, forgot/reset-password, timer-settings, session-goal, award-points, Google OAuth (`/google`, `/google/callback`) |
| Subjects | `/api/subjects` | CRUD + archive + reorder + stats patch |
| Day plans | `/api/day-plans` | per-date plan, range query, per-subject goal patch, session append, reflection |
| Todos | `/api/todos` | CRUD + toggle + subtask toggle + reorder, date-scoped |
| Sessions | `/api/sessions` | CRUD + start/end lifecycle + active/current |
| Stats | `/api/stats` | profile, dashboard, weekly, monthly, per-subject analytics |
| Study packs | `/api/study-packs` | CRUD + import/clone/public share + SRS stats + quiz attempts |
| AI | `/api/ai/study-advice` | Gemini 1.5 Flash with deterministic local fallback |
| Notes | `/api/notes` | CRUD + pin/archive/color + password verify |

**Auth flow**: email/password → bcrypt compare → JWT (`{id}`, `JWT_EXPIRE` env). Google OAuth issues the *same* JWT then redirects to the Angular callback with `?token=`. Clients send `Authorization: Bearer <token>`; no refresh tokens, no server-side session after login.

**Mobile-readiness**: CORS already allows requests with no `Origin` header (native apps), and the API is a clean JSON/JWT surface — the backend can serve a Flutter client **without any breaking change**.

## 2. Existing Strengths

- Clean JSON REST surface, resource-oriented, already consumed by one SPA client.
- JWT is client-agnostic; Google OAuth carefully avoids persistent server sessions.
- Mongoose schemas are rich and validated (enums, min/max, regex, compound indexes, pre-save hooks that keep `DayPlan` totals consistent).
- AI endpoint has a graceful offline/quota fallback — never 500s the client.
- Angular app has a real offline layer (IndexedDB + sync engine) proving the domain can work offline — a great blueprint for Flutter's offline-ready architecture.
- Passwords: bcrypt(10), `select: false`, hashed reset tokens with 15-min expiry, anti-enumeration generic responses on forgot-password.

## 3. Technical Debt

1. **Fat routes, no service layer**: every route module inlines business logic (studyPacks.js = 549 lines). Nothing is unit-testable in isolation.
2. **Duplicated inline JWT decoding**: `routes/auth.js` re-implements token extraction/verification ~8 times instead of using the existing `protect` middleware (which every other router uses via `router.use(protect)`).
3. **Inconsistent response envelopes**: `{success, subjects}` vs `{success, data}` vs `{success, token, user}` — clients must special-case each resource.
4. **Dead dependencies**: `multer` and `cloudinary` are declared but never imported — there is **no upload system**; avatars are plain URL strings. Either implement or remove.
5. **Scratch files** committed in `backend/` (`scratch_check_tags.js`, `scratch_run_api_tests.js`, `scratch_test_import.js`).
6. `server.js` has a stray duplicated `console.log` after `module.exports`.
7. Duplicate index warnings: `UserSchema.index({email:1})` duplicates `unique: true` on the field (mongoose 9 warns).
8. No automated tests, no linting config on the backend.

## 4. Security Concerns

- **No rate limiting** on `/api/auth/login`, `/register`, `/forgot-password` → brute-force exposure. (`express-rate-limit` is the minimal fix.)
- **No helmet / security headers.**
- Single long-lived JWT, no revocation/refresh strategy — acceptable for now; Flutter client should treat 401 as hard logout, and a refresh-token endpoint is a recommended backend evolution (additive, non-breaking).
- Note "password protection" (`/api/notes/:id/verify-password`) is app-level and the note content is still returned by `GET /api/notes` — protection is cosmetic client-side gating.
- `award-points` trusts any positive integer from the client — gameable.
- Error handler returns `err.message` outside production — fine, but ensure `NODE_ENV=production` is actually set on Render.

## 5. Performance Bottlenecks

- `stats/dashboard` runs 6 sequential awaited queries → should be `Promise.all` (and later an aggregation).
- `StudyPack` embeds *all* content (notes, flashcards, QCM…) in one document: every list fetch ships full decks. Fine at current scale; needs projection (`select`) for the pack-list endpoint before mobile ships large decks over cellular.
- SRS stats (`/study-packs/srs-stats`) iterates all packs/cards in JS rather than aggregating in MongoDB.
- No pagination anywhere (todos, sessions, notes) — unbounded result sets.

## 6. Duplicate Logic & Missing Abstractions

- Token extraction duplicated (see §3.2) — missing: consistent use of `protect`.
- Ad-hoc `{success:false, message}` error responses everywhere — missing: central `ApiError` + async wrapper.
- Date-string (`YYYY-MM-DD`) handling recomputed per route — missing: date utility.
- SRS/SM-2 logic lives **client-side** (Angular `srs-engine.service.ts`) while SRS *fields* live server-side — a second client (Flutter) would have to re-implement the algorithm. **Recommendation**: move SM-2 scheduling to a backend service endpoint (additive `POST /api/study-packs/:id/review`) so both clients share one implementation.
- No OpenAPI/contract documentation — the Flutter DTO layer in `mobile/` now serves as executable documentation.

## 7. Opportunities

- Backend: introduce `controllers/` + `services/` incrementally (start with new endpoints only), add `express-rate-limit` + `helmet`, standardize envelope `{success, data, message}` for *new* endpoints while keeping old ones untouched.
- Flutter can reuse the JWT + Google OAuth flow via a system browser + deep-link callback (backend already redirects with `?token=`; add a mobile scheme redirect later — additive).
- The Angular offline sync design maps 1:1 to Flutter (drift/sembast + connectivity_plus + queue).

## 8. Migration Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Response-envelope inconsistency breaks DTO parsing | High | DTOs written per-endpoint from actual route code (done in `mobile/`), not from assumptions |
| Re-implementing SRS in Dart drifts from Angular version | High | Phase 2: move SM-2 to backend; until then Flutter reads SRS state read-only |
| Android emulator can't reach `localhost:5002` | Medium | `--dart-define=API_BASE_URL` override; use `10.0.2.2` on emulator |
| Google OAuth needs deep links on mobile | Medium | Ship email/password first; OAuth via `app_links` + custom scheme in a later phase |
| JWT expiry mid-session on mobile | Medium | Dio interceptor: 401 → purge token → route to login |
| Backend regression while both clients live | High | Golden rule: only *additive* backend changes; Angular stays the reference client |

## 9. Chosen Evolution Strategy

1. **`mobile/` Flutter app added as a sibling** of `backend/` and `frontend/` — zero changes to existing code.
2. Feature-first architecture, Riverpod, repository pattern, DTO separation, Material 3, dark-first EduFocus design language (violet `#8b5cf6` family, Inter typography, glass surfaces).
3. Phase order: **Foundation → Auth → Dashboard read models → Subjects/Todos CRUD → Timer/Sessions → Study Hub/SRS → Offline sync → OAuth deep links**.
4. Every phase ends with `flutter analyze` + format + compile gates and an API-compatibility check against the real backend routes.
