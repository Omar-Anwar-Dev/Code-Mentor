# M0 Demo — Thin Vertical Slice (end of Sprint 1)

**Goal of M0:** Prove the core plumbing works end-to-end: frontend talks to backend, backend issues JWT, protected endpoints honour the token, DB persists.

**What's out of scope for M0:** GitHub OAuth (deferred to Sprint 2), rate limiting (deferred to Sprint 2), anything beyond auth + an empty dashboard.

---

## Prerequisites

Already done per [`README.md`](../../README.md):

- `docker compose up -d` → 5 containers healthy
- Backend running on `http://localhost:5000`
- Frontend running on `http://localhost:5173`

Confirm:

```bash
docker ps | grep codementor   # should show 5 healthy containers
curl -s http://localhost:5000/ready | head -c 200   # "status":"Healthy"
curl -sI http://localhost:5173 | head -1            # 200 OK
```

---

## Demo script (run these in order)

### Step 1 — Register a new user via the UI

- Open [http://localhost:5173/register](http://localhost:5173/register)
- Fill:
  - Full name: `Layla Demo`
  - Email: `layla-demo@example.com`
  - Password: `Strong_Pass_123!` (matches backend policy: 8+, upper, lower, digit)
  - Confirm: same
- Submit → expect a success toast + redirect to `/dashboard`.

**What's proven:** frontend → `POST /api/auth/register` → backend persists the user → JWT + refresh token returned → Redux hydrates → protected route lets the user into `/dashboard`.

### Step 2 — Hit the protected `/auth/me`

Inside the frontend (DevTools → Network tab), any call to `/api/auth/me` should return the user's details with `roles: ["Learner"]`.

Verify from a terminal with the token (paste any access token returned in step 1):

```bash
TOKEN="<paste access token>"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/auth/me | head -c 400
```

**Expect:** user JSON with `fullName`, `email`, `roles=["Learner"]`.

### Step 3 — Log out, then log in as the seeded admin

- Header → user menu → **Log out**
- Go to `/login`, log in with:
  - Email: `admin@codementor.local`
  - Password: `Admin_Dev_123!`
- Expect redirect to `/admin`, role badge = Admin.

**What's proven:** JWT role claims flow through → ProtectedRoute's admin check works → logout clears state.

### Step 4 — Prove an unauthenticated request fails

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:5000/api/auth/me
# Expect: HTTP 401
```

### Step 5 — Spot the request in Seq

- Open [http://localhost:5341](http://localhost:5341)
- Filter: `RequestPath = "/api/auth/login"`
- Click an event → properties panel shows `RequestId`, `UserId` (after authentication), `Service=CodeMentor.Api`, `Environment=Development`.

**What's proven:** structured logging + enrichers land in Seq correctly.

---

## Pass / fail checklist

| Step | Passed? |
|---|---|
| 1. Register → lands on `/dashboard` | ☐ |
| 2. `/auth/me` returns user data with `roles: ["Learner"]` | ☐ |
| 3. Admin login → redirects to `/admin` | ☐ |
| 4. Unauthenticated `/auth/me` → 401 | ☐ |
| 5. `/api/auth/login` event visible in Seq with enrichers | ☐ |

All 5 ticked = **M0 complete**. Record in `docs/progress.md` under "Completed Sprints."

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `connection refused` on 5000 | backend not running | `cd backend && dotnet run --project src/CodeMentor.Api --launch-profile http` |
| Register returns 409 | email already taken | pick a fresh email, or reset DB: `docker compose down -v && docker compose up -d` then restart backend to re-seed |
| Login loops back to `/login` | stale tokens in localStorage | DevTools → Application → localStorage → Clear; hard reload |
| CORS error in browser | backend URL mismatch | confirm `frontend/.env.local` has `VITE_API_BASE_URL=http://localhost:5000` |
| Seq UI blank | first-run tenant not created | visit [http://localhost:5341](http://localhost:5341) directly (no-auth flag is set in compose) |
