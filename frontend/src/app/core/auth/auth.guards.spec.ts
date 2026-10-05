import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import Keycloak from 'keycloak-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authGuard, roleGuard } from './auth.guards';

describe('route guards', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/app/approvals' } as RouterStateSnapshot;
  let keycloak: { authenticated: boolean; realmAccess: { roles: string[] }; login: ReturnType<typeof vi.fn> };

  function signedInAs(...roles: string[]) {
    keycloak.authenticated = true;
    keycloak.realmAccess.roles = roles;
  }

  function run(guard: typeof authGuard) {
    return TestBed.runInInjectionContext(() => guard(route, state)) as Promise<boolean | UrlTree>;
  }

  beforeEach(() => {
    keycloak = { authenticated: false, realmAccess: { roles: [] }, login: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Keycloak, useValue: keycloak }],
    });
  });

  it('authGuard lets signed-in users through', async () => {
    signedInAs('EMPLOYEE');
    expect(await run(authGuard)).toBe(true);
  });

  it('authGuard sends visitors to sign-in and back to the page they wanted', async () => {
    expect(await run(authGuard)).toBe(false);
    expect(keycloak.login).toHaveBeenCalledWith({ redirectUri: window.location.origin + '/app/approvals' });
  });

  it('roleGuard allows any of the listed roles', async () => {
    signedInAs('HR', 'EMPLOYEE');
    expect(await run(roleGuard('MANAGER', 'HR'))).toBe(true);
  });

  it('roleGuard redirects other roles to the no-access page', async () => {
    signedInAs('EMPLOYEE');
    const result = await run(roleGuard('MANAGER', 'HR'));

    const router = TestBed.inject(Router);
    expect(result instanceof UrlTree && router.serializeUrl(result)).toBe('/app/no-access');
    expect(keycloak.login).not.toHaveBeenCalled();
  });

  it('roleGuard sends visitors to sign-in first', async () => {
    expect(await run(roleGuard('ADMIN'))).toBe(false);
    expect(keycloak.login).toHaveBeenCalled();
  });
});
