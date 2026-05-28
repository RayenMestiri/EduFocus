import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      (click)="toggleLanguage()"
      class="flex items-center justify-center w-10 h-10 rounded-xl dark:bg-yellow-500/20 dark:hover:bg-yellow-500/30 dark:border-yellow-500/30 light:bg-indigo-50 light:hover:bg-indigo-100 light:border-indigo-200 border dark:text-yellow-400 light:text-indigo-600 transition-all duration-300 hover:scale-105 text-sm font-extrabold uppercase focus:outline-none"
      [title]="currentLanguage() === 'en' ? 'Switch to French' : 'Passer en Anglais'"
    >
      <span>{{ currentLanguage() }}</span>
    </button>
  `
})
export class LanguageSwitcherComponent {
  private languageService = inject(LanguageService);
  currentLanguage = this.languageService.currentLanguage;

  toggleLanguage() {
    this.languageService.toggleLanguage();
  }
}
