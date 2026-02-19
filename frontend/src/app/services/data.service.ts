import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private apiUrl = environment.API_URI;

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}/${endpoint}`);
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${endpoint}`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.patch<T>(`${this.apiUrl}/${endpoint}`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}/${endpoint}`);
  }
}
