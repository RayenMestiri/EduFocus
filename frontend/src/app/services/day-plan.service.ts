import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DayPlan, ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DayPlanService {
  private apiUrl = 'http://localhost:5000/api/day-plans';

  constructor(private http: HttpClient) { }

  // Get day plan by date
  getDayPlan(date: string): Observable<ApiResponse<DayPlan>> {
    return this.http.get<ApiResponse<DayPlan>>(`${this.apiUrl}/${date}`);
  }

  // Get day plans for date range
  getDayPlansRange(startDate: string, endDate: string): Observable<ApiResponse<DayPlan[]>> {
    return this.http.get<ApiResponse<DayPlan[]>>(`${this.apiUrl}/range/${startDate}/${endDate}`);
  }

  // Save/Create day plan
  saveDayPlan(dayPlan: Partial<DayPlan>): Observable<ApiResponse<DayPlan>> {
    return this.http.post<ApiResponse<DayPlan>>(this.apiUrl, dayPlan);
  }

  // Update studied time for a subject
  updateStudiedTime(date: string, subjectId: string, studiedMinutes: number): Observable<ApiResponse<DayPlan>> {
    return this.http.patch<ApiResponse<DayPlan>>(`${this.apiUrl}/${date}/subject/${subjectId}`, {
      studiedMinutes
    });
  }

  // Add session to subject
  addSession(date: string, subjectId: string, session: {
    startTime: string;
    endTime: string;
    duration: number;
    completed?: boolean;
    note?: string;
  }): Observable<ApiResponse<DayPlan>> {
    return this.http.post<ApiResponse<DayPlan>>(`${this.apiUrl}/${date}/subject/${subjectId}/session`, session);
  }

  // Update day plan reflection
  updateReflection(date: string, reflection: {
    mood?: string;
    productivity?: number;
    notes?: string;
    achievements?: string[];
  }): Observable<ApiResponse<DayPlan>> {
    return this.http.patch<ApiResponse<DayPlan>>(`${this.apiUrl}/${date}/reflection`, reflection);
  }
}
