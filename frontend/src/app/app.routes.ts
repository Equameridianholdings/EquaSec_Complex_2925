import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Register } from './register/register';
import { Dashboard } from './dashboard/dashboard';
import { GuardPortal } from './guard-portal/guard-portal';
import { GuardLogin } from './guard-login/guard-login';
import { AdminPortal } from './admin-portal/admin-portal';
import { SecurityManager } from './security-manager/security-manager';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: 'login', component: Login },
	{ path: 'guard-login', component: GuardLogin },
	{ path: 'register', component: Register },
	{ path: 'dashboard', component: Dashboard },
	{ path: 'guard-portal', component: GuardPortal },
	{ path: 'admin-portal', component: AdminPortal },
	{ path: 'security-manager', component: SecurityManager }
];
