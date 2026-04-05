# EduFocus Theme System

## Overview

EduFocus uses a dual-theme architecture with a consistent premium visual language:

- Dark mode: deep near-black surfaces with yellow/gold accents
- Light mode: white/slate surfaces with indigo/violet accents

Theme consistency has been applied across Home, Login, Register, Dashboard task UI, and alert styling.

## Color direction

### Dark mode
- Base surfaces: #050505, #0b0b0b, #131313
- Accent family: #fde047, #facc15, #eab308
- Text hierarchy: white + layered alpha variants

### Light mode
- Base surfaces: #eef2ff, #ffffff, #f5f3ff
- Accent family: #6366f1, #4f46e5, #8b5cf6
- Text hierarchy: slate shades with strong contrast

## Theme implementation model

- Component token variables are declared in `:host`
- Light-mode overrides are applied with `:host-context(.light)`
- Existing Tailwind class-based dark/light patterns remain supported
- SweetAlert styling is also theme-aware in dashboard task flows

## Components currently aligned

### Home
- Tokenized palette + dual-mode visuals
- Hero overlays, cards, CTA, footer aligned with auth theme family
- Three.js particle palette updated to the same accent system

### Login
- Premium card layout with ambient effects
- Full light-mode support
- Autofill readability fixed (`-webkit-autofill` / `-moz-autofill`)

### Register
- Same design system as Login
- Light-mode support and matching tokens
- Enhanced validation UX (password strength and checklist)

### Dashboard
- Task UI refined for white mode
- Alert dialogs color-tuned for both themes
- AI panel and timer-related elements follow global contrast rules

### Day Planner and Notes
- Retain dual-theme compatibility with updated component styles and token usage patterns

## Theme service usage

Theme state is controlled by `frontend/src/app/services/theme.service.ts`.

Key methods:
- `toggleTheme()`
- `setTheme(theme)`
- `isDark()`
- `isLight()`
- `currentTheme()`

## Practical conventions

- Prefer semantic local tokens (`--surface-*`, `--text-*`, `--border`, `--ghost-*`) over one-off hardcoded colors.
- Keep accent mapping consistent:
	- Dark -> yellow/gold
	- Light -> indigo/violet
- Avoid introducing isolated color islands that break page-to-page continuity.

## Material icons

Material Icons remain the default icon set across modules with consistent sizing and themed color application.
