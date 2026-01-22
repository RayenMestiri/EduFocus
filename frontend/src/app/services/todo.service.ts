import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Todo, ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private apiUrl = 'http://localhost:5000/api/todos';

  constructor(private http: HttpClient) { }

  // Get todos by date
  getTodos(date: string): Observable<ApiResponse<Todo[]>> {
    return this.http.get<ApiResponse<Todo[]>>(`${this.apiUrl}/${date}`);
  }

  // Get todos with filters
  getTodosWithFilters(params: {
    date?: string;
    priority?: string;
    category?: string;
    done?: boolean;
    subjectId?: string;
  }): Observable<ApiResponse<Todo[]>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<Todo[]>>(`${this.apiUrl}?${queryParams}`);
  }

  // Create todo
  createTodo(todo: Partial<Todo>): Observable<ApiResponse<Todo>> {
    return this.http.post<ApiResponse<Todo>>(this.apiUrl, todo);
  }

  // Update todo
  updateTodo(id: string, todo: Partial<Todo>): Observable<ApiResponse<Todo>> {
    return this.http.put<ApiResponse<Todo>>(`${this.apiUrl}/${id}`, todo);
  }

  // Toggle todo done status
  toggleTodo(id: string): Observable<ApiResponse<Todo>> {
    return this.http.patch<ApiResponse<Todo>>(`${this.apiUrl}/${id}/toggle`, {});
  }

  // Toggle subtask
  toggleSubtask(todoId: string, subtaskId: string): Observable<ApiResponse<Todo>> {
    return this.http.patch<ApiResponse<Todo>>(`${this.apiUrl}/${todoId}/subtask/${subtaskId}/toggle`, {});
  }

  // Reorder todos
  reorderTodos(todos: Array<{ id: string; order: number }>): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/reorder`, { todos });
  }

  // Delete todo
  deleteTodo(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }
}
