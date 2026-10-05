# EMS: 2-Day Execution Plan

Order: **Backend → API testing → Frontend.**
Scope is the 2-week reduced scope from [EMS-Project-Plan.md](EMS-Project-Plan.md): Keycloak + api-gateway + employee-service + leave-attendance-service + Angular.
Claude writes the code. You install the tools, run the stack, and test and approve at each checkpoint.

---

## Step 0: Prerequisites (you, ~30–45 min, before Day 1)
Machine check (2026-10-05): **Java, Maven and Docker are not installed**. Node v24 and Git are present.

| Install | From | Why |
|---|---|---|
| **JDK 17** (Temurin 17 LTS, .msi, tick "Set JAVA_HOME") | adoptium.net | Build/run the Spring Boot services |
| **Docker Desktop** (WSL 2 backend; restart the PC after) | docker.com | Postgres 16 + Keycloak 26 (+ Redis later) |
| **Bruno** (API testing tool, free, offline, no account) | usebruno.com | Test all APIs; the collection is saved in the repo |
| IntelliJ IDEA Community (optional) or VS Code + "Extension Pack for Java" | jetbrains.com | Editing/debugging |
| Angular CLI (Day 2): `npm i -g @angular/cli@18` | npm | Frontend |

Maven is **not** needed: the project ships with the Maven Wrapper (`mvnw`).
After installing, confirm that `java -version` (shows 17), `docker --version` and `docker compose version` all work.

---

## DAY 1: Backend

### Step 1: Repo & infrastructure (~1.5 h)
- `git init`, `.gitignore`, `README.md`, `.env.example` (no real secrets committed)
- Parent `pom.xml`: Java 17, Spring Boot 3.5.x, Spring Cloud 2025.0.x, modules: `common-lib`, `api-gateway`, `employee-service`, `leave-attendance-service`
- `infra/docker-compose.yml`: **postgres:16** (with `init.sql` creating `employee_db`, `leave_db`, `keycloak_db`) and **keycloak:26** (dev mode, imports the realm on startup)
- `infra/keycloak/realm-ems.json`:
  - realm `ems`
  - roles `ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`
  - clients: `ems-frontend` (public, PKCE) and `ems-api-test` (for Bruno, password grant, **dev only**)
  - brute-force protection on; password policy (min 8, uppercase, digit)
  - TOTP required for ADMIN/HR (switched **off** in the dev realm for testing, **on** for prod)
  - 4 seed users: `admin`, `hr`, `manager`, `employee`
- ✅ **Checkpoint 1:** `docker compose up -d` brings Keycloak up at http://localhost:8180, and a token can be fetched for each user.

### Step 2: common-lib (~1 h)
- `SecurityConfig` (OAuth2 resource server, stateless, JWT from Keycloak issuer)
- `KeycloakRoleConverter` (`realm_access.roles` → `ROLE_*`)
- `CurrentUser` helper (keycloak user id / email from the JWT)
- `GlobalExceptionHandler` (`@RestControllerAdvice`, safe JSON errors: 400/401/403/404/409/500)
- `ApiError`, `PageResponse<T>` DTOs; `AesGcmAttributeConverter` for encrypting bank/ID fields

### Step 3: api-gateway (port 8080, ~1 h)
- Spring Cloud Gateway (WebFlux) routes:
  - `/api/employees/**`, `/api/departments/**`, `/api/designations/**` → employee-service :8081
  - `/api/leaves/**`, `/api/leave-types/**`, `/api/holidays/**`, `/api/attendance/**` → leave-attendance-service :8082
- JWT validation at the edge, CORS for `http://localhost:4200`, security headers
- In-memory rate limit (Redis later)
- ✅ **Checkpoint 2:** no token → 401 at the gateway.

### Step 4: employee-service (port 8081, ~3 h)
- Flyway `V1__init.sql` tables: `department`, `designation`, `employee`, `audit_log`
- `employee` columns: `keycloak_user_id`, `emp_code`, names, email, phone, dob, `join_date`, `department_id`, `designation_id`, `manager_id`, `status`, `bank_account` (encrypted), address, emergency contact
- Seed data via `V2__seed.sql` (departments, designations, 4 employees linked to the Keycloak users)
- **Endpoints**

| Method & path | Who |
|---|---|
| `GET/POST/PUT/DELETE /api/departments` | ADMIN, HR write · all read |
| `GET/POST/PUT/DELETE /api/designations` | same |
| `GET /api/employees?search=&dept=&page=` (directory, sensitive fields hidden) | all |
| `GET /api/employees/{id}` (full for HR/ADMIN/self, masked bank for others) | ownership rule |
| `POST /api/employees`, `PUT /api/employees/{id}`, `PATCH /api/employees/{id}/status` | HR, ADMIN |
| `GET /api/employees/me`, `PUT /api/employees/me` (limited fields: phone, address, emergency contact) | self |
| `GET /api/employees/me/team` | MANAGER |
| `GET /internal/employees/by-user/{keycloakId}` (manager lookup for the leave service; still requires a JWT) | service call |
| `GET /api/employees/stats` (headcount by department) | HR, ADMIN |

- Validation (`@Valid`), MapStruct DTOs, audit rows on create/update/status change
- springdoc Swagger UI at `/swagger-ui.html`

### Step 5: leave-attendance-service (port 8082, ~3 h)
- Flyway tables: `leave_type`, `leave_balance`, `leave_request`, `holiday`, `attendance`, `attendance_correction`, `audit_log`; seed leave types (Casual 12, Sick 8, Earned 15, Unpaid) + holidays
- OpenFeign client → employee-service (forwards the user's JWT), Resilience4j timeout/circuit breaker
- **Business rules**
  - Leave days exclude weekends and holidays
  - No overlapping requests
  - Balance check (Unpaid is unlimited)
  - Only the employee's **own manager** (or HR) can approve/reject
  - Balance is deducted on approval
  - The applicant can cancel while the request is PENDING
  - Balances are auto-created per year on first access
- **Endpoints**

| Method & path | Who |
|---|---|
| `GET/POST/PUT /api/leave-types` | ADMIN/HR write |
| `GET /api/leaves/balance/me` | self |
| `POST /api/leaves` (apply) · `GET /api/leaves/me` · `PATCH /api/leaves/{id}/cancel` | self |
| `GET /api/leaves/pending` (my team's) · `PATCH /api/leaves/{id}/approve` · `PATCH /api/leaves/{id}/reject` | MANAGER (own team) / HR |
| `GET /api/leaves?status=&from=&to=` (all) · `GET /api/leaves/team-calendar?month=` | HR / MANAGER |
| `GET/POST/DELETE /api/holidays` | all read, HR/ADMIN write |
| `POST /api/attendance/check-in` · `POST /api/attendance/check-out` · `GET /api/attendance/me?month=` | self |
| `GET /api/attendance/today` (who's in / on leave) | HR, MANAGER |
| `POST /api/attendance/corrections` · `PATCH /api/attendance/corrections/{id}/approve` · `.../reject` | self / manager |
| `GET /api/dashboard/me`, `GET /api/dashboard/manager`, `GET /api/dashboard/hr` | by role |

- ✅ **Checkpoint 3 (end of Day 1):** all 4 apps start, Swagger UI works, and `./mvnw verify` passes.

---

## DAY 2 (morning): API testing (~3 h)

### Step 6: Automated tests (Claude writes; you run `./mvnw test`)
- Service unit tests (JUnit 5 + Mockito): leave day calculation, overlap, balance, approval rules
- Controller security tests (MockMvc + `jwt()`) for each role:
  - 401 without a token
  - 403 when an EMPLOYEE calls HR endpoints
  - 403 when an employee reads another employee's full profile (IDOR)
  - 403 when a manager approves another team's leave
  - 400 on invalid input

### Step 7: Manual testing with Bruno (you, with Claude's collection)
- `api-tests/` Bruno collection committed in the repo, with environments `local` (gateway :8080)
- An auth folder holds "Login as admin / hr / manager / employee", which stores the token in a variable automatically
- Folders per module, with **assertions in each request** (status code + key fields), so you can run the **whole collection in one click** (Bruno Runner)
- Scenario flow to test end-to-end:
  1. HR creates an employee
  2. The employee checks in and out
  3. The employee applies for leave
  4. The manager sees it pending and approves it
  5. The balance is reduced
  6. The employee tries to approve their own leave and gets 403
- Also: Swagger UI per service for quick ad-hoc tries
- ✅ **Checkpoint 4:** the Bruno runner is all green, and you report any bug and Claude fixes it. **Backend frozen.**

---

## DAY 2 (afternoon/evening): Frontend (~6 h)

### Step 8: Angular setup (~1 h)
- `ng new frontend` (Angular 18, standalone, SCSS, routing), Angular Material, `keycloak-angular`
- `core/`:
  - Keycloak init (login-required, PKCE)
  - auth interceptor (adds the bearer token)
  - `roleGuard`
  - global error handler (snackbar)
  - shell layout (toolbar + sidenav with menu items filtered by role)
- `environment.ts` → gateway URL, Keycloak URL/realm/client

### Step 9: Screens (~4 h)
1. **Dashboard** (by role): leave balance cards, today's check-in status, pending approvals count, HR headcount and on-leave today
2. **Employees**: directory table (search, filter, paginator), detail page, create/edit form (HR), my profile edit
3. **Org setup** (Admin/HR): departments and designations CRUD dialogs
4. **Leave**: apply form (date range, type, live day count), my leaves (with cancel), approvals inbox (manager/HR), team calendar (month grid), leave types admin
5. **Attendance**: check-in/out button, monthly table, correction request, correction approvals
6. **Holidays**: list + HR add/delete

### Step 10: Polish & verify (~1 h)
- Loading states, empty states, form validation messages, masked bank number pipe
- Manual walk-through as each of the 4 users in the browser; fix bugs
- ✅ **Checkpoint 5:** the full flow works in the browser for all roles.

---

## After the 2 days (not in this sprint)
Docker images for every service + production compose + HTTPS on a VPS, the document service, the notification service (emails, RabbitMQ), audit service, backups, CI.

## Risks / honest notes
- 2 days is only possible because Claude generates the code. **Your testing time at each checkpoint is the real bottleneck.** Docker or Keycloak setup issues on Windows are the most likely delay.
- If Day 1 runs long, the dashboard endpoints and the attendance corrections move to Day 2. Security tests are never skipped.
