import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'frontend';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check authentication and validate token
    const token = localStorage.getItem('token');
    if (token) {
      // Validate token with backend
      this.authService.checkAuth().subscribe({
        next: (response) => {
          if (response.success && response.user) {
            console.log('Auto-login successful');
            // Redirect to dashboard if on login page
            const currentUrl = this.router.url;
            if (currentUrl === '/' || currentUrl === '/login' || currentUrl === '/register') {
              this.router.navigate(['/dashboard']);
            }
          }
        },
        error: () => {
          // Token invalid, clear and go to login
          localStorage.removeItem('token');
          this.authService.isAuthenticated.set(false);
          this.router.navigate(['/login']);
        }
      });
    } else {
      // No token, ensure we're on login page
      const currentUrl = this.router.url;
      if (currentUrl === '/dashboard') {
        this.router.navigate(['/login']);
      }
    }
  }
}
