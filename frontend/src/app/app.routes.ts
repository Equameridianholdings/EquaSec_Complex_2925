import { Routes } from '@angular/router';
import { Login } from './login/login';

import { Dashboard } from './dashboard/dashboard';
import { GuardPortal } from './guard-portal/guard-portal';

import { AdminPortal } from './admin-portal/admin-portal';
import { SecurityManager } from './security-manager/security-manager';
import { Visitors } from './dashboard/visitors/visitors';
import { AllUnits } from './dashboard/all-units/all-units';
import { Vehicles } from './dashboard/vehicles/vehicles';
import { Notfound } from './notfound/notfound';
import { ForgetPassword } from './forget-password/forget-password';
import { clientGuard } from './services/client-guard.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: Login },
  {
    path: 'dashboard',
    component: Dashboard,
    children: [
      {
        path: 'visitors',
        component: Visitors,
      },
      {
        path: 'units',
        component: AllUnits,
      },
      {
        path: 'vehicles',
        component: Vehicles,
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'visitors',
      },
      {
        path: '**',
        component: Notfound,
      },
    ],
    canActivate: [clientGuard],
    data: { roles: ['tenant'] }
  },
  { path: 'guard-portal', component: GuardPortal, canActivate: [clientGuard], data: { roles: ['admin', 'security', 'manager'] } },
  { path: 'admin-portal', component: AdminPortal, canActivate: [clientGuard], data: { roles: ['admin'] } },
  { path: 'security-manager', component: SecurityManager, canActivate: [clientGuard], data: { roles: ['admin', 'manager'] }},
  { path: 'forgot-password/:email/:token', component: ForgetPassword },
  { path: '**', component: Notfound },
];
