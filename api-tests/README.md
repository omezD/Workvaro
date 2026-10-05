# EMS API tests (Bruno)

85 requests in 8 folders, all through the gateway, each with assertions. The folders run in order and form one
end-to-end scenario. Tokens and ids are passed between requests automatically.

| Folder | Covers |
|---|---|
| 01 Auth | Logs in the 4 seed users (stores `adminToken`, `hrToken`, `managerToken`, `employeeToken`); unknown user is rejected |
| 02 Gateway security | No/garbage token → 401, `/internal/**` blocked, security headers, CORS allow/deny |
| 03 Employees | Own profile, directory hides sensitive fields, **IDOR → 403**, masked bank for manager, HR create/validate/duplicate/status |
| 04 Org setup | Department/designation CRUD and role checks, can't delete a department that has employees |
| 05 Leave flow | Apply → overlap 409 / invalid 400 → manager sees pending → **employee can't approve own (403)** → manager approves → **balance reduced** → cancel rules → **manager can't approve another team (403)** → HR can't approve own → calendar |
| 06 Attendance | Check-in/out (once per day), correction request → manager approval, today's board by role |
| 07 Holidays and leave types | Read for all, write for HR only, duplicate date 409 |
| 08 Dashboards | Employee / manager / HR dashboards and their role checks |

## Run it

1. Start the stack (see the main [README](../README.md)): Docker infra, then employee-service,
   leave-attendance-service and api-gateway.
2. **Bruno app:** *Open Collection* → pick this `api-tests` folder → choose environment **local** (top right)
   → right-click the collection → **Run** → *Run Collection*. Everything should be green.
3. **Or the CLI** (from this folder):
   ```bash
   npx @usebruno/cli run -r --env local
   ```

If the gateway isn't on 8080 (Apache uses 8080 on this machine), change `gatewayUrl` in
`environments/local.bru`, or temporarily in the Bruno environment editor.

## Re-running

The collection can be re-run: it generates unique codes, emails and dates, and accepts 409 for check-in when
you already checked in today. Two things accumulate:

- Each run approves 1 day of the employee's **Casual Leave next year** (12 days). After about 12 runs, "Balance
  before" fails with a hint.
- Each run creates a test employee (`T…@ems.local`) and an approved attendance correction.

Reset everything to the seed state (wipes the database and Keycloak):

```bash
docker compose -f infra/docker-compose.yml down -v
```

Then `up -d` again and restart the services (Flyway re-creates the tables).

## Dev-only credentials

`environments/local.bru` holds the **dev seed** passwords from `infra/keycloak/realm-ems.json`, and logins use
the `ems-api-test` client (password grant). Both must be removed in production.
