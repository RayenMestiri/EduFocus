import { Injectable, signal, NgZone } from '@angular/core';

/**
 * Reactive connectivity detection service.
 * Exposes an `isOnline` signal that updates on browser online/offline events.
 */
@Injectable({
  providedIn: 'root'
})
export class ConnectivityService {
  /** Reactive signal: true when the browser reports being online */
  isOnline = signal<boolean>(navigator.onLine);

  constructor(private ngZone: NgZone) {
    // Listen to browser connectivity events
    window.addEventListener('online', () => {
      this.ngZone.run(() => this.isOnline.set(true));
    });

    window.addEventListener('offline', () => {
      this.ngZone.run(() => this.isOnline.set(false));
    });
  }
}
