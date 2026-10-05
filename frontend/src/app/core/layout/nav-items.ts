import { Role } from '../auth/roles';
import { IconName } from '../../shared/ui/icon';

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  /** Shown only to these roles; everyone signed in when omitted. Mirrors the route guards. */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/app/dashboard', icon: 'dashboard' },
  { label: 'People', path: '/app/people', icon: 'people' },
  { label: 'Leave', path: '/app/leave', icon: 'leave' },
  { label: 'Attendance', path: '/app/attendance', icon: 'clock' },
  { label: 'Approvals', path: '/app/approvals', icon: 'check', roles: ['MANAGER', 'HR'] },
  { label: 'Holidays', path: '/app/holidays', icon: 'star' },
  { label: 'Org setup', path: '/app/org', icon: 'building', roles: ['ADMIN', 'HR'] },
];

/** Most senior role first, for the label under the user's name. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  HR: 'HR',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};
