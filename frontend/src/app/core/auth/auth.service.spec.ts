import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { KEYCLOAK_EVENT_SIGNAL, KeycloakEvent, KeycloakEventType } from 'keycloak-angular';
import Keycloak from 'keycloak-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

function fakeKeycloak() {
  return {
    authenticated: true,
    realmAccess: { roles: ['HR', 'EMPLOYEE', 'offline_access', 'default-roles-ems'] },
    tokenParsed: {
      sub: '22222222-2222-4222-8222-222222222222',
      preferred_username: 'hr',
      name: 'Harini Rao',
      given_name: 'Harini',
      email: 'hr@ems.local',
    },
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    accountManagement: vi.fn().mockResolvedValue(undefined),
  };
}

describe('AuthService', () => {
  let keycloak: ReturnType<typeof fakeKeycloak>;
  let events: ReturnType<typeof signal<KeycloakEvent>>;
  let auth: AuthService;

  beforeEach(() => {
    keycloak = fakeKeycloak();
    events = signal<KeycloakEvent>({ type: KeycloakEventType.Ready });
    TestBed.configureTestingModule({
      providers: [
        { provide: Keycloak, useValue: keycloak },
        { provide: KEYCLOAK_EVENT_SIGNAL, useValue: events },
      ],
    });
    auth = TestBed.inject(AuthService);
  });

  it('exposes only the app roles, ignoring Keycloak built-ins', () => {
    expect(auth.roles()).toEqual(['HR', 'EMPLOYEE']);
    expect(auth.hasAnyRole('MANAGER', 'HR')).toBe(true);
    expect(auth.hasAnyRole('ADMIN')).toBe(false);
  });

  it('maps the token to the current user', () => {
    expect(auth.user()).toEqual({
      id: '22222222-2222-4222-8222-222222222222',
      username: 'hr',
      name: 'Harini Rao',
      firstName: 'Harini',
      email: 'hr@ems.local',
      initials: 'HR',
    });
  });

  it('clears the user after a logout event', () => {
    keycloak.authenticated = false;
    events.set({ type: KeycloakEventType.AuthLogout });

    expect(auth.authenticated()).toBe(false);
    expect(auth.user()).toBeNull();
  });

  it('returns to the requested page after sign-in and to the home page after sign-out', async () => {
    await auth.login('/app/leave');
    await auth.logout();

    expect(keycloak.login).toHaveBeenCalledWith({ redirectUri: window.location.origin + '/app/leave' });
    expect(keycloak.logout).toHaveBeenCalledWith({ redirectUri: window.location.origin + '/' });
  });
});
