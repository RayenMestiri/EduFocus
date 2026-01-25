import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  stats?: {
    totalStudyMinutes?: number;
    totalSessions?: number;
    totalTasks?: number;
    completedTasks?: number;
    points?: number;
    streak?: number;
    longestStreak?: number;
    lastStudyDate?: Date;
  };
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Signal for reactive UI
  isAuthenticated = signal(false);
  currentUser = signal<User | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Don't call checkAuth() automatically - let components handle it
    // Just set initial state based on token presence
    const token = this.getToken();
    if (token) {
      this.isAuthenticated.set(true);
    }
  }

  // Check if user is authenticated - call this manually when needed
  checkAuth(): Observable<AuthResponse> {
    return this.getMe().pipe(
      tap(response => {
        if (response.success && response.user) {
          this.setUser(response.user);
        }
      })
    );
  }

  // Register new user
  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, {
      name,
      email,
      password
    }).pipe(
      tap(response => {
        if (response.success && response.token && response.user) {
          this.setToken(response.token);
          this.setUser(response.user);
        }
      })
    );
  }

  // Login user
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        if (response.success && response.token && response.user) {
          this.setToken(response.token);
          this.setUser(response.user);
        }
      })
    );
  }

  // Get current user
  getMe(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.apiUrl}/me`);
  }

  // Logout
  logout(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  // Get token from localStorage
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Set token in localStorage
  private setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  // Set user data
  private setUser(user: User): void {
    this.currentUserSubject.next(user);
    this.isAuthenticated.set(true);
    this.currentUser.set(user);
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Award points to user
  awardPoints(points: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/award-points`, { points }).pipe(
      tap(response => {
        if (response.success) {
          // Update local user stats with deep copy
          const user = this.currentUser();
          if (user) {
            const updatedUser = {
              ...user,
              stats: {
                ...user.stats,
                points: response.totalPoints
              }
            };
            this.currentUser.set(updatedUser);
            this.currentUserSubject.next(updatedUser);
          }
        }
      })
    );
  }

  // Get all timer settings
  getTimerSettings(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/timer-settings`);
  }

  // Update all timer settings
  updateTimerSettings(settings: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/timer-settings`, settings);
  }

  // Get daily sessions goal
  getSessionGoal(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/session-goal`);
  }

  // Update daily sessions goal
  updateSessionGoal(goal: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/session-goal`, { dailySessionsGoal: goal });
  }
}

