import { CanActivateFn } from '@angular/router';
// import jsonwebtoken from 'jsonwebtoken';
import { environment } from '../environments/environment';
import { inject } from '@angular/core';
import { StorageService } from './services/storage.service';

export const clientGuard: CanActivateFn = (route, state) => {
  // const { verify } = jsonwebtoken;
  let storage = inject(StorageService);

  const token = storage.getItem("bearer-token");

  if (token) {
    // const decoded = verify(token as string, environment.SECRET_KEY);
    // console.log(decoded);
    // if (decoded) return true;
    return true;
  }

  return false;
};
