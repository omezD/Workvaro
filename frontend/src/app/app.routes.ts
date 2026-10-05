import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/auth.guards';

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
        loadComponent: () => import('./features/people/people-page').then((m) => m.PeoplePage),
      },
      {
        path: 'people/new',
        title: 'Add employee | Workvaro',
        canActivate: [roleGuard('HR', 'ADMIN')],
        loadComponent: () => import('./features/people/employee-form-page').then((m) => m.EmployeeFormPage),
      },
      {
        path: 'people/:id',
        title: 'Profile | Workvaro',
        loadComponent: () => import('./features/people/person-page').then((m) => m.PersonPage),
      },
      {
        path: 'people/:id/edit',
        title: 'Edit employee | Workvaro',
        canActivate: [roleGuard('HR', 'ADMIN')],
        loadComponent: () => import('./features/people/employee-form-page').then((m) => m.EmployeeFormPage),
      },
      {
        path: 'profile',
        title: 'My profile | Workvaro',
        loadComponent: () => import('./features/people/my-profile-page').then((m) => m.MyProfilePage),
      },
      {
        path: 'leave',
        title: 'Leave | Workvaro',
        loadComponent: () => import('./features/leave/leave-page').then((m) => m.LeavePage),
      },
      {
        path: 'attendance',
        title: 'Attendance | Workvaro',
        loadComponent: () => import('./features/attendance/attendance-page').then((m) => m.AttendancePage),
      },
      {
        path: 'approvals',
        title: 'Approvals | Workvaro',
        canActivate: [roleGuard('MANAGER', 'HR')],
        loadComponent: () => import('./features/approvals/approvals-page').then((m) => m.ApprovalsPage),
      },
      {
        path: 'holidays',
        title: 'Holidays | Workvaro',
        loadComponent: () => import('./features/holidays/holidays-page').then((m) => m.HolidaysPage),
      },
      {
        path: 'org',
        title: 'Org setup | Workvaro',
        canActivate: [roleGuard('ADMIN', 'HR')],
        loadComponent: () => import('./features/org/org-page').then((m) => m.OrgPage),
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
