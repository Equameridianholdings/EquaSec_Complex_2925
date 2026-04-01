import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private apiUrl = process.env['NG_APP_API_URI'];
  // authService = inject(AuthService);
  router = inject(Router);
  // private _snackBar = inject(MatSnackBar);
  // horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  // verticalPosition: MatSnackBarVerticalPosition = 'top';
  constructor(private http: HttpClient) {}

  // isValid() {
  //   if (this.authService.isTokenExpired()) {
  //     this._snackBar.open('Session Ended!', 'close', {
  //       horizontalPosition: this.horizontalPosition,
  //       verticalPosition: this.verticalPosition,
  //     });
  //     this.router.navigate(['./login']);
  //     return false;
  //   }

  //   return true;
  // }

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
