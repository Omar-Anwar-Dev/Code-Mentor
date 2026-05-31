# Sprint 18 — Task Batch 1 Report

**BatchId:** `5631369e-444b-4535-b99e-930b37ef83b5`  
**Generated at:** 2026-05-14T23:54:53Z  
**Reviewer:** Claude single-reviewer (ADR-056 + ADR-057 + ADR-058)  
**Wall clock:** 77.1s (~1.3 min)  
**Token cost:** 24,438 tokens (retries: 1)  

## Summary
- **Total drafts generated:** 10
- **Approved:** 10 (100.0%)
- **Rejected:** 0 (0.0%)
- **30% reject-rate bar:** within bar.

## Distribution (by track × difficulty)

| Track | Diff 2 | Diff 3 | Total |
|---|---|---|---|
| FullStack | 2 | 2 | 4 |
| Backend | 2 | 1 | 3 |
| Python | 2 | 1 | 3 |

## Approved drafts

### A1: FullStack / diff=2 / OOP (6h)

**Title:** Build a Product Review Moderation Dashboard with Live Highlights

**Description:** Create a focused moderation workspace that lets support and product ops monitor new product reviews, flag problematic content, and validate the final decision before it reaches the storefront. The dashboard surface should pull review records, show metadata, and surface items that need attention while the backend enforces review state transitions and summaries.

Functional requirements:
- Design a simple API that lists incoming reviews with metadata (rating, text snippet, product, user) and supports marking reviews as pending, approved, or rejected.
- Generate lightweight highlights (e.g., keywords, sentiment) from review text when it lands so the UI can show why it was flagged.
- Allow reviewers to leave a decision note and change the state, storing an audit trail for each review action.
- Build a single-page front end that streams the list, lets reviewers filter by state, and shows the latest audit trail per review.
- Ensure both API and UI validate inputs and surface meaningful errors when states or note lengths are invalid.

Stretch goals:
- Add a bulk decision tool for reviewers to approve or reject multiple similar reviews at once.
- Show a confidence indicator from the highlight generator and let reviewers toggle whether machine suggestions influenced their decision.
- Cache recent review lists in-memory on the backend to avoid repeated database queries for the same state filter.
- Log state transitions with timestamps and display a mini-timeline per review in the UI.

**Acceptance:** - API returns paginated review lists filtered by state and includes highlight metadata for each record.
- Decision updates require notes of at least 20 chars and persist an audit entry per change.
- Front end filters, sorts, and displays review histories without full page reloads.
- Validation errors surface clearly in the UI and API responses for invalid states or missing data.
- README explains how to run both backend and frontend along with sample data for testing.

**Deliverables:** GitHub URL with both frontend and backend code, README covering setup + data seeding, and at least one automated test per API route.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.7}, {'skill': 'design', 'weight': 0.3}]  
**Learning gain:** {'correctness': 0.55, 'design': 0.25}

*Rationale:* This dashboard task ties easy-to-implement FullStack components with correctness-driven API flows and UI design decisions at a medium difficulty.

---

### A2: FullStack / diff=2 / OOP (6h)

**Title:** Build a Neighborhood Event Feed with RSVP Insights

**Description:** Local communities need a single pane to promote meetups, share details, and monitor interest without drowning in noise. Build a simple full-stack experience that lets organizers create short event blurbs and attendees browse, filter, and see RSVP trends in a clean interface.

Functional requirements:
- Provide CRUD endpoints for events (title, description, time, tags) from a REST API and store records in a lightweight database.
- Create a front-end that lists upcoming events, allows keyword/tag filtering, and highlights a single “featured” event per filter state.
- Track RSVPs by category (yes/maybe/no) and expose real-time tallies per event so attendees see how many people plan to join before they sign up.
- Ensure that each RSVP increments only once per simulated user session to keep counts believable.

Stretch goals:
- Add pagination or infinite scroll so the feed feels responsive when many events exist.
- Introduce a dropdown for event type and animate a banner when RSVP tallies cross a configurable milestone.
- Include a simple admin widget to mark events as canceled and visually dim them in the feed.

**Acceptance:** - Event creation, updates, and deletions work through documented API endpoints.
- Front-end filters respond to keyword/tag selections within two seconds and always show the current featured event.
- RSVP counts update immediately after a response, and a simulated repeat RSVP from the same session is ignored.
- README explains architecture choices, setup instructions, and how to seed sample data.
- Project includes at least one automated test covering a key API route or RSVP logic.

**Deliverables:** GitHub repo URL containing the source code, README, and any scripts used to bootstrap sample events.

**Skill tags:** [{'skill': 'readability', 'weight': 0.5}, {'skill': 'design', 'weight': 0.5}]  
**Learning gain:** {'readability': 0.6, 'design': 0.4}

*Rationale:* This 2-level FullStack brief focuses on readability and design through a real-world event feed with clean APIs and UI affordances.

---

### A3: FullStack / diff=3 / Security (12h)

**Title:** Build a secure full-stack photo sharing board with audit trails

**Description:** Capture the workflows that a small creative team needs when they share reference photos, annotate them, and prove who touched each asset — all through a secure, data-integrity-focused web tool.

1. Provide an authenticated React+TS dashboard where users can upload images, assign short descriptive tags, and create a secure share link that expires after a configured time window.
2. Persist each upload plus tag metadata and share link information in a hardened backend that records who performed each action and at what timestamp.
3. Protect each backend route with scoped authorization so only the owner or invitees can view/edit the upload, and ensure expired links reject access with clear responses.
4. Surface the audit trail for every asset in the UI, showing upload, tag edits, and share link creation along with the responsible user and time.
5. Include backend validation that sanitizes file names, enforces size limits, and rejects invalid tags to avoid downstream injection threats.

Stretch goals:

- Implement file hashing so the backend can detect duplicate uploads before storing them while still honoring unique tags.
- Let users revoke share links early and immediately block previously issued URLs.
- Add a lightweight websocket channel that notifies viewers when a new tag or comment appears on an asset.

**Acceptance:** - All API endpoints enforce authentication and return 4xx/2xx codes that reflect authorization and validation outcomes.
- Uploaded images plus metadata persist with timestamped audit entries showing the acting user in the database.
- Share links honor expiry and revocation checks before allowing downloads, and the UI clearly marks expired links.
- Frontend surfaces the audit trail in a table or list with user, action, and timestamp for every edit.
- File uploads reject entries exceeding size limits or containing invalid tags, with helpful error feedback surfaced to the user.

**Deliverables:** GitHub repo with README explaining your stack choices, secure upload flow, and instructions to run the app locally.
Include configuration for secrets (e.g., .env.example) and at least one automated test that covers a security check.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'security', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.5, 'security': 0.3}

*Rationale:* This task blends frontend and backend work to reinforce correct auth flows and secure handling of uploads/link sharing in a full-stack setting.

---

### A4: FullStack / diff=3 / Databases (10h)

**Title:** Ship an analytics-aware product listing grid with edge-cache hints

**Description:** Your team wants to surface fast product listings while also keeping an eye on the data that drives cache decisions. Build a full-stack result grid that streams catalog data, tracks how often each tile is requested, and exposes the metrics that help tune caching layers.

- Requirements:
  - Render a responsive grid of product cards fetched from a REST endpoint, including imagery, price, and availability stamps.
  - Instrument the client so each card click increments a counter tied to that product and persists via the API.
  - Create an endpoint that returns the top N products by click velocity and total views without scanning every record on demand.
  - Tie an HTTP header or query option into the product list route that guides CDN/edge layers with an expected freshness policy based on the trending counters.
  - Store analytics (view + click counts) alongside the core product data while ensuring counts stay performant under frequent updates.

- Stretch goals:
  - Visualize the trending score on each card and allow users to sort the grid by it.
  - Cache the products response server-side and invalidate it when a product’s trending rank changes by a configurable threshold.
  - Surface a lightweight admin dashboard that lets reviewers reset counters or mark products as "hot" so that analytics honor manual boosts.

**Acceptance:** - Product grid loads within 200ms for the first viewport and shows up-to-date stock/price info.
- Every card click issues a call that increments the backend counter and commits the delta to the datastore.
- Trending endpoint returns the top N items in under 300ms regardless of catalog size.
- Listing endpoint honors the freshness policy header/query parameter in its caching metadata.
- README explains how analytics storage stays performant and how cache hints are generated.

**Deliverables:** - GitHub repo with README, API docs, and automated tests covering analytics counters.

**Skill tags:** [{'skill': 'performance', 'weight': 0.6}, {'skill': 'design', 'weight': 0.4}]  
**Learning gain:** {'performance': 0.6, 'design': 0.4}

*Rationale:* This task pushes a mid-level full-stack engineer to balance cache-friendly analytics with thoughtful API/UX design, aligning tightly with the requested performance and design focus.

---

### A5: Backend / diff=2 / Databases (6h)

**Title:** Ship an aggregate event query service with pagination and metrics

**Description:** Support a neighborhood event feed by building a backend service that reads from a persistent store, enforces sensible pagination, and surfaces key counts for the UI. The service should treat the event catalog as a single source of truth while providing predictable responses when consumers request different slices of the timeline.

- Functional requirements:
  - Expose an API that returns a page of events ordered by start time with configurable page size and cursor tokens.
  - Provide per-request metadata that includes the total matching events and the percentage of events flagged as "recommended" within the current page.
  - Persist incoming events to a simple SQL table and allow replaying the pagination query against current data without in-memory caching.
  - Validate client input so page sizes stay within reasonable bounds and reject requests with stale cursors.

- Stretch goals:
  - Add an endpoint to estimate how many events occur within the next 24 hours by scanning indexed timestamp ranges.
  - Return a lightweight summary of tag counts (e.g., number of music vs. sports events) for the current result set.
  - Log slow pagination queries and expose an endpoint that reports the slowest request in the last hour, without storing full request bodies.


**Acceptance:** - API returns paginated responses with consistent metadata for valid requests.
- SQL schema and migrations persist events so repeated queries return identical rows.
- Inputs outside allowed bounds (page size, cursor) produce 4xx responses with descriptive errors.
- Total count and recommended percentage reflect the current page and underlying data.
- README documents how to run migrations, invoke the API, and interpret the metadata fields.

**Deliverables:** GitHub URL with service code, migration scripts, and README describing running instructions plus at least three integration tests.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'design', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.5, 'design': 0.3}

*Rationale:* Building a paginated query service with metrics reinforces correctness and design thinking at the medium backend level requested.

---

### A6: Backend / diff=2 / Security (6h)

**Title:** Build a secrets-safe webhook receiver with HMAC validation

**Description:** Many services need to accept webhooks but still maintain confidence that incoming events are genuine and one-time. Build a backend microservice that receives JSON payloads, verifies a shared-secret signature, and stores the cleanest copy of each event while keeping replay and tampering risks at bay.

- Receive POST requests on a single endpoint, ensure the payload matches an HMAC signature header computed with a shared secret, and log any mismatches.
- Persist each verified event to a datastore/table with a deduplication key so retries do not create duplicate records and maintain a timestamp.
- Reject requests that reuse a nonce or timestamp outside a configurable window to block replay attacks, plus return informative error payloads.
- Record audit metadata (IP, signature header, verification outcome) alongside each stored event for later review.
- Provide a health-check endpoint that reports the freshness of the shared-secret configuration and datastore connectivity.

Stretch goals:
- Allow rotating the shared secret without downtime and support verifying events signed with the previous secret for a grace period.
- Emit metrics (counters or simple JSON stats) for accepted vs rejected events plus verification latency.
- Add an automated regression test that simulates a signed payload and a replay to prove the guards work.
- Expose a lightweight API to query stored events with pagination and optional filtering by status.

**Acceptance:** * All incoming payloads require a valid HMAC signature; invalid signatures are rejected with 400-series responses and logged.
* Replay attempts (duplicate nonce/timestamp) do not create new records and return a descriptive error.
* Verified events are persisted with audit metadata, unique key, and timestamp.
* Health-check endpoint reports both secret validity and datastore reachability.
* README documents the security guarantees, configuration options, and how to run the service locally.

**Deliverables:** GitHub URL with source, README, and automated verification tests demonstrating signature and replay defenses.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'security', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.5, 'security': 0.3}

*Rationale:* This project lets backend-focused learners practice verifying HMAC-signed payloads and replay protections while keeping correctness requirements clear.

---

### A7: Backend / diff=3 / Algorithms (10h)

**Title:** Build a bounded ingestion queue with async deduplication

**Description:** Teams ingest tens of thousands of change events per minute, and a thin backend needs to persist only the latest non-duplicate updates while keeping a tight memory budget. Model a bounded in-memory queue that accepts events from multiple producers, deduplicates based on a key, and flushes summaries to a datastore in configurable batches.

Functional requirements
- Accept event objects (id, payload, timestamp) via a single async API and coalesce duplicates per rolling key window.
- Maintain a fixed maximum number of stored keys; evict the oldest or least-recently-used entry when capacity is reached.
- Provide a background flush process that batches the current queue state every N seconds and pushes summaries to a mock persistence layer in order of their last update.
- Expose visibility APIs for current queue size and the timestamp of the most recent flush.

Stretch goals
- Track per-key latency metrics for how long events sit before flushing and expose percentiles.
- Allow configuration of soft-cap thresholds that trigger early flushes under high-pressure scenarios.
- Add optimistic locking around the flush so concurrent pushes don’t duplicate a batch.

**Acceptance:** - Queue accepts asynchronous event objects without blocking producers and returns success responses for valid payloads.
- Deduplication removes events with the same key if a newer timestamp arrives before the next flush.
- When capacity is reached, the eviction policy removes the least-recently-updated key and admits the new event.
- The background flusher runs at the configured interval, batches pending summaries, and records successful persistence calls.
- Monitoring endpoints report current queue length and last flush timestamp accurately after operations.

**Deliverables:** GitHub URL with README explaining the async queue design, configuration knobs, and instructions to run.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'performance', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.6, 'performance': 0.35}

*Rationale:* This backend-focused task pushes a junior-to-mid dev to balance correctness with throughput by building a deduplicating ingestion queue with eviction and batching constraints.

---

### A8: Python / diff=2 / Algorithms (6h)

**Title:** Build a transaction reconciler CLI with fuzzy matching

**Description:** You are supporting a small business owner who receives bank statements, CSV exports from their payment processor, and manual cash entries. The goal is a Python CLI tool that quickly reconciles these records to highlight missing or duplicate transactions before month-end reporting. 

Functional requirements:
1. Accept multiple CSV inputs (bank, processor, manual) and normalize their columns so they can be compared reliably.
2. Match transactions across sources by amount and date, flagging exact matches, potential duplicates, and items only present in one feed.
3. Provide interactive prompts or summary output so the user can mark matches as confirmed or add notes before finalizing.
4. Export a reconciliation report that lists matched pairs, unresolved items, and user annotations.
5. Maintain a simple configuration file for common column mappings and tolerance thresholds.

Stretch goals:
1. Implement fuzzy string matching on payee descriptions to surface likely matches that don’t align exactly.
2. Offer a dry-run mode that prints the reconciliation steps without persisting changes.
3. Support saving reconciliation presets per client to speed up future runs.

**Acceptance:** - CLI accepts at least three CSV files and normalizes their entries for comparison.
- Matching logic identifies exact matches, duplicates, and unmatched transactions with confidence scores or flags.
- Users can review matches via prompts or summary output and mark them as confirmed.
- Exported report clearly separates confirmed matches, unresolved entries, and user notes.
- Configuration file controls column aliases and matching tolerances without code changes.

**Deliverables:** GitHub repo with source, README describing CLI usage + sample CSVs, and reconciliation report output.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'design', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.4, 'design': 0.2}

*Rationale:* Reconciling CSV feeds exercises correctness through matching logic and design by structuring reusable normalization and reporting layers.

---

### A9: Python / diff=2 / Algorithms (6h)

**Title:** Build a dynamic fare-matching CLI for rideshare promos

**Description:** You are shipping a small pricing helper that matches incoming ride requests against a pool of promotional fare bands to maximize rider savings while keeping the system deterministic. The tool processes batches of ride requests, compares each against tiered promos, and reports optimal assignments plus fallback prices.

Functional requirements:
- Accept a JSON array of ride requests (origin, destination, distance, time window) via stdin or a file argument.
- Normalize each request into a scoring model that factors in distance, demand multiplier, and promo eligibility rules.
- Choose the promo tier that yields the lowest net fare while respecting capacity limits per tier.
- Output the matched promo, final fare, and reason for fallback if no promo applies, in JSON.
- Log summary statistics (requests processed, matches per tier) to stderr.

Stretch goals:
- Support a dry-run mode that simulates matches without consuming tier capacity.
- Allow custom promo definitions loaded from YAML that describe eligibility predicates and caps.
- Emit detailed debug traces for a single request via a `--trace` flag.

**Acceptance:** - The CLI handles valid JSON input and exits with 0 when matches complete.
- Each output entry includes promo name (or "base"), fare, and fallback reason when needed.
- Summary statistics appear on stderr after batch completion.
- Invalid inputs and capacity violations raise descriptive errors and exit with non-zero.
- README explains how to run the tool, config promos, and interpret outputs.

**Deliverables:** GitHub URL with README + unit tests covering promo selection logic.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'design', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.4, 'design': 0.2}

*Rationale:* This medium Python CLI task builds correctness by enforcing deterministic promo selection while rewarding thoughtful design around input/output surfaces.

---

### A10: Python / diff=3 / Algorithms (10h)

**Title:** Build a streaming CSV profile dashboard with adaptive sampling

**Description:** Data teams often work with CSV exports that can spike to millions of rows; downloading the entire file defeats the purpose of a quick health check. Build a lightweight Python service that reads CSV files incrementally, keeps a rolling sketch of numeric distributions, and serves a small dashboard summarizing the sample so teams can decide whether the dataset needs a full pipeline.

- Ingest CSV data without loading it all into memory, tracking column statistics (counts, min/max/avg, percentiles) as you stream.
- Maintain an adaptive sample set per numeric column that prioritizes recent rows and preserves diversity across value ranges.
- Expose a small command-line dashboard (or simple TUI) that reports the current sample size, cardinality estimates, and top anomalies for each column.
- Allow the user to pause/resume ingestion so dashboards stabilize before reporting.
- Persist checkpoints so a restart resumes without reprocessing the entire input.

Stretch goals:
- Add a configuration layer that lets users define column groups and custom anomaly thresholds.
- Emit lightweight log events when distributions shift beyond a configurable delta.
- Provide a hook for downstream code to request the current sample batch for deeper inspection.

**Acceptance:** - Streamed ingestion never loads the entire CSV into RAM (use chunked reads and generators).
- Dashboard output updates within one second after each chunk and reports percentiles plus anomaly counts per column.
- Sample preservation respects recency while ensuring coverage across observed value ranges (show runtime stats proving it).
- Checkpoints allow a restart to continue from the last processed row without reprocessing earlier data.
- README explains trade-offs in sampling strategy and how to run the dashboard.

**Deliverables:** Repo with source, README covering setup/running instructions, and sample CSV used for tests.

**Skill tags:** [{'skill': 'correctness', 'weight': 0.6}, {'skill': 'performance', 'weight': 0.4}]  
**Learning gain:** {'correctness': 0.6, 'performance': 0.4}

*Rationale:* This project pushes a Python developer to balance correctness guarantees around sampled statistics with real-time performance constraints in a streaming CSV context.

---

## Rejected drafts
