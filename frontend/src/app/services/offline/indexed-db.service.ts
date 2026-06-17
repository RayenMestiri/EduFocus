import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ── IndexedDB Schema ──────────────────────────────────────────────────────────

interface EduFocusDB extends DBSchema {
  notes: {
    key: string;
    value: any;
    indexes: { 'by-updated': string };
  };
  studyPacks: {
    key: string;
    value: any;
    indexes: { 'by-updated': string };
  };
  dashboardCache: {
    key: string;
    value: any;
  };
  quizAttempts: {
    key: number;
    value: any;
    indexes: { 'by-pack': string };
  };
  pendingSync: {
    key: number;
    value: PendingSyncEntry;
    indexes: { 'by-store': string };
  };
}

export interface PendingSyncEntry {
  id?: number;
  store: 'notes' | 'studyPacks' | 'quizAttempts' | 'todos' | 'dayPlans';
  action: 'create' | 'update' | 'delete';
  entityId: string;        // ID of the entity being modified
  data: any;               // Payload to send to server
  timestamp: number;       // Date.now() when the mutation happened
  retryCount: number;      // Number of sync attempts
}

const DB_NAME = 'edufocus-offline';
const DB_VERSION = 1;

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private db: IDBPDatabase<EduFocusDB> | null = null;
  private dbReady: Promise<IDBPDatabase<EduFocusDB>>;

  constructor() {
    this.dbReady = this.initDB();
  }

  // ── Database Initialization ───────────────────────────────────────────────

  private async initDB(): Promise<IDBPDatabase<EduFocusDB>> {
    const db = await openDB<EduFocusDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Notes store
        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: '_id' });
          noteStore.createIndex('by-updated', 'updatedAt');
        }

        // Study Packs store
        if (!db.objectStoreNames.contains('studyPacks')) {
          const packStore = db.createObjectStore('studyPacks', { keyPath: 'id' });
          packStore.createIndex('by-updated', 'updatedAt');
        }

        // Dashboard cache (keyed by arbitrary string like 'subjects', 'dayPlan:2026-06-17', etc.)
        if (!db.objectStoreNames.contains('dashboardCache')) {
          db.createObjectStore('dashboardCache');
        }

        // Quiz attempts
        if (!db.objectStoreNames.contains('quizAttempts')) {
          const attemptStore = db.createObjectStore('quizAttempts', {
            keyPath: 'id',
            autoIncrement: true
          });
          attemptStore.createIndex('by-pack', 'pack');
        }

        // Pending sync queue
        if (!db.objectStoreNames.contains('pendingSync')) {
          const syncStore = db.createObjectStore('pendingSync', {
            keyPath: 'id',
            autoIncrement: true
          });
          syncStore.createIndex('by-store', 'store');
        }
      }
    });

    this.db = db;
    return db;
  }

  private async getDB(): Promise<IDBPDatabase<EduFocusDB>> {
    if (this.db) return this.db;
    return this.dbReady;
  }

  // ── Generic CRUD ──────────────────────────────────────────────────────────

  async getAll<T = any>(storeName: 'notes' | 'studyPacks' | 'quizAttempts'): Promise<T[]> {
    const db = await this.getDB();
    return db.getAll(storeName) as Promise<T[]>;
  }

  async getById<T = any>(storeName: 'notes' | 'studyPacks', id: string): Promise<T | undefined> {
    const db = await this.getDB();
    return db.get(storeName, id) as Promise<T | undefined>;
  }

  async put(storeName: 'notes' | 'studyPacks', data: any): Promise<void> {
    const db = await this.getDB();
    await db.put(storeName, data);
  }

  async putAll(storeName: 'notes' | 'studyPacks', items: any[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(storeName, 'readwrite');
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  }

  async delete(storeName: 'notes' | 'studyPacks', id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete(storeName, id);
  }

  async clear(storeName: 'notes' | 'studyPacks' | 'quizAttempts' | 'dashboardCache' | 'pendingSync'): Promise<void> {
    const db = await this.getDB();
    await db.clear(storeName);
  }

  // ── Dashboard Cache ───────────────────────────────────────────────────────

  async getDashboardCache(key: string): Promise<any | undefined> {
    const db = await this.getDB();
    return db.get('dashboardCache', key);
  }

  async setDashboardCache(key: string, data: any): Promise<void> {
    const db = await this.getDB();
    await db.put('dashboardCache', data, key);
  }

  // ── Quiz Attempts ─────────────────────────────────────────────────────────

  async addQuizAttempt(attempt: any): Promise<void> {
    const db = await this.getDB();
    await db.add('quizAttempts', attempt);
  }

  async getQuizAttemptsByPack(packId: string): Promise<any[]> {
    const db = await this.getDB();
    return db.getAllFromIndex('quizAttempts', 'by-pack', packId);
  }

  // ── Pending Sync Queue ────────────────────────────────────────────────────

  async addPendingSync(entry: Omit<PendingSyncEntry, 'id'>): Promise<void> {
    const db = await this.getDB();
    await db.add('pendingSync', entry as PendingSyncEntry);
  }

  async getPendingSyncs(): Promise<PendingSyncEntry[]> {
    const db = await this.getDB();
    return db.getAll('pendingSync');
  }

  async removePendingSync(id: number): Promise<void> {
    const db = await this.getDB();
    await db.delete('pendingSync', id);
  }

  async updatePendingSyncRetry(id: number, retryCount: number): Promise<void> {
    const db = await this.getDB();
    const entry = await db.get('pendingSync', id);
    if (entry) {
      entry.retryCount = retryCount;
      await db.put('pendingSync', entry);
    }
  }

  async getPendingSyncCount(): Promise<number> {
    const db = await this.getDB();
    return db.count('pendingSync');
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  /** Generate a temporary offline ID (prefixed to distinguish from MongoDB ObjectIds) */
  generateOfflineId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
