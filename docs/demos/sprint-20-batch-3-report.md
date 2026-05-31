# Sprint 20 -- Task Batch 3 Report

**BatchId:** `57cf3d44-537b-4f4b-8021-5a752949d25c`  
**Generated at:** 2026-05-15T09:32:14Z  
**Reviewer:** Claude single-reviewer (ADR-060, extends ADR-056 + 057 + 058 + 059)  
**Wall clock:** 65.0s (~1.1 min)  
**Token cost:** 23,425 tokens (retries: 1)  

## Summary
- **Total drafts generated:** 9
- **Approved:** 9 (100.0%)
- **Rejected:** 0 (0.0%)
- **30% reject-rate bar:** within bar.
- **F16 task-library target:** 50 tasks after apply -- MET.

## Distribution (by track x difficulty)

| Track | Diff 2 | Diff 3 | Diff 4 | Total |
|---|---|---|---|---|
| FullStack | 1 | 2 | 0 | 3 |
| Backend | 1 | 1 | 1 | 3 |
| Python | 1 | 1 | 1 | 3 |

## Approved drafts

### A1: FullStack / diff=2 / Algorithms (6h)

**Title:** Build a collaborative shopping list service with change tracking

**Description:** You are building a lightweight collaborative shopping list service where multiple users can add items, mark them as purchased, and see who changed what. The goal is to deliver a clear API plus a minimal client that keeps shared state in sync, so your future teammates can rely on the data and understand what happened.

Functional requirements:
- Expose a REST-like API to create lists, add items, toggle purchased flags, and fetch item history with timestamps and actor names.
- Store list data and per-item change logs so each entry records who made the last update and when.
- Implement a simple client (CLI or single-page UI) that fetches the list data, displays ownership info, and lets the user submit updates.
- Ensure the client renders clear timestamps and shows the latest actor for each change so other collaborators can follow recent actions.
- Provide server- or client-side validation to prevent empty items and enforce that each list belongs to a valid session or workspace identifier.

Stretch goals:
- Add optimistic UI updates on the client so users see their edits immediately with an indicator for pending confirmation.
- Emit a summary event (console log or UI badge) when the list has more than three pending changes by others.
- Allow filtering the displayed history by actor name or by "since" timestamp.

**Acceptance:** - API returns 2xx responses for valid list/item operations and rejects invalid payloads with 4xx codes.
- The persistence layer stores both the current state of each item and the latest change log (actor + timestamp).
- Client displays latest actor and timestamp next to each list item and reflects state changes after API calls.
- Validation prevents creating blank items or mutating items without a workspace identifier.
- README explains how to run the service, interact with the client, and inspect the change log data.

**Deliverables:** GitHub repository with server + client code, README describing setup, and at least one example workflow demonstrating change tracking.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'readability', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.4, 'readability': 0.3}

*Rationale:* This medium FullStack task balances correctness in handling shared list state and readability through clear change logs, a good fit for level 2 growth.

---

### A2: FullStack / diff=3 / Security (12h)

**Title:** Build a consent-aware data sharing hub with tiered access policies

**Description:** Many services now collect user data that can be shared with partners, but the decision to share should be explicit, traceable, and reversible. Build a compact full-stack experience where consent choices drive which datasets are accessible to different consumer apps.

- Create a backend that stores user profiles, their granted consents, and partner apps with scoped permissions; expose authenticated CRUD routes that honor the active consents.
- Build a front-end dashboard that lists active consents, explains the consequences of each scope, and lets the user toggle them; changes should propagate immediately to the backend.
- Implement a consent audit trail that records each grant, revocation, and expiration, and surface summaries both for internal administrators and for users to review what partners can see.
- Protect all data movements with a security posture that includes signed tokens, per-endpoint authorization checks, and a consistent error handling strategy to avoid leaking sensitive info.
- Link the front end and backend with a secure session pattern, and document how refreshed policies are pushed without requiring full reloads.

Stretch goals:

- Offer a simulated partner app interface that can request data under a specific permission scope and show how it is denied when consent is withdrawn.
- Add rate-limiting or throttling middleware to the backend to defend sensitive routes from overuse.
- Allow exporting consent history as a downloadable report that redacts personally identifiable fields.
- Provide a deployable configuration (e.g., Docker compose or scripts) to spin up the stack with sample data.

**Acceptance:** All API routes require authentication and reject requests lacking the proper consent scope.
The UI accurately reflects the backend consents state within one user interaction and shows audit entries after each change.
Audit trail entries capture actor, timestamp, action, and affected scopes for every grant or revocation.
Push notifications or polling keep the dashboard in sync with consent updates without manual refresh.
Security handling (tokens/headers) is explained in the README along with how to rotate secrets.

**Deliverables:** GitHub repo with backend + frontend source, README explaining the architecture, and instructions to seed data;
Include any configuration files needed to run tests or sample data.

**Skill tags:** [{'skill': 'security', 'weight': 0.6}, {'skill': 'design', 'weight': 0.4}]  
**Learning gain:** {'security': 0.5, 'design': 0.4}

*Rationale:* This consent-focused full-stack project challenges developers to balance security controls with thoughtful UX design, matching a difficulty 3 FullStack goal.

---

### A3: FullStack / diff=3 / Databases (12h)

**Title:** Build a product search index with adaptive cache warming

**Description:** Many full-stack apps struggle when complex search queries suddenly spike, so you will build a small product catalog service that keeps a lightweight search index in sync with a fast cache layer and pre-warms hot results to keep latency predictable.

#### Requirements
- Provide a REST endpoint that returns paginated product search results based on name/description keywords and optional category filters, backed by a modest dataset (could be JSON or SQLite).
- Maintain an in-memory cache of recent queries with their result sets and signal when stale data should trigger a rebuild from the primary store.
- Track query frequencies and implement a background ``cache warmer`` that refreshes the most frequent queries every minute without blocking incoming requests.
- Measure and expose latency and hit-rate metrics for both the cache and primary storage layer.

#### Stretch goals
- Add support for faceted counts (e.g., number of matching products per category) while still honoring the caching strategy.
- Allow the warmer to prefetch slightly wider query variants (e.g., including synonyms) and compare their hit rates.
- Provide a simple front-end page that displays the cache hit rate and lets users trigger manual refreshes for a query.

**Acceptance:** - Search endpoint returns correct paginated results for name/description matches and category filters.
- Cache layer returns fresh data when available and reliably falls back to the primary store when outdated.
- Background cache warmer refreshes the top N queries each minute without blocking request throughput.
- Metrics endpoint reports cache hit rate and request latency with updated values after warmups.
- README documents dataset shape, cache eviction policy, and how to run the warmer.

**Deliverables:** GitHub repo with full source, README, and instructions for running both the API and cache warmer.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.3}, {'skill': 'performance', 'weight': 0.7}]  
**Learning gain:** {'correctness': 0.35, 'performance': 0.65}

*Rationale:* This task fits a FullStack level-3 scope because it forces developers to manage correctness in cached search results while building a performant cache-warming layer that mirrors production challenges.

---

### A4: Backend / diff=2 / Databases (6h)

**Title:** Build a reconciliation-ready inventory audit API

**Description:** You are helping a warehouse team get better visibility into stock movements by designing a service that tracks reported counts and reconciliations. The API should accept snapshots from scanning stations, allow reviewing the deltas against expected inventory, and provide a way to mark discrepancies as investigated within a single request cycle.

Functional requirements:
- Accept a POST with a bundle of item scans (SKU, location, counted quantity) plus metadata (shift, operator) and persist each observation along with a generated reconciliation ID.
- Provide a GET endpoint that, for a reconciliation ID, returns the expected quantity, latest reported count, and a simple status marker (matching, short, over) without exposing raw history rows.
- Support a PATCH that lets an analyst flag a discrepancy, attach a short note, and atomically transition the status to “investigated” while logging the timestamp.
- Store the core data in a relational model (items, scans, reconciliation events) that enforces referential integrity and prevents duplicated scan IDs.
- Ensure the service rejects scans that arrive with timestamps older than the latest persisted observation for the same SKU/location pair to guard against out-of-order uploads.

Stretch goals:
- Emit a summary view that groups reconciliations by shift and returns counts for each status bucket to assist daily reporting.
- Add a lightweight in-memory cache for the most recent reconciliation per SKU/location to reduce database hits for frequent polling.
- Write a migration or seeding script that seeds a few sample SKUs and expected quantities to exercise the endpoints easily.

**Acceptance:** - POSTing a scan bundle returns 201 and the response includes the reconciliation ID and created records count.
- GETting a reconciliation returns matching status info and does not expose scan-level rows when the request is scoped to one ID.
- PATCHing a discrepancy updates the status to investigated, records the note, and rejects requests that omit the reconciliation ID.
- Attempts to ingest an older timestamp for the same SKU/location are rejected with 400 and no new row is written.
- README outlines the data model, endpoints, and any cache or migration scripts provided.

**Deliverables:** Git repository URL with README explaining the persistence model and API contract, plus automated tests that cover the core endpoints and validation rules.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'design', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.5, 'design': 0.3}

*Rationale:* Building this medium-weight API teaches junior developers how to structure audit-friendly backend services that prioritize correctness and thoughtful data design.

---

### A5: Backend / diff=3 / Security (12h)

**Title:** Build a secure telemetry gateway with adaptive throttling

**Description:** Telemetry pipelines need a first-mile gate that enforces identity, limits abuse, and keeps the downstream services fast. Build a lightweight Python backend that validates client assertions, enacts a token-bucket limiter per API key, and keeps an in-memory performance dashboard of request timing.

- Validate incoming requests against a signed API key registry and reject replayed or malformed tokens.
- Record every request’s latency and status so the gateway can expose recent percentiles in a dashboard API.
- Enforce a configurable token-bucket rate limit per client, gracefully rejecting bursts that exhaust their bucket.
- Emit audit logs (timestamp, client, decision) for every request that hits the gateway.

Stretch goals:
- Persist the API key registry and audit log to Postgres/SQLite with upsert semantics.
- Allow operators to rotate keys and invalidate buckets without downtime.
- Integrate a lightweight circuit breaker that widens the rate limit when downstream latency spikes.
- Add a config-driven list of trusted IPs whose requests bypass throttling.

**Acceptance:** - Authenticated requests with valid keys receive 2xx responses and recorded latency metrics.
- Invalid tokens, replayed IDs, or clients over quota return 4xx/429 with descriptive JSON bodies.
- Metrics API exposes buckets, recent latencies, and request counts within 30 seconds of activity.
- Audit logs contain timestamp, client ID, decision, and reason for every incoming call.
- README documents deployment steps, configuration options, and how to rotate keys.

**Deliverables:** GitHub repo with source code, tests for token validation and throttling, README explaining deployment and configuration.

**Skill tags:** [{'skill': 'security', 'weight': 0.5}, {'skill': 'performance', 'weight': 0.35}, {'skill': 'correctness', 'weight': 0.15}]  
**Learning gain:** {'security': 0.6, 'performance': 0.4, 'correctness': 0.3}

*Rationale:* Designing a telemetry gateway combines security validation and performance-aware throttling, making it a solid difficulty-3 Backend task.

---

### A6: Backend / diff=4 / Security (18h)

**Title:** Build a secure policy-aware service mesh config validator

**Description:** Service meshes rely on distributed configuration and trust policies to keep inter-service traffic safe. Your job is to create a backend service that ingests service mesh resource definitions, evaluates them against a configurable security policy, and surfaces a verdict plus remediation hints. This keeps operators from deploying misconfigured mutual TLS, unsafe traffic routes, or permissive authorization rules.

Functional requirements:
1. Accept JSON or YAML service mesh resources (VirtualService, DestinationRule, AuthorizationPolicy) via a REST endpoint and normalize them into typed models.
2. Validate incoming configs against policy rules such as required mutual TLS mode, explicit host whitelists, and least-privilege authorization selectors.
3. Track findings per resource and emit a structured report (pass/fail, severity, remediation suggestion) plus overall policy compliance score.
4. Persist the latest evaluation result per resource in a lightweight durable store and expose a query endpoint so operators can fetch the latest verdict history.

Stretch goals:
- Allow operators to upload custom policy rules (e.g., prohibit wildcard hosts) and have the validator re-evaluate stored configs on demand.
- Provide a batching endpoint that receives multiple resources in one request and returns a summarized compliance dashboard.
- Integrate rate limiting or token bucket guards to defend the validation pipeline from overloaded clients.

**Acceptance:** - REST endpoint accepts JSON/YAML payloads and returns a compliance report with severity metadata.
- Policy rules are configurable and enforced against all supported resource types.
- Each validated resource has a persisted record with status and timestamp retrievable via query endpoint.
- Reports include remediation hints and an overall compliance score.
- Tests verify strong-path policy enforcement plus rate limiting/backpressure if implemented.

**Deliverables:** - GitHub URL containing the service code, config samples, README with usage, and at least one policy test suite.
- README explains the policy model, persistence choices, and security considerations.

**Skill tags:** [{'skill': 'design', 'weight': 0.55}, {'skill': 'security', 'weight': 0.45}]  
**Learning gain:** {'design': 0.5, 'security': 0.5}

*Rationale:* Designing a policy-aware validator with persistence and configurable rules sharpens advanced backend design while reinforcing security controls at difficulty level 4.

---

### A7: Python / diff=2 / Algorithms (6h)

**Title:** Build a prioritized job runner for CSV health checks

**Description:** Operations teams often need a lightweight Python tool to scan CSV exports for freshness, schema drift, and row-level constraints without spinning up a whole orchestration framework.

Functional requirements:
- Accept a configuration describing multiple CSV sources, per-file freshness thresholds, and priority levels.
- Schedule and execute health-check jobs in priority order, running higher-priority sources first when multiple jobs are ready.
- Track results per job, flagging schema issues (missing/extra columns) and invalid rows (type mismatches or missing critical fields).
- Record run durations and detected failures for each source, and summarize the latest status in a machine-readable report.
- Provide a CLI to trigger a full run or rerun an individual source by name.

Stretch goals:
- Cache the last successful schema per source to detect drift without reloading example files.
- Emit structured logs or metrics so downstream tooling can visualize job performance.
- Allow specifying a soft timeout per source and gracefully cancel long-running checks.

**Acceptance:** - Configuration parsing succeeds for at least three CSV sources with varying priorities and thresholds.
- Priority-aware scheduler runs higher-priority sources before lower ones when multiple are queued.
- Schema and row validation detects injected column/row violations and surfaces them in the report.
- Summary report includes run duration, status, and failure details for each source after a full run.
- CLI accepts commands to rerun a single named source and exits with non-zero status when a check fails.

**Deliverables:** GitHub URL with README, runner module, and 5+ tests covering scheduler and validation logic.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'design', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.4, 'design': 0.2}

*Rationale:* A priority-aware CSV health-check runner lets Python developers practice correctness and performance tradeoffs without exceeding a 2-level effort.

---

### A8: Python / diff=3 / OOP (10h)

**Title:** Build a reusable CSV transformation pipeline CLI

**Description:** Data teams often encode business rules as monolithic scripts that are hard to adjust or test. Build a Python command-line tool that lets users define a sequence of lightweight transformation steps (filtering, enrichment, aggregation) declaratively and applies them to input datasets, while providing clear logs and modular operators.

Functional requirements:
1. Accept a YAML or JSON pipeline definition that lists named steps and the transformation they perform on CSV rows.
2. Support at least three operator types (e.g., row filtering, field renaming, arithmetic enrichment) that can be composed in order.
3. Stream input rows from a file, apply the configured steps sequentially, and write the resulting rows to a new CSV.
4. Emit human-readable logs that detail which step processed how many rows and highlight skipped records.
5. Provide a `--dry-run` flag that validates the pipeline without emitting output, reporting any invalid configs.

Stretch goals:
- Add a plugin system so additional operator modules can be registered without changing the core runner.
- Enable step-level metrics (duration, input/output counts) that are serialized alongside the transformed output.
- Allow conditional branching where a step can reroute rows to different downstream operators based on predicates.

**Acceptance:** - CLI loads a pipeline file and exits with a clear error when required fields are missing.
- Running the pipeline produces an output CSV where each row has passed through every configured step in order.
- Logs include step names, row counts processed, and summaries of dropped records.
- `--dry-run` validates config and reports validation failures without generating output.
- Plugin operators can be registered and invoked via the pipeline definition without modifying core runner.

**Deliverables:** GitHub repo with README describing usage, pipeline schema, and instructions for running built-in operators; include sample pipelines and logs.

**Skill tags:** [{'skill': 'readability', 'weight': 0.6}, {'skill': 'design', 'weight': 0.4}]  
**Learning gain:** {'readability': 0.5, 'design': 0.3}

*Rationale:* Designing a configurable CSV pipeline exercises Python readability and system design skills at a solid difficulty-3 level.

---

### A9: Python / diff=4 / Security (20h)

**Title:** Ship a secure credential issuance CLI with audit logging

**Description:** Teams often need to distribute short-lived credentials for service accounts, but ad-hoc scripts leak secrets and lack traceability. Build a Python CLI that issues opaque tokens, stores their hashes in an append-only audit log, and enforces policy guards before handing over new credentials.

Functional requirements:
1. Accept a service name, expiration, and scope; validate inputs and refuse unsafe combinations.
2. Generate a random credential, encrypt it for transport, and persist only a cryptographic fingerprint plus metadata to the audit store.
3. Support multiple transports (stdout, file, webhook) while keeping the secret out of persisted logs.
4. Maintain an append-only audit log with timestamps, hashed credentials, and the user who requested issuance.
5. Provide a verification mode that checks whether a presented credential matches a stored hash without ever storing plaintext.

Stretch goals:
- Integrate a simple policy engine that refuses issuance if the service already holds the maximum number of active credentials.
- Add HMAC-signed webhooks so remote systems can prove authenticity when pulling secrets.
- Emit structured JSON logs compatible with SIEM ingestion.

**Acceptance:** - CLI rejects invalid input combinations with descriptive errors.
- Each issued credential appears in the audit log with only hashed material and metadata.
- Verification mode confirms valid credentials and rejects tampered ones without leaking values.
- Tests cover policy rules, log integrity, and transport guards.
- Documentation explains how to rotate credentials and why secrets are never stored in plaintext.

**Deliverables:** GitHub URL with README, CLI module, and test suite
Include sample audit log exports and usage documentation.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'security', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.5, 'security': 0.45}

*Rationale:* A CLI that issues hardened credentials and traces every step lets developers practice security-first correctness at difficulty 4 in Python.

---

## Rejected drafts
