import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Subject, ApiResponse, SubjectAnalytics } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SubjectService {
  private apiUrl = 'http://localhost:5000/api/subjects';

  constructor(private http: HttpClient) { }

  // Get all subjects
  getSubjects(includeArchived = false): Observable<ApiResponse<Subject[]>> {
    return this.http.get<ApiResponse<Subject[]>>(`${this.apiUrl}?includeArchived=${includeArchived}`);
  }

  // Get subject by ID
  getSubjectById(id: string): Observable<ApiResponse<Subject>> {
    return this.http.get<ApiResponse<Subject>>(`${this.apiUrl}/${id}`);
  }

  // Create subject
  createSubject(subject: Partial<Subject>): Observable<ApiResponse<Subject>> {
    return this.http.post<ApiResponse<Subject>>(this.apiUrl, subject);
  }

  // Update subject
  updateSubject(id: string, subject: Partial<Subject>): Observable<ApiResponse<Subject>> {
    return this.http.put<ApiResponse<Subject>>(`${this.apiUrl}/${id}`, subject);
  }

  // Update subject stats
  updateSubjectStats(id: string, minutes: number): Observable<ApiResponse<Subject>> {
    return this.http.patch<ApiResponse<Subject>>(`${this.apiUrl}/${id}/stats`, { minutes });
  }

  // Archive/unarchive subject
  archiveSubject(id: string, isArchived: boolean): Observable<ApiResponse<Subject>> {
    return this.http.patch<ApiResponse<Subject>>(`${this.apiUrl}/${id}/archive`, { isArchived });
  }

  // Reorder subjects
  reorderSubjects(subjects: Array<{ id: string; order: number }>): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/reorder`, { subjects });
  }

  // Delete subject
  deleteSubject(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  // Get subject analytics
  getSubjectAnalytics(id: string, startDate?: string, endDate?: string): Observable<ApiResponse<SubjectAnalytics>> {
    let url = `http://localhost:5000/api/stats/subjects/${id}/analytics`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    return this.http.get<ApiResponse<SubjectAnalytics>>(url);
  }
}
