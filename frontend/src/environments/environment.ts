// Development settings. Production values live in environment.prod.ts (swapped in by `ng build`).
export const environment = {
  production: false,
  /** API calls go to /api on the same origin; `ng serve` proxies them to the gateway (proxy.conf.mjs). */
  apiBaseUrl: '/api',
  keycloak: {
    url: 'http://localhost:8180',
    realm: 'ems',
    clientId: 'ems-frontend',
  },
  /** Where "Try the live demo" goes: a separate deployment built with `npm run demo`. */
  demoUrl: 'http://localhost:4300/app/dashboard',
  /** Sign the user out after this much inactivity. */
  sessionTimeoutMs: 30 * 60 * 1000,
};
