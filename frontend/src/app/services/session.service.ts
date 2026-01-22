import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StudySession, ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private apiUrl = 'http://localhost:5000/api/sessions';

  constructor(private http: HttpClient) { }

  // Get sessions with filters
  getSessions(params?: {
    date?: string;
    subjectId?: string;
    startDate?: string;
    endDate?: string;
    type?: string;
    completed?: boolean;
  }): Observable<ApiResponse<StudySession[]>> {
    let url = this.apiUrl;
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
      url += `?${queryParams}`;
    }
    return this.http.get<ApiResponse<StudySession[]>>(url);
  }

  // Get session by ID
  getSessionById(id: string): Observable<ApiResponse<StudySession>> {
    return this.http.get<ApiResponse<StudySession>>(`${this.apiUrl}/${id}`);
  }

  // Create session
  createSession(session: Partial<StudySession>): Observable<ApiResponse<StudySession>> {
    return this.http.post<ApiResponse<StudySession>>(this.apiUrl, session);
  }

  // Start new session
  startSession(data: {
    subjectId: string;
    type?: string;
    tags?: string[];
  }): Observable<ApiResponse<StudySession>> {
    return this.http.post<ApiResponse<StudySession>>(`${this.apiUrl}/start`, data);
  }

  // End active session
  endSession(id: string, data: {
    focusLevel?: number;
    notes?: string;
    interruptions?: number;
  }): Observable<ApiResponse<StudySession>> {
    return this.http.patch<ApiResponse<StudySession>>(`${this.apiUrl}/end/${id}`, data);
  }

  // Get active session
  getActiveSession(): Observable<ApiResponse<StudySession>> {
    return this.http.get<ApiResponse<StudySession>>(`${this.apiUrl}/active/current`);
  }

  // Update session
  updateSession(id: string, session: Partial<StudySession>): Observable<ApiResponse<StudySession>> {
    return this.http.put<ApiResponse<StudySession>>(`${this.apiUrl}/${id}`, session);
  }

  // Delete session
  deleteSession(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }
}
