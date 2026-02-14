# 🎨 EduFocus Theme System

## Overview
EduFocus now features a professional dual-theme system with Material Icons throughout the application.

## Theme Colors

### Dark Mode (Default)
- **Primary**: Gold (#ffd700, #ffb300, #ff8f00)
- **Background**: Black/Gray-900
- **Text**: White
- **Accents**: Yellow gradients

### Light Mode  
- **Primary**: Premium Blue (#3b82f6, #2563eb, #1d4ed8)
- **Background**: White/Blue-50/Gray-50
- **Text**: Gray-900
- **Accents**: Blue gradients

## Icons
All icons have been replaced with **Google Material Icons** for a professional look:
- Menu Book, School, Event, Timer, etc.
- Consistent sizing: text-xl, text-2xl, text-3xl
- Theme-aware colors

## Theme Toggle
Users can switch themes via the button in the header (moon/sun icon)
- State persists in localStorage
- Smooth transitions (300ms)
- All components respond dynamically

## CSS Classes Pattern

### Dual Theme Classes
```html
<!-- Background -->
dark:bg-black light:bg-white
dark:bg-gray-900 light:bg-gray-50

<!-- Text -->
dark:text-white light:text-gray-900
dark:text-yellow-400 light:text-blue-600

<!-- Borders -->
dark:border-yellow-500/20 light:border-blue-500/20

<!-- Gradients -->
dark:from-yellow-400 dark:to-yellow-600 light:from-blue-500 light:to-blue-700
```

## Components Updated

### ✅ Dashboard
- Theme toggle button in header
- All cards with dual-theme styling
- Material Icons throughout
- Stats, timer, todos all theme-aware

### ✅ Day Planner
- Theme toggle button
- Calendar with theme-aware styling
- Stats cards with dual themes
- Material Icons

### ✅ Login/Register
- Material Icons (school, email, lock, person)
- Dark theme only (auth pages)

## ThemeService

Location: `frontend/src/app/services/theme.service.ts`

### Methods:
- `toggleTheme()`: Switch between dark/light
- `setTheme(theme)`: Set specific theme
- `isDark()`: Check if dark mode
- `isLight()`: Check if light mode
- `currentTheme()`: Signal with current theme

### Usage:
```typescript
constructor(public themeService: ThemeService) {}

// In template:
themeService.isDark()
themeService.toggleTheme()
```

## FullCalendar Integration
FullCalendar buttons change color based on theme:
- Dark: Gold buttons
- Light: Blue buttons

## Material Icons Usage

### In HTML:
```html
<span class="material-icons">icon_name</span>
<span class="material-icons text-2xl">icon_name</span>
```

### Common Icons Used:
- `school`: Education/logo
- `calendar_today`: Calendar
- `timer`: Pomodoro timer
- `menu_book`: Books/subjects
- `event`: Events
- `light_mode` / `dark_mode`: Theme toggle
- `add`: Add button
- `edit`: Edit button
- `delete`: Delete button
- `check_circle`: Completed/success
- `local_fire_department`: Streak/fire

## Tailwind Configuration
Premium color palettes added in `tailwind.config.js`:
- Gold scales (50-900)
- Premium Blue scales (50-900)
- Sky scales for light mode accents

## Global Styles
Theme-aware animations and scrollbars in `styles.css`:
- Dark: Gold scrollbar with black track
- Light: Blue scrollbar with light track
- Shimmer, glow, float animations

## Browser Support
- Modern browsers with CSS custom properties
- localStorage for theme persistence
- Smooth transitions on all theme changes

## Future Enhancements
- Auto theme based on system preference
- Additional accent color options
- Per-user theme preferences in backend
- Theme preview before switching
