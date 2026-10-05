import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { createAuthGuard } from 'keycloak-angular';
import { Role } from './roles';

/** Any signed-in user. Anonymous visitors are sent to the Keycloak sign-in page. */
export const authGuard: CanActivateFn = createAuthGuard<CanActivateFn>(async (_route, state, { authenticated, keycloak }) => {
  if (authenticated) {
    return true;
  }
  await keycloak.login({ redirectUri: window.location.origin + state.url });
  return false;
});

/**
 * Signed-in users holding at least one of `roles`. Others land on the "no access" page.
 * The backend enforces the same rules; this guard only keeps people out of screens they can't use.
 */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return createAuthGuard<CanActivateFn>(async (_route, state, { authenticated, grantedRoles, keycloak }) => {
    const router = inject(Router);
    if (!authenticated) {
      await keycloak.login({ redirectUri: window.location.origin + state.url });
      return false;
    }
    return roles.some((r) => grantedRoles.realmRoles.includes(r)) ? true : router.createUrlTree(['/app/no-access']);
  });
}
