import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  password = '';
  confirmPassword = '';
  isLoading = false;
  isSuccess = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      Swal.fire({
        icon: 'error',
        title: 'Lien invalide',
        text: 'Le lien de réinitialisation est invalide ou incomplet.',
        confirmButtonColor: '#6366f1'
      });
      this.router.navigate(['/login']);
    }
  }

  submit(): void {
    if (!this.password || !this.confirmPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'Champs requis',
        text: 'Veuillez remplir les deux champs mot de passe.',
        confirmButtonColor: '#6366f1'
      });
      return;
    }

    if (this.password.length < 6) {
      Swal.fire({
        icon: 'warning',
        title: 'Mot de passe trop court',
        text: 'Le mot de passe doit contenir au moins 6 caractères.',
        confirmButtonColor: '#6366f1'
      });
      return;
    }

    if (this.password !== this.confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Non identiques',
        text: 'Les mots de passe ne correspondent pas.',
        confirmButtonColor: '#6366f1'
      });
      return;
    }

    this.isLoading = true;
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSuccess = true;
        Swal.fire({
          icon: 'success',
          title: 'Mot de passe modifié',
          text: 'Votre mot de passe a été mis à jour avec succès.',
          timer: 1700,
          showConfirmButton: false,
          confirmButtonColor: '#6366f1'
        }).then(() => {
          this.router.navigate(['/login']);
        });
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Échec de réinitialisation',
          text: err?.error?.message || 'Lien expiré ou invalide. Demandez un nouveau lien.',
          confirmButtonColor: '#6366f1'
        });
      }
    });
  }
}
