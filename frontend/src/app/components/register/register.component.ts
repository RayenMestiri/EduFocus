import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
    private router: Router
  ) {}

  // ── Validators ───────────────────────────────────────────────────────
  validateName(): void {
    if (!this.name.trim()) {
      this.nameError = 'Le nom est requis';
    } else if (this.name.trim().length < 2) {
      this.nameError = 'Le nom doit contenir au moins 2 caractères';
    } else {
      this.nameError = '';
    }
  }

  validateEmail(): void {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.email) {
      this.emailError = '';
      this.isValidEmail = false;
    } else if (!re.test(this.email)) {
      this.emailError = 'Adresse e-mail invalide';
      this.isValidEmail = false;
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

  onSubmit(): void {
    this.globalAlert = null;
    this.termsError = false;
    this.validateName();
    this.validateEmail();

    const cleanName  = this.name.trim();
    const cleanEmail = this.email.trim().toLowerCase();

    // Validations with inline alerts
    if (!cleanName || !cleanEmail || !this.password || !this.confirmPassword) {
      this.showAlert('warning', 'Champs requis', 'Veuillez remplir tous les champs du formulaire.');
      return;
    }
    if (this.nameError || this.emailError) {
      this.showAlert('warning', 'Informations invalides', 'Veuillez corriger les champs marqués en rouge.');
      return;
    }
    if (!this.isValidEmail) {
      this.showAlert('warning', 'E-mail invalide', 'Vérifiez le format de votre adresse e-mail.');
      return;
    }
    if (this.passwordScore < 2) {
      this.showAlert('error', 'Mot de passe trop faible', 'Utilisez au moins 8 caractères avec des lettres et des chiffres.');
      return;
    }
    if (this.passwordsMismatch) {
      this.showAlert('error', 'Mots de passe différents', 'Les deux mots de passe ne correspondent pas. Vérifiez et réessayez.');
      return;
    }
    if (!this.acceptTerms) {
      this.termsError = true;
      this.showAlert('info', 'Conditions requises', 'Veuillez accepter les conditions d\'utilisation pour continuer.');
      return;
    }

    this.isLoading = true;
    this.authService.register(cleanName, cleanEmail, this.password).subscribe({
      next: () => {
        this.showAlert('success', 'Compte créé avec succès !', 'Bienvenue sur EduFocus. Redirection vers votre espace…');
        setTimeout(() => this.router.navigate(['/dashboard']), 1200);
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.message || '';
        if (msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('déjà')) {
          this.showAlert('warning', 'Compte déjà existant', 'Un compte avec cet e-mail existe déjà. Connectez-vous ou utilisez un autre e-mail.');
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
