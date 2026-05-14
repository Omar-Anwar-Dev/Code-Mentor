-- SBF-1 follow-up (2026-05-14): seed AcceptanceCriteria + Deliverables on the
-- 6 demo tasks used in supervisor rehearsals.
--
-- WHY THIS SCRIPT EXISTS:
--   DbInitializer.SeedTasksAsync() short-circuits when Tasks already exist, so
--   updating TaskSeedData.cs alone won't backfill the new fields on a live DB.
--   This script does that backfill via UPDATE statements scoped by Task.Title.
--
-- TARGETED TASKS (6):
--   - FizzBuzz + Pytest Intro              (Python   · Difficulty 1 · Algorithms)
--   - Secure REST API with FastAPI + JWT   (Python   · Difficulty 4 · Security)
--   - CRUD REST API with ASP.NET + EF Core (Backend  · Difficulty 2 · Databases)
--   - Add JWT Auth to a .NET API           (Backend  · Difficulty 3 · Security)
--   - TODO App (React + Node + SQLite)     (FullStack· Difficulty 2 · OOP)
--   - Book Catalog: Search + Pagination    (FullStack· Difficulty 3 · Databases)
--
-- HOW TO RUN (Windows PowerShell from the repo root):
--   sqlcmd -S localhost -d CodeMentor -E -i tools\seed-demo-task-briefs.sql
--
-- The script is IDEMPOTENT: running it twice produces the same result. Each
-- UPDATE is scoped by Title (which is treated as a stable demo identifier
-- here — none of the 6 demo titles collide with each other).
--
-- After running, refresh `/admin/tasks` and verify each demo task shows the
-- new Acceptance Criteria + Deliverables sections in the editor modal.

SET NOCOUNT ON;
USE [CodeMentor];
GO

-- =========================================================================
-- Task 1: FizzBuzz + Pytest Intro
-- =========================================================================
UPDATE dbo.Tasks
SET
    AcceptanceCriteria = N'- A `fizzbuzz(n: int) -> str` function returns the correct string for a single number: `"Fizz"` for multiples of 3, `"Buzz"` for multiples of 5, `"FizzBuzz"` for multiples of both, and `str(n)` otherwise.
- A `main()` routine prints the FizzBuzz output for `1..100` inclusive when the script is executed directly.
- A separate `pytest` test file contains at least 4 tests covering: a multiple of 3, a multiple of 5, a multiple of both (e.g. 15 or 30), and a plain non-multiple.
- Running `pytest` from the project root produces zero failures and zero errors.',
    Deliverables = N'- One Python source file with the `fizzbuzz` function and the `main()` entry point (e.g. `fizzbuzz.py`).
- One Python test file using `pytest` (e.g. `test_fizzbuzz.py`).
- Optional but recommended: a short `README.md` showing how to run the script and the tests.',
    UpdatedAt = SYSUTCDATETIME()
WHERE Title = N'FizzBuzz + Pytest Intro';
PRINT '✓ Updated: FizzBuzz + Pytest Intro';
GO

-- =========================================================================
-- Task 2: Secure REST API with FastAPI + JWT
-- =========================================================================
UPDATE dbo.Tasks
SET
    AcceptanceCriteria = N'- `POST /register` accepts `{email, password}` JSON, creates a user with a **bcrypt-hashed** password, returns **201** on success and **409** when the email already exists.
- `POST /login` accepts `{email, password}`, verifies credentials via `passlib`, and returns **200** with `{access_token, token_type}` containing a signed JWT whose expiry is **~1 hour**. Bad credentials return **401**.
- `GET /me` reads the `Authorization: Bearer <token>` header, validates the JWT signature + expiry, and returns the authenticated user (without the password hash). Missing / malformed / invalid / expired tokens return **401**.
- Passwords are **never** stored in plaintext — bcrypt (or argon2) hashing must be visible in the code.
- The JWT signing secret is read from an environment variable (e.g. `JWT_SECRET`) — **not** a hardcoded string literal.
- At least **5 pytest tests** cover: successful register, duplicate-email register, successful login, wrong-password login, and `/me` with both a valid and an invalid/expired token.',
    Deliverables = N'- A FastAPI application implementing the three endpoints (e.g. `main.py` + `app/` package).
- A dependency file (`requirements.txt` or `pyproject.toml`) listing `fastapi`, `uvicorn`, `passlib[bcrypt]`, `python-jose[cryptography]`, `pydantic`, `pytest`, `httpx`.
- A test file using FastAPI''s `TestClient`.
- A `README.md` showing how to start `uvicorn`, how to run the tests, and how to set the `JWT_SECRET` env var.',
    UpdatedAt = SYSUTCDATETIME()
WHERE Title = N'Secure REST API with FastAPI + JWT';
PRINT '✓ Updated: Secure REST API with FastAPI + JWT';
GO

-- =========================================================================
-- Task 3: CRUD REST API with ASP.NET + EF Core
-- =========================================================================
UPDATE dbo.Tasks
SET
    AcceptanceCriteria = N'- Five endpoints exposed under `/api/books`: `GET` (list), `GET /{id}` (read one), `POST` (create), `PUT /{id}` (replace), `DELETE /{id}` (remove).
- A `Book` entity persists `Id` (auto), `Title` (required, max 200 chars), `Author` (required, max 100 chars), `PublishedYear` (int, **between 1450 and current year + 1**).
- POST and PUT return **400 BadRequest** with a useful error payload when validation fails (e.g. missing title, year out of range).
- `GET /{id}`, `PUT /{id}`, and `DELETE /{id}` return **404 NotFound** when the book id does not exist.
- POST returns **201 Created** with the created entity and a `Location` header pointing to `GET /api/books/{id}`.
- Swagger UI is reachable at `/swagger` in Development.
- At least **3 integration tests** (using `WebApplicationFactory<T>` or similar): happy-path CRUD round-trip, 404 on missing id, and 400 on validation failure.',
    Deliverables = N'- A .NET 8 ASP.NET Core Web API project (e.g. `BookCatalog.Api`).
- An EF Core `DbContext` with a `Book` `DbSet` and a generated migration committed under `Migrations/`.
- A test project (xUnit or NUnit) containing the integration tests above.
- A `README.md` covering: how to apply the migration, how to run the API, and how to run the test suite.',
    UpdatedAt = SYSUTCDATETIME()
WHERE Title = N'CRUD REST API with ASP.NET + EF Core';
PRINT '✓ Updated: CRUD REST API with ASP.NET + EF Core';
GO

-- =========================================================================
-- Task 4: Add JWT Auth to a .NET API
-- =========================================================================
UPDATE dbo.Tasks
SET
    AcceptanceCriteria = N'- `POST /auth/register` creates a user via ASP.NET Core Identity (`UserManager<IdentityUser>` or a custom user); enforces the configured password policy; returns **400** with the policy error message when the password is weak.
- `POST /auth/login` validates email + password and returns **200** with `{accessToken, expiresAt}` on success, **401** on bad credentials (no token-detail leak in the failure response).
- `GET /me` is decorated with `[Authorize]`: returns **401** without a token, **200** with the authenticated user''s id and email when a valid bearer token is presented.
- The JWT signing key + issuer + audience are read from configuration (`appsettings.json` / env vars / user secrets) — **not hardcoded** as string literals in source files.
- `TokenValidationParameters` validate signature, issuer, audience, and lifetime.
- At least **3 integration tests** cover: register-then-login yielding a usable bearer token, `/me` accepts that token, `/me` rejects an expired or tampered token with **401**.',
    Deliverables = N'- A .NET 8 Web API project with the three auth endpoints wired into ASP.NET Core Identity (in the existing `DbContext` or a new one).
- A test project containing the integration tests above.
- A `README.md` showing how to set the JWT signing key (env var or `appsettings.Development.json`), how to register + login, and an example of using the token via `curl` or Postman.',
    UpdatedAt = SYSUTCDATETIME()
WHERE Title = N'Add JWT Auth to a .NET API';
PRINT '✓ Updated: Add JWT Auth to a .NET API';
GO

-- =========================================================================
-- Task 5: TODO App (React + Node + SQLite)
-- =========================================================================
UPDATE dbo.Tasks
SET
    AcceptanceCriteria = N'- Backend endpoints: `GET /todos` (supports `?filter=all|active|completed`), `POST /todos` (create), `PATCH /todos/:id` (toggle completed and/or update text), `DELETE /todos/:id`.
- SQLite schema includes `id` (PK), `text` (NOT NULL, length 1-200), `completed` (boolean, default `false`), `created_at` (timestamp).
- Frontend is a single-page React app with: an Add-todo form, a list of todos with a checkbox-toggle + delete button per row, and **three filter tabs (All / Active / Completed)** that reflect the active filter visually.
- Input validation on **both** server and client: empty or `>200`-char text is rejected inline on the FE and returns **400** on the BE.
- Loading and empty states are rendered explicitly — no jarring flashes, no perpetual spinner on an empty list.
- POST / PATCH / DELETE update the visible list without a full page reload (state update or refetch — not `window.location.reload()`).',
    Deliverables = N'- A Node + Express (or Fastify) backend folder (e.g. `server/`) with the SQLite file and any migration / init script.
- A React frontend folder (e.g. `client/`) using Vite or CRA + TypeScript, consuming the backend API.
- A `README.md` covering: how to install deps for both apps, how to run them locally, and the resulting schema (DDL or a short diagram).',
    UpdatedAt = SYSUTCDATETIME()
WHERE Title = N'TODO App (React + Node + SQLite)';
PRINT '✓ Updated: TODO App (React + Node + SQLite)';
GO

-- =========================================================================
-- Task 6: Book Catalog: Search + Pagination
-- =========================================================================
UPDATE dbo.Tasks
SET
    AcceptanceCriteria = N'- Backend endpoint `GET /books` accepts `search`, `page` (1-based, default 1), and `size` (default 20, max 100) query params and returns `{items, page, size, totalCount}`.
- The `search` filter matches **title OR author** with a case-insensitive partial match. An empty `search` returns all books paginated.
- Frontend has: a search input that debounces user typing by **~300 ms** before firing the request, prev/next page controls, and a counter showing `N results · page X of Y`.
- The URL reflects the current `search` + `page` so refreshing or sharing the link preserves the state; the browser back button restores prior queries.
- **Distinct** empty states for "no books at all" vs "no results for this search" with appropriate copy.
- An in-flight request is cancelled when a new search keystroke fires inside the debounce window (no race-condition stale-results bug).
- Catalog page Lighthouse Performance score **≥ 85** on a local run with ~5000 seeded books.',
    Deliverables = N'- A backend (any stack — Express / FastAPI / ASP.NET) exposing `GET /books` plus a seed script that inserts ~5000 books.
- A React frontend with the search + pagination component; URL state synced via React Router or `URLSearchParams`.
- A `README.md` with: run + seed instructions, plus a short note on the index or full-text strategy used for the search filter.',
    UpdatedAt = SYSUTCDATETIME()
WHERE Title = N'Book Catalog: Search + Pagination';
PRINT '✓ Updated: Book Catalog: Search + Pagination';
GO

-- =========================================================================
-- Verification: confirm all 6 demo tasks now have both fields populated
-- =========================================================================
PRINT '';
PRINT '=========================================================================';
PRINT 'Demo-task brief status (expect 6 rows, both columns YES):';
PRINT '=========================================================================';

SELECT
    Title,
    CASE WHEN AcceptanceCriteria IS NOT NULL AND LEN(AcceptanceCriteria) > 0
         THEN 'YES' ELSE 'NO' END AS HasAcceptanceCriteria,
    CASE WHEN Deliverables IS NOT NULL AND LEN(Deliverables) > 0
         THEN 'YES' ELSE 'NO' END AS HasDeliverables,
    UpdatedAt
FROM dbo.Tasks
WHERE Title IN (
    N'FizzBuzz + Pytest Intro',
    N'Secure REST API with FastAPI + JWT',
    N'CRUD REST API with ASP.NET + EF Core',
    N'Add JWT Auth to a .NET API',
    N'TODO App (React + Node + SQLite)',
    N'Book Catalog: Search + Pagination'
)
ORDER BY Track, Difficulty;
GO
