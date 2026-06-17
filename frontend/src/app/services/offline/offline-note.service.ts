import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { NoteService } from '../note.service';
import { IndexedDbService } from './indexed-db.service';
import { ConnectivityService } from './connectivity.service';
import { SyncEngineService } from './sync-engine.service';
import { Note, NoteFilter, ApiResponse } from '../../models';

/**
 * Offline-first wrapper around NoteService.
 * - Online: calls HTTP API, caches result in IndexedDB
 * - Offline: returns cached data, queues mutations for sync
 */
@Injectable({
  providedIn: 'root'
})
export class OfflineNoteService {
  private noteService = inject(NoteService);
  private db = inject(IndexedDbService);
  private connectivity = inject(ConnectivityService);
  private syncEngine = inject(SyncEngineService);

  // ── Read ────────────────────────────────────────────────────────────────

  getNotes(filters?: NoteFilter): Observable<ApiResponse<Note[]>> {
    if (this.connectivity.isOnline()) {
      // Online: fetch from API and cache
      return this.noteService.getNotes(filters).pipe(
        tap(response => {
          if (response.success && response.data) {
            // Cache all notes in IndexedDB
            this.db.putAll('notes', response.data);
          }
        }),
        catchError(() => {
          // Network error even though navigator.onLine — fall back to cache
          return from(this.getNotesFromCache());
        })
      );
    } else {
      // Offline: return from IndexedDB
      return from(this.getNotesFromCache());
    }
  }

  private async getNotesFromCache(): Promise<ApiResponse<Note[]>> {
    const notes = await this.db.getAll<Note>('notes');
    return { success: true, data: notes, message: 'offline' };
  }

  // ── Create ──────────────────────────────────────────────────────────────

  createNote(note: Partial<Note> & { password?: string }): Observable<ApiResponse<Note>> {
    if (this.connectivity.isOnline()) {
      return this.noteService.createNote(note).pipe(
        tap(response => {
          if (response.success && response.data) {
            this.db.put('notes', response.data);
          }
        }),
        catchError(() => from(this.createNoteOffline(note)))
      );
    } else {
      return from(this.createNoteOffline(note));
    }
  }

  private async createNoteOffline(note: Partial<Note>): Promise<ApiResponse<Note>> {
    const offlineNote = {
      ...note,
      _id: this.db.generateOfflineId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _offlinePending: true
    } as any;

    await this.db.put('notes', offlineNote);
    await this.db.addPendingSync({
      store: 'notes',
      action: 'create',
      entityId: offlineNote._id,
      data: note,
      timestamp: Date.now(),
      retryCount: 0
    });
    await this.syncEngine.refreshPendingCount();

    return { success: true, data: offlineNote as Note, message: 'offline' };
  }

  // ── Update ──────────────────────────────────────────────────────────────

  updateNote(id: string, note: Partial<Note> & { password?: string }): Observable<ApiResponse<Note>> {
    if (this.connectivity.isOnline()) {
      return this.noteService.updateNote(id, note).pipe(
        tap(response => {
          if (response.success && response.data) {
            this.db.put('notes', response.data);
          }
        }),
        catchError(() => from(this.updateNoteOffline(id, note)))
      );
    } else {
      return from(this.updateNoteOffline(id, note));
    }
  }

  private async updateNoteOffline(id: string, note: Partial<Note>): Promise<ApiResponse<Note>> {
    const existing = await this.db.getById<any>('notes', id);
    const updated = {
      ...existing,
      ...note,
      _id: id,
      updatedAt: new Date().toISOString(),
      _offlinePending: true
    };

    await this.db.put('notes', updated);
    await this.db.addPendingSync({
      store: 'notes',
      action: 'update',
      entityId: id,
      data: note,
      timestamp: Date.now(),
      retryCount: 0
    });
    await this.syncEngine.refreshPendingCount();

    return { success: true, data: updated as Note, message: 'offline' };
  }

  // ── Delete ──────────────────────────────────────────────────────────────

  deleteNote(id: string): Observable<ApiResponse<any>> {
    if (this.connectivity.isOnline()) {
      return this.noteService.deleteNote(id).pipe(
        tap(() => {
          this.db.delete('notes', id);
        }),
        catchError(() => from(this.deleteNoteOffline(id)))
      );
    } else {
      return from(this.deleteNoteOffline(id));
    }
  }

  private async deleteNoteOffline(id: string): Promise<ApiResponse<any>> {
    await this.db.delete('notes', id);

    // Only queue sync if it's a real server ID (not an offline-created note)
    if (!id.startsWith('offline_')) {
      await this.db.addPendingSync({
        store: 'notes',
        action: 'delete',
        entityId: id,
        data: null,
        timestamp: Date.now(),
        retryCount: 0
      });
      await this.syncEngine.refreshPendingCount();
    }

    return { success: true, message: 'offline' };
  }

  // ── Pass-through methods (online only) ────────────────────────────────

  togglePin(id: string): Observable<ApiResponse<Note>> {
    return this.noteService.togglePin(id);
  }

  toggleArchive(id: string): Observable<ApiResponse<Note>> {
    return this.noteService.toggleArchive(id);
  }

  changeColor(id: string, color: string): Observable<ApiResponse<Note>> {
    return this.noteService.changeColor(id, color);
  }

  getTags(): Observable<ApiResponse<string[]>> {
    return this.noteService.getTags();
  }

  verifyPassword(id: string, password: string): Observable<ApiResponse<any>> {
    return this.noteService.verifyPassword(id, password);
  }
}
