import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private apiUrl = process.env['NG_APP_API_URI'];

  constructor(private http: HttpClient) {}

  get<T>(
    endpoint: string,
    options?: {
      headers?: Record<string, string>;
      params?: Record<string, string | number | boolean>;
    },
  ): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}/${endpoint}`, options);
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  uniquePost<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(endpoint, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.patch<T>(`${this.apiUrl}/${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}/${endpoint}`);
  }
}
