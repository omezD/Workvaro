import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/auth.guards';

const placeholder = () => import('./features/placeholder/placeholder-page').then((m) => m.PlaceholderPage);

export const routes: Routes = [
  {
    path: '',
    title: 'Workvaro',
    loadComponent: () => import('./features/landing/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard | Workvaro',
        loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'people',
        title: 'People | Workvaro',
        loadComponent: placeholder,
        data: { title: 'People', subtitle: 'Find colleagues and their contact details.', icon: 'people' },
      },
      {
        path: 'leave',
        title: 'Leave | Workvaro',
        loadComponent: placeholder,
        data: { title: 'Leave', subtitle: 'Apply for leave, track requests and see your balance.', icon: 'leave' },
      },
      {
        path: 'attendance',
        title: 'Attendance | Workvaro',
        loadComponent: placeholder,
        data: { title: 'Attendance', subtitle: 'Check in and out, and fix a missed day.', icon: 'clock' },
      },
      {
        path: 'approvals',
        title: 'Approvals | Workvaro',
        canActivate: [roleGuard('MANAGER', 'HR')],
        loadComponent: placeholder,
        data: { title: 'Approvals', subtitle: 'Leave and attendance requests waiting for your decision.', icon: 'check' },
      },
      {
        path: 'holidays',
        title: 'Holidays | Workvaro',
        loadComponent: placeholder,
        data: { title: 'Holidays', subtitle: 'Company holidays for the year.', icon: 'star' },
      },
      {
        path: 'org',
        title: 'Org setup | Workvaro',
        canActivate: [roleGuard('ADMIN', 'HR')],
        loadComponent: placeholder,
        data: { title: 'Org setup', subtitle: 'Departments, designations and leave types.', icon: 'building' },
      },
      {
        path: 'no-access',
        title: 'No access | Workvaro',
        loadComponent: () => import('./features/system/no-access-page').then((m) => m.NoAccessPage),
      },
    ],
  },
  {
    path: '**',
    title: 'Page not found | Workvaro',
    loadComponent: () => import('./features/system/not-found-page').then((m) => m.NotFoundPage),
  },
];
