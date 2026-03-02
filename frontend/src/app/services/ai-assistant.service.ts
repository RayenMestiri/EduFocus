import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AiAssistantResponse {
  success: boolean;
  source: 'gemini' | 'fallback';
  advice: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiAssistantService {
  private apiUrl = (window as any).__API_BASE_URL__
    ? `${(window as any).__API_BASE_URL__}/api/ai`
    : 'http://localhost:5000/api/ai';

  constructor(private http: HttpClient) {}

  getStudyAdvice(payload: {
    context: any;
    question?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Observable<AiAssistantResponse> {
    return this.http.post<AiAssistantResponse>(`${this.apiUrl}/study-advice`, payload);
  }
}
