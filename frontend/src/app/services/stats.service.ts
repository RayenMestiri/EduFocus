import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  User, 
  DashboardStats, 
  WeeklyStats, 
  MonthlyStats, 
  SubjectAnalytics,
  ApiResponse 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private apiUrl = 'http://localhost:5000/api/stats';

  constructor(private http: HttpClient) { }

  // Get user profile with stats
  getProfile(): Observable<ApiResponse<Partial<User>>> {
    return this.http.get<ApiResponse<Partial<User>>>(`${this.apiUrl}/profile`);
  }

  // Get dashboard stats
  getDashboardStats(): Observable<ApiResponse<DashboardStats>> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.apiUrl}/dashboard`);
  }

  // Get weekly stats
  getWeeklyStats(): Observable<ApiResponse<WeeklyStats>> {
    return this.http.get<ApiResponse<WeeklyStats>>(`${this.apiUrl}/weekly`);
  }

  // Get monthly stats
  getMonthlyStats(year: number, month: number): Observable<ApiResponse<MonthlyStats>> {
    return this.http.get<ApiResponse<MonthlyStats>>(`${this.apiUrl}/monthly/${year}/${month}`);
  }

  // Get subject analytics
  getSubjectAnalytics(
    subjectId: string, 
    startDate?: string, 
    endDate?: string
  ): Observable<ApiResponse<SubjectAnalytics>> {
    let url = `${this.apiUrl}/subjects/${subjectId}/analytics`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    return this.http.get<ApiResponse<SubjectAnalytics>>(url);
  }
}
