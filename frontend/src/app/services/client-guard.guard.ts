import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Location } from '@angular/common';

export const clientGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const location = inject(Location);

  const expectedRoles = route.data['roles'] as string[];

  if (authService.isTokenExpired()) {
    router.navigate(['./login']);
  }

  if (!authService.hasAnyRole(expectedRoles)) {
    // Redirect to access denied or login
    location.back();
    return false;
  }

  return true;
};
