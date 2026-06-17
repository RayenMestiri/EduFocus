import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectivityService } from '../../../services/offline/connectivity.service';
import { SyncEngineService, SyncStatus } from '../../../services/offline/sync-engine.service';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Offline Banner -->
    @if (showBanner()) {
      <div class="offline-banner" [class]="bannerClass()" [@.disabled]="false">
        <div class="offline-banner-content">
          <span class="offline-banner-icon">{{ bannerIcon() }}</span>
          <span class="offline-banner-text">{{ bannerText() }}</span>
          @if (pendingCount() > 0 && !isOnline()) {
            <span class="offline-banner-badge">{{ pendingCount() }}</span>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .offline-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10000;
      padding: 8px 16px;
      text-align: center;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.3px;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      animation: slideDown 0.4s ease-out;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .offline-banner-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .offline-banner-icon {
      font-size: 16px;
    }

    .offline-banner-badge {
      background: rgba(255, 255, 255, 0.25);
      border-radius: 10px;
      padding: 1px 8px;
      font-size: 11px;
      font-weight: 700;
    }

    /* ── States ────────────────────── */

    .banner-offline {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #1a1a1a;
    }

    .banner-syncing {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #ffffff;
    }

    .banner-syncing .offline-banner-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .banner-error {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #ffffff;
    }

    .banner-success {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: #ffffff;
      animation: slideDown 0.4s ease-out, fadeOut 0.5s ease-in 2.5s forwards;
    }

    @keyframes fadeOut {
      to {
        transform: translateY(-100%);
        opacity: 0;
      }
    }
  `]
})
export class OfflineIndicatorComponent {
  private connectivity = inject(ConnectivityService);
  private syncEngine = inject(SyncEngineService);

  isOnline = this.connectivity.isOnline;
  syncStatus = this.syncEngine.syncStatus;
  pendingCount = this.syncEngine.pendingCount;

  showBanner = computed(() => {
    return !this.isOnline() ||
           this.syncStatus() === 'syncing' ||
           this.syncStatus() === 'error' ||
           this.syncStatus() === 'success';
  });

  bannerClass = computed(() => {
    if (!this.isOnline()) return 'banner-offline';
    switch (this.syncStatus()) {
      case 'syncing': return 'banner-syncing';
      case 'error': return 'banner-error';
      case 'success': return 'banner-success';
      default: return 'banner-offline';
    }
  });

  bannerIcon = computed(() => {
    if (!this.isOnline()) return '📡';
    switch (this.syncStatus()) {
      case 'syncing': return '🔄';
      case 'error': return '⚠️';
      case 'success': return '✅';
      default: return '📡';
    }
  });

  bannerText = computed(() => {
    if (!this.isOnline()) {
      const count = this.pendingCount();
      return count > 0
        ? `Mode hors ligne — ${count} modification${count > 1 ? 's' : ''} en attente de synchronisation`
        : 'Mode hors ligne — vos données sont disponibles localement';
    }
    switch (this.syncStatus()) {
      case 'syncing': return 'Synchronisation en cours...';
      case 'error': return 'Certaines modifications n\'ont pas pu être synchronisées';
      case 'success': return 'Synchronisation terminée !';
      default: return '';
    }
  });
}
