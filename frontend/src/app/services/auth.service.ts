import { inject, Injectable, signal } from '@angular/core';
import { UserDTO } from '../interfaces/userDTO';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';
import { DataService } from './data.service';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { ResponseBody } from '../interfaces/ResponseBody';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  payload = signal<any>({});
  currentUser = signal<UserDTO>({
    cellNumber: '',
    confirmPassword: '',
    emailAddress: '',
    movedOut: false,
    name: '',
    password: '',
    profilePhoto: '',
    surname: '',
    type: [],
    visitorsTokens: 0,
  });
  private jwtHelper = new JwtHelperService();
  private _snackBar = inject(MatSnackBar);
  router = inject(Router);
  dataService = inject(DataService);
  horizontalPosition: MatSnackBarHorizontalPosition | undefined;
  verticalPosition: MatSnackBarVerticalPosition | undefined;
  token = signal<string>("");

  constructor() {
    const tempToken = localStorage.getItem('bearer-token') as string;
    if (tempToken) {
      this.token.update(() => tempToken);
      this.payload.update(() => this.decodeToken());
    } else {
      this.router.navigate(['/login']);
    }
  }

  decodeToken() {
    return this.jwtHelper.decodeToken(this.token());
  }

  public isTokenExpired(): boolean {
    return this.jwtHelper.isTokenExpired(this.token());
  }

  getUser(): UserDTO | null {
    this.dataService.get<ResponseBody>('user/current/').subscribe({
      next: (res) => this.currentUser.update(() => res.payload as UserDTO),
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
      },
    });
    return this.currentUser();
  }

  hasRole(role: string): boolean {
    return (this.payload().role as string[]).includes(role) ?? false;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }
}
