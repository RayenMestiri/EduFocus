import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Current theme signal
  currentTheme = signal<Theme>('dark');

  constructor() {
    // Load theme from localStorage or default to dark
    const savedTheme = localStorage.getItem('edufocus-theme') as Theme;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      this.currentTheme.set(savedTheme);
    }

    // Apply theme immediately
    this.applyTheme(this.currentTheme());

    // Watch for theme changes and persist
    effect(() => {
      const theme = this.currentTheme();
      this.applyTheme(theme);
      localStorage.setItem('edufocus-theme', theme);
    });
  }

  /**
   * Toggle between dark and light themes
   */
  toggleTheme(): void {
    this.currentTheme.update(current => current === 'dark' ? 'light' : 'dark');
  }

  /**
   * Set a specific theme
   */
  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
  }

  /**
   * Check if current theme is dark
   */
  isDark(): boolean {
    return this.currentTheme() === 'dark';
  }

  /**
   * Check if current theme is light
   */
  isLight(): boolean {
    return this.currentTheme() === 'light';
  }

  /**
   * Apply theme to document
   */
  private applyTheme(theme: Theme): void {
    const html = document.documentElement;
    
    if (theme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }
  }
}
