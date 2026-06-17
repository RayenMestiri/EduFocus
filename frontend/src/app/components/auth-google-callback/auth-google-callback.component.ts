import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-google-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-google-callback.component.html',
  styleUrl: './auth-google-callback.component.css'
})
export class AuthGoogleCallbackComponent implements OnInit {
  status: 'loading' | 'error' = 'loading';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Read the token from the URL query parameter
    // Backend redirects to: /auth/google/callback?token=JWT
    const token = this.route.snapshot.queryParamMap.get('token');
    const error = this.route.snapshot.queryParamMap.get('error');

    // Handle error from backend (OAuth failure)
    if (error || !token) {
      this.status = 'error';
      this.errorMessage = this.getErrorMessage(error);
      // Redirect to login after 3 seconds with error context
      setTimeout(() => {
        this.router.navigate(['/login'], {
          queryParams: { error: error || 'google_no_token' }
        });
      }, 3000);
      return;
    }

    // Exchange the token — store it and hydrate user signals
    this.authService.handleGoogleCallback(token).subscribe({
      next: (response) => {
        if (response.success && response.user) {
          // Success — navigate to dashboard
          this.router.navigateByUrl('/dashboard');
        } else {
          this.status = 'error';
          this.errorMessage = 'Impossible de récupérer votre profil. Réessayez.';
          setTimeout(() => this.router.navigate(['/login']), 3000);
        }
      },
      error: (err) => {
        console.error('[Google OAuth Callback] Error:', err);
        this.status = 'error';
        this.errorMessage = 'Une erreur s\'est produite lors de la connexion Google.';
        // Remove invalid token
        localStorage.removeItem('token');
        setTimeout(() => this.router.navigate(['/login']), 3000);
      }
    });
  }

  private getErrorMessage(error: string | null): string {
    const messages: Record<string, string> = {
      google_failed: 'La connexion Google a échoué. Veuillez réessayer.',
      google_no_user: 'Impossible de créer votre compte Google.',
      google_server_error: 'Erreur serveur lors de la connexion Google.',
      google_no_token: 'Token de connexion manquant.'
    };
    return error && messages[error]
      ? messages[error]
      : 'Une erreur inattendue s\'est produite.';
  }
}
