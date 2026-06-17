import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import Swal from 'sweetalert2';


interface Alert {
  type: 'error' | 'warning' | 'success' | 'info';
  icon: string;
  title: string;
  text?: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  isLoading = false;
  showPassword = false;
  rememberMe = false;

  // Focus states
  emailFocused = false;
  pwFocused = false;

  // Inline validation
  emailError = '';
  isValidEmail = false;

  // Global inline alert
  globalAlert: Alert | null = null;

  // Forgot password
  forgotMode = false;
  forgotEmail = '';
  forgotLoading = false;
  forgotSent = false;
  forgotError = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    public themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Show error alert if redirected back from a failed Google OAuth attempt
    const error = this.route.snapshot.queryParamMap.get('error');
    if (error) {
      const googleErrors: Record<string, string> = {
        google_failed: 'La connexion Google a échoué. Veuillez réessayer.',
        google_no_user: 'Impossible de créer votre compte Google.',
        google_server_error: 'Erreur serveur lors de la connexion Google.',
        google_no_token: 'Token de connexion Google manquant.'
      };
      const msg = googleErrors[error] || 'Une erreur s\'est produite lors de la connexion Google.';
      this.showAlert('error', 'Connexion Google échouée', msg);
    }
  }

  get passwordStrength(): { score: number; label: string; color: string } {
    const p = this.password;
    let score = 0;
    if (p.length >= 8)           score++;
    if (/[A-Z]/.test(p))        score++;
    if (/[0-9]/.test(p))        score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const labels = ['', 'Faible', 'Moyen', 'Bon', 'Fort'];
    const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
    return { score, label: labels[score] || '', color: colors[score] || '' };
  }

  validateEmail(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.email) {
      this.emailError = '';
      this.isValidEmail = false;
    } else if (!emailRegex.test(this.email)) {
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
      setTimeout(() => this.globalAlert = null, 4000);
    }
  }

  onSubmit(): void {
    this.globalAlert = null;
    this.validateEmail();

    if (!this.email || !this.password) {
      this.showAlert('warning', 'Champs requis', 'Veuillez remplir votre e-mail et mot de passe.');
      return;
    }
    if (!this.isValidEmail) {
      this.showAlert('warning', 'E-mail invalide', 'Vérifiez le format de votre adresse e-mail.');
      return;
    }

    this.isLoading = true;
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.showAlert('success', 'Bienvenue !', 'Connexion réussie. Redirection…');
        const redirectUrl = this.route.snapshot.queryParams['redirect'] || '/dashboard';
        setTimeout(() => this.router.navigateByUrl(redirectUrl), 900);
      },
      error: (err) => {
        this.isLoading = false;
        this.showAlert('error', 'Échec de connexion', err.error?.message || 'Identifiants incorrects. Vérifiez votre e-mail et mot de passe.');
      }
    });
  }

  sendReset(): void {
    this.forgotError = '';
    const cleanEmail = this.forgotEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    this.forgotLoading = true;
    this.authService.forgotPassword(cleanEmail).subscribe({
      next: () => {
        this.forgotLoading = false;
        this.forgotSent = true;
      },
      error: (err) => {
        this.forgotLoading = false;
        this.forgotError = err?.error?.message || 'Impossible d\'envoyer le lien. Vérifiez l\'adresse.';
      }
    });
  }

  closeForgot(): void {
    this.forgotMode = false;
    this.forgotEmail = '';
    this.forgotSent = false;
    this.forgotLoading = false;
    this.forgotError = '';
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }
}
