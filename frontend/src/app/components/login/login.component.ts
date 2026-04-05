import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email = '';
  password = '';
  isLoading = false;
  showPassword = false;
  rememberMe = false;

  // Forgot password
  forgotMode = false;
  forgotEmail = '';
  forgotLoading = false;
  forgotSent = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  get passwordStrength(): { score: number; label: string; color: string } {
    const p = this.password;
    let score = 0;
    if (p.length >= 8)                    score++;
    if (/[A-Z]/.test(p))                  score++;
    if (/[0-9]/.test(p))                  score++;
    if (/[^A-Za-z0-9]/.test(p))           score++;
    const labels = ['', 'Faible', 'Moyen', 'Bon', 'Fort'];
    const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
    return { score, label: labels[score] || '', color: colors[score] || '' };
  }

  onSubmit() {
    if (!this.email || !this.password) {
      Swal.fire({ icon: 'error', title: 'Champs manquants', text: 'Veuillez remplir tous les champs.', background: '#0d0900', color: '#fbbf24', confirmButtonColor: '#f59e0b' });
      return;
    }
    this.isLoading = true;
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Bienvenue !', text: 'Connexion réussie', background: '#0d0900', color: '#fbbf24', confirmButtonColor: '#f59e0b', timer: 1400, showConfirmButton: false });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({ icon: 'error', title: 'Échec de connexion', text: err.error?.message || 'Identifiants incorrects.', background: '#0d0900', color: '#fbbf24', confirmButtonColor: '#f59e0b' });
      }
    });
  }

  sendReset() {
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
        Swal.fire({
          icon: 'error',
          title: 'Échec d\'envoi',
          text: err?.error?.message || 'Impossible d\'envoyer le lien de réinitialisation.',
          background: '#0d0900',
          color: '#fbbf24',
          confirmButtonColor: '#f59e0b'
        });
      }
    });
  }

  closeForgot() {
    this.forgotMode = false;
    this.forgotEmail = '';
    this.forgotSent = false;
    this.forgotLoading = false;
  }
}
