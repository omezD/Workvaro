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
| `npm start` | Dev server on :4200 with live reload and the `/api` proxy (needs the backend + Keycloak) |
| `npm run demo` | The same app with a built-in fake backend and sample company, no backend needed |
| `npm run build` | Production build into `dist/frontend/browser` |
| `npx ng test --watch=false` | Unit tests (Vitest) |

## Demo mode

`npm run demo` runs the full app without Docker, Keycloak or the Java services:
- **Signed in automatically.** The dark pill at the bottom right switches between Employee (Esha), Manager (Manoj), HR (Harini) and Admin (Asha).
- **Sample company:** 13 people, leave and attendance history, pending requests and a missed check-in.
- **Realistic rules:** an in-browser fake backend applies the same main rules as the real services (who can see which profile, who can approve, overlaps, balances).
- **Changes carry over between personas** for the browser session. For example, apply as Esha, switch to Manoj and approve, then switch back and see the balance. "Reset data" starts over.

It's a separate build configuration (`angular.json` swaps `core/demo/demo-mode.ts` for `demo-mode.demo.ts`), so none of the demo code is in the production build.

## Screens

| Route | Who | What |
|---|---|---|
| `/` | everyone | Landing page with sign-in |
| `/app/dashboard` | everyone | My day (check-in/out), balances, holidays, upcoming leave. Managers/HR: who's in, approvals inbox, who's away strip. HR/Admin: headcount by department |
| `/app/people` | everyone | Directory cards with search and department filter (HR also filters by status) |
| `/app/people/:id` | self, manager, HR | Profile. Managers see the bank number masked, others get a "private" message |
| `/app/people/new`, `/:id/edit` | HR, Admin | Add/edit employee form with server-side validation messages |
| `/app/profile` | everyone | My profile; contact details are editable |
| `/app/leave` | everyone | Balance, my requests (cancel while pending), apply dialog with live working-day count. Managers/HR: calendar and request list |
| `/app/attendance` | everyone | Day-by-day month view, missed days, correction requests. Managers/HR: who's in today |
| `/app/approvals` | Manager, HR | Pending leave and attendance fixes; approve, or reject with a reason |
| `/app/holidays` | everyone | Holiday list per year; HR/Admin add and remove |
| `/app/org` | HR, Admin | Departments, designations, leave types |

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
      api/                 typed models (mirroring the backend DTOs) and API services
      demo/                demo mode: sample data, in-browser backend, persona switcher
    shared/ui/             icon, avatar, page header, empty state, status chip, balance ring, leave strip,
                           confirm dialog, logo
    shared/util/           date helpers (same working-day rule as the backend), initials
    features/              landing, dashboard, people, leave, attendance, approvals, holidays, org, system
```

## Auth flow

- The landing page is public. Keycloak runs `check-sso`, so a returning user is recognised without a redirect.
- `/app/**` requires sign-in (`authGuard` redirects to Keycloak). Approvals need MANAGER or HR, and org setup
  needs ADMIN or HR (`roleGuard`). The backend enforces the same rules again.
- The access token is attached only to `/api` requests and lives in memory (keycloak-js), never in localStorage.
  It refreshes while the user is active; after 30 minutes idle the user is signed out.
