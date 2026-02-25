import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { StorageService } from './services/storage.service';

export const clientGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  let storage = inject(StorageService);

  const token = storage.getItem('bearer-token');

  if (token) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
