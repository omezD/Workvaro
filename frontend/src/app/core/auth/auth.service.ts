import { Injectable, computed, inject } from '@angular/core';
import { KEYCLOAK_EVENT_SIGNAL } from 'keycloak-angular';
import Keycloak from 'keycloak-js';
import { initialsOf } from '../../shared/util/initials';
import { Role, isRole } from './roles';

export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  firstName: string;
  email: string;
  initials: string;
}

/**
 * The signed-in user as signals. Values are re-read whenever Keycloak emits an event
 * (ready, login, token refresh, logout). The access token itself stays inside keycloak-js memory;
 * it is never written to localStorage.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly keycloak = inject(Keycloak);
  private readonly events = inject(KEYCLOAK_EVENT_SIGNAL);

  readonly authenticated = computed(() => {
    this.events();
    return this.keycloak.authenticated === true;
  });

  readonly roles = computed<Role[]>(() => {
    this.events();
    return (this.keycloak.realmAccess?.roles ?? []).filter(isRole);
  });

  readonly user = computed<CurrentUser | null>(() => {
    this.events();
    const t = this.keycloak.tokenParsed;
    if (!t || !this.keycloak.authenticated) {
      return null;
    }
    const username = String(t['preferred_username'] ?? '');
    const name = String(t['name'] ?? username);
    const firstName = String(t['given_name'] ?? name.split(' ')[0] ?? username);
    return {
      id: t.sub ?? '',
      username,
      name,
      firstName,
      email: String(t['email'] ?? ''),
      initials: initialsOf(name),
    };
  });

  hasAnyRole(...roles: Role[]): boolean {
    const mine = this.roles();
    return roles.some((r) => mine.includes(r));
  }

  /** Sends the browser to the Keycloak sign-in page; returns to `redirectPath` afterwards. */
  login(redirectPath = '/app'): Promise<void> {
    return this.keycloak.login({ redirectUri: window.location.origin + redirectPath });
  }

  logout(): Promise<void> {
    return this.keycloak.logout({ redirectUri: window.location.origin + '/' });
  }

  /** Keycloak's own page where users change their password and set up two-factor sign-in. */
  manageAccount(): Promise<void> {
    return this.keycloak.accountManagement();
  }
}
