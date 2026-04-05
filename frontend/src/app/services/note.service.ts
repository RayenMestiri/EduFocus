import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Note, NoteFilter, ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private apiUrl = `${environment.apiUrl}/api/notes`;

  constructor(private http: HttpClient) {}

  getNotes(filters?: NoteFilter): Observable<ApiResponse<Note[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const query = params.toString();
    return this.http.get<ApiResponse<Note[]>>(query ? `${this.apiUrl}?${query}` : this.apiUrl);
  }

  getTags(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/tags`);
  }

  createNote(note: Partial<Note> & { password?: string }): Observable<ApiResponse<Note>> {
    return this.http.post<ApiResponse<Note>>(this.apiUrl, note);
  }

  updateNote(id: string, note: Partial<Note> & { password?: string }): Observable<ApiResponse<Note>> {
    return this.http.put<ApiResponse<Note>>(`${this.apiUrl}/${id}`, note);
  }

  deleteNote(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  togglePin(id: string): Observable<ApiResponse<Note>> {
    return this.http.patch<ApiResponse<Note>>(`${this.apiUrl}/${id}/pin`, {});
  }

  toggleArchive(id: string): Observable<ApiResponse<Note>> {
    return this.http.patch<ApiResponse<Note>>(`${this.apiUrl}/${id}/archive`, {});
  }

  changeColor(id: string, color: string): Observable<ApiResponse<Note>> {
    return this.http.patch<ApiResponse<Note>>(`${this.apiUrl}/${id}/color`, { color });
  }

  verifyPassword(id: string, password: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${id}/verify-password`, { password });
  }
}
