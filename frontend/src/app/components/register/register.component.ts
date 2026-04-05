import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

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

  preventDefault(event: Event) {
    event.preventDefault();
  }

  onSubmit() {
    const cleanName = this.name.trim();
    const cleanEmail = this.email.trim().toLowerCase();
    const hasLetter = /[A-Za-z]/.test(this.password);

    if (!cleanName || !cleanEmail || !this.password || !this.confirmPassword) {
      Swal.fire({ icon: 'error', title: 'Champs manquants', text: 'Veuillez remplir tous les champs.', background: '#0d0900', color: '#fbbf24', confirmButtonColor: '#f59e0b' });
      return;
    }

    if (this.passwordsMismatch) {
      Swal.fire({ icon: 'error', title: 'Mots de passe différents', text: 'Les mots de passe ne correspondent pas.', background: '#0d0900', color: '#fbbf24', confirmButtonColor: '#f59e0b' });
      return;
    }

    if (!this.passwordChecks.length || !hasLetter || !this.passwordChecks.number) {
      Swal.fire({ icon: 'error', title: 'Mot de passe trop faible', text: 'Utilisez au moins 8 caractères avec des lettres et des chiffres.', background: '#0d0900', color: '#fbbf24', confirmButtonColor: '#f59e0b' });
      return;
    }

    if (!this.acceptTerms) {
      Swal.fire({ icon: 'info', title: 'Conditions requises', text: 'Veuillez accepter les conditions d’utilisation.', background: '#0d0900', color: '#fbbf24', confirmButtonColor: '#f59e0b' });
      return;
    }

    this.isLoading = true;
    this.authService.register(cleanName, cleanEmail, this.password).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Compte créé !', text: 'Inscription réussie', background: '#0d0900', color: '#fbbf24', confirmButtonColor: '#f59e0b', timer: 1400, showConfirmButton: false });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({ icon: 'error', title: 'Échec', text: err.error?.message || 'Une erreur est survenue.', background: '#0d0900', color: '#fbbf24', confirmButtonColor: '#f59e0b' });
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}
