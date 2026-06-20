import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { IndexedDbService } from './indexed-db.service';
import { ConnectivityService } from './connectivity.service';
import { SyncEngineService } from './sync-engine.service';
import { StudyPack, QuizAttempt } from '../../models/study-hub.model';
import { environment } from '../../../environments/environment';

/**
 * Offline-first wrapper around StudyHubService.
 * Caches study packs in IndexedDB for offline access.
 * Queues quiz attempts and pack updates for sync.
 */
@Injectable({
  providedIn: 'root'
})
export class OfflineStudyHubService {
  private http = inject(HttpClient);
  private db = inject(IndexedDbService);
  private connectivity = inject(ConnectivityService);
  private syncEngine = inject(SyncEngineService);

  private apiUrl = `${environment.apiUrl}/api/study-packs`;

  // ── State ─────────────────────────────────────────────────────────────

  private studyPacksSignal = signal<StudyPack[]>([]);
  public isLoading = signal<boolean>(false);

  public studyPacks = computed(() => this.studyPacksSignal());
  public totalPacks = computed(() => this.studyPacksSignal().length);
  public totalNotes = computed(() => this.studyPacksSignal().reduce((s, p) => s + (p.notes?.length || 0), 0));
  public totalFlashcards = computed(() => this.studyPacksSignal().reduce((s, p) => s + (p.flashcards?.length || 0), 0));
  public totalQcms = computed(() => this.studyPacksSignal().reduce((s, p) => s + (p.qcm?.length || 0), 0));
  public recentPacks = computed(() => {
    return [...this.studyPacksSignal()]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  });

  constructor() {
    this.refreshPacks();
  }

  // ── Map helper ────────────────────────────────────────────────────────

  private mapPack(raw: any): StudyPack {
    return {
      ...raw,
      id: raw._id || raw.id,
      lastStudied: raw.lastStudied ? new Date(raw.lastStudied) : undefined,
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
      notes: (raw.notes || []).map((n: any) => ({
        ...n,
        id: n.id || n._id,
        createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
        updatedAt: n.updatedAt ? new Date(n.updatedAt) : new Date(),
      })),
      flashcards: (raw.flashcards || []).map((f: any) => ({
        ...f,
        id: f.id || f._id,
        state: f.state || 'new',
        repetitions: f.repetitions ?? 0,
        interval: f.interval ?? 0,
        easeFactor: f.easeFactor ?? 2.5,
        dueDate: f.dueDate ? new Date(f.dueDate) : undefined,
        lastReviewed: f.lastReviewed ? new Date(f.lastReviewed) : undefined,
        lapses: f.lapses ?? 0,
        createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
      })),
      qcm: (raw.qcm || []).map((q: any) => ({
        ...q,
        id: q.id || q._id,
        createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
      })),
      cheatsheets: (raw.cheatsheets || []).map((cs: any) => ({
        ...cs,
        id: cs.id || cs._id,
        createdAt: cs.createdAt ? new Date(cs.createdAt) : new Date(),
      })),
      exercises: (raw.exercises || []).map((ex: any) => ({
        ...ex,
        id: ex.id || ex._id,
        createdAt: ex.createdAt ? new Date(ex.createdAt) : new Date(),
      })),
    };
  }

  private cleanForBackend(obj: any): any {
    if (obj instanceof Date) return obj.toISOString(); // Serialize Dates as ISO strings for clean JSON
    if (Array.isArray(obj)) return obj.map(item => this.cleanForBackend(item));
    if (obj && typeof obj === 'object') {
      const clean: any = {};
      for (const key of Object.keys(obj)) {
        if (key === '_id' || key === '__v' || key === '_offlinePending') continue;
        clean[key] = this.cleanForBackend(obj[key]);
      }
      return clean;
    }
    return obj;
  }

  // ── Refresh (online-first, fallback to cache) ─────────────────────────

  public refreshPacks(): void {
    this.isLoading.set(true);

    if (this.connectivity.isOnline()) {
      this.http.get<{ success: boolean; data: any[] }>(this.apiUrl).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res && res.success) {
            const mapped = res.data.map(p => this.mapPack(p));
            this.studyPacksSignal.set(mapped);
            // Cache in IndexedDB
            this.db.putAll('studyPacks', mapped);
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.loadFromCache();
        }
      });
    } else {
      this.loadFromCache();
    }
  }

  private async loadFromCache(): Promise<void> {
    const cached = await this.db.getAll<StudyPack>('studyPacks');
    const mapped = cached.map(p => this.mapPack(p));
    this.studyPacksSignal.set(mapped);
    this.isLoading.set(false);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────

  public getPackById(id: string): StudyPack | undefined {
    return this.studyPacksSignal().find(p => p.id === id);
  }

  public async getPackByIdAsync(id: string): Promise<StudyPack | undefined> {
    // First check memory
    const inMemory = this.getPackById(id);
    if (inMemory) return inMemory;
    // Then check IndexedDB
    const raw = await this.db.getById<StudyPack>('studyPacks', id);
    return raw ? this.mapPack(raw) : undefined;
  }

  public addPack(pack: Omit<StudyPack, 'id' | 'createdAt' | 'updatedAt'>, callback?: () => void): void {
    const payload = {
      title: pack.title,
      subject: pack.subject,
      description: pack.description || '',
    };

    if (this.connectivity.isOnline()) {
      this.http.post<{ success: boolean; data: any }>(this.apiUrl, payload).subscribe({
        next: (res) => {
          if (res && res.success) {
            this.refreshPacks();
            if (callback) callback();
          }
        },
        error: () => this.addPackOffline(payload, callback)
      });
    } else {
      this.addPackOffline(payload, callback);
    }
  }

  private async addPackOffline(payload: any, callback?: () => void): Promise<void> {
    const offlinePack: any = {
      ...payload,
      id: this.db.generateOfflineId(),
      notes: [],
      flashcards: [],
      qcm: [],
      cheatsheets: [],
      exercises: [],
      progress: 0,
      streak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      _offlinePending: true
    };

    await this.db.put('studyPacks', offlinePack);
    this.studyPacksSignal.update(packs => [...packs, offlinePack]);

    await this.db.addPendingSync({
      store: 'studyPacks',
      action: 'create',
      entityId: offlinePack.id,
      data: payload,
      timestamp: Date.now(),
      retryCount: 0
    });
    await this.syncEngine.refreshPendingCount();

    if (callback) callback();
  }

  public updatePack(id: string, updates: Partial<StudyPack>, callback?: () => void): void {
    // Optimistic local update
    this.studyPacksSignal.update(packs => packs.map(p =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
    ));

    const payload = this.cleanForBackend(updates);

    if (this.connectivity.isOnline()) {
      this.http.put<{ success: boolean; data: any }>(`${this.apiUrl}/${id}`, payload).subscribe({
        next: (res) => {
          if (res && res.success) {
            const fresh = this.mapPack(res.data);
            this.studyPacksSignal.update(packs => packs.map(p => p.id === id ? fresh : p));
            this.db.put('studyPacks', fresh);
            if (callback) callback();
          }
        },
        error: () => this.updatePackOffline(id, payload, callback)
      });
    } else {
      this.updatePackOffline(id, payload, callback);
    }
  }

  private async updatePackOffline(id: string, payload: any, callback?: () => void): Promise<void> {
    const current = this.getPackById(id);
    if (current) {
      const updated = { ...current, ...payload, updatedAt: new Date(), _offlinePending: true };
      await this.db.put('studyPacks', updated);
    }

    await this.db.addPendingSync({
      store: 'studyPacks',
      action: 'update',
      entityId: id,
      data: payload,
      timestamp: Date.now(),
      retryCount: 0
    });
    await this.syncEngine.refreshPendingCount();

    if (callback) callback();
  }

  public deletePack(id: string): void {
    this.studyPacksSignal.update(packs => packs.filter(p => p.id !== id));
    this.db.delete('studyPacks', id);

    if (this.connectivity.isOnline()) {
      this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`).subscribe({
        error: () => this.deletePackOffline(id)
      });
    } else {
      this.deletePackOffline(id);
    }
  }

  private async deletePackOffline(id: string): Promise<void> {
    if (!id.startsWith('offline_')) {
      await this.db.addPendingSync({
        store: 'studyPacks',
        action: 'delete',
        entityId: id,
        data: null,
        timestamp: Date.now(),
        retryCount: 0
      });
      await this.syncEngine.refreshPendingCount();
    }
  }

  public bulkDeletePacks(ids: string[], callback?: () => void): void {
    this.studyPacksSignal.update(packs => packs.filter(p => !ids.includes(p.id)));
    ids.forEach(id => this.db.delete('studyPacks', id));

    if (this.connectivity.isOnline()) {
      this.http.delete<{ success: boolean; deletedCount: number }>(`${this.apiUrl}/bulk`, { body: { ids } }).subscribe({
        next: (res) => { if (res?.success && callback) callback(); },
        error: () => { ids.forEach(id => this.deletePackOffline(id)); }
      });
    } else {
      ids.forEach(id => this.deletePackOffline(id));
    }
  }

  // ── Quiz Attempts (offline capable) ───────────────────────────────────

  public saveQuizAttempt(packId: string, attempt: Omit<QuizAttempt, 'completedAt'>): Observable<any> {
    const payload = {
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percentage: attempt.percentage,
      answers: (attempt.answers || []).map(a => ({
        questionId: a.questionId,
        selectedAnswer: String(a.selectedAnswer),
        isCorrect: a.isCorrect,
        topic: a.topic || 'Général'
      }))
    };

    if (this.connectivity.isOnline()) {
      return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/${packId}/attempts`, payload).pipe(
        tap({
          next: (res) => {
            if (res && res.success) {
              // Cache the attempt
              this.db.addQuizAttempt({ ...payload, pack: packId, completedAt: new Date() });
              // Update pack progress
              const pack = this.getPackById(packId);
              if (pack) {
                const newStreak = (pack.streak || 0) + 1;
                const newProgress = Math.min(100, Math.max(pack.progress || 0, Math.round(attempt.percentage)));
                this.updatePack(packId, { streak: newStreak, progress: newProgress });
              }
            }
          }
        }),
        catchError(() => from(this.saveQuizAttemptOffline(packId, payload, attempt)))
      );
    } else {
      return from(this.saveQuizAttemptOffline(packId, payload, attempt));
    }
  }

  private async saveQuizAttemptOffline(packId: string, payload: any, attempt: any): Promise<any> {
    // Save locally
    await this.db.addQuizAttempt({ ...payload, pack: packId, completedAt: new Date() });

    // Queue for sync
    await this.db.addPendingSync({
      store: 'quizAttempts',
      action: 'create',
      entityId: packId,
      data: { packId, ...payload },
      timestamp: Date.now(),
      retryCount: 0
    });
    await this.syncEngine.refreshPendingCount();

    // Update local pack progress
    const pack = this.getPackById(packId);
    if (pack) {
      const newStreak = (pack.streak || 0) + 1;
      const newProgress = Math.min(100, Math.max(pack.progress || 0, Math.round(attempt.percentage)));
      this.studyPacksSignal.update(packs => packs.map(p =>
        p.id === packId ? { ...p, streak: newStreak, progress: newProgress } : p
      ));
    }

    return { success: true, message: 'offline' };
  }

  public getQuizAttempts(packId: string): Observable<{ success: boolean; data: QuizAttempt[] }> {
    if (this.connectivity.isOnline()) {
      return this.http.get<{ success: boolean; data: QuizAttempt[] }>(`${this.apiUrl}/${packId}/attempts`).pipe(
        tap(res => {
          if (res.success && res.data) {
            // Cache attempts
            res.data.forEach(a => this.db.addQuizAttempt({ ...a, pack: packId }));
          }
        }),
        catchError(() => from(this.getQuizAttemptsFromCache(packId)))
      );
    } else {
      return from(this.getQuizAttemptsFromCache(packId));
    }
  }

  private async getQuizAttemptsFromCache(packId: string): Promise<{ success: boolean; data: QuizAttempt[] }> {
    const attempts = await this.db.getQuizAttemptsByPack(packId);
    return { success: true, data: attempts };
  }

  // ── Pass-through (online only) ────────────────────────────────────────

  public getPublicPackById(id: string): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/public/${id}`);
  }

  public clonePack(id: string): Observable<{ success: boolean; data: any }> {
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/clone/${id}`, {});
  }

  // ── JSON Import / Export ──────────────────────────────────────────────

  public exportPacksToJson(): string {
    return JSON.stringify(this.studyPacksSignal(), null, 2);
  }

  public importPacksFromJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      const packsArray = Array.isArray(parsed) ? parsed : [parsed];
      this.http.post<{ success: boolean; data: any[] }>(`${this.apiUrl}/import`, { packs: packsArray }).subscribe({
        next: (res) => { if (res && res.success) this.refreshPacks(); },
        error: (err) => console.error('[OfflineStudyHub] Import failed:', err)
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  public downloadJson(filename: string = 'study-packs.json'): void {
    const dataStr = this.exportPacksToJson();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
