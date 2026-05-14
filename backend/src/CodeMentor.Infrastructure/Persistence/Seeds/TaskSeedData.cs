using CodeMentor.Domain.Assessments;
using CodeMentor.Domain.Tasks;

namespace CodeMentor.Infrastructure.Persistence.Seeds;

/// <summary>
/// 21 curated tasks: 7 per track × 3 tracks (Python, Backend, FullStack).
/// Covers all 5 skill categories with a realistic difficulty spread (1..5).
/// </summary>
public static class TaskSeedData
{
    public static IReadOnlyList<TaskItem> All { get; } = new List<TaskItem>
    {
        // ==================== Python track (7) ====================

        new()
        {
            Title = "FizzBuzz + Pytest Intro",
            Track = Track.Python,
            Category = SkillCategory.Algorithms,
            Difficulty = 1,
            ExpectedLanguage = ProgrammingLanguage.Python,
            EstimatedHours = 1,
            Prerequisites = new[] { "Basic Python syntax", "How to run a script from the terminal" },
            Description = """
## Overview
Write a classic FizzBuzz program and cover it with a small Pytest suite. Prints numbers 1..100; replace multiples of 3 with "Fizz", multiples of 5 with "Buzz", multiples of both with "FizzBuzz".

## Learning goals
- Python control flow and functions.
- Writing unit tests with Pytest.
- Running tests and interpreting output.

## Hints
- Tests first, implementation second. Your first commit can be a set of failing tests.
- Don't over-engineer — this is a warm-up, not a framework.
""",
            AcceptanceCriteria = """
- A `fizzbuzz(n: int) -> str` function returns the correct string for a single number: `"Fizz"` for multiples of 3, `"Buzz"` for multiples of 5, `"FizzBuzz"` for multiples of both, and `str(n)` otherwise.
- A `main()` routine prints the FizzBuzz output for `1..100` inclusive when the script is executed directly.
- A separate `pytest` test file contains at least 4 tests covering: a multiple of 3, a multiple of 5, a multiple of both (e.g. 15 or 30), and a plain non-multiple.
- Running `pytest` from the project root produces zero failures and zero errors.
""",
            Deliverables = """
- One Python source file with the `fizzbuzz` function and the `main()` entry point (e.g. `fizzbuzz.py`).
- One Python test file using `pytest` (e.g. `test_fizzbuzz.py`).
- Optional but recommended: a short `README.md` showing how to run the script and the tests.
""",
        },
        new()
        {
            Title = "Implement an LRU Cache",
            Track = Track.Python,
            Category = SkillCategory.DataStructures,
            Difficulty = 2,
            ExpectedLanguage = ProgrammingLanguage.Python,
            EstimatedHours = 4,
            Prerequisites = new[] { "Dictionaries in Python", "Linked lists conceptually" },
            Description = """
## Overview
Implement a Least Recently Used (LRU) cache as a reusable Python class. `get(key)` and `put(key, value)` must both run in O(1) average time.

## Learning goals
- Combining a hash map with a doubly linked list.
- Reasoning about amortized time complexity.
- Writing tests for data structures.

## Acceptance criteria
- `LRUCache(capacity: int)` class with `get` and `put` operations.
- Evicts the least-recently-accessed item when at capacity.
- Tests cover: cache hit updates recency, cache miss returns sentinel, eviction on overflow, `put` updating existing key doesn't duplicate.
- Type hints on all public methods.

## Hints
- Python's built-in `OrderedDict` makes this trivial — do it the hard way first (dict + doubly linked list) to internalize the mechanics, then optionally add a second solution using `OrderedDict` and compare.
""",
        },
        new()
        {
            Title = "Model a Blog with SQLAlchemy 2.0",
            Track = Track.Python,
            Category = SkillCategory.Databases,
            Difficulty = 3,
            ExpectedLanguage = ProgrammingLanguage.Python,
            EstimatedHours = 5,
            Prerequisites = new[] { "Python classes", "Basic SQL (SELECT/INSERT/JOIN)" },
            Description = """
## Overview
Model a tiny blog schema with SQLAlchemy 2.0: `User` (id, email, full_name) and `Post` (id, user_id FK, title, body, created_at). Enforce the one-to-many relationship and write queries against it.

## Learning goals
- SQLAlchemy 2.x declarative mapping.
- Foreign keys and relationship navigation.
- Database sessions and transactions.

## Acceptance criteria
- Models defined with proper constraints (unique email, non-null FK).
- Alembic migration that creates the schema.
- A `seed.py` that inserts 3 users with 2 posts each.
- A `queries.py` with: (a) fetch all posts for a given user, (b) count posts per user grouped by email.
- Tests prove both queries return correct results on the seeded data.

## Hints
- Use `Mapped[]` and `mapped_column()` style (SQLAlchemy 2.0), not legacy `Column()`.
- Wrap writes in a session context manager; never forget to commit.
""",
        },
        new()
        {
            Title = "Library Management System (OOP)",
            Track = Track.Python,
            Category = SkillCategory.OOP,
            Difficulty = 2,
            ExpectedLanguage = ProgrammingLanguage.Python,
            EstimatedHours = 4,
            Prerequisites = new[] { "Python classes and inheritance", "Writing custom exceptions" },
            Description = """
## Overview
Design a small library system using OOP. Model `Book`, `Member`, and `Library`. A member can borrow a book (if copies available), return it, and the library tracks current loans.

## Learning goals
- Classes, encapsulation, and clear responsibilities.
- Composition over inheritance.
- Error handling with custom exceptions.

## Acceptance criteria
- `Book(isbn, title, total_copies)` with available-copies accounting.
- `Member(member_id, name)` with a list of currently borrowed books.
- `Library.borrow(member, isbn)` decrements copies or raises `BookUnavailableError`.
- `Library.return_book(member, isbn)` reverses the action; raises if the member wasn't holding it.
- Tests for all three flows plus the two error cases.

## Hints
- Keep state in the `Library`, not on `Book` — books shouldn't know who's holding them.
- Define your exceptions in a dedicated module; don't use bare `ValueError`.
""",
        },
        new()
        {
            Title = "Secure REST API with FastAPI + JWT",
            Track = Track.Python,
            Category = SkillCategory.Security,
            Difficulty = 4,
            ExpectedLanguage = ProgrammingLanguage.Python,
            EstimatedHours = 7,
            Prerequisites = new[] { "FastAPI basics", "HTTP + headers", "What a JWT looks like" },
            Description = """
## Overview
Build a FastAPI service with three endpoints: `POST /register`, `POST /login` (returns JWT), and `GET /me` (protected, returns the current user). Passwords hashed with bcrypt.

## Learning goals
- FastAPI routing and dependency injection.
- JWT issuance and verification.
- Secure password storage.

## Hints
- Use `passlib[bcrypt]` for hashing, `python-jose[cryptography]` for JWTs.
- Never store plaintext passwords. Verify via `passlib`, not string comparison.
- Store the JWT secret in an env var, not a constant.
""",
            AcceptanceCriteria = """
- `POST /register` accepts `{email, password}` JSON, creates a user with a **bcrypt-hashed** password, returns **201** on success and **409** when the email already exists.
- `POST /login` accepts `{email, password}`, verifies credentials via `passlib`, and returns **200** with `{access_token, token_type}` containing a signed JWT whose expiry is **~1 hour**. Bad credentials return **401**.
- `GET /me` reads the `Authorization: Bearer <token>` header, validates the JWT signature + expiry, and returns the authenticated user (without the password hash). Missing / malformed / invalid / expired tokens return **401**.
- Passwords are **never** stored in plaintext — bcrypt (or argon2) hashing must be visible in the code.
- The JWT signing secret is read from an environment variable (e.g. `JWT_SECRET`) — **not** a hardcoded string literal.
- At least **5 pytest tests** cover: successful register, duplicate-email register, successful login, wrong-password login, and `/me` with both a valid and an invalid/expired token.
""",
            Deliverables = """
- A FastAPI application implementing the three endpoints (e.g. `main.py` + `app/` package).
- A dependency file (`requirements.txt` or `pyproject.toml`) listing `fastapi`, `uvicorn`, `passlib[bcrypt]`, `python-jose[cryptography]`, `pydantic`, `pytest`, `httpx`.
- A test file using FastAPI's `TestClient`.
- A `README.md` showing how to start `uvicorn`, how to run the tests, and how to set the `JWT_SECRET` env var.
""",
        },
        new()
        {
            Title = "Priority Queue via Binary Heap",
            Track = Track.Python,
            Category = SkillCategory.Algorithms,
            Difficulty = 3,
            ExpectedLanguage = ProgrammingLanguage.Python,
            EstimatedHours = 4,
            Prerequisites = new[] { "Arrays and indexing", "Big-O notation" },
            Description = """
## Overview
Implement a min-priority queue backed by a binary heap. Expose `push(item, priority)`, `pop()` (returns the lowest-priority item), and `peek()`.

## Learning goals
- Heap invariants and sift-up/sift-down operations.
- Time complexity of heap operations (O(log n)).
- Testing invariants, not just outputs.

## Acceptance criteria
- `PriorityQueue` class with the three methods above.
- `pop()` raises `IndexError` on an empty queue.
- Tests verify: pop order matches priority order across 100 random inserts; peek doesn't mutate; interleaved push/pop preserves order.
- Optional: compare against `heapq` on the same input as a sanity check.

## Hints
- Don't use `heapq` as the implementation — implement sift operations yourself. You can use `heapq` in the test to validate your own output.
- Stable ordering for equal priorities is a nice-to-have; document your choice.
""",
        },
        new()
        {
            Title = "SQLite → Postgres Migration with Alembic",
            Track = Track.Python,
            Category = SkillCategory.Databases,
            Difficulty = 5,
            ExpectedLanguage = ProgrammingLanguage.Python,
            EstimatedHours = 8,
            Prerequisites = new[] { "SQLAlchemy ORM basics", "Familiarity with Postgres", "Alembic migrations" },
            Description = """
## Overview
Migrate a production-like SQLite database (provided as `data.db`) to Postgres using Alembic, with zero data loss. Model the schema in SQLAlchemy, write an Alembic migration chain, and script the data copy with foreign-key ordering.

## Learning goals
- Working across two different SQL dialects.
- Alembic migration authoring (not just autogenerate).
- Dealing with schema and data migration separately.

## Acceptance criteria
- Alembic migration creates the same 4 tables in Postgres.
- A separate Python script streams rows from SQLite → Postgres in FK-safe order.
- Row counts match in both databases after migration.
- A smoke test queries a random row from each table and compares.

## Hints
- SQLite and Postgres handle types differently (dates, booleans). Convert explicitly.
- Disable FK constraints during load, re-enable and validate afterward.
- Batch inserts (~1000 at a time) — row-at-a-time is painfully slow.
""",
        },

        // ==================== Backend track (7) ====================

        new()
        {
            Title = "Weather CLI with Dependency Injection",
            Track = Track.Backend,
            Category = SkillCategory.OOP,
            Difficulty = 1,
            ExpectedLanguage = ProgrammingLanguage.CSharp,
            EstimatedHours = 2,
            Prerequisites = new[] { "C# basics (classes, methods)", "Running a dotnet console project" },
            Description = """
## Overview
Build a tiny .NET console app that takes a city name and prints the current weather. Call the public wttr.in API (`https://wttr.in/{city}?format=j1`). Structure the code with `IHostBuilder` + dependency injection.

## Learning goals
- Setting up a .NET console app with `IHostBuilder`.
- Registering services in DI.
- Calling an HTTP API with `HttpClient` (injected, not `new`).

## Acceptance criteria
- `IWeatherService` interface + `WttrWeatherService` implementation.
- `Main` uses `Host.CreateApplicationBuilder`, registers `HttpClient` with `AddHttpClient<IWeatherService, WttrWeatherService>()`.
- Prints: city, current temperature °C, condition, humidity.
- Gracefully handles network errors with a clear message.

## Hints
- Don't new up `HttpClient` — inject it via `IHttpClientFactory`.
- Cancellation tokens on your async methods. This is muscle memory you want.
- Deserialize with `System.Text.Json`, not Newtonsoft (it's the .NET default now).
""",
        },
        new()
        {
            Title = "CRUD REST API with ASP.NET + EF Core",
            Track = Track.Backend,
            Category = SkillCategory.Databases,
            Difficulty = 2,
            ExpectedLanguage = ProgrammingLanguage.CSharp,
            EstimatedHours = 5,
            Prerequisites = new[] { "C# fundamentals", "HTTP methods (GET/POST/PUT/DELETE)" },
            Description = """
## Overview
Build a minimal REST API for managing `Books` (id, title, author, published_year). Use ASP.NET Core + EF Core with SQLite for easy local runs. Expose GET/POST/PUT/DELETE at `/api/books`.

## Learning goals
- Structuring a .NET Web API project.
- EF Core DbContext, migrations, and basic CRUD.
- Route conventions and model binding.

## Hints
- Use `Results.NotFound()`, `Results.Ok()` etc. with minimal APIs — concise and expressive.
- Apply the migration on startup for local dev (`db.Database.Migrate()`), guarded by `Development` env.
- FluentValidation or DataAnnotations — either is fine, pick one and be consistent.
""",
            AcceptanceCriteria = """
- Five endpoints exposed under `/api/books`: `GET` (list), `GET /{id}` (read one), `POST` (create), `PUT /{id}` (replace), `DELETE /{id}` (remove).
- A `Book` entity persists `Id` (auto), `Title` (required, max 200 chars), `Author` (required, max 100 chars), `PublishedYear` (int, **between 1450 and current year + 1**).
- POST and PUT return **400 BadRequest** with a useful error payload when validation fails (e.g. missing title, year out of range).
- `GET /{id}`, `PUT /{id}`, and `DELETE /{id}` return **404 NotFound** when the book id does not exist.
- POST returns **201 Created** with the created entity and a `Location` header pointing to `GET /api/books/{id}`.
- Swagger UI is reachable at `/swagger` in Development.
- At least **3 integration tests** (using `WebApplicationFactory<T>` or similar): happy-path CRUD round-trip, 404 on missing id, and 400 on validation failure.
""",
            Deliverables = """
- A .NET 8 ASP.NET Core Web API project (e.g. `BookCatalog.Api`).
- An EF Core `DbContext` with a `Book` `DbSet` and a generated migration committed under `Migrations/`.
- A test project (xUnit or NUnit) containing the integration tests above.
- A `README.md` covering: how to apply the migration, how to run the API, and how to run the test suite.
""",
        },
        new()
        {
            Title = "Add JWT Auth to a .NET API",
            Track = Track.Backend,
            Category = SkillCategory.Security,
            Difficulty = 3,
            ExpectedLanguage = ProgrammingLanguage.CSharp,
            EstimatedHours = 6,
            Prerequisites = new[] { "Building a .NET Web API", "HTTP authorization headers" },
            Description = """
## Overview
Add JWT bearer authentication to an existing .NET Web API. Implement `POST /auth/register`, `POST /auth/login`, and protect a `GET /me` endpoint.

## Learning goals
- ASP.NET Core Identity basics.
- JWT issuance with symmetric or asymmetric keys.
- Authorization attributes and claims.

## Hints
- HS256 is fine for this task; RS256 is closer to production but adds key-management overhead.
- Configure `JwtBearerOptions.TokenValidationParameters` carefully — validate issuer, audience, lifetime.
- Refresh tokens are out of scope here; a single-token flow is enough to learn the mechanics.
""",
            AcceptanceCriteria = """
- `POST /auth/register` creates a user via ASP.NET Core Identity (`UserManager<IdentityUser>` or a custom user); enforces the configured password policy; returns **400** with the policy error message when the password is weak.
- `POST /auth/login` validates email + password and returns **200** with `{accessToken, expiresAt}` on success, **401** on bad credentials (no token-detail leak in the failure response).
- `GET /me` is decorated with `[Authorize]`: returns **401** without a token, **200** with the authenticated user's id and email when a valid bearer token is presented.
- The JWT signing key + issuer + audience are read from configuration (`appsettings.json` / env vars / user secrets) — **not hardcoded** as string literals in source files.
- `TokenValidationParameters` validate signature, issuer, audience, and lifetime.
- At least **3 integration tests** cover: register-then-login yielding a usable bearer token, `/me` accepts that token, `/me` rejects an expired or tampered token with **401**.
""",
            Deliverables = """
- A .NET 8 Web API project with the three auth endpoints wired into ASP.NET Core Identity (in the existing `DbContext` or a new one).
- A test project containing the integration tests above.
- A `README.md` showing how to set the JWT signing key (env var or `appsettings.Development.json`), how to register + login, and an example of using the token via `curl` or Postman.
""",
        },
        new()
        {
            Title = "Thread-Safe Hash Map",
            Track = Track.Backend,
            Category = SkillCategory.DataStructures,
            Difficulty = 3,
            ExpectedLanguage = ProgrammingLanguage.CSharp,
            EstimatedHours = 5,
            Prerequisites = new[] { "C# generics", "Basic multithreading (Tasks, lock keyword)" },
            Description = """
## Overview
Implement a thread-safe key-value store in C# that supports concurrent `Get`, `Put`, and `Remove` without data races. Target: 4 concurrent writers + 8 concurrent readers for 100ms each with no lost updates.

## Learning goals
- `lock`, `ReaderWriterLockSlim`, and `ConcurrentDictionary`.
- Benchmarking lock strategies.
- Reasoning about memory visibility.

## Acceptance criteria
- `IThreadSafeMap<TKey, TValue>` with Get/Put/Remove/Count.
- Two implementations: one using a global `lock` and one using `ConcurrentDictionary`. Both must pass the same test.
- A stress test that runs N writers + M readers for a fixed duration and asserts: no exceptions, every `Put` is observed by at least one `Get`, final count = expected inserts minus removes.
- BenchmarkDotNet comparison of the two impls (at least in the README).

## Hints
- Don't use `Dictionary<,>` without any lock — you will see corruption under concurrency.
- `ConcurrentDictionary.AddOrUpdate` is the idiomatic way to avoid TOCTOU bugs.
""",
        },
        new()
        {
            Title = "Normalize a Sales Dataset to 3NF",
            Track = Track.Backend,
            Category = SkillCategory.Databases,
            Difficulty = 4,
            ExpectedLanguage = ProgrammingLanguage.Sql,
            EstimatedHours = 5,
            Prerequisites = new[] { "Relational model basics", "SQL CREATE TABLE, JOIN" },
            Description = """
## Overview
Given a flat denormalized sales CSV (provided), design a 3NF SQL schema that eliminates redundancy. Produce the `CREATE TABLE` statements and an import script that loads the CSV into the new schema.

## Learning goals
- Functional dependencies and normalization.
- Primary keys, foreign keys, and surrogate vs natural keys.
- Writing portable SQL DDL.

## Acceptance criteria
- At least 4 normalized tables (e.g., customers, products, orders, order_items) with PKs and FKs.
- No repeating groups; every non-key attribute depends on the whole key.
- ERD diagram (Mermaid or image) committed alongside the SQL.
- Import script loads the sample CSV; row counts in source/target reconcile.
- One JOIN query that reproduces a row from the original flat file.

## Hints
- Ask: for each column, what does it functionally depend on? Put it in that table.
- Pick surrogate `id` primary keys — natural keys are brittle.
- Use `ON DELETE RESTRICT` as the default; switch to `CASCADE` only where it's semantically right.
""",
        },
        new()
        {
            Title = "Token-Bucket Rate Limiter Middleware",
            Track = Track.Backend,
            Category = SkillCategory.Algorithms,
            Difficulty = 3,
            ExpectedLanguage = ProgrammingLanguage.CSharp,
            EstimatedHours = 5,
            Prerequisites = new[] { "ASP.NET middleware pipeline", "Concurrency primitives in C#" },
            Description = """
## Overview
Implement a token-bucket rate limiter in C# that can be plugged in as ASP.NET Core middleware. Configuration: requests-per-minute per API key, with a burst allowance.

## Learning goals
- Token bucket vs leaky bucket vs sliding window.
- Writing ASP.NET Core middleware.
- Handling concurrent counter state correctly.

## Acceptance criteria
- `TokenBucketLimiter` class with a testable `TryAcquire(key)` method.
- Middleware integrates the limiter; returns 429 with `Retry-After` header on rejection.
- Configuration via `appsettings.json`: `PerMinute`, `Burst`.
- Unit tests: bucket refills correctly; bursting consumes tokens faster than the rate; separate keys don't share buckets.

## Hints
- Use `Stopwatch` (monotonic) for token-refill time math, not `DateTime.Now`.
- Keep per-key state in a `ConcurrentDictionary`; lock only the specific bucket when updating it.
- Production systems use Redis for this; an in-memory version is sufficient for the exercise.
""",
        },
        new()
        {
            Title = "Secure Password-Reset Flow",
            Track = Track.Backend,
            Category = SkillCategory.Security,
            Difficulty = 4,
            ExpectedLanguage = ProgrammingLanguage.CSharp,
            EstimatedHours = 6,
            Prerequisites = new[] { "JWT or similar auth pattern", "ASP.NET Identity or equivalent user store" },
            Description = """
## Overview
Implement a "forgot password" flow in a .NET Web API. Emit a time-limited reset token, accept it at a reset endpoint, and change the password securely — no account enumeration, no token reuse.

## Learning goals
- Secure random token generation.
- Timing-safe comparison to avoid side channels.
- Not leaking whether an email is registered.

## Acceptance criteria
- `POST /auth/forgot-password { email }` always returns 202 (never 404), logs the reset token for the test.
- `POST /auth/reset-password { token, newPassword }` validates the token (15-minute expiry, single-use, hashed in DB) and updates the password hash.
- Tokens are cryptographically random (≥32 bytes).
- Tests for: unknown email → 202; expired token → 400; reused token → 400; happy path → 204.

## Hints
- Store a hash of the token in the DB, not the raw token — treat it like a password.
- Use `RandomNumberGenerator.GetBytes`, not `Random`.
- Compare tokens with `CryptographicOperations.FixedTimeEquals`.
""",
        },

        // ==================== Full-Stack track (7) ====================

        new()
        {
            Title = "Full-Stack Counter Hello World",
            Track = Track.FullStack,
            Category = SkillCategory.OOP,
            Difficulty = 1,
            ExpectedLanguage = ProgrammingLanguage.TypeScript,
            EstimatedHours = 2,
            Prerequisites = new[] { "React basics", "Any backend framework you like (Express/FastAPI/ASP.NET)" },
            Description = """
## Overview
Build a full-stack "counter" hello world. A React page with a number and two buttons (+/−). Persist the count in a tiny Express (or FastAPI, or ASP.NET) backend with an in-memory store. On refresh, the count remains.

## Learning goals
- Shape of a full-stack request/response cycle.
- Setting up CORS.
- Basic React state management.

## Acceptance criteria
- Backend: `GET /count`, `POST /count/increment`, `POST /count/decrement`. In-memory counter is fine.
- Frontend: React + Vite, two buttons, current count displayed, refreshed from backend on mount.
- CORS configured so the frontend can call the backend.
- Loading state shown while a mutation is in flight.

## Hints
- Don't stress about styling — focus on the request plumbing.
- Use `fetch` or `axios` consistently; don't mix.
- Errors shouldn't crash the UI — show a simple toast or inline message.
""",
        },
        new()
        {
            Title = "TODO App (React + Node + SQLite)",
            Track = Track.FullStack,
            Category = SkillCategory.OOP,
            Difficulty = 2,
            ExpectedLanguage = ProgrammingLanguage.TypeScript,
            EstimatedHours = 5,
            Prerequisites = new[] { "React components + hooks", "Basic SQL" },
            Description = """
## Overview
Classic TODO list. React UI + Node/Express API + SQLite. Add a todo, mark complete, delete, filter by all/active/completed.

## Learning goals
- CRUD across a full stack.
- Component composition and lifting state.
- Controlled forms with validation.

## Hints
- Use `react-hook-form` + Zod — forms without it tend to sprawl.
- Optimistic updates make the UI feel instant; just remember to revert on error.
- Index `completed` so filter queries stay fast when the list grows.
""",
            AcceptanceCriteria = """
- Backend endpoints: `GET /todos` (supports `?filter=all|active|completed`), `POST /todos` (create), `PATCH /todos/:id` (toggle completed and/or update text), `DELETE /todos/:id`.
- SQLite schema includes `id` (PK), `text` (NOT NULL, length 1-200), `completed` (boolean, default `false`), `created_at` (timestamp).
- Frontend is a single-page React app with: an Add-todo form, a list of todos with a checkbox-toggle + delete button per row, and **three filter tabs (All / Active / Completed)** that reflect the active filter visually.
- Input validation on **both** server and client: empty or `>200`-char text is rejected inline on the FE and returns **400** on the BE.
- Loading and empty states are rendered explicitly — no jarring flashes, no perpetual spinner on an empty list.
- POST / PATCH / DELETE update the visible list without a full page reload (state update or refetch — not `window.location.reload()`).
""",
            Deliverables = """
- A Node + Express (or Fastify) backend folder (e.g. `server/`) with the SQLite file and any migration / init script.
- A React frontend folder (e.g. `client/`) using Vite or CRA + TypeScript, consuming the backend API.
- A `README.md` covering: how to install deps for both apps, how to run them locally, and the resulting schema (DDL or a short diagram).
""",
        },
        new()
        {
            Title = "Book Catalog: Search + Pagination",
            Track = Track.FullStack,
            Category = SkillCategory.Databases,
            Difficulty = 3,
            ExpectedLanguage = ProgrammingLanguage.TypeScript,
            EstimatedHours = 6,
            Prerequisites = new[] { "REST API design", "React data fetching" },
            Description = """
## Overview
Given a backend serving ~5000 books, build a paginated, searchable catalog page. Server-side filtering by title or author, page size 20, with a URL-synced query state so deep links work.

## Learning goals
- Server-side pagination and SQL LIMIT/OFFSET.
- Debounced search inputs.
- Syncing UI state to the URL.

## Hints
- Debounce the input value, and also cancel in-flight requests when a new search fires.
- Don't call the API on every keystroke.
- Add a DB index on `title` (or use full-text search when ready).
""",
            AcceptanceCriteria = """
- Backend endpoint `GET /books` accepts `search`, `page` (1-based, default 1), and `size` (default 20, max 100) query params and returns `{items, page, size, totalCount}`.
- The `search` filter matches **title OR author** with a case-insensitive partial match. An empty `search` returns all books paginated.
- Frontend has: a search input that debounces user typing by **~300 ms** before firing the request, prev/next page controls, and a counter showing `N results · page X of Y`.
- The URL reflects the current `search` + `page` so refreshing or sharing the link preserves the state; the browser back button restores prior queries.
- **Distinct** empty states for "no books at all" vs "no results for this search" with appropriate copy.
- An in-flight request is cancelled when a new search keystroke fires inside the debounce window (no race-condition stale-results bug).
- Catalog page Lighthouse Performance score **≥ 85** on a local run with ~5000 seeded books.
""",
            Deliverables = """
- A backend (any stack — Express / FastAPI / ASP.NET) exposing `GET /books` plus a seed script that inserts ~5000 books.
- A React frontend with the search + pagination component; URL state synced via React Router or `URLSearchParams`.
- A `README.md` with: run + seed instructions, plus a short note on the index or full-text strategy used for the search filter.
""",
        },
        new()
        {
            Title = "OAuth Login with Google",
            Track = Track.FullStack,
            Category = SkillCategory.Security,
            Difficulty = 3,
            ExpectedLanguage = ProgrammingLanguage.TypeScript,
            EstimatedHours = 7,
            Prerequisites = new[] { "HTTP redirects", "Cookies vs localStorage", "OAuth 2.0 mental model" },
            Description = """
## Overview
Add "Sign in with Google" to a web app. OAuth 2.0 authorization-code flow. The backend exchanges the code for tokens, creates or links the user, and issues your own session JWT.

## Learning goals
- OAuth 2.0 authorization-code vs implicit flows.
- CSRF protection with the `state` parameter.
- Account linking (same email → same user).

## Acceptance criteria
- Frontend: "Sign in with Google" button redirects to Google's consent screen.
- Callback endpoint on the backend validates `state`, exchanges the code, fetches the user profile.
- If a user with that email already exists, link; otherwise create.
- Session JWT returned to the frontend; `/me` endpoint returns the user.
- 400 on invalid/missing `state`.

## Hints
- Set `state` as an HttpOnly cookie before redirecting; verify on callback. Never trust query-string state alone.
- Store Google's access token only if you need it (for later API calls). For basic login, you don't need to persist it at all.
- Test mode: the Google Cloud console lets you register a test OAuth app for localhost.
""",
        },
        new()
        {
            Title = "Trie-Based Fuzzy Search (Client-Side)",
            Track = Track.FullStack,
            Category = SkillCategory.DataStructures,
            Difficulty = 2,
            ExpectedLanguage = ProgrammingLanguage.TypeScript,
            EstimatedHours = 4,
            Prerequisites = new[] { "Basic data structures", "React input handling" },
            Description = """
## Overview
Client-side fuzzy search over ~10,000 items (e.g., product names). Build a trie index + prefix lookup; add a small edit-distance tolerance so "lpato" finds "laptop".

## Learning goals
- Trie data structure.
- Edit distance (Levenshtein) basics.
- React state management for a live-search UX.

## Acceptance criteria
- `Trie` class with `insert(word)` and `searchPrefix(prefix)`.
- A fuzzy wrapper that tolerates edit distance ≤ 1 for queries ≥ 4 characters.
- Search results ranked by closeness and appearance frequency.
- React input wired to the search with sub-100ms response on 10k items.

## Hints
- Don't use a library — build the trie yourself. Then, optionally, benchmark against `fuse.js`.
- For edit distance, bound the search depth — unbounded Levenshtein over a big list is slow.
- Keep the trie in memory; rebuilding per keystroke is wasteful.
""",
        },
        new()
        {
            Title = "XSS-Safe Markdown Renderer",
            Track = Track.FullStack,
            Category = SkillCategory.Security,
            Difficulty = 4,
            ExpectedLanguage = ProgrammingLanguage.TypeScript,
            EstimatedHours = 5,
            Prerequisites = new[] { "React `dangerouslySetInnerHTML`", "Common XSS payloads" },
            Description = """
## Overview
A blog app renders user-submitted markdown. Implement it safely — no `<script>` injection, no `onclick=`, no `javascript:` links. Use a sanitizer on the output; never `dangerouslySetInnerHTML` unfiltered content.

## Learning goals
- XSS attack vectors beyond the obvious.
- Markdown → HTML → sanitized HTML pipeline.
- Trust boundaries in frontend code.

## Acceptance criteria
- Markdown rendered via `marked` or `remark`, then sanitized with `DOMPurify` (or equivalent).
- 6 test inputs that try common XSS payloads (`<script>`, `<img onerror>`, `javascript:` URL, `<a href="data:text/html,...">`, SVG script, HTML entity bypass). All rendered safely.
- Safe HTML (bold, links, code blocks) still works after sanitization.
- A short `SECURITY.md` explaining what's sanitized and what's trusted.

## Hints
- The correct order is: render markdown → sanitize HTML. Sanitizing markdown first misses HTML-in-markdown.
- Allowlist, don't blocklist. Configure sanitizer to allow a known set of tags and attributes.
- Never disable React's XSS escaping unless absolutely necessary.
""",
        },
        new()
        {
            Title = "Real-Time Chat with WebSockets",
            Track = Track.FullStack,
            Category = SkillCategory.Databases,
            Difficulty = 5,
            ExpectedLanguage = ProgrammingLanguage.TypeScript,
            EstimatedHours = 10,
            Prerequisites = new[] { "HTTP vs WebSocket protocol", "Event-driven server code", "A SQL database" },
            Description = """
## Overview
Two-user chat room. React client + Node WebSocket server. Messages persist in a DB so refreshing a client shows history. Reconnect automatically if the connection drops.

## Learning goals
- WebSocket protocol and handshake.
- Maintaining a message history on the server.
- Reconnect-with-backoff patterns on the client.

## Acceptance criteria
- Server: accepts websocket connections, broadcasts messages, persists each to SQLite with timestamp + sender id.
- Client: connect, display history on load, send messages, scroll-to-bottom on new message.
- Reconnect automatically if the socket drops (exponential backoff up to 30s max).
- Two browser tabs can chat; messages appear in real time.

## Hints
- `ws` library on the server; browser native `WebSocket` on the client. Don't pull in Socket.IO for this — the raw protocol is instructive.
- Handle the "connection closed while sending" race — buffer outgoing messages and flush on reconnect.
- `ping`/`pong` frames at ~30s intervals keep intermediaries from killing idle connections.
""",
        },
    };
}
