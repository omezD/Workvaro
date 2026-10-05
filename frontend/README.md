# Workvaro frontend

Angular 22 (standalone components, signals, zoneless), Angular Material restyled to the Workvaro "Evergreen"
theme, and Keycloak sign-in through `keycloak-angular`.

## Run

```bash
npm install
npm start
```

Open http://localhost:4200 (live reload on save). `/api` calls are forwarded to the gateway, by default
`http://localhost:8080` (see `proxy.conf.mjs`). If the gateway runs on another port, start with
`$env:GATEWAY_URL="http://localhost:8090"; npm start`.

| Command | What it does |
|---|---|
| `npm start` | Dev server on :4200 with live reload and the `/api` proxy |
| `npm run build` | Production build into `dist/frontend/browser` |
| `npx ng test --watch=false` | Unit tests (Vitest) |

## Structure

```
src/
  environments/            API base path and Keycloak settings (prod file swapped in by `ng build`)
  styles/                  _tokens.scss (colours, type, light/dark), _material.scss (Material restyle), _base.scss
  app/
    core/
      auth/                Keycloak setup (check-sso + PKCE), AuthService signals, authGuard/roleGuard
      http/                API error model and the global error interceptor
      errors/              last-resort ErrorHandler (snackbar)
      notify/              snackbar messages
      theme/               light/dark switch, remembered per device
      layout/              signed-in shell: forest sidebar, role-filtered navigation, user menu
    shared/ui/             icon, avatar (initials), page header, empty state, status chip, logo
    features/              landing, dashboard, placeholder screens, no-access, not-found
```

## Auth flow

- The landing page is public. Keycloak runs `check-sso`, so a returning user is recognised without a redirect.
- `/app/**` requires sign-in (`authGuard` redirects to Keycloak). Approvals need MANAGER or HR, and org setup
  needs ADMIN or HR (`roleGuard`). The backend enforces the same rules again.
- The access token is attached only to `/api` requests and lives in memory (keycloak-js), never in localStorage.
  It refreshes while the user is active; after 30 minutes idle the user is signed out.
