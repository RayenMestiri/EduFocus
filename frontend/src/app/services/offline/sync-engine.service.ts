import { Injectable, signal, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConnectivityService } from './connectivity.service';
import { IndexedDbService, PendingSyncEntry } from './indexed-db.service';
import { environment } from '../../../environments/environment';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

@Injectable({
  providedIn: 'root'
})
export class SyncEngineService {
  private http = inject(HttpClient);
  private connectivity = inject(ConnectivityService);
  private db = inject(IndexedDbService);

  private apiUrl = environment.apiUrl;

  /** Current sync status */
  syncStatus = signal<SyncStatus>('idle');

  /** Number of pending operations waiting to sync */
  pendingCount = signal<number>(0);

  /** Last sync error message */
  lastError = signal<string>('');

  private isSyncing = false;
  private MAX_RETRIES = 3;

  constructor() {
    // Watch connectivity changes — trigger sync when coming back online
    effect(() => {
      const online = this.connectivity.isOnline();
      if (online && !this.isSyncing) {
        this.syncAll();
      }
    });

    // Load initial pending count
    this.refreshPendingCount();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Manually trigger a full sync of all pending operations */
  async syncAll(): Promise<void> {
    if (this.isSyncing || !this.connectivity.isOnline()) return;

    const pending = await this.db.getPendingSyncs();
    if (pending.length === 0) {
      this.syncStatus.set('idle');
      this.pendingCount.set(0);
      return;
    }

    this.isSyncing = true;
    this.syncStatus.set('syncing');

    // Sort by timestamp — FIFO (oldest first)
    const sorted = pending.sort((a, b) => a.timestamp - b.timestamp);

    let hasErrors = false;
    for (const entry of sorted) {
      try {
        await this.processSyncEntry(entry);
        await this.db.removePendingSync(entry.id!);
      } catch (error: any) {
        console.error(`[SyncEngine] Failed to sync entry ${entry.id}:`, error);
        hasErrors = true;

        const newRetry = (entry.retryCount || 0) + 1;
        if (newRetry >= this.MAX_RETRIES) {
          // Give up after max retries — remove from queue
          console.warn(`[SyncEngine] Max retries reached for entry ${entry.id}, removing from queue`);
          await this.db.removePendingSync(entry.id!);
        } else {
          await this.db.updatePendingSyncRetry(entry.id!, newRetry);
        }
      }
    }

    this.isSyncing = false;
    await this.refreshPendingCount();

    if (hasErrors) {
      this.syncStatus.set('error');
      this.lastError.set('Certaines modifications n\'ont pas pu être synchronisées.');
      // Reset to idle after a delay
      setTimeout(() => {
        if (this.syncStatus() === 'error') this.syncStatus.set('idle');
      }, 5000);
    } else {
      this.syncStatus.set('success');
      // Reset to idle after showing success briefly
      setTimeout(() => {
        if (this.syncStatus() === 'success') this.syncStatus.set('idle');
      }, 3000);
    }
  }

  /** Refresh the pending operations count */
  async refreshPendingCount(): Promise<void> {
    const count = await this.db.getPendingSyncCount();
    this.pendingCount.set(count);
  }

  // ── Sync Processing ───────────────────────────────────────────────────────

  private async processSyncEntry(entry: PendingSyncEntry): Promise<void> {
    const { store, action, entityId, data } = entry;

    switch (store) {
      case 'notes':
        await this.syncNote(action, entityId, data);
        break;
      case 'studyPacks':
        await this.syncStudyPack(action, entityId, data);
        break;
      case 'quizAttempts':
        await this.syncQuizAttempt(data);
        break;
      case 'todos':
        await this.syncTodo(action, entityId, data);
        break;
      case 'dayPlans':
        await this.syncDayPlan(action, entityId, data);
        break;
      default:
        console.warn(`[SyncEngine] Unknown store: ${store}`);
    }
  }

  // ── Notes Sync ────────────────────────────────────────────────────────────

  private syncNote(action: string, entityId: string, data: any): Promise<any> {
    const url = `${this.apiUrl}/api/notes`;
    switch (action) {
      case 'create':
        return this.http.post(`${url}`, data).toPromise();
      case 'update':
        return this.http.put(`${url}/${entityId}`, data).toPromise();
      case 'delete':
        return this.http.delete(`${url}/${entityId}`).toPromise();
      default:
        return Promise.resolve();
    }
  }

  // ── Study Packs Sync ──────────────────────────────────────────────────────

  private syncStudyPack(action: string, entityId: string, data: any): Promise<any> {
    const url = `${this.apiUrl}/api/study-packs`;
    switch (action) {
      case 'create':
        return this.http.post(`${url}`, data).toPromise();
      case 'update':
        return this.http.put(`${url}/${entityId}`, data).toPromise();
      case 'delete':
        return this.http.delete(`${url}/${entityId}`).toPromise();
      default:
        return Promise.resolve();
    }
  }

  // ── Quiz Attempts Sync ────────────────────────────────────────────────────

  private syncQuizAttempt(data: any): Promise<any> {
    const { packId, ...attempt } = data;
    return this.http.post(`${this.apiUrl}/api/study-packs/${packId}/attempts`, attempt).toPromise();
  }

  // ── Todos Sync ────────────────────────────────────────────────────────────

  private syncTodo(action: string, entityId: string, data: any): Promise<any> {
    const url = `${this.apiUrl}/api/todos`;
    switch (action) {
      case 'create':
        return this.http.post(`${url}`, data).toPromise();
      case 'update':
        return this.http.put(`${url}/${entityId}`, data).toPromise();
      case 'delete':
        return this.http.delete(`${url}/${entityId}`).toPromise();
      default:
        return Promise.resolve();
    }
  }

  // ── Day Plans Sync ────────────────────────────────────────────────────────

  private syncDayPlan(action: string, entityId: string, data: any): Promise<any> {
    const url = `${this.apiUrl}/api/day-plans`;
    switch (action) {
      case 'create':
        return this.http.post(`${url}`, data).toPromise();
      case 'update':
        return this.http.patch(`${url}/${entityId}`, data).toPromise();
      default:
        return Promise.resolve();
    }
  }
}
