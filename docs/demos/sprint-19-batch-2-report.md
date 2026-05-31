# Sprint 19 — Task Batch 2 Report

**BatchId:** `245ff2cd-bf48-4d84-b37c-81e35ca41d2d`  
**Generated at:** 2026-05-15T01:58:05Z  
**Reviewer:** Claude single-reviewer (ADR-059, extends ADR-056 + 057 + 058)  
**Wall clock:** 75.7s (~1.3 min)  
**Token cost:** 27,875 tokens (retries: 2)  

## Summary
- **Total drafts generated:** 10
- **Approved:** 10 (100.0%)
- **Rejected:** 0 (0.0%)
- **30% reject-rate bar:** within bar.

## Distribution (by track × difficulty)

| Track | Diff 2 | Diff 3 | Diff 4 | Total |
|---|---|---|---|---|
| FullStack | 1 | 1 | 1 | 3 |
| Backend | 1 | 2 | 1 | 4 |
| Python | 1 | 1 | 1 | 3 |

## Approved drafts

### A1: FullStack / diff=2 / OOP (6h)

**Title:** Ship a collaborative task board with activity comments

**Description:** Teams often juggle priorities across async workflows, so give them a lightweight kanban-style task board that documents collaboration. Build a UI where users can drag cards between columns, assign themselves, and leave short comments so the board tells the story of each item.

- Persist columns, cards, assignments, and per-card comments in a shared data model accessible to all viewers.
- Provide API endpoints that list cards in a column, move cards between columns, add comments, and capture the latest activity timestamp for each card.
- Offer a frontend view that shows columns with their cards, highlights assigned members, and reveals the most recent comments inline.
- Ensure the UI reacts to optimistic moves so users see instantaneous updates while the backend confirms persistence.
- Allow commenters to delete their own comment text while keeping card history consistent.

Stretch Goals:
- Emit simple websocket events (or polling updates) so teammates see card movements and new comments appear without a manual refresh.
- Show an activity badge summarizing how many comments or moves occurred in the last 24 hours per column.
- Offer a compact export of the current board state (columns, cards, comments) that can be downloaded as JSON.

**Acceptance:** - Columns, cards, assignments, and comments persist through API calls and reloads with consistent identifiers.
- Moving a card between columns returns a success status and the frontend reflects the card in the target column immediately.
- Comment creation and deletion endpoints enforce that only the author can remove their comment and return updated comment lists.
- The board view surfaces the most recent comment per card and the assigned user next to the card title.
- Optional real-time updates (websocket or polling) surface new activity for other connected clients within 5 seconds.

**Deliverables:** GitHub URL containing the backend source, frontend source, README describing setup, and at least 5 integration or UI tests.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'readability', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.5, 'readability': 0.3}

*Rationale:* This manageable FullStack build exercises correctness through shared state and readability via clear UI/UX and API surface design at a mid-level scope.

---

### A2: FullStack / diff=3 / OOP (12h)

**Title:** Ship an adaptive product gallery with viewport-aware caching

**Description:** A modern storefront needs to spotlight featured items without overwhelming the user or hammering APIs. Build a full-stack gallery that streams curated products, reuses client-server state, and keeps render costs predictable as shoppers pan across categories.

Functional requirements:
- Deliver a paginated gallery view that fetches product metadata from an API, reuses cached pages when scrolling back, and keeps latency under control with declarative loading states.
- Build backend endpoints that accept viewport filters (category, sort, preferences), return minimal payloads, and expose cache hints so the client can decide whether to refresh data.
- Implement a client-side cache layer keyed by filter + page that ignores stale responses, rehydrates server-side prefetched pages, and gracefully retries failed loads.
- Ensure the gallery layout adapts to different screen widths while keeping motion smooth and avoiding unnecessary re-renders.
- Wire up analytics for cache hits/misses so the user can audit performance behavior without exposing PII.

Stretch goals:
- Add a lightweight service worker that seeds the cache and keeps a quota of the most-viewed pages offline.
- Provide an admin view showing cache statistics per filter tuple and let an operator invalidate specific entries.
- Expose a webhook that notifies the client when a product in the current viewport is updated, triggering a targeted refresh.
- Allow toggling between list and grid modes while keeping cached data synchronized across layouts.

**Acceptance:** - API endpoints serve JSON, respect filter/page query params, and respond within 500ms during normal load.
- Client caches responses keyed by filter+page and only refetches after a manual retry or when cache TTL expires.
- Gallery layout maintains responsive breakpoints and avoids jank while scrolling through at least 30 products.
- Cache hit/miss metrics are logged or displayed so a reviewer can verify that hits increase as the user scrolls back.
- README documents architectural trade-offs, cache invalidation rules, and how performance is measured.

**Deliverables:** GitHub URL with frontend + backend folders, README covering setup and cache strategy, and at least one automated test per backend route.

**Skill tags:** [{'skill': 'design', 'weight': 0.55}, {'skill': 'performance', 'weight': 0.45}]  
**Learning gain:** {'design': 0.55, 'performance': 0.45}

*Rationale:* This full-stack challenge blends design considerations and performance tooling while keeping the scope manageable for a junior-to-mid developer.

---

### A3: FullStack / diff=4 / Security (20h)

**Title:** Ship a secure feature-flag dashboard with audit trails

**Description:** You join a team that toggles features across customers, and the ops team needs a single place to view flag states, enforce policies, and trace who changed what. Build a full-stack feature-flag dashboard that connects a UI to a backend API with a tight audit trail and policy guardrails.

Functional requirements:
1. A backend service exposes CRUD operations for feature flags, with fields for environment, owners, enabled state, and time-bound overrides.
2. Each flag change emits an audit entry (who, when, why, diff) that is stored securely and can be paged via the API.
3. The UI lists flags with real-time state, allows toggling in permitted environments, and surfaces the latest audit details per flag.
4. Implement RBAC so only authorized roles can flip flags, and all mutations validate policy rules (e.g., no production toggle without multi-approver tag).
5. Store sensitive data (API keys or secrets used for toggles) encrypted at rest and only decrypt for display when the viewer has explicit permission.

Stretch goals:
- Add a bulk CSV import/export flow that preserves audit continuity.
- Include a visual diff view showing flag configuration changes between two timestamps.
- Provide an endpoint that exports recent audit events to a secure log stream (file, cloud log, etc.).

**Acceptance:** - Backend API exposes flag CRUD plus audit listing with pagination and policy checks.
- UI shows flag grid, environment filters, toggle controls, and recent audit entry for each flag.
- Mutation attempts from unauthorized roles or invalid policy combos fail with explicit error payloads.
- Audit entries are immutable, contain diff metadata, and can be consumed via dedicated endpoint.
- Sensitive configuration secrets remain encrypted in storage and are only decrypted for permitted users.
- README explains architecture decisions around security controls and data flow.

**Deliverables:** GitHub repo link containing frontend + backend, scripts to seed sample flags, README detailing architecture, and at least 6 automated tests covering critical flows.

**Skill tags:** [{'skill': 'security', 'weight': 0.5}, {'skill': 'design', 'weight': 0.3}, {'skill': 'correctness', 'weight': 0.2}]  
**Learning gain:** {'security': 0.6, 'design': 0.4, 'correctness': 0.3}

*Rationale:* A dashboard with secure flag toggles and audit trails pushes juniors to integrate design, correctness, and advanced security controls in a single end-to-end feature.

---

### A4: Backend / diff=2 / Algorithms (6h)

**Title:** Ship an adaptive pricing calculator with cached lookups

**Description:** Expose a backend that helps a retail operations team calculate adaptive wholesale prices by combining multiple rule sets and live demand multipliers. The service should keep repeated lookups fast enough for a dashboard view but still act on fresh input.

- Accept a POST with SKU, base cost, sales volume bucket, and urgency flag and return a single suggested price and justification fields within the same response.
- Merge static rule definitions (tier discounts, floor/ceiling price) with dynamic modifiers (recent conversion rate, in-flight promotions) before computing each price.
- Cache the latest computed price and its derivation for each SKU so repeated requests hit memory instead of recomputing rules, but invalidate caches when a configuration payload changes.
- Record calculation latency and cache hit rate for each request so the client can display performance health.
- Provide an endpoint to refresh the rule definitions manually without restarting the service.

- Stretch: Support an asynchronous worker that rebuilds the cached prices at a regular interval and pushes a summary to a monitoring log.
- Stretch: Allow bulk price recalculation for a batch of SKUs while keeping per-request latency guarantees for single checks.
- Stretch: Emit structured events (JSON) whenever a cache miss occurs so downstream systems can recalibrate their forecasts.

**Acceptance:** - POST /pricing returns 200 and includes price, justification, and cache status for valid payloads.
- Cache invalidation endpoint resets stored price and subsequent requests show cache-miss latency before a fresh compute.
- Response time for cache hits is appreciably lower than cache recomputation (compare medians from logged metrics).
- Monitoring metrics expose total requests, cache hits, and average latency in a retrievable report.
- README explains rule merging pipeline, cache invalidation strategy, and performance-tracking approach.

**Deliverables:** GitHub URL with README covering API contract, cache strategy, and performance observations plus automated tests or scripts demonstrating cache hits and invalidation.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'performance', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.6, 'performance': 0.4}

*Rationale:* Coordinating rule merging plus caching gives junior backend engineers a manageable challenge that reinforces correctness and performance practices.

---

### A5: Backend / diff=3 / Security (12h)

**Title:** Build a secure replay-resistant webhook validator

**Description:** Many services hook into external event sources, and an endpoint that accepts webhook payloads must stay resilient to tampering and replay attacks. Create a small webhook-validation service that accepts incoming POST payloads, verifies authenticity via HMAC signatures, and stores enough metadata to ensure each delivery is processed exactly once.

Functional requirements:
- Expose an authenticated HTTP endpoint that receives JSON payloads plus headers for timestamp, body hash, and signature.
- Validate each request by recomputing the HMAC using a rotating secret and the provided timestamp, rejecting requests with stale timestamps or signature mismatches.
- Track a compact set of processed identifiers (e.g., `delivery-id`) so replays or duplicate deliveries are dropped before business logic runs.
- Return clear JSON responses for success, validation failure, and replay detection, and log validation outcomes in structured log entries.
- Persist the processed identifier metadata in a lightweight store (in-memory with TTL or a simple database) so duplicates are recognized even across restarts.

Stretch goals:
- Publish a simple health check or metrics endpoint showing the number of rejections vs. successes over the last minute.
- Provide a CLI or HTTP route to rotate the HMAC key while still honoring a short grace period for the previous key.
- Add an integration test that replays the same payload twice and asserts the second request is rejected.
- Implement rate limiting tied to the requester IP or API key to avoid brute-force attempts on the HMAC verification.

**Acceptance:** - Valid webhook requests signed with the current HMAC key and fresh timestamps return success and register as processed.  
- Requests with invalid signatures, old timestamps, or reused delivery IDs return descriptive errors without executing the core payload logic.  
- The processed delivery tracker survives a service restart (persisted or checkpointed) so repeats after a crash are still caught.  
- Tests simulate tampering (signature mismatch), replay, and successful delivery to prove both correctness and security aspects.  
- README documents how to start the service, configure HMAC secrets, and rotate keys safely.

**Deliverables:** GitHub repo URL or ZIP containing the source, README with security rationale, and automated tests covering validation paths.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'security', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.5, 'security': 0.5}

*Rationale:* This backend security task forces learners to reason about correctness and threat modeling while building a practical webhook validation layer.

---

### A6: Backend / diff=3 / Databases (12h)

**Title:** Ship a billing reconciliation webhook processor

**Description:** Your platform ingests billing events from partner systems and must reconcile them against your internal ledger in near real time. Build a backend service that validates incoming webhook payloads, applies transformation rules, and ensures duplicate or late events do not corrupt account balances.

- Accept POST callbacks from at least two partner schemas, normalize their fields, and enqueue the resulting reconciliation jobs.
- Persist each job in a durable store with status markers so retries can resume after restarts.
- Apply idempotent ledger updates by comparing each job's external identifier with previously processed records to skip duplicates.
- Emit a lightweight audit record for every processed job that links to the reconciled ledger entry.
- Provide an endpoint to query the most recent 20 reconciliation attempts for a given account.

Stretch goals:
- Add a background sweep that replays jobs stuck in a retry state after five minutes.
- Report simple summary metrics (success/failure counts) to a monitoring endpoint.
- Allow partial successes by continuing to process remaining ledger entries even when one update fails.

**Acceptance:** - POSTing valid webhook payloads returns a 2xx response and creates a job record.
- Duplicate payloads with identical external IDs do not create new ledger entries.
- Jobs survive process restarts and retain their latest status state.
- Reconciliation audit records reference the final ledger entry and include a timestamp.
- The query endpoint lists the latest 20 reconciliations for a supplied account identifier.
- README explains reconciliation workflow, data validation rules, and how idempotency is enforced.

**Deliverables:** GitHub repo with service code, README, and at least five automated tests covering happy-path and dedup scenarios.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'design', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.5, 'design': 0.3}

*Rationale:* This backend reconciliation service balances design considerations for idempotent job flow with correctness in ledger updates, matching a difficulty 3 Backend task.

---

### A7: Backend / diff=4 / Security (20h)

**Title:** Ship a rate-aware webhook ingestion service with signed callbacks

**Description:** External partners upload sensitive payloads through a high-volume webhook endpoint. Build a Go-based ingestion service that validates caller credentials, throttles spikes, and stores events durably so downstream processors can batch them safely.

Functional requirements:
1. Expose a single POST /events endpoint that authenticates requests using HMAC signatures tied to per-partner secrets and rejects replayed payloads.
2. Persist incoming events in a transactional store with metadata about the requester, timestamp, and validation outcome so audit queries can double-check every delivery.
3. Track per-partner burst and sustained throughput, enqueueing work for asynchronous storage only if the partner stays within configured burst/sustained limits and rejecting or deferring excess traffic.
4. Emit structured observability metrics (success rate, throttled count, storage latency) and optionally expose a health endpoint that reflects the ingestion backlog.
5. Provide a CLI or light UI to rotate secrets safely without dropping in-flight validation.

Stretch goals:
- Cache partner secrets securely so HMAC validation stays performant under high QPS while still supporting key rotation.
- Provide a backoff-aware retry strategy for clients that sends structured 429 responses with retry-after hints.
- Offer a lightweight dashboard summarizing partner quotas, failure rates, and storage lag for compliance reviews.


**Acceptance:** - Authentication rejects requests without valid HMACs or with replayed nonces, allowing only correctly signed payloads.
- The POST /events path persists each accepted event with requester, timestamp, and validation metadata, and is discoverable in the storage layer.
- Rate throttling enforces burst and sustained limits per partner, returning 429 when thresholds are exceeded while logging the reason.
- Metrics capture request throughput, throttled counts, and storage latency, and the health endpoint reflects backlog pressure.
- Secret rotation tooling updates the in-memory cache without downtime and the new keys are quickly usable for signing.

**Deliverables:** GitHub repo with Go source, a README documenting the API, rate limits, and secret rotation steps, plus automated tests or simulations validating throttling and HMAC verification.

**Skill tags:** [{'skill': 'performance', 'weight': 0.4}, {'skill': 'security', 'weight': 0.35}, {'skill': 'design', 'weight': 0.25}]  
**Learning gain:** {'performance': 0.5, 'security': 0.7, 'design': 0.3}

*Rationale:* Designing a high-throughput, secure webhook intake with throttling, signatures, and observability stretches a backend engineer at the advanced level while sharpening both performance and security instincts.

---

### A8: Python / diff=2 / Algorithms (6h)

**Title:** Build a schema-aware CSV diff CLI with sanity checks

**Description:** Teams often compare CSV exports from different services, and a fast, readable diff tool helps catch regressions before they reach dashboards. Build a CLI that compares two CSV files and surfaces row-level differences while validating each file against a simple schema.

Functional requirements:
- Accept two CSV paths plus an optional JSON schema that defines required headers and simple types (string, integer, float) and fail early if headers or types diverge.
- Compare the files row by row (by primary-key column passed via CLI flag) and report additions, removals, and value changes with context for each diff.
- Print a clean summary of counts (added/removed/changed) and export a JSON report containing the diff details for downstream automation.
- Provide clear logging for skipped rows when the schema validation fails and ensure the CLI exits with a non-zero code on any validation or comparison error.

Stretch goals:
- Allow ignoring a configurable set of columns during comparison and describe ignored columns in the report.
- Add a `--sample` option to show the first N diffs inline for quick inspection.
- Bundle a small test suite that runs the CLI on fixtures and checks the exit codes and output structure.

**Acceptance:** - CLI accepts `--left`, `--right`, and optional `--schema` paths and exits with 0 when files match and schema is satisfied
- Schema validation prevents comparison when headers/types violate the definition, returning a clear error message
- Diff summary lists counts for added/removed/changed rows and JSON report contains entries for each detected change
- Sample fixtures exercise added, removed, and changed rows and the CLI logs skipped rows when schema mismatches occur
- README documents usage, schema format, and how to interpret the JSON diff report

**Deliverables:** - GitHub repo URL with README, CLI code, schema fixtures, and at least three tests that run the CLI on fixture pairs

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'readability', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.6, 'readability': 0.5}

*Rationale:* This CLI-focused task keeps the medium-level emphasis on correctness and readable reporting while staying within Python-friendly tooling.

---

### A9: Python / diff=3 / Databases (12h)

**Title:** Build a Python batch validator for customer invoices with embedded audit snapshots

**Description:** Finance teams need to trust the invoices flowing into downstream systems, so your service will take a raw batch of customer invoices, apply structural and business rule checks, and produce both a clean payload and an audit-friendly summary. Functional requirements:
- Accept a batch of invoice data (JSON or CSV) and normalize it into a deterministic schema, including nested line items, customer info, and taxes.
- Run a suite of validation checks (unique invoice IDs, required fields, currency consistency, amount sum matching line items, and date windows) and flag any violations with structured errors.
- Persist each batch and its validation outcome to a simple SQLite datastore, ensuring each record keeps the raw payload, validation status, and a timestamped audit trail.
- Expose a CLI or lightweight script entrypoint that runs the validation pipeline, reports summary statistics, and emits clean output for downstream consumers.
Stretch goals:
- Add a configurable rules layer (YAML or JSON) so the same tool can enforce different thresholds (e.g., warning when net amount exceeds configured limit).
- Include a “reconciliation mode” that compares a new batch against the last successful batch in the database and reports differences in customer totals.
- Produce a lightweight HTML or Markdown report showing validation results with summary charts or tables for stakeholders.

**Acceptance:** - CLI/script successfully processes both JSON and CSV input samples and writes normalized rows into SQLite.
- Validation engine reports structured errors for at least five rule types (missing required field, duplicate ID, amount mismatch, invalid currency, out-of-window date).
- Audit records in SQLite include raw payload, validation status, and timestamp for every batch run.
- Summary output shows total processed invoices, number of failures, and any reconciliation diffs when that mode is enabled.
- Stretch report file is generated when enabled and contains key validation metrics and error examples.

**Deliverables:** Repository or ZIP with src/, README describing setup and validation rules, sample input files, and one CLI run log.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'design', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.6, 'design': 0.4}

*Rationale:* The task forces a Python developer to architect a validation+audit pipeline where correctness and high-level design decisions about schema and reporting directly define success.

---

### A10: Python / diff=4 / Algorithms (20h)

**Title:** Build a latency-aware log deduplicator service

**Description:** Logs from distributed workers contain bursts of repeated events that waste storage and obscure alerts. Build a service that ingests timestamped log entries, filters out duplicates within configurable windows, and maintains performance metadata so downstream consumers can trust the dataset. 

Functional requirements:
- Accept a stream of log records (id, source, timestamp, level, payload) via a REST endpoint and persist them in a cache or datastore that supports high-throughput deduplication.
- Deduplicate records that share the same source and payload within a sliding time window while preserving the earliest timestamp and incrementing a repeat counter.
- Expose an endpoint that returns recent unique events sorted by time, accompanied by throughput and deduplication ratio metrics.
- Ensure the service can scale its deduplication logic with bounded memory by evicting entries past the retention window without sacrificing correctness.

Stretch goals:
- Provide an additional endpoint to replay aggregated metadata for a given source so a consumer can reconstruct what was dropped.
- Emit Prometheus-friendly metrics for request latency, cache hits/misses, and deduplicated counts.
- Allow configuration of deduplication precision (exact payload vs. hash fingerprint) per source via dynamic rules.

**Acceptance:** - POSTing valid log batches returns 2xx responses and stored records reflect earliest timestamp with repeat counters incremented.
- GETting recent events returns entries ordered by timestamp with associated throughput and deduplication ratios.
- Deduplication windows evict old entries so memory usage stays bounded while correctness is maintained for retained records.
- Metrics endpoint reports latency plus cache hit/miss counts after a burst of requests.
- README documents deployment steps, configuration knobs, and how to run included tests.

**Deliverables:** GitHub repo with service code, README covering architecture/configuration, and automated tests covering deduplication + metrics.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'performance', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.5, 'performance': 0.3}

*Rationale:* This advanced Python task asks learners to balance correctness and performance while building a deduplication service with real-time constraints.

---

## Rejected drafts
