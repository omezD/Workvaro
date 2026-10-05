/** Keycloak realm roles used by the backend. */
export type Role = 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';

export const ALL_ROLES: readonly Role[] = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];

export function isRole(value: string): value is Role {
  return (ALL_ROLES as readonly string[]).includes(value);
}
