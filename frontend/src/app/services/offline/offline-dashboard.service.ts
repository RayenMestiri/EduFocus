import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { IndexedDbService } from './indexed-db.service';
import { ConnectivityService } from './connectivity.service';
import { SubjectService } from '../subject.service';
import { DayPlanService } from '../day-plan.service';
import { TodoService } from '../todo.service';
import { AuthService } from '../auth.service';
import { Subject, DayPlan, Todo, ApiResponse } from '../../models';
import { environment } from '../../../environments/environment';

/**
 * Offline-first wrapper for dashboard data.
 * Caches subjects, day plans, todos, and stats in IndexedDB.
 * Returns cached data when offline.
 */
@Injectable({
  providedIn: 'root'
})
export class OfflineDashboardService {
  private db = inject(IndexedDbService);
  private connectivity = inject(ConnectivityService);
  private subjectService = inject(SubjectService);
  private dayPlanService = inject(DayPlanService);
  private todoService = inject(TodoService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  private apiUrl = environment.apiUrl;

  // ── Subjects ──────────────────────────────────────────────────────────

  getSubjects(): Observable<ApiResponse<Subject[]>> {
    if (this.connectivity.isOnline()) {
      return this.subjectService.getSubjects().pipe(
        tap(res => {
          if (res.success && res.data) {
            this.db.setDashboardCache('subjects', res.data);
          }
        }),
        catchError(() => from(this.getCachedSubjects()))
      );
    }
    return from(this.getCachedSubjects());
  }

  private async getCachedSubjects(): Promise<ApiResponse<Subject[]>> {
    const cached = await this.db.getDashboardCache('subjects');
    return { success: true, data: cached || [] };
  }

  // ── Day Plan ──────────────────────────────────────────────────────────

  getDayPlan(date: string): Observable<ApiResponse<DayPlan>> {
    if (this.connectivity.isOnline()) {
      return this.dayPlanService.getDayPlan(date).pipe(
        tap(res => {
          if (res.success && res.data) {
            this.db.setDashboardCache(`dayPlan:${date}`, res.data);
          }
        }),
        catchError(() => from(this.getCachedDayPlan(date)))
      );
    }
    return from(this.getCachedDayPlan(date));
  }

  private async getCachedDayPlan(date: string): Promise<ApiResponse<DayPlan>> {
    const cached = await this.db.getDashboardCache(`dayPlan:${date}`);
    return { success: !!cached, data: cached || undefined };
  }

  getDayPlansRange(startDate: string, endDate: string): Observable<ApiResponse<DayPlan[]>> {
    if (this.connectivity.isOnline()) {
      return this.dayPlanService.getDayPlansRange(startDate, endDate).pipe(
        tap(res => {
          if (res.success && res.data) {
            this.db.setDashboardCache(`dayPlansRange:${startDate}:${endDate}`, res.data);
            // Also cache individual plans
            res.data.forEach(plan => {
              this.db.setDashboardCache(`dayPlan:${plan.date}`, plan);
            });
          }
        }),
        catchError(() => from(this.getCachedDayPlansRange(startDate, endDate)))
      );
    }
    return from(this.getCachedDayPlansRange(startDate, endDate));
  }

  private async getCachedDayPlansRange(startDate: string, endDate: string): Promise<ApiResponse<DayPlan[]>> {
    const cached = await this.db.getDashboardCache(`dayPlansRange:${startDate}:${endDate}`);
    return { success: true, data: cached || [] };
  }

  // ── Todos ─────────────────────────────────────────────────────────────

  getTodos(date: string): Observable<ApiResponse<Todo[]>> {
    if (this.connectivity.isOnline()) {
      return this.todoService.getTodos(date).pipe(
        tap(res => {
          if (res.success && res.data) {
            this.db.setDashboardCache(`todos:${date}`, res.data);
          }
        }),
        catchError(() => from(this.getCachedTodos(date)))
      );
    }
    return from(this.getCachedTodos(date));
  }

  private async getCachedTodos(date: string): Promise<ApiResponse<Todo[]>> {
    const cached = await this.db.getDashboardCache(`todos:${date}`);
    return { success: true, data: cached || [] };
  }

  // ── User / Auth ───────────────────────────────────────────────────────

  checkAuth() {
    if (this.connectivity.isOnline()) {
      return this.authService.checkAuth().pipe(
        tap(res => {
          if (res.success && res.user) {
            this.db.setDashboardCache('currentUser', res.user);
          }
        }),
        catchError(() => from(this.getCachedUser()))
      );
    }
    return from(this.getCachedUser());
  }

  private async getCachedUser(): Promise<any> {
    const user = await this.db.getDashboardCache('currentUser');
    return { success: !!user, user: user || null };
  }

  // ── Timer Settings ────────────────────────────────────────────────────

  getTimerSettings(): Observable<any> {
    if (this.connectivity.isOnline()) {
      return this.authService.getTimerSettings().pipe(
        tap(res => {
          if (res.success) {
            this.db.setDashboardCache('timerSettings', res.settings);
          }
        }),
        catchError(() => from(this.getCachedTimerSettings()))
      );
    }
    return from(this.getCachedTimerSettings());
  }

  private async getCachedTimerSettings(): Promise<any> {
    const settings = await this.db.getDashboardCache('timerSettings');
    return { success: true, settings: settings || null };
  }

  getSessionGoal(): Observable<any> {
    if (this.connectivity.isOnline()) {
      return this.authService.getSessionGoal().pipe(
        tap(res => {
          if (res.success) {
            this.db.setDashboardCache('sessionGoal', res.dailySessionsGoal);
          }
        }),
        catchError(() => from(this.getCachedSessionGoal()))
      );
    }
    return from(this.getCachedSessionGoal());
  }

  private async getCachedSessionGoal(): Promise<any> {
    const goal = await this.db.getDashboardCache('sessionGoal');
    return { success: true, dailySessionsGoal: goal || 4 };
  }

  // ── Pass-through methods (require online) ─────────────────────────────

  saveDayPlan(dayPlan: Partial<DayPlan>) {
    return this.dayPlanService.saveDayPlan(dayPlan);
  }

  updateStudiedTime(date: string, subjectId: string, studiedMinutes: number) {
    return this.dayPlanService.updateStudiedTime(date, subjectId, studiedMinutes);
  }

  addSession(date: string, subjectId: string, session: any) {
    return this.dayPlanService.addSession(date, subjectId, session);
  }

  createTodo(todo: Partial<Todo>) {
    return this.todoService.createTodo(todo);
  }

  toggleTodo(id: string) {
    return this.todoService.toggleTodo(id);
  }

  deleteTodo(id: string) {
    return this.todoService.deleteTodo(id);
  }
}
