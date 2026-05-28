import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  currentLanguage = signal<string>('en');

  constructor(private translate: TranslateService) {
    this.initLanguage();
  }

  private initLanguage() {
    this.translate.addLangs(['en', 'fr']);
    this.translate.setDefaultLang('en');

    const savedLang = localStorage.getItem('language');
    const browserLang = this.translate.getBrowserLang();
    
    let defaultLang = 'en';
    if (savedLang && savedLang.match(/en|fr/)) {
      defaultLang = savedLang;
    } else if (browserLang && browserLang.match(/en|fr/)) {
      defaultLang = browserLang;
    }

    this.setLanguage(defaultLang);
  }

  setLanguage(lang: string) {
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    localStorage.setItem('language', lang);
  }

  toggleLanguage() {
    const newLang = this.currentLanguage() === 'en' ? 'fr' : 'en';
    this.setLanguage(newLang);
  }
}
