# EMS: Employee Management System

Spring Boot microservices backend (Java 17, Boot 3.5, Spring Cloud 2025.0) + Keycloak + PostgreSQL.
Angular frontend (Workvaro) in `frontend/`. Plans: [EMS-Project-Plan.md](EMS-Project-Plan.md), [EMS-Execution-Plan.md](EMS-Execution-Plan.md).

## Layout

```
frontend/                   Angular 22 web app (Workvaro), see frontend/README.md
pom.xml                     parent POM (modules below), Maven Wrapper: mvnw / mvnw.cmd
common-lib/                 shared: JWT resource-server security, Keycloak role converter, CurrentUser,
                            GlobalExceptionHandler + ApiError, PageResponse, AES-GCM field encryption
api-gateway/        :8080   Spring Cloud Gateway: routing, JWT check, CORS, security headers, rate limit
employee-service/   :8081   departments, designations, employees, directory, profile, team, stats
leave-attendance-service/ :8082  leave types, balances, requests + approvals, holidays,
                            check-in/out, corrections, dashboards (calls employee-service via OpenFeign)
infra/
  docker-compose.yml        postgres:16 (:5434) + keycloak:26 (:8180)
  postgres/init.sql         creates employee_db, leave_db, keycloak_db
  keycloak/realm-ems.json   realm "ems": roles, clients, password policy, brute-force lockout, seed users
```

Each service: `controller -> service -> repository -> entity`, plus `dto/`, `mapper/` (MapStruct), `config/`,
Flyway migrations in `src/main/resources/db/migration`.

## Run locally

Prerequisites: JDK 17 (`java -version`), Docker Desktop running. Maven is not needed (wrapper).

```powershell
# 1. Infrastructure (first start imports the Keycloak realm; give it ~30-60 s)
docker compose -f infra/docker-compose.yml up -d

# 2. Build everything once (installs common-lib for the services)
.\mvnw.cmd install -DskipTests

# 3. Start each app in its own terminal
.\mvnw.cmd -pl employee-service spring-boot:run
.\mvnw.cmd -pl leave-attendance-service spring-boot:run
.\mvnw.cmd -pl api-gateway spring-boot:run
```

> Port 8080 is used by Apache (XAMPP `httpd`) on this machine. Stop Apache, or start the gateway on another
> port: `$env:GATEWAY_PORT=8090; .\mvnw.cmd -pl api-gateway spring-boot:run`.

| URL | What |
|---|---|
| http://localhost:8180/admin | Keycloak admin console (`admin` / `admin_dev_password`) |
| http://localhost:8081/swagger-ui.html | employee-service Swagger UI |
| http://localhost:8082/swagger-ui.html | leave-attendance-service Swagger UI |
| http://localhost:8080/api/... | everything, through the gateway |
| http://localhost:4200 | Workvaro web app (`cd frontend; npm install; npm start`), see [frontend/README.md](frontend/README.md) |

## Seed users (DEV ONLY)

| User | Password | Roles | Notes |
|---|---|---|---|
| `admin` | `Admin@Ems2026` | ADMIN, MANAGER, EMPLOYEE | manager of `hr` and `manager` |
| `hr` | `Hr@Ems2026` | HR, EMPLOYEE | |
| `manager` | `Manager@Ems2026` | MANAGER, EMPLOYEE | manager of `employee` |
| `employee` | `Employee@Ems2026` | EMPLOYEE | |

Get a token (Checkpoint 1) with the dev-only `ems-api-test` client:

```powershell
curl.exe -s -X POST http://localhost:8180/realms/ems/protocol/openid-connect/token -d "client_id=ems-api-test" -d "grant_type=password" -d "username=employee" -d "password=Employee@Ems2026"
```

Then call `GET http://localhost:8080/api/employees/me` with `Authorization: Bearer <access_token>`.
Without a token the gateway answers 401 (Checkpoint 2).

## Security model

- Keycloak does login, password policy, lockout after 5 failures, sessions and TOTP. Access tokens last 15 min.
- The gateway **and** every service validate the JWT (zero trust). Roles come from `realm_access.roles`.
- `@PreAuthorize` for roles plus ownership checks in the services:
  - Employee profile: HR/Admin and the employee see everything; the direct manager sees it with the bank account
    masked; others get 403 and use the directory, which has no sensitive fields.
  - Leave and correction approvals: the employee's **current** manager (checked live against employee-service)
    or HR. Nobody approves their own request. Admin has org-wide read access but approves only if also HR.
- `/internal/**` (service-to-service) is blocked at the gateway and still needs the caller's forwarded JWT.
- Bank account numbers are encrypted at rest with AES-256-GCM (`EMS_ENCRYPTION_KEY`). The dev profile uses a
  dummy all-zero key; production must set a real one.
- Errors are safe JSON (`ApiError`): no stack traces or SQL. Every write is recorded in each service's `audit_log`.

## Deploy to production (one VPS)

Everything runs in Docker on one server (Ubuntu, 4-8 GB RAM). Only Caddy is public: it serves the web app,
proxies `/api` to the gateway, fronts Keycloak, and gets HTTPS certificates automatically.

| File | What |
|---|---|
| `Dockerfile` | one image recipe for every Spring service (`--build-arg MODULE=...`), non-root JRE 17 |
| `frontend/Dockerfile` | builds Angular and bakes it into a Caddy image |
| `infra/caddy/Caddyfile` | HTTPS, security headers + CSP, SPA routing, `/api` → gateway, auth domain → Keycloak |
| `infra/docker-compose.prod.yml` | postgres, keycloak (`start`, proxy mode), 3 services, web. No DB/service ports published |
| `infra/.env.prod.example` | every production setting (copy to `infra/.env`) |
| `infra/scripts/make-prod-realm.mjs` | production Keycloak realm: removes the test client, real URLs, one-time passwords, forced TOTP |
| `infra/scripts/backup.sh` | nightly `pg_dump` of all three databases, keeps 14 days |
| `.github/workflows/ci.yml` | on every push: `mvnw verify`, Angular build + tests, both Docker images build |

Steps:

1. Point two DNS A records at the server, e.g. `hr.client.com` (app) and `auth.client.com` (login).
2. On the server: install Docker, clone the repo, then `cp infra/.env.prod.example infra/.env` and fill in
   every value (`openssl rand -base64 32` for `EMS_ENCRYPTION_KEY`, long random passwords).
3. `node infra/scripts/make-prod-realm.mjs`. Save the printed one-time passwords and hand them over privately.
   (No Node on the server? Run it locally with the same `infra/.env` and copy `infra/keycloak/prod/` up.)
4. `docker compose -f infra/docker-compose.prod.yml --env-file infra/.env up -d --build`
5. Open `https://hr.client.com`. Each user signs in, sets a new password and scans the TOTP QR code.
6. Cron the backup: `0 2 * * * cd /opt/ems && sh infra/scripts/backup.sh`, and copy `/var/backups/ems` off
   the server. Test one restore (the command is at the bottom of the script).
7. Firewall: allow only 22, 80 and 443 (`ufw allow OpenSSH; ufw allow 80,443/tcp; ufw enable`).

Notes:
- The Flyway seed data (4 demo employees linked to the 4 Keycloak users) also loads in production. Rename them in
  the app to the real people, or mark them exited, after go-live.
- The Keycloak admin console is at `https://auth.client.com/admin`. Use the `KEYCLOAK_ADMIN` login from `.env`.

## Business rules (leave and attendance)

- Leave days exclude weekends and holidays. A request can't span two calendar years or be back-dated more than
  30 days.
- Pending and approved requests can't overlap. Limited types check `allocated - used - pending`; Unpaid is unlimited.
- Balances are created per user and year on first access. The balance is deducted when the request is approved.
  The applicant can cancel while the request is PENDING.
- Check-in/out happens once per day, in the business time zone (`EMS_ZONE_ID`, default Asia/Kolkata).
  Corrections are allowed for up to 31 days back. An approved correction overwrites that day's times.

## Tests

**Automated** (`.\mvnw.cmd verify`, no Docker needed):

- Business rules (JUnit 5 + Mockito): leave day count, overlap, balance and approval rules, ownership (IDOR),
  reporting cycles, account linking, check-in/out and corrections.
- HTTP security (`@WebMvcTest` + `jwt()`, using the real common-lib security): 401 without a token, 403 per role,
  400 validation, and the JSON error format.
- Gateway (WebTestClient): 401 at the edge, `/internal/**` blocked, CORS allow/deny, security headers,
  rate limiter.

**Manual/E2E**: the Bruno collection in [api-tests/](api-tests/README.md) runs the full flow against the
running stack.
