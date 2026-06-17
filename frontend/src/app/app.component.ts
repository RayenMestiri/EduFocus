import { Component, OnInit, inject, isDevMode } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { ConnectivityService } from './services/offline/connectivity.service';
import { SyncEngineService } from './services/offline/sync-engine.service';
import { OfflineIndicatorComponent } from './components/shared/offline-indicator/offline-indicator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, OfflineIndicatorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'frontend';

  private authService = inject(AuthService);
  private router = inject(Router);
  private connectivity = inject(ConnectivityService);
  private syncEngine = inject(SyncEngineService);

  constructor() {
    // Initialize SW update listener (only in production)
    if (!isDevMode()) {
      try {
        const swUpdate = inject(SwUpdate);
        if (swUpdate.isEnabled) {
          swUpdate.versionUpdates.pipe(
            filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
          ).subscribe(() => {
            console.log('[SW] New version available — reloading...');
            if (confirm('Une nouvelle version d\'EduFocus est disponible. Recharger maintenant ?')) {
              window.location.reload();
            }
          });
        }
      } catch {
        // SwUpdate not available in dev mode — ignore
      }
    }
  }

  ngOnInit() {
    // Wake up the backend immediately in the background
    if (this.connectivity.isOnline()) {
      this.authService.wakeupBackend();
    }

    // Check authentication and validate token
    const token = localStorage.getItem('token');
    if (token) {
      // Validate token with backend (or use cached user if offline)
      this.authService.checkAuth().subscribe({
        next: (response) => {
          if (response.success && response.user) {
            console.log('Auto-login successful');
            // Redirect to dashboard if on login page
            const currentUrl = this.router.url;
            if ( currentUrl === '/login' || currentUrl === '/register') {
              this.router.navigate(['/dashboard']);
            }
          }
        },
        error: () => {
          if (this.connectivity.isOnline()) {
            // Token invalid, clear and go to login
            localStorage.removeItem('token');
            this.authService.isAuthenticated.set(false);
            this.router.navigate(['/login']);
          }
          // If offline, keep the token — it might be valid once we're back online
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
