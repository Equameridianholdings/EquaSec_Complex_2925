import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Register } from './register/register';
import { Dashboard } from './dashboard/dashboard';
import { GuardPortal } from './guard-portal/guard-portal';
import { GuardLogin } from './guard-login/guard-login';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: 'login', component: Login },
	{ path: 'guard-login', component: GuardLogin },
	{ path: 'register', component: Register },
	{ path: 'dashboard', component: Dashboard },
	{ path: 'guard-portal', component: GuardPortal }
];
