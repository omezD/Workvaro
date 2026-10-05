import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, EnvironmentProviders, Provider, signal } from '@angular/core';
import { INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG, KEYCLOAK_EVENT_SIGNAL, KeycloakEvent, KeycloakEventType } from 'keycloak-angular';
import Keycloak from 'keycloak-js';
import { mergeMap, of, throwError, timer } from 'rxjs';
import { todayIso } from '../../shared/util/dates';
import { DemoDb, PERSONAS, PersonaKey, seedDb } from './demo-data';
import { handleDemoRequest } from './demo-backend';

// Demo build (`npm run demo`): a fake signed-in user and an in-browser backend with sample data.
// Changes are kept in sessionStorage, so you can apply as the employee, switch to the manager and approve.

export const DEMO_MODE = true;

const DB_KEY = 'wv-demo-db';
const PERSONA_KEY = 'wv-demo-persona';
const SIGNED_IN_KEY = 'wv-demo-signed-in';

function loadDb(): DemoDb {
  try {
    const stored = JSON.parse(sessionStorage.getItem(DB_KEY) ?? 'null') as { day: string; db: DemoDb } | null;
    if (stored && stored.day === todayIso()) {
      return stored.db;
    }
  } catch {
    // corrupted or unavailable storage: start fresh
  }
  return seedDb();
}

function saveDb(db: DemoDb): void {
  try {
    sessionStorage.setItem(DB_KEY, JSON.stringify({ day: todayIso(), db }));
  } catch {
    // storage full or blocked: changes last until the next reload
  }
}

function persona(): PersonaKey {
  const p = sessionStorage.getItem(PERSONA_KEY) as PersonaKey | null;
  return p && p in PERSONAS ? p : 'manager';
}

const signedIn = () => sessionStorage.getItem(SIGNED_IN_KEY) !== 'false';

function fakeKeycloak() {
  const db = loadDb();
  const me = db.people.find((p) => p.keycloakUserId === PERSONAS[persona()].userId)!;
  const authenticated = signedIn();
  return {
    authenticated,
    token: 'demo-token',
    tokenParsed: authenticated
      ? { sub: me.keycloakUserId, preferred_username: me.email.split('@')[0], name: me.fullName, given_name: me.firstName, email: me.email }
      : undefined,
    realmAccess: { roles: authenticated ? [...me.roles] : [] },
    resourceAccess: {},
    updateToken: async () => false,
    login: async (options?: { redirectUri?: string }) => {
      sessionStorage.setItem(SIGNED_IN_KEY, 'true');
      location.href = options?.redirectUri ?? '/app/dashboard';
    },
    logout: async () => {
      sessionStorage.setItem(SIGNED_IN_KEY, 'false');
      location.href = '/';
    },
    accountManagement: async () => {
      alert('In the real app this opens Keycloak, where people change their password and set up two-factor sign-in.');
    },
  };
}

export function demoProviders(): (Provider | EnvironmentProviders)[] {
  return [
    { provide: Keycloak, useFactory: fakeKeycloak },
    { provide: KEYCLOAK_EVENT_SIGNAL, useFactory: () => signal<KeycloakEvent>({ type: KeycloakEventType.Ready }) },
    { provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG, useValue: [] },
  ];
}

/** Answers /api calls from the in-browser demo backend, with a short delay so loading states show. */
const demoApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }
  const db = loadDb();
  const result = handleDemoRequest(
    db,
    PERSONAS[persona()].userId,
    req.method,
    new URL(req.urlWithParams, location.origin),
    req.body as Record<string, unknown> | null,
  );
  saveDb(db);
  return timer(180 + Math.random() * 220).pipe(
    mergeMap(() =>
      result.status >= 400
        ? throwError(() => new HttpErrorResponse({ status: result.status, error: result.body, url: req.url }))
        : of(new HttpResponse({ status: result.status, body: result.body, url: req.url })),
    ),
  );
};

export const demoInterceptors: HttpInterceptorFn[] = [demoApiInterceptor];

/** Floating control to switch the demo user or reset the sample data. */
@Component({
  selector: 'wv-demo-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="tag">Demo</span>
    <label class="sr-only" for="wv-demo-persona">View as</label>
    <select id="wv-demo-persona" (change)="switchTo($any($event.target).value)">
      @for (p of personas; track p.key) {
        <option [value]="p.key" [selected]="p.key === current">{{ p.label }}</option>
      }
    </select>
    <button type="button" (click)="reset()">Reset data</button>
  `,
  styles: `
    :host {
      position: fixed; right: 16px; bottom: 16px; z-index: 1000;
      display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 10px;
      background: var(--wv-ink); color: var(--wv-canvas); border-radius: 99px;
      box-shadow: 0 8px 24px rgb(0 0 0 / 25%); font-size: 13px;
    }
    .tag { font-weight: 700; color: var(--wv-gold); }
    select, button {
      font: inherit; border: 0; border-radius: 99px; padding: 6px 10px; cursor: pointer;
      background: rgb(255 255 255 / 12%); color: inherit;
    }
    option { color: #13261d; }
  `,
})
export class DemoBar {
  protected readonly personas = (Object.keys(PERSONAS) as PersonaKey[]).map((key) => ({ key, label: PERSONAS[key].label }));
  protected readonly current = persona();

  protected switchTo(key: PersonaKey): void {
    sessionStorage.setItem(PERSONA_KEY, key);
    sessionStorage.setItem(SIGNED_IN_KEY, 'true');
    location.href = '/app/dashboard';
  }

  protected reset(): void {
    sessionStorage.removeItem(DB_KEY);
    location.reload();
  }
}
