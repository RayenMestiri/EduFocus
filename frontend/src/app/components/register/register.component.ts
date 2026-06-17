import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

interface Alert {
  type: 'error' | 'warning' | 'success' | 'info';
  icon: string;
  title: string;
  text?: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  acceptTerms = false;

  currentStep = 1;

  // Focus states
  nameFocused = false;
  emailFocused = false;
  pwFocused = false;
  cpwFocused = false;

  // Validation errors
  nameError = '';
  emailError = '';
  isValidEmail = false;
  termsError = false;

  // Global alert
  globalAlert: Alert | null = null;

  // ── Password computed ────────────────────────────────────────────────
  get passwordChecks() {
    const p = this.password;
    return {
      length:  p.length >= 8,
      upper:   /[A-Z]/.test(p),
      number:  /[0-9]/.test(p),
      special: /[^A-Za-z0-9]/.test(p),
    };
  }

  get passwordScore(): number {
    return Object.values(this.passwordChecks).filter(Boolean).length;
  }

  get strengthLabel(): string {
    return ['', 'Faible', 'Moyen', 'Bon', 'Fort'][this.passwordScore] || '';
  }

  get strengthColor(): string {
    return ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][this.passwordScore] || '';
  }

  get passwordsMatch(): boolean {
    return this.password.length > 0 && this.password === this.confirmPassword;
  }

  get passwordsMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    public themeService: ThemeService
  ) {}

  // ── Validators ───────────────────────────────────────────────────────
  validateName(onInput = false): void {
    if (!this.name.trim()) {
      if (!onInput) {
        this.nameError = 'Le nom est requis';
      }
    } else if (this.name.trim().length < 2) {
      if (!onInput) {
        this.nameError = 'Le nom doit contenir au moins 2 caractères';
      }
    } else {
      this.nameError = '';
    }
  }

  validateEmail(onInput = false): void {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.email) {
      this.emailError = '';
      this.isValidEmail = false;
    } else if (!re.test(this.email)) {
      this.isValidEmail = false;
      if (!onInput) {
        this.emailError = 'Adresse e-mail invalide';
      }
    } else {
      this.emailError = '';
      this.isValidEmail = true;
    }
  }

  showAlert(type: Alert['type'], title: string, text?: string): void {
    const icons: Record<Alert['type'], string> = {
      error: 'error_outline',
      warning: 'warning_amber',
      success: 'check_circle_outline',
      info: 'info_outline'
    };
    this.globalAlert = { type, icon: icons[type], title, text };
    if (type === 'success') {
      setTimeout(() => this.globalAlert = null, 5000);
    }
  }

  // ── Step Navigation ──────────────────────────────────────────────────
  nextStep(): void {
    if (this.currentStep === 1) {
      this.validateName();
      this.validateEmail();
      if (!this.name.trim()) {
        this.nameError = 'Le nom est requis';
      }
      if (!this.email) {
        this.emailError = 'L\'adresse e-mail est requise';
      }
      if (this.nameError || this.emailError || !this.isValidEmail) {
        this.showAlert('warning', 'Informations invalides', 'Veuillez corriger les erreurs avant de continuer.');
        return;
      }
      if (this.globalAlert?.type === 'warning') {
        this.globalAlert = null;
      }
      this.currentStep = 2;
    } else if (this.currentStep === 2) {
      if (!this.password) {
        this.showAlert('warning', 'Mot de passe requis', 'Veuillez entrer un mot de passe.');
        return;
      }
      if (this.passwordScore < 2) {
        this.showAlert('error', 'Mot de passe trop faible', 'Utilisez au moins 8 caractères avec des lettres et des chiffres.');
        return;
      }
      if (!this.confirmPassword) {
        this.showAlert('warning', 'Confirmation requise', 'Veuillez confirmer votre mot de passe.');
        return;
      }
      if (this.passwordsMismatch) {
        this.showAlert('error', 'Mots de passe différents', 'Les deux mots de passe ne correspondent pas.');
        return;
      }
      this.globalAlert = null;
      this.currentStep = 3;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.globalAlert = null;
    }
  }

  onSubmit(): void {
    this.globalAlert = null;
    this.termsError = false;

    if (this.currentStep === 1) {
      this.nextStep();
      return;
    }
    if (this.currentStep === 2) {
      this.nextStep();
      return;
    }

    // Step 3 submission
    if (!this.acceptTerms) {
      this.termsError = true;
      this.showAlert('info', 'Conditions requises', 'Veuillez accepter les conditions d\'utilisation pour continuer.');
      return;
    }

    this.isLoading = true;
    const cleanName  = this.name.trim();
    const cleanEmail = this.email.trim().toLowerCase();

    this.authService.register(cleanName, cleanEmail, this.password).subscribe({
      next: () => {
        this.showAlert('success', 'Compte créé avec succès !', 'Bienvenue sur EduFocus. Redirection vers votre espace…');
        setTimeout(() => this.router.navigate(['/dashboard']), 1200);
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.message || '';
        if (msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('déjà')) {
          this.showAlert('warning', 'Compte déjà existant', 'Un compte avec cet e-mail existe déjà. Veuillez utiliser une autre adresse.');
          this.currentStep = 1; // Send them back to change email
        } else {
          this.showAlert('error', 'Échec de l\'inscription', msg || 'Une erreur est survenue. Veuillez réessayer.');
        }
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  // ── Google OAuth ──────────────────────────────────────────────────────
  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }
}
