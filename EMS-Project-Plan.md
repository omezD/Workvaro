# Employee Management System: Spring Boot Microservices Plan (50–100 employees, solo developer)

## Context
A small corporate client (50–100 employees) needs an internal employee management tool. The folder `Employee Management Platform/` is empty, so this is a greenfield build. The developer wants a **Java Spring Boot backend on a microservices architecture** so the system can scale later. The developer works alone, so the design is a **lean microservices setup**: only a few services, boring proven tools, one `docker-compose up` to run everything locally. Services are cut along business boundaries so that more can be split out later.

> Honest note: at 100 users a single app would handle the load easily. Microservices are chosen here for **future scalability and team growth**, not current load. To keep solo maintenance sane: start with **4 business services + gateway**, use Keycloak instead of writing auth, and use one Postgres server with a separate database per service.

---

## 1. Actors (4 roles)

| Role | Can do |
|---|---|
| **Admin** | Company settings, departments, user/role management, leave policy, holidays, audit log |
| **HR** | Employee CRUD, documents, leave/attendance management, announcements, reports |
| **Manager** | Employee rights + view own team, approve/reject team leave and attendance corrections |
| **Employee** | Own profile, apply leave, check-in/out, own documents/payslips, directory, announcements |

Roles live in **Keycloak** (realm roles: `ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`) and are carried inside the JWT. Ownership checks (own data / own team) happen inside each service.

---

## 2. Architecture

```
            Angular (TypeScript) frontend
                        │  HTTPS
                ┌───────▼────────┐
                │  API Gateway   │  Spring Cloud Gateway: routing, JWT check, rate limit, CORS
                └───────┬────────┘
     ┌──────────┬───────┼──────────┬─────────────┐
     ▼          ▼       ▼          ▼             ▼
 employee-   leave-    document-  notification-  Keycloak
 service     attendance service   service        (auth server:
 (org, emp,  -service  (files,    (email,        login, MFA,
 dept, desg) (leave,   MinIO/S3)  announcements) lockout, roles)
             attendance,
             holidays)
     │          │         │          ▲
     ▼          ▼         ▼          │ events
  emp_db     leave_db   doc_db       │
  (PostgreSQL: one server, separate DB per service)
     └──────────┴─────────┴──── RabbitMQ (async events) ┘
```

### Services (v1)

| Service | Responsibility | DB |
|---|---|---|
| **api-gateway** | Single entry point, routes `/api/employees/**` → employee-service etc., validates JWT, rate limiting, CORS | — |
| **Keycloak** (ready-made, not coded) | Login, password policy, **MFA/TOTP**, brute-force lockout, forgot password, roles, sessions, later Google/Microsoft SSO | keycloak_db |
| **employee-service** | Departments, designations, employees, reporting manager, directory, profile | employee_db |
| **leave-attendance-service** | Leave types/quotas, balances, requests + approval, holidays, check-in/out, corrections | leave_db |
| **document-service** | Upload/download employee documents and payslip PDFs (MinIO locally, S3 in production), signed URLs | document_db |
| **notification-service** | Consumes events → sends emails; announcements; birthday widget data | notification_db |

**Audit log:** each service publishes `AuditEvent` messages to RabbitMQ. The notification-service (or a later `audit-service`) stores them. This keeps v1 small.

### Communication
- **Sync (REST via OpenFeign)** only when an immediate answer is needed, e.g. leave-service asks employee-service "who is this employee's manager?"
- **Async (RabbitMQ)** for side effects: `LeaveApplied`, `LeaveApproved`, `EmployeeCreated` (→ create leave balances + welcome email), `AuditEvent`
- **Resilience4j** circuit breaker and timeout on Feign calls

### Deliberately skipped for now (add when scaling)
- **Eureka / Config Server**: Docker Compose service names provide discovery, and config comes from env vars. Add them when moving to many instances.
- **Kafka**: RabbitMQ is simpler for this volume.
- **Kubernetes**: a Docker Compose deployment on one VPS is enough for 100 users.
- Distributed tracing (Zipkin) is optional; add it if debugging cross-service calls gets hard.

---

## 3. Features

### v1 (MVP)
1. Login via Keycloak (email/password + TOTP 2FA for Admin/HR), forgot password, no public sign-up
2. Departments, designations, employee CRUD, directory, profile, reporting manager
3. Leave: types + yearly quota, apply → manager approve/reject, balances, holiday list, team calendar
4. Attendance: web check-in/out, monthly view, correction request → manager approval
5. Documents: HR uploads, the employee views and downloads their own (payslip PDFs uploaded, no payroll calculation)
6. Announcements, birthdays and anniversaries
7. Role-based dashboards
8. Email notifications
9. Audit log

### v2 (later, each one can become its own service)
`asset-service`, `expense-service`, `performance-service` (reviews/goals), onboarding/offboarding checklists, reports/Excel export, Google/Microsoft SSO (just a Keycloak config change), `payroll-service`.

---

## 4. Security
1. **Keycloak** handles password hashing, policy, lockout after failed attempts, MFA (TOTP) and session timeout. That is far safer than custom auth for a solo developer.
2. **OAuth2/OIDC** with Authorization Code + PKCE from the frontend. Short-lived access tokens (5–15 min) and refresh tokens.
3. **Gateway** validates the JWT. **Every service also validates the JWT** (`spring-boot-starter-oauth2-resource-server`), which is zero trust: an internal call is not trusted just because it is internal.
4. **Method-level authorization**: `@PreAuthorize("hasRole('HR')")` plus **ownership checks** (employee = self, manager = own team) to prevent IDOR.
5. Only the gateway (and Keycloak's login page) is exposed publicly. Services and DBs sit on the private Docker network, with **no published ports** in production.
6. **Input validation** with `jakarta.validation` (`@Valid`, `@NotBlank`, `@Email`…). JPA parameterized queries prevent SQL injection. A global `@ControllerAdvice` returns safe error messages.
7. **Rate limiting** at the gateway (Redis-backed `RequestRateLimiter`).
8. **HTTPS** through Nginx/Caddy reverse proxy + Let's Encrypt. Security headers (HSTS, CSP, X-Frame-Options, nosniff). Strict CORS to the frontend origin only.
9. **Sensitive fields** (bank account, ID number): masked in API responses for non-HR roles, encrypted at rest with a JPA `AttributeConverter` (AES-GCM, key from an env var/secret).
10. **Files**: type/size whitelist, private bucket, short-lived pre-signed URLs issued only after a permission check.
11. **Secrets** in `.env` / Docker secrets, never in Git. Separate dev/prod Keycloak realms and keys.
12. **Audit events** for logins, profile/salary edits, role changes and approvals.
13. Daily `pg_dump` backups of each DB plus a Keycloak realm export, with one tested restore.
14. Dependabot / OWASP Dependency-Check in CI.

---

## 5. Tech Stack

| Part | Choice |
|---|---|
| Backend | **Java 17 (LTS, e.g. Eclipse Temurin 17)** + **Spring Boot 3.5.x** (latest 3.5 patch on start.spring.io; Java 17 is its minimum, and it is stable with all libraries below), Maven multi-module (one repo, a module per service) |
| Spring Cloud | **Spring Cloud 2025.0.x (Northfields)**, the release train matching Boot 3.5 (Gateway, OpenFeign, Circuit Breaker/Resilience4j) |
| Other versions | Keycloak **26.x** (Docker image `quay.io/keycloak/keycloak:26.x`), PostgreSQL **16**, RabbitMQ **3.13/4.x-management**, Redis **7**, Flyway 10 (managed by Boot), MapStruct 1.6, Lombok (Boot-managed), springdoc-openapi **2.8.x**, Testcontainers (Boot-managed) |
| Gateway | Spring Cloud Gateway |
| Auth | **Keycloak** (Docker) + Spring Security OAuth2 Resource Server |
| Inter-service | OpenFeign + Resilience4j; **RabbitMQ** (Spring AMQP) |
| DB | **PostgreSQL** (one container, a DB per service) + Spring Data JPA + **Flyway** migrations |
| Files | MinIO (local) / AWS S3 (prod) |
| Cache/rate-limit | Redis |
| Mapping/boilerplate | MapStruct, Lombok |
| API docs | springdoc-openapi (Swagger UI per service) |
| Frontend | **Angular 18+ (TypeScript, standalone components, signals)** + **Angular Material** (or PrimeNG for richer tables/calendars) + Tailwind for layout; **`keycloak-angular` + `keycloak-js`** for login; Reactive Forms; `HttpClient` interceptor attaches the bearer token; route guards (`canActivate`) by role; FullCalendar for the leave/holiday calendar |
| Testing | JUnit 5, Mockito, **Testcontainers** (real Postgres/RabbitMQ in tests) |
| Run/deploy | Docker + **docker-compose**; GitHub Actions CI; one VPS (e.g., 4–8 GB RAM) with Caddy/Nginx |

### Repo layout (monorepo)
```
ems/
  pom.xml                      # parent POM
  common-lib/                  # shared DTOs, security config, exception handling, audit event model
  api-gateway/
  employee-service/
  leave-attendance-service/
  document-service/
  notification-service/
  frontend/                    # Angular app
    src/app/
      core/                    # auth (keycloak init, interceptor, role guards), layout, error handler
      shared/                  # reusable components, pipes (mask bank no.), models
      features/
        dashboard/  employees/  leave/  attendance/  documents/  announcements/  admin/
                               # each lazy-loaded via loadChildren / loadComponent
  infra/
    docker-compose.yml         # postgres, rabbitmq, redis, minio, keycloak, all services
    keycloak/realm-export.json # roles, clients, MFA policy pre-configured
    postgres/init.sql          # creates employee_db, leave_db, ...
```
Each service follows the same layering: `controller → service → repository → entity`, plus `dto/`, `mapper/`, `event/`, `config/`.

---

## 6. Two-week sprint (chosen): microservices, reduced scope

**Goal of the 2 weeks:** a working, secure demo with **Keycloak + api-gateway + employee-service + leave-attendance-service + Angular**. document-service, notification-service, RabbitMQ events and the audit log move to weeks 3–5. Until then, leave-attendance calls employee-service over Feign only, and audit is a simple table inside each service.

**Shortcuts that save time without hurting security:** Keycloak handles all auth (no custom login code). Angular Material is used as-is (no custom design). Spring Initializr generates the services. Copy the employee-service structure for the second service. Basic tests only on the permission rules.

| Day | Work |
|---|---|
| **1** | Maven monorepo (parent POM, Java 17, Boot 3.5.x, Cloud 2025.0.x), `common-lib`, `docker-compose` (Postgres 16, Keycloak 26). Keycloak realm, 4 roles, 4 test users, TOTP required for ADMIN/HR |
| **2** | api-gateway (routes, JWT validation, CORS, Redis rate-limit optional). `common-lib` security config (resource server, role converter from Keycloak `realm_access.roles`), global exception handler |
| **3–4** | employee-service: Department, Designation, Employee entities + Flyway, CRUD APIs, directory search/pagination, "my profile", "my team", ownership checks, bank number masking/encryption |
| **5** | Angular: `ng new`, Material, keycloak-angular login, interceptor, role guards, sidenav layout, dashboard shell |
| **6–7** | Angular: departments/designations admin, employee list/detail/form, my profile, team page |
| **8–9** | leave-attendance-service: LeaveType, LeaveBalance, LeaveRequest, Holiday, Attendance, Correction. Apply/approve/reject with a manager check via Feign → employee-service. Balance deduction, check-in/out |
| **10–11** | Angular: apply leave, my leaves, approval inbox (manager), holiday list, team calendar, check-in/out button, monthly attendance |
| **12** | Role dashboards (leave balance, today's attendance, pending approvals, headcount / on-leave today) |
| **13** | Security pass + tests: 401/403/IDOR tests per endpoint, validation, headers; fix bugs |
| **14** | Dockerize all services, production compose, deploy to VPS with HTTPS (Caddy), demo to the client |

**Weeks 3–5 (after demo):** document-service (MinIO/S3), notification-service + RabbitMQ events + emails, audit-service, announcements/birthdays, backups, CI pipeline, more tests.

> Risk: 14 days is tight for a first microservices + Keycloak setup. If you fall behind, cut the team calendar and dashboards (days 11–12) first, never the security pass (day 13).

## 6a. Original full build order (reference, ~9–11 weeks)
1. **Wk 1**: Maven monorepo, `common-lib`, docker-compose (Postgres, RabbitMQ, Redis, MinIO, Keycloak), Keycloak realm + roles + test users
2. **Wk 2**: api-gateway + JWT validation; Angular skeleton (`ng new`, Angular Material, keycloak-angular login, auth interceptor, role guards, sidenav layout, lazy feature routes)
3. **Wk 3–4**: employee-service (departments, designations, employees, directory, profile) + frontend pages
4. **Wk 5–6**: leave-attendance-service (Feign call for the manager lookup, approval flow, balances, check-in/out) + UI
5. **Wk 7**: document-service (MinIO, signed URLs) + UI
6. **Wk 8**: notification-service (RabbitMQ consumers, email, announcements) + audit events
7. **Wk 9**: dashboards, rate limiting, field encryption, security headers, error handling
8. **Wk 10–11**: tests, CI, production compose + HTTPS on a VPS, backups, client demo

Tip: build **employee-service end-to-end first** (gateway → service → DB → UI). It becomes the template you copy for every other service.

---

## 6b. Accounts you need to create (and where)

**Local development needs no sign-ups.** Postgres, RabbitMQ, Redis, MinIO and Keycloak all run free in Docker on your machine.

| When | Purpose | Site | Required? |
|---|---|---|---|
| Now | Code repo + CI (GitHub Actions) + container registry (GHCR) | **github.com** | ✅ Yes |
| Now | Dev email testing (catches all outgoing mail, nothing is really sent) | **mailtrap.io** (or run Mailpit in Docker, no account) | Optional |
| Now | Download Java 17 / Docker / IDE (no account needed) | adoptium.net, docker.com (Docker Desktop), jetbrains.com (IntelliJ Community) or VS Code | Install only |
| Before deploy | Production email (leave approvals, password reset) | **brevo.com** (300/day free) or **resend.com**, or a Gmail/Google Workspace SMTP app password | ✅ Yes (one of them) |
| Before deploy | Server (VPS, 4–8 GB RAM) | **hetzner.com** (cheapest) / **digitalocean.com** / **AWS Lightsail** (aws.amazon.com) / Hostinger VPS | ✅ Yes (one) |
| Before deploy | Domain name, e.g. `hr.clientcompany.com` | Usually the **client's existing domain**. Otherwise **cloudflare.com** registrar / namecheap.com | ✅ Yes |
| Before deploy | DNS + free HTTPS proxy, WAF, DDoS protection | **cloudflare.com** | Recommended |
| Before deploy | Production file storage (if not self-hosting MinIO on the VPS) | **AWS S3** (aws.amazon.com) or **Cloudflare R2** | Optional |
| Before deploy | Error monitoring | **sentry.io** (free tier) | Optional |
| Later | Google login SSO | **console.cloud.google.com** (OAuth client), using the client's Google Workspace | Only if the client uses Google |
| Later | Microsoft login SSO | **portal.azure.com** → Entra ID app registration, using the client's M365 | Only if the client uses Microsoft |
| Later | Dependency security scans | **snyk.io** (or GitHub Dependabot, built in, no extra account) | Optional |

Minimum to start coding: **GitHub only**. Minimum to go live: **GitHub + a VPS + a domain/Cloudflare + an email provider**. Ideally the production accounts (VPS, domain, email) are created under the **client's** company email, with you added as a member, so the client owns its data and billing.

---

## 7. Open questions for the client
1. Do they use Google Workspace / Microsoft 365? (If yes, enable SSO in Keycloak.)
2. Leave types, quotas and carry-forward rules?
3. Fixed hours or shifts?
4. Hosting: a VPS / AWS / on-prem server? (A microservices stack needs about 4–8 GB RAM.)

---

## 8. Verification
- `docker compose up` brings up the whole stack. Swagger UI for each service is reachable via the gateway in dev.
- Seed one Keycloak user per role, then walk the flow: employee applies for leave → `LeaveApplied` event → manager email → manager approves → balance updates → audit entry.
- **Security tests** (MockMvc + `@WithMockJwt` / Testcontainers): no token → 401; employee fetching another employee → 403; manager approving a non-team leave → 403; a service called directly without a JWT → 401.
- Testcontainers integration tests per service (repository + RabbitMQ events).
- Angular unit tests (Jasmine/Karma or Jest) for guards, interceptor and services; Playwright/Cypress E2E: login, apply leave, approve leave.
- Frontend security: rely on Angular's built-in XSS sanitization (never use `bypassSecurityTrust*` on user data), keep tokens in memory through keycloak-js (not localStorage), and hide UI by role while the backend still enforces every rule.
- After deploy: check securityheaders.com, confirm only ports 80/443 are open (`nmap`), run a restore test from backup.
