import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { StudyPack, Note, Flashcard, QCM, CheatSheet, CodingExercise, QuizAttempt } from '../models/study-hub.model';

@Injectable({
  providedIn: 'root'
})
export class StudyHubService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/study-packs`;

  // State
  private studyPacksSignal = signal<StudyPack[]>([]);
  public isLoading = signal<boolean>(false);

  // Computed views
  public studyPacks = computed(() => this.studyPacksSignal());
  public totalPacks = computed(() => this.studyPacksSignal().length);
  public recentPacks = computed(() => {
    return [...this.studyPacksSignal()]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  });

  constructor() {
    this.refreshPacks();
  }

  // ─── Backend Sync ────────────────────────────────────────────────────────────

  public refreshPacks(): void {
    this.isLoading.set(true);
    this.http.get<{ success: boolean; data: any[] }>(this.apiUrl)
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res && res.success) {
            const mapped: StudyPack[] = res.data.map(p => this.mapPack(p));
            this.studyPacksSignal.set(mapped);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          console.error('[StudyHub] Failed to load packs:', err);
        }
      });
  }

  /** Map raw MongoDB document → frontend StudyPack (normalizes _id → id) */
  private mapPack(raw: any): StudyPack {
    return {
      ...raw,
      id: raw._id || raw.id,
      notes: (raw.notes || []).map((n: any) => ({ ...n, id: n.id || n._id })),
      flashcards: (raw.flashcards || []).map((f: any) => ({ ...f, id: f.id || f._id })),
      qcm: (raw.qcm || []).map((q: any) => ({ ...q, id: q.id || q._id })),
      cheatsheets: (raw.cheatsheets || []).map((cs: any) => ({ ...cs, id: cs.id || cs._id })),
      exercises: (raw.exercises || []).map((ex: any) => ({ ...ex, id: ex.id || ex._id })),
    };
  }

  /** Strip any Mongoose metadata fields before sending to backend */
  private cleanForBackend(obj: any): any {
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.cleanForBackend(item));
    if (obj && typeof obj === 'object') {
      const clean: any = {};
      for (const key of Object.keys(obj)) {
        if (key === '_id' || key === '__v') continue; // strip Mongoose internals
        clean[key] = this.cleanForBackend(obj[key]);
      }
      return clean;
    }
    return obj;
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  public getPackById(id: string): StudyPack | undefined {
    return this.studyPacksSignal().find(p => p.id === id);
  }

  public addPack(pack: Omit<StudyPack, 'id' | 'createdAt' | 'updatedAt'>, callback?: () => void): void {
    const payload = {
      title: pack.title,
      subject: pack.subject,
      description: pack.description || '',
    };
    this.http.post<{ success: boolean; data: any }>(this.apiUrl, payload)
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            this.refreshPacks();
            if (callback) callback();
          }
        },
        error: (err) => console.error('[StudyHub] Failed to create pack:', err)
      });
  }

  public updatePack(id: string, updates: Partial<StudyPack>, callback?: () => void): void {
    // 1) Optimistic local update
    this.studyPacksSignal.update(packs => packs.map(p =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
    ));

    // 2) Clean payload — remove _id / __v Mongoose artefacts from arrays
    const payload = this.cleanForBackend(updates);

    // 3) Persist to backend
    this.http.put<{ success: boolean; data: any }>(`${this.apiUrl}/${id}`, payload)
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            // Re-map the returned document so our local state is exactly what the DB has
            const fresh = this.mapPack(res.data);
            this.studyPacksSignal.update(packs => packs.map(p => p.id === id ? fresh : p));
            if (callback) callback();
          }
        },
        error: (err) => {
          console.error('[StudyHub] Failed to update pack:', err);
          // On error, pull fresh data to correct optimistic state
          this.refreshPacks();
        }
      });
  }

  public deletePack(id: string): void {
    // Local optimistic remove
    this.studyPacksSignal.update(packs => packs.filter(p => p.id !== id));

    this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`)
      .subscribe({
        next: () => { /* already removed locally */ },
        error: (err) => {
          console.error('[StudyHub] Failed to delete pack:', err);
          this.refreshPacks(); // restore on error
        }
      });
  }

  // ─── Quiz Attempts ───────────────────────────────────────────────────────────

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

    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/${packId}/attempts`, payload).pipe(
      tap({
        next: (res) => {
          if (res && res.success) {
            const pack = this.getPackById(packId);
            if (pack) {
              const newStreak = (pack.streak || 0) + 1;
              const newProgress = Math.min(100, Math.max(pack.progress || 0, Math.round(attempt.percentage)));
              // Only send scalar fields for progress/streak update
              this.updatePack(packId, { streak: newStreak, progress: newProgress });
            }
          }
        },
        error: (err) => console.error('[StudyHub] Failed to save attempt:', err)
      })
    );
  }

  public getQuizAttempts(packId: string): Observable<{ success: boolean; data: QuizAttempt[] }> {
    return this.http.get<{ success: boolean; data: QuizAttempt[] }>(`${this.apiUrl}/${packId}/attempts`);
  }

  // ─── JSON Import / Export ────────────────────────────────────────────────────

  public exportPacksToJson(): string {
    // Export the clean frontend model (uses id not _id)
    return JSON.stringify(this.studyPacksSignal(), null, 2);
  }

  public importPacksFromJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      const packsArray = Array.isArray(parsed) ? parsed : [parsed];

      this.http.post<{ success: boolean; data: any[] }>(`${this.apiUrl}/import`, { packs: packsArray })
        .subscribe({
          next: (res) => {
            if (res && res.success) {
              this.refreshPacks();
            }
          },
          error: (err) => console.error('[StudyHub] Failed to import packs:', err)
        });
      return true;
    } catch (e) {
      console.error('[StudyHub] Invalid JSON for import:', e);
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
