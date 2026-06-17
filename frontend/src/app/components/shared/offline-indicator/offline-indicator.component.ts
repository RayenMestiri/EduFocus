import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectivityService } from '../../../services/offline/connectivity.service';
import { SyncEngineService, SyncStatus } from '../../../services/offline/sync-engine.service';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showBanner()) {
      <div class="offline-toast" [class]="bannerClass()">
        <span class="offline-toast-icon">{{ bannerIcon() }}</span>
        <span class="offline-toast-text">{{ bannerText() }}</span>
        @if (pendingCount() > 0 && !isOnline()) {
          <span class="offline-toast-badge">{{ pendingCount() }}</span>
        }
      </div>
    }
  `,
  styles: [`
    .offline-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 10000;
      padding: 10px 18px;
      border-radius: 50px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.2px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(12px);
      animation: toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      max-width: 90vw;
      pointer-events: auto;
    }

    @keyframes toastIn {
      from {
        transform: translateY(20px) scale(0.9);
        opacity: 0;
      }
      to {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }

    .offline-toast-icon {
      font-size: 15px;
      flex-shrink: 0;
    }

    .offline-toast-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .offline-toast-badge {
      background: rgba(255, 255, 255, 0.25);
      border-radius: 10px;
      padding: 1px 7px;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }

    /* ── States ────────────────────── */

    .banner-offline {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.92), rgba(217, 119, 6, 0.92));
      color: #1a1a1a;
    }

    .banner-syncing {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.92), rgba(37, 99, 235, 0.92));
      color: #ffffff;
    }

    .banner-syncing .offline-toast-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .banner-error {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.92), rgba(220, 38, 38, 0.92));
      color: #ffffff;
    }

    .banner-success {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.92), rgba(22, 163, 74, 0.92));
      color: #ffffff;
      animation: toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), fadeOut 0.5s ease-in 2.5s forwards;
    }

    @keyframes fadeOut {
      to {
        transform: translateY(20px) scale(0.9);
        opacity: 0;
      }
    }

    /* Mobile: full-width bottom toast */
    @media (max-width: 480px) {
      .offline-toast {
        bottom: 16px;
        right: 16px;
        left: 16px;
        justify-content: center;
        font-size: 12px;
        padding: 8px 14px;
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
