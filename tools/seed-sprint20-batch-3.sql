-- Sprint 20 task batch 3 -- applied via run_task_batch_s20.py at 2026-05-15T09:31:09Z
-- BatchId: 57cf3d44-537b-4f4b-8021-5a752949d25c
-- Drafts: 9 expected (3 FullStack / 3 Backend / 3 Python; diff 2-4)
-- Reviewer: Claude single-reviewer per ADR-060 (extends ADR-056 + 057 + 058 + 059)
-- F16 task-library target (50 tasks) HIT after this batch is applied.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('85c40ea6-febd-4aa5-b36d-7bc5ddf6add6', N'Build a collaborative shopping list service with change tracking', N'You are building a lightweight collaborative shopping list service where multiple users can add items, mark them as purchased, and see who changed what. The goal is to deliver a clear API plus a minimal client that keeps shared state in sync, so your future teammates can rely on the data and understand what happened.

Functional requirements:
- Expose a REST-like API to create lists, add items, toggle purchased flags, and fetch item history with timestamps and actor names.
- Store list data and per-item change logs so each entry records who made the last update and when.
- Implement a simple client (CLI or single-page UI) that fetches the list data, displays ownership info, and lets the user submit updates.
- Ensure the client renders clear timestamps and shows the latest actor for each change so other collaborators can follow recent actions.
- Provide server- or client-side validation to prevent empty items and enforce that each list belongs to a valid session or workspace identifier.

Stretch goals:
- Add optimistic UI updates on the client so users see their edits immediately with an indicator for pending confirmation.
- Emit a summary event (console log or UI badge) when the list has more than three pending changes by others.
- Allow filtering the displayed history by actor name or by "since" timestamp.',
     N'- API returns 2xx responses for valid list/item operations and rejects invalid payloads with 4xx codes.
- The persistence layer stores both the current state of each item and the latest change log (actor + timestamp).
- Client displays latest actor and timestamp next to each list item and reflects state changes after API calls.
- Validation prevents creating blank items or mutating items without a workspace identifier.
- README explains how to run the service, interact with the client, and inspect the change log data.', N'GitHub repository with server + client code, README describing setup, and at least one example workflow demonstrating change tracking.',
     2, N'Algorithms', N'FullStack', N'Python',
     6, N'[]',
     '765E1668-44D3-4E11-AF1A-589A2274B311', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "readability", "weight": 0.4}]', N'{"correctness": 0.4, "readability": 0.3}', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('bc5ae531-592d-48fd-8e55-d088e01ed3e7', '57cf3d44-537b-4f4b-8021-5a752949d25c', 0, N'Approved',
     N'Build a collaborative shopping list service with change tracking', N'You are building a lightweight collaborative shopping list service where multiple users can add items, mark them as purchased, and see who changed what. The goal is to deliver a clear API plus a minimal client that keeps shared state in sync, so your future teammates can rely on the data and understand what happened.

Functional requirements:
- Expose a REST-like API to create lists, add items, toggle purchased flags, and fetch item history with timestamps and actor names.
- Store list data and per-item change logs so each entry records who made the last update and when.
- Implement a simple client (CLI or single-page UI) that fetches the list data, displays ownership info, and lets the user submit updates.
- Ensure the client renders clear timestamps and shows the latest actor for each change so other collaborators can follow recent actions.
- Provide server- or client-side validation to prevent empty items and enforce that each list belongs to a valid session or workspace identifier.

Stretch goals:
- Add optimistic UI updates on the client so users see their edits immediately with an indicator for pending confirmation.
- Emit a summary event (console log or UI badge) when the list has more than three pending changes by others.
- Allow filtering the displayed history by actor name or by "since" timestamp.',
     N'- API returns 2xx responses for valid list/item operations and rejects invalid payloads with 4xx codes.
- The persistence layer stores both the current state of each item and the latest change log (actor + timestamp).
- Client displays latest actor and timestamp next to each list item and reflects state changes after API calls.
- Validation prevents creating blank items or mutating items without a workspace identifier.
- README explains how to run the service, interact with the client, and inspect the change log data.', N'GitHub repository with server + client code, README describing setup, and at least one example workflow demonstrating change tracking.',
     2, N'Algorithms', N'FullStack', N'Python',
     6, N'[]',
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "readability", "weight": 0.4}]', N'{"correctness": 0.4, "readability": 0.3}',
     N'This medium FullStack task balances correctness in handling shared list state and readability through clear change logs, a good fit for level 2 growth.', N'generate_tasks_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a collaborative shopping list service with change tracking", "description": "You are building a lightweight collaborative shopping list service where multiple users can add items, mark them as purchased, and see who changed what. The goal is to deliver a clear API plus a minimal client that keeps shared state in sync, so your future teammates can rely on the data and understand what happened.\n\nFunctional requirements:\n- Expose a REST-like API to create lists, add items, toggle purchased flags, and fetch item history with timestamps and actor names.\n- Store list data and per-item change logs so each entry records who made the last update and when.\n- Implement a simple client (CLI or single-page UI) that fetches the list data, displays ownership info, and lets the user submit updates.\n- Ensure the client renders clear timestamps and shows the latest actor for each change so other collaborators can follow recent actions.\n- Provide server- or client-side validation to prevent empty items and enforce that each list belongs to a valid session or workspace identifier.\n\nStretch goals:\n- Add optimistic UI updates on the client so users see their edits immediately with an indicator for pending confirmation.\n- Emit a summary event (console log or UI badge) when the list has more than three pending changes by others.\n- Allow filtering the displayed history by actor name or by \"since\" timestamp.", "acceptanceCriteria": "- API returns 2xx responses for valid list/item operations and rejects invalid payloads with 4xx codes.\n- The persistence layer stores both the current state of each item and the latest change log (actor + timestamp).\n- Client displays latest actor and timestamp next to each list item and reflects state changes after API calls.\n- Validation prevents creating blank items or mutating items without a workspace identifier.\n- README explains how to run the service, interact with the client, and inspect the change log data.", "deliverables": "GitHub repository with server + client code, README describing setup, and at least one example workflow demonstrating change tracking.", "difficulty": 2, "category": "Algorithms", "track": "FullStack", "expectedLanguage": "Python", "estimatedHours": 6, "prerequisites": [], "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "readability", "weight": 0.4}], "learningGain": {"correctness": 0.4, "readability": 0.3}, "rationale": "This medium FullStack task balances correctness in handling shared list state and readability through clear change logs, a good fit for level 2 growth."}',
     '85c40ea6-febd-4aa5-b36d-7bc5ddf6add6');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('7367aaff-25ea-469d-9955-016b9692e123', N'Build a consent-aware data sharing hub with tiered access policies', N'Many services now collect user data that can be shared with partners, but the decision to share should be explicit, traceable, and reversible. Build a compact full-stack experience where consent choices drive which datasets are accessible to different consumer apps.

- Create a backend that stores user profiles, their granted consents, and partner apps with scoped permissions; expose authenticated CRUD routes that honor the active consents.
- Build a front-end dashboard that lists active consents, explains the consequences of each scope, and lets the user toggle them; changes should propagate immediately to the backend.
- Implement a consent audit trail that records each grant, revocation, and expiration, and surface summaries both for internal administrators and for users to review what partners can see.
- Protect all data movements with a security posture that includes signed tokens, per-endpoint authorization checks, and a consistent error handling strategy to avoid leaking sensitive info.
- Link the front end and backend with a secure session pattern, and document how refreshed policies are pushed without requiring full reloads.

Stretch goals:

- Offer a simulated partner app interface that can request data under a specific permission scope and show how it is denied when consent is withdrawn.
- Add rate-limiting or throttling middleware to the backend to defend sensitive routes from overuse.
- Allow exporting consent history as a downloadable report that redacts personally identifiable fields.
- Provide a deployable configuration (e.g., Docker compose or scripts) to spin up the stack with sample data.',
     N'All API routes require authentication and reject requests lacking the proper consent scope.
The UI accurately reflects the backend consents state within one user interaction and shows audit entries after each change.
Audit trail entries capture actor, timestamp, action, and affected scopes for every grant or revocation.
Push notifications or polling keep the dashboard in sync with consent updates without manual refresh.
Security handling (tokens/headers) is explained in the README along with how to rotate secrets.', N'GitHub repo with backend + frontend source, README explaining the architecture, and instructions to seed data;
Include any configuration files needed to run tests or sample data.',
     3, N'Security', N'FullStack', N'JavaScript',
     12, N'["Secure REST API with FastAPI + JWT"]',
     '765E1668-44D3-4E11-AF1A-589A2274B311', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "security", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"security": 0.5, "design": 0.4}', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('eeba7061-6585-40bb-8049-c663fe0e82a1', '57cf3d44-537b-4f4b-8021-5a752949d25c', 1, N'Approved',
     N'Build a consent-aware data sharing hub with tiered access policies', N'Many services now collect user data that can be shared with partners, but the decision to share should be explicit, traceable, and reversible. Build a compact full-stack experience where consent choices drive which datasets are accessible to different consumer apps.

- Create a backend that stores user profiles, their granted consents, and partner apps with scoped permissions; expose authenticated CRUD routes that honor the active consents.
- Build a front-end dashboard that lists active consents, explains the consequences of each scope, and lets the user toggle them; changes should propagate immediately to the backend.
- Implement a consent audit trail that records each grant, revocation, and expiration, and surface summaries both for internal administrators and for users to review what partners can see.
- Protect all data movements with a security posture that includes signed tokens, per-endpoint authorization checks, and a consistent error handling strategy to avoid leaking sensitive info.
- Link the front end and backend with a secure session pattern, and document how refreshed policies are pushed without requiring full reloads.

Stretch goals:

- Offer a simulated partner app interface that can request data under a specific permission scope and show how it is denied when consent is withdrawn.
- Add rate-limiting or throttling middleware to the backend to defend sensitive routes from overuse.
- Allow exporting consent history as a downloadable report that redacts personally identifiable fields.
- Provide a deployable configuration (e.g., Docker compose or scripts) to spin up the stack with sample data.',
     N'All API routes require authentication and reject requests lacking the proper consent scope.
The UI accurately reflects the backend consents state within one user interaction and shows audit entries after each change.
Audit trail entries capture actor, timestamp, action, and affected scopes for every grant or revocation.
Push notifications or polling keep the dashboard in sync with consent updates without manual refresh.
Security handling (tokens/headers) is explained in the README along with how to rotate secrets.', N'GitHub repo with backend + frontend source, README explaining the architecture, and instructions to seed data;
Include any configuration files needed to run tests or sample data.',
     3, N'Security', N'FullStack', N'JavaScript',
     12, N'["Secure REST API with FastAPI + JWT"]',
     N'[{"skill": "security", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"security": 0.5, "design": 0.4}',
     N'This consent-focused full-stack project challenges developers to balance security controls with thoughtful UX design, matching a difficulty 3 FullStack goal.', N'generate_tasks_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a consent-aware data sharing hub with tiered access policies", "description": "Many services now collect user data that can be shared with partners, but the decision to share should be explicit, traceable, and reversible. Build a compact full-stack experience where consent choices drive which datasets are accessible to different consumer apps.\n\n- Create a backend that stores user profiles, their granted consents, and partner apps with scoped permissions; expose authenticated CRUD routes that honor the active consents.\n- Build a front-end dashboard that lists active consents, explains the consequences of each scope, and lets the user toggle them; changes should propagate immediately to the backend.\n- Implement a consent audit trail that records each grant, revocation, and expiration, and surface summaries both for internal administrators and for users to review what partners can see.\n- Protect all data movements with a security posture that includes signed tokens, per-endpoint authorization checks, and a consistent error handling strategy to avoid leaking sensitive info.\n- Link the front end and backend with a secure session pattern, and document how refreshed policies are pushed without requiring full reloads.\n\nStretch goals:\n\n- Offer a simulated partner app interface that can request data under a specific permission scope and show how it is denied when consent is withdrawn.\n- Add rate-limiting or throttling middleware to the backend to defend sensitive routes from overuse.\n- Allow exporting consent history as a downloadable report that redacts personally identifiable fields.\n- Provide a deployable configuration (e.g., Docker compose or scripts) to spin up the stack with sample data.", "acceptanceCriteria": "All API routes require authentication and reject requests lacking the proper consent scope.\nThe UI accurately reflects the backend consents state within one user interaction and shows audit entries after each change.\nAudit trail entries capture actor, timestamp, action, and affected scopes for every grant or revocation.\nPush notifications or polling keep the dashboard in sync with consent updates without manual refresh.\nSecurity handling (tokens/headers) is explained in the README along with how to rotate secrets.", "deliverables": "GitHub repo with backend + frontend source, README explaining the architecture, and instructions to seed data;\nInclude any configuration files needed to run tests or sample data.", "difficulty": 3, "category": "Security", "track": "FullStack", "expectedLanguage": "JavaScript", "estimatedHours": 12, "prerequisites": ["Secure REST API with FastAPI + JWT"], "skillTags": [{"skill": "security", "weight": 0.6}, {"skill": "design", "weight": 0.4}], "learningGain": {"security": 0.5, "design": 0.4}, "rationale": "This consent-focused full-stack project challenges developers to balance security controls with thoughtful UX design, matching a difficulty 3 FullStack goal."}',
     '7367aaff-25ea-469d-9955-016b9692e123');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('b693bdf5-7131-4e22-98f7-22f90aac3c74', N'Build a product search index with adaptive cache warming', N'Many full-stack apps struggle when complex search queries suddenly spike, so you will build a small product catalog service that keeps a lightweight search index in sync with a fast cache layer and pre-warms hot results to keep latency predictable.

#### Requirements
- Provide a REST endpoint that returns paginated product search results based on name/description keywords and optional category filters, backed by a modest dataset (could be JSON or SQLite).
- Maintain an in-memory cache of recent queries with their result sets and signal when stale data should trigger a rebuild from the primary store.
- Track query frequencies and implement a background ``cache warmer`` that refreshes the most frequent queries every minute without blocking incoming requests.
- Measure and expose latency and hit-rate metrics for both the cache and primary storage layer.

#### Stretch goals
- Add support for faceted counts (e.g., number of matching products per category) while still honoring the caching strategy.
- Allow the warmer to prefetch slightly wider query variants (e.g., including synonyms) and compare their hit rates.
- Provide a simple front-end page that displays the cache hit rate and lets users trigger manual refreshes for a query.',
     N'- Search endpoint returns correct paginated results for name/description matches and category filters.
- Cache layer returns fresh data when available and reliably falls back to the primary store when outdated.
- Background cache warmer refreshes the top N queries each minute without blocking request throughput.
- Metrics endpoint reports cache hit rate and request latency with updated values after warmups.
- README documents dataset shape, cache eviction policy, and how to run the warmer.', N'GitHub repo with full source, README, and instructions for running both the API and cache warmer.',
     3, N'Databases', N'FullStack', N'TypeScript',
     12, N'["TODO App (React + Node + SQLite)"]',
     '765E1668-44D3-4E11-AF1A-589A2274B311', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "correctness", "weight": 0.3}, {"skill": "performance", "weight": 0.7}]', N'{"correctness": 0.35, "performance": 0.65}', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('1d393154-a3be-44ea-96fc-31b88ef308cf', '57cf3d44-537b-4f4b-8021-5a752949d25c', 2, N'Approved',
     N'Build a product search index with adaptive cache warming', N'Many full-stack apps struggle when complex search queries suddenly spike, so you will build a small product catalog service that keeps a lightweight search index in sync with a fast cache layer and pre-warms hot results to keep latency predictable.

#### Requirements
- Provide a REST endpoint that returns paginated product search results based on name/description keywords and optional category filters, backed by a modest dataset (could be JSON or SQLite).
- Maintain an in-memory cache of recent queries with their result sets and signal when stale data should trigger a rebuild from the primary store.
- Track query frequencies and implement a background ``cache warmer`` that refreshes the most frequent queries every minute without blocking incoming requests.
- Measure and expose latency and hit-rate metrics for both the cache and primary storage layer.

#### Stretch goals
- Add support for faceted counts (e.g., number of matching products per category) while still honoring the caching strategy.
- Allow the warmer to prefetch slightly wider query variants (e.g., including synonyms) and compare their hit rates.
- Provide a simple front-end page that displays the cache hit rate and lets users trigger manual refreshes for a query.',
     N'- Search endpoint returns correct paginated results for name/description matches and category filters.
- Cache layer returns fresh data when available and reliably falls back to the primary store when outdated.
- Background cache warmer refreshes the top N queries each minute without blocking request throughput.
- Metrics endpoint reports cache hit rate and request latency with updated values after warmups.
- README documents dataset shape, cache eviction policy, and how to run the warmer.', N'GitHub repo with full source, README, and instructions for running both the API and cache warmer.',
     3, N'Databases', N'FullStack', N'TypeScript',
     12, N'["TODO App (React + Node + SQLite)"]',
     N'[{"skill": "correctness", "weight": 0.3}, {"skill": "performance", "weight": 0.7}]', N'{"correctness": 0.35, "performance": 0.65}',
     N'This task fits a FullStack level-3 scope because it forces developers to manage correctness in cached search results while building a performant cache-warming layer that mirrors production challenges.', N'generate_tasks_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a product search index with adaptive cache warming", "description": "Many full-stack apps struggle when complex search queries suddenly spike, so you will build a small product catalog service that keeps a lightweight search index in sync with a fast cache layer and pre-warms hot results to keep latency predictable.\n\n#### Requirements\n- Provide a REST endpoint that returns paginated product search results based on name/description keywords and optional category filters, backed by a modest dataset (could be JSON or SQLite).\n- Maintain an in-memory cache of recent queries with their result sets and signal when stale data should trigger a rebuild from the primary store.\n- Track query frequencies and implement a background ``cache warmer`` that refreshes the most frequent queries every minute without blocking incoming requests.\n- Measure and expose latency and hit-rate metrics for both the cache and primary storage layer.\n\n#### Stretch goals\n- Add support for faceted counts (e.g., number of matching products per category) while still honoring the caching strategy.\n- Allow the warmer to prefetch slightly wider query variants (e.g., including synonyms) and compare their hit rates.\n- Provide a simple front-end page that displays the cache hit rate and lets users trigger manual refreshes for a query.", "acceptanceCriteria": "- Search endpoint returns correct paginated results for name/description matches and category filters.\n- Cache layer returns fresh data when available and reliably falls back to the primary store when outdated.\n- Background cache warmer refreshes the top N queries each minute without blocking request throughput.\n- Metrics endpoint reports cache hit rate and request latency with updated values after warmups.\n- README documents dataset shape, cache eviction policy, and how to run the warmer.", "deliverables": "GitHub repo with full source, README, and instructions for running both the API and cache warmer.", "difficulty": 3, "category": "Databases", "track": "FullStack", "expectedLanguage": "TypeScript", "estimatedHours": 12, "prerequisites": ["TODO App (React + Node + SQLite)"], "skillTags": [{"skill": "correctness", "weight": 0.3}, {"skill": "performance", "weight": 0.7}], "learningGain": {"correctness": 0.35, "performance": 0.65}, "rationale": "This task fits a FullStack level-3 scope because it forces developers to manage correctness in cached search results while building a performant cache-warming layer that mirrors production challenges."}',
     'b693bdf5-7131-4e22-98f7-22f90aac3c74');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('4addce9a-0d7e-4132-8475-b7f0fc87a4a7', N'Build a reconciliation-ready inventory audit API', N'You are helping a warehouse team get better visibility into stock movements by designing a service that tracks reported counts and reconciliations. The API should accept snapshots from scanning stations, allow reviewing the deltas against expected inventory, and provide a way to mark discrepancies as investigated within a single request cycle.

Functional requirements:
- Accept a POST with a bundle of item scans (SKU, location, counted quantity) plus metadata (shift, operator) and persist each observation along with a generated reconciliation ID.
- Provide a GET endpoint that, for a reconciliation ID, returns the expected quantity, latest reported count, and a simple status marker (matching, short, over) without exposing raw history rows.
- Support a PATCH that lets an analyst flag a discrepancy, attach a short note, and atomically transition the status to “investigated” while logging the timestamp.
- Store the core data in a relational model (items, scans, reconciliation events) that enforces referential integrity and prevents duplicated scan IDs.
- Ensure the service rejects scans that arrive with timestamps older than the latest persisted observation for the same SKU/location pair to guard against out-of-order uploads.

Stretch goals:
- Emit a summary view that groups reconciliations by shift and returns counts for each status bucket to assist daily reporting.
- Add a lightweight in-memory cache for the most recent reconciliation per SKU/location to reduce database hits for frequent polling.
- Write a migration or seeding script that seeds a few sample SKUs and expected quantities to exercise the endpoints easily.',
     N'- POSTing a scan bundle returns 201 and the response includes the reconciliation ID and created records count.
- GETting a reconciliation returns matching status info and does not expose scan-level rows when the request is scoped to one ID.
- PATCHing a discrepancy updates the status to investigated, records the note, and rejects requests that omit the reconciliation ID.
- Attempts to ingest an older timestamp for the same SKU/location are rejected with 400 and no new row is written.
- README outlines the data model, endpoints, and any cache or migration scripts provided.', N'Git repository URL with README explaining the persistence model and API contract, plus automated tests that cover the core endpoints and validation rules.',
     2, N'Databases', N'Backend', N'Python',
     6, N'[]',
     '765E1668-44D3-4E11-AF1A-589A2274B311', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"correctness": 0.5, "design": 0.3}', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('4ba3f58a-9004-4bc0-a1fe-5fedd55492d9', '57cf3d44-537b-4f4b-8021-5a752949d25c', 3, N'Approved',
     N'Build a reconciliation-ready inventory audit API', N'You are helping a warehouse team get better visibility into stock movements by designing a service that tracks reported counts and reconciliations. The API should accept snapshots from scanning stations, allow reviewing the deltas against expected inventory, and provide a way to mark discrepancies as investigated within a single request cycle.

Functional requirements:
- Accept a POST with a bundle of item scans (SKU, location, counted quantity) plus metadata (shift, operator) and persist each observation along with a generated reconciliation ID.
- Provide a GET endpoint that, for a reconciliation ID, returns the expected quantity, latest reported count, and a simple status marker (matching, short, over) without exposing raw history rows.
- Support a PATCH that lets an analyst flag a discrepancy, attach a short note, and atomically transition the status to “investigated” while logging the timestamp.
- Store the core data in a relational model (items, scans, reconciliation events) that enforces referential integrity and prevents duplicated scan IDs.
- Ensure the service rejects scans that arrive with timestamps older than the latest persisted observation for the same SKU/location pair to guard against out-of-order uploads.

Stretch goals:
- Emit a summary view that groups reconciliations by shift and returns counts for each status bucket to assist daily reporting.
- Add a lightweight in-memory cache for the most recent reconciliation per SKU/location to reduce database hits for frequent polling.
- Write a migration or seeding script that seeds a few sample SKUs and expected quantities to exercise the endpoints easily.',
     N'- POSTing a scan bundle returns 201 and the response includes the reconciliation ID and created records count.
- GETting a reconciliation returns matching status info and does not expose scan-level rows when the request is scoped to one ID.
- PATCHing a discrepancy updates the status to investigated, records the note, and rejects requests that omit the reconciliation ID.
- Attempts to ingest an older timestamp for the same SKU/location are rejected with 400 and no new row is written.
- README outlines the data model, endpoints, and any cache or migration scripts provided.', N'Git repository URL with README explaining the persistence model and API contract, plus automated tests that cover the core endpoints and validation rules.',
     2, N'Databases', N'Backend', N'Python',
     6, N'[]',
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"correctness": 0.5, "design": 0.3}',
     N'Building this medium-weight API teaches junior developers how to structure audit-friendly backend services that prioritize correctness and thoughtful data design.', N'generate_tasks_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a reconciliation-ready inventory audit API", "description": "You are helping a warehouse team get better visibility into stock movements by designing a service that tracks reported counts and reconciliations. The API should accept snapshots from scanning stations, allow reviewing the deltas against expected inventory, and provide a way to mark discrepancies as investigated within a single request cycle.\n\nFunctional requirements:\n- Accept a POST with a bundle of item scans (SKU, location, counted quantity) plus metadata (shift, operator) and persist each observation along with a generated reconciliation ID.\n- Provide a GET endpoint that, for a reconciliation ID, returns the expected quantity, latest reported count, and a simple status marker (matching, short, over) without exposing raw history rows.\n- Support a PATCH that lets an analyst flag a discrepancy, attach a short note, and atomically transition the status to “investigated” while logging the timestamp.\n- Store the core data in a relational model (items, scans, reconciliation events) that enforces referential integrity and prevents duplicated scan IDs.\n- Ensure the service rejects scans that arrive with timestamps older than the latest persisted observation for the same SKU/location pair to guard against out-of-order uploads.\n\nStretch goals:\n- Emit a summary view that groups reconciliations by shift and returns counts for each status bucket to assist daily reporting.\n- Add a lightweight in-memory cache for the most recent reconciliation per SKU/location to reduce database hits for frequent polling.\n- Write a migration or seeding script that seeds a few sample SKUs and expected quantities to exercise the endpoints easily.", "acceptanceCriteria": "- POSTing a scan bundle returns 201 and the response includes the reconciliation ID and created records count.\n- GETting a reconciliation returns matching status info and does not expose scan-level rows when the request is scoped to one ID.\n- PATCHing a discrepancy updates the status to investigated, records the note, and rejects requests that omit the reconciliation ID.\n- Attempts to ingest an older timestamp for the same SKU/location are rejected with 400 and no new row is written.\n- README outlines the data model, endpoints, and any cache or migration scripts provided.", "deliverables": "Git repository URL with README explaining the persistence model and API contract, plus automated tests that cover the core endpoints and validation rules.", "difficulty": 2, "category": "Databases", "track": "Backend", "expectedLanguage": "Python", "estimatedHours": 6, "prerequisites": [], "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}], "learningGain": {"correctness": 0.5, "design": 0.3}, "rationale": "Building this medium-weight API teaches junior developers how to structure audit-friendly backend services that prioritize correctness and thoughtful data design."}',
     '4addce9a-0d7e-4132-8475-b7f0fc87a4a7');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('f328ee00-eec7-4bf9-beda-17299c432bf9', N'Build a secure telemetry gateway with adaptive throttling', N'Telemetry pipelines need a first-mile gate that enforces identity, limits abuse, and keeps the downstream services fast. Build a lightweight Python backend that validates client assertions, enacts a token-bucket limiter per API key, and keeps an in-memory performance dashboard of request timing.

- Validate incoming requests against a signed API key registry and reject replayed or malformed tokens.
- Record every request’s latency and status so the gateway can expose recent percentiles in a dashboard API.
- Enforce a configurable token-bucket rate limit per client, gracefully rejecting bursts that exhaust their bucket.
- Emit audit logs (timestamp, client, decision) for every request that hits the gateway.

Stretch goals:
- Persist the API key registry and audit log to Postgres/SQLite with upsert semantics.
- Allow operators to rotate keys and invalidate buckets without downtime.
- Integrate a lightweight circuit breaker that widens the rate limit when downstream latency spikes.
- Add a config-driven list of trusted IPs whose requests bypass throttling.',
     N'- Authenticated requests with valid keys receive 2xx responses and recorded latency metrics.
- Invalid tokens, replayed IDs, or clients over quota return 4xx/429 with descriptive JSON bodies.
- Metrics API exposes buckets, recent latencies, and request counts within 30 seconds of activity.
- Audit logs contain timestamp, client ID, decision, and reason for every incoming call.
- README documents deployment steps, configuration options, and how to rotate keys.', N'GitHub repo with source code, tests for token validation and throttling, README explaining deployment and configuration.',
     3, N'Security', N'Backend', N'Python',
     12, N'["Secure REST API with FastAPI + JWT"]',
     '765E1668-44D3-4E11-AF1A-589A2274B311', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "security", "weight": 0.5}, {"skill": "performance", "weight": 0.35}, {"skill": "correctness", "weight": 0.15}]', N'{"security": 0.6, "performance": 0.4, "correctness": 0.3}', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('8f1ac82a-74b1-4c20-b2d5-35b52ac450f6', '57cf3d44-537b-4f4b-8021-5a752949d25c', 4, N'Approved',
     N'Build a secure telemetry gateway with adaptive throttling', N'Telemetry pipelines need a first-mile gate that enforces identity, limits abuse, and keeps the downstream services fast. Build a lightweight Python backend that validates client assertions, enacts a token-bucket limiter per API key, and keeps an in-memory performance dashboard of request timing.

- Validate incoming requests against a signed API key registry and reject replayed or malformed tokens.
- Record every request’s latency and status so the gateway can expose recent percentiles in a dashboard API.
- Enforce a configurable token-bucket rate limit per client, gracefully rejecting bursts that exhaust their bucket.
- Emit audit logs (timestamp, client, decision) for every request that hits the gateway.

Stretch goals:
- Persist the API key registry and audit log to Postgres/SQLite with upsert semantics.
- Allow operators to rotate keys and invalidate buckets without downtime.
- Integrate a lightweight circuit breaker that widens the rate limit when downstream latency spikes.
- Add a config-driven list of trusted IPs whose requests bypass throttling.',
     N'- Authenticated requests with valid keys receive 2xx responses and recorded latency metrics.
- Invalid tokens, replayed IDs, or clients over quota return 4xx/429 with descriptive JSON bodies.
- Metrics API exposes buckets, recent latencies, and request counts within 30 seconds of activity.
- Audit logs contain timestamp, client ID, decision, and reason for every incoming call.
- README documents deployment steps, configuration options, and how to rotate keys.', N'GitHub repo with source code, tests for token validation and throttling, README explaining deployment and configuration.',
     3, N'Security', N'Backend', N'Python',
     12, N'["Secure REST API with FastAPI + JWT"]',
     N'[{"skill": "security", "weight": 0.5}, {"skill": "performance", "weight": 0.35}, {"skill": "correctness", "weight": 0.15}]', N'{"security": 0.6, "performance": 0.4, "correctness": 0.3}',
     N'Designing a telemetry gateway combines security validation and performance-aware throttling, making it a solid difficulty-3 Backend task.', N'generate_tasks_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a secure telemetry gateway with adaptive throttling", "description": "Telemetry pipelines need a first-mile gate that enforces identity, limits abuse, and keeps the downstream services fast. Build a lightweight Python backend that validates client assertions, enacts a token-bucket limiter per API key, and keeps an in-memory performance dashboard of request timing.\n\n- Validate incoming requests against a signed API key registry and reject replayed or malformed tokens.\n- Record every request’s latency and status so the gateway can expose recent percentiles in a dashboard API.\n- Enforce a configurable token-bucket rate limit per client, gracefully rejecting bursts that exhaust their bucket.\n- Emit audit logs (timestamp, client, decision) for every request that hits the gateway.\n\nStretch goals:\n- Persist the API key registry and audit log to Postgres/SQLite with upsert semantics.\n- Allow operators to rotate keys and invalidate buckets without downtime.\n- Integrate a lightweight circuit breaker that widens the rate limit when downstream latency spikes.\n- Add a config-driven list of trusted IPs whose requests bypass throttling.", "acceptanceCriteria": "- Authenticated requests with valid keys receive 2xx responses and recorded latency metrics.\n- Invalid tokens, replayed IDs, or clients over quota return 4xx/429 with descriptive JSON bodies.\n- Metrics API exposes buckets, recent latencies, and request counts within 30 seconds of activity.\n- Audit logs contain timestamp, client ID, decision, and reason for every incoming call.\n- README documents deployment steps, configuration options, and how to rotate keys.", "deliverables": "GitHub repo with source code, tests for token validation and throttling, README explaining deployment and configuration.", "difficulty": 3, "category": "Security", "track": "Backend", "expectedLanguage": "Python", "estimatedHours": 12, "prerequisites": ["Secure REST API with FastAPI + JWT"], "skillTags": [{"skill": "security", "weight": 0.5}, {"skill": "performance", "weight": 0.35}, {"skill": "correctness", "weight": 0.15}], "learningGain": {"security": 0.6, "performance": 0.4, "correctness": 0.3}, "rationale": "Designing a telemetry gateway combines security validation and performance-aware throttling, making it a solid difficulty-3 Backend task."}',
     'f328ee00-eec7-4bf9-beda-17299c432bf9');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('748dc250-c0ba-4e33-936c-d5688f40ac5f', N'Build a secure policy-aware service mesh config validator', N'Service meshes rely on distributed configuration and trust policies to keep inter-service traffic safe. Your job is to create a backend service that ingests service mesh resource definitions, evaluates them against a configurable security policy, and surfaces a verdict plus remediation hints. This keeps operators from deploying misconfigured mutual TLS, unsafe traffic routes, or permissive authorization rules.

Functional requirements:
1. Accept JSON or YAML service mesh resources (VirtualService, DestinationRule, AuthorizationPolicy) via a REST endpoint and normalize them into typed models.
2. Validate incoming configs against policy rules such as required mutual TLS mode, explicit host whitelists, and least-privilege authorization selectors.
3. Track findings per resource and emit a structured report (pass/fail, severity, remediation suggestion) plus overall policy compliance score.
4. Persist the latest evaluation result per resource in a lightweight durable store and expose a query endpoint so operators can fetch the latest verdict history.

Stretch goals:
- Allow operators to upload custom policy rules (e.g., prohibit wildcard hosts) and have the validator re-evaluate stored configs on demand.
- Provide a batching endpoint that receives multiple resources in one request and returns a summarized compliance dashboard.
- Integrate rate limiting or token bucket guards to defend the validation pipeline from overloaded clients.',
     N'- REST endpoint accepts JSON/YAML payloads and returns a compliance report with severity metadata.
- Policy rules are configurable and enforced against all supported resource types.
- Each validated resource has a persisted record with status and timestamp retrievable via query endpoint.
- Reports include remediation hints and an overall compliance score.
- Tests verify strong-path policy enforcement plus rate limiting/backpressure if implemented.', N'- GitHub URL containing the service code, config samples, README with usage, and at least one policy test suite.
- README explains the policy model, persistence choices, and security considerations.',
     4, N'Security', N'Backend', N'Go',
     18, N'["Secure REST API with FastAPI + JWT"]',
     '765E1668-44D3-4E11-AF1A-589A2274B311', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "design", "weight": 0.55}, {"skill": "security", "weight": 0.45}]', N'{"design": 0.5, "security": 0.5}', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('1574328c-44f2-4e82-a7e4-1bcc2ced30c9', '57cf3d44-537b-4f4b-8021-5a752949d25c', 5, N'Approved',
     N'Build a secure policy-aware service mesh config validator', N'Service meshes rely on distributed configuration and trust policies to keep inter-service traffic safe. Your job is to create a backend service that ingests service mesh resource definitions, evaluates them against a configurable security policy, and surfaces a verdict plus remediation hints. This keeps operators from deploying misconfigured mutual TLS, unsafe traffic routes, or permissive authorization rules.

Functional requirements:
1. Accept JSON or YAML service mesh resources (VirtualService, DestinationRule, AuthorizationPolicy) via a REST endpoint and normalize them into typed models.
2. Validate incoming configs against policy rules such as required mutual TLS mode, explicit host whitelists, and least-privilege authorization selectors.
3. Track findings per resource and emit a structured report (pass/fail, severity, remediation suggestion) plus overall policy compliance score.
4. Persist the latest evaluation result per resource in a lightweight durable store and expose a query endpoint so operators can fetch the latest verdict history.

Stretch goals:
- Allow operators to upload custom policy rules (e.g., prohibit wildcard hosts) and have the validator re-evaluate stored configs on demand.
- Provide a batching endpoint that receives multiple resources in one request and returns a summarized compliance dashboard.
- Integrate rate limiting or token bucket guards to defend the validation pipeline from overloaded clients.',
     N'- REST endpoint accepts JSON/YAML payloads and returns a compliance report with severity metadata.
- Policy rules are configurable and enforced against all supported resource types.
- Each validated resource has a persisted record with status and timestamp retrievable via query endpoint.
- Reports include remediation hints and an overall compliance score.
- Tests verify strong-path policy enforcement plus rate limiting/backpressure if implemented.', N'- GitHub URL containing the service code, config samples, README with usage, and at least one policy test suite.
- README explains the policy model, persistence choices, and security considerations.',
     4, N'Security', N'Backend', N'Go',
     18, N'["Secure REST API with FastAPI + JWT"]',
     N'[{"skill": "design", "weight": 0.55}, {"skill": "security", "weight": 0.45}]', N'{"design": 0.5, "security": 0.5}',
     N'Designing a policy-aware validator with persistence and configurable rules sharpens advanced backend design while reinforcing security controls at difficulty level 4.', N'generate_tasks_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a secure policy-aware service mesh config validator", "description": "Service meshes rely on distributed configuration and trust policies to keep inter-service traffic safe. Your job is to create a backend service that ingests service mesh resource definitions, evaluates them against a configurable security policy, and surfaces a verdict plus remediation hints. This keeps operators from deploying misconfigured mutual TLS, unsafe traffic routes, or permissive authorization rules.\n\nFunctional requirements:\n1. Accept JSON or YAML service mesh resources (VirtualService, DestinationRule, AuthorizationPolicy) via a REST endpoint and normalize them into typed models.\n2. Validate incoming configs against policy rules such as required mutual TLS mode, explicit host whitelists, and least-privilege authorization selectors.\n3. Track findings per resource and emit a structured report (pass/fail, severity, remediation suggestion) plus overall policy compliance score.\n4. Persist the latest evaluation result per resource in a lightweight durable store and expose a query endpoint so operators can fetch the latest verdict history.\n\nStretch goals:\n- Allow operators to upload custom policy rules (e.g., prohibit wildcard hosts) and have the validator re-evaluate stored configs on demand.\n- Provide a batching endpoint that receives multiple resources in one request and returns a summarized compliance dashboard.\n- Integrate rate limiting or token bucket guards to defend the validation pipeline from overloaded clients.", "acceptanceCriteria": "- REST endpoint accepts JSON/YAML payloads and returns a compliance report with severity metadata.\n- Policy rules are configurable and enforced against all supported resource types.\n- Each validated resource has a persisted record with status and timestamp retrievable via query endpoint.\n- Reports include remediation hints and an overall compliance score.\n- Tests verify strong-path policy enforcement plus rate limiting/backpressure if implemented.", "deliverables": "- GitHub URL containing the service code, config samples, README with usage, and at least one policy test suite.\n- README explains the policy model, persistence choices, and security considerations.", "difficulty": 4, "category": "Security", "track": "Backend", "expectedLanguage": "Go", "estimatedHours": 18, "prerequisites": ["Secure REST API with FastAPI + JWT"], "skillTags": [{"skill": "design", "weight": 0.55}, {"skill": "security", "weight": 0.45}], "learningGain": {"design": 0.5, "security": 0.5}, "rationale": "Designing a policy-aware validator with persistence and configurable rules sharpens advanced backend design while reinforcing security controls at difficulty level 4."}',
     '748dc250-c0ba-4e33-936c-d5688f40ac5f');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('894de0a8-bd49-4fef-aef3-177e91c687e1', N'Build a prioritized job runner for CSV health checks', N'Operations teams often need a lightweight Python tool to scan CSV exports for freshness, schema drift, and row-level constraints without spinning up a whole orchestration framework.

Functional requirements:
- Accept a configuration describing multiple CSV sources, per-file freshness thresholds, and priority levels.
- Schedule and execute health-check jobs in priority order, running higher-priority sources first when multiple jobs are ready.
- Track results per job, flagging schema issues (missing/extra columns) and invalid rows (type mismatches or missing critical fields).
- Record run durations and detected failures for each source, and summarize the latest status in a machine-readable report.
- Provide a CLI to trigger a full run or rerun an individual source by name.

Stretch goals:
- Cache the last successful schema per source to detect drift without reloading example files.
- Emit structured logs or metrics so downstream tooling can visualize job performance.
- Allow specifying a soft timeout per source and gracefully cancel long-running checks.',
     N'- Configuration parsing succeeds for at least three CSV sources with varying priorities and thresholds.
- Priority-aware scheduler runs higher-priority sources before lower ones when multiple are queued.
- Schema and row validation detects injected column/row violations and surfaces them in the report.
- Summary report includes run duration, status, and failure details for each source after a full run.
- CLI accepts commands to rerun a single named source and exits with non-zero status when a check fails.', N'GitHub URL with README, runner module, and 5+ tests covering scheduler and validation logic.',
     2, N'Algorithms', N'Python', N'Python',
     6, N'[]',
     '765E1668-44D3-4E11-AF1A-589A2274B311', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"correctness": 0.4, "design": 0.2}', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('6965d76e-92d6-435d-9fcf-aa183e96bb1f', '57cf3d44-537b-4f4b-8021-5a752949d25c', 6, N'Approved',
     N'Build a prioritized job runner for CSV health checks', N'Operations teams often need a lightweight Python tool to scan CSV exports for freshness, schema drift, and row-level constraints without spinning up a whole orchestration framework.

Functional requirements:
- Accept a configuration describing multiple CSV sources, per-file freshness thresholds, and priority levels.
- Schedule and execute health-check jobs in priority order, running higher-priority sources first when multiple jobs are ready.
- Track results per job, flagging schema issues (missing/extra columns) and invalid rows (type mismatches or missing critical fields).
- Record run durations and detected failures for each source, and summarize the latest status in a machine-readable report.
- Provide a CLI to trigger a full run or rerun an individual source by name.

Stretch goals:
- Cache the last successful schema per source to detect drift without reloading example files.
- Emit structured logs or metrics so downstream tooling can visualize job performance.
- Allow specifying a soft timeout per source and gracefully cancel long-running checks.',
     N'- Configuration parsing succeeds for at least three CSV sources with varying priorities and thresholds.
- Priority-aware scheduler runs higher-priority sources before lower ones when multiple are queued.
- Schema and row validation detects injected column/row violations and surfaces them in the report.
- Summary report includes run duration, status, and failure details for each source after a full run.
- CLI accepts commands to rerun a single named source and exits with non-zero status when a check fails.', N'GitHub URL with README, runner module, and 5+ tests covering scheduler and validation logic.',
     2, N'Algorithms', N'Python', N'Python',
     6, N'[]',
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"correctness": 0.4, "design": 0.2}',
     N'A priority-aware CSV health-check runner lets Python developers practice correctness and performance tradeoffs without exceeding a 2-level effort.', N'generate_tasks_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a prioritized job runner for CSV health checks", "description": "Operations teams often need a lightweight Python tool to scan CSV exports for freshness, schema drift, and row-level constraints without spinning up a whole orchestration framework.\n\nFunctional requirements:\n- Accept a configuration describing multiple CSV sources, per-file freshness thresholds, and priority levels.\n- Schedule and execute health-check jobs in priority order, running higher-priority sources first when multiple jobs are ready.\n- Track results per job, flagging schema issues (missing/extra columns) and invalid rows (type mismatches or missing critical fields).\n- Record run durations and detected failures for each source, and summarize the latest status in a machine-readable report.\n- Provide a CLI to trigger a full run or rerun an individual source by name.\n\nStretch goals:\n- Cache the last successful schema per source to detect drift without reloading example files.\n- Emit structured logs or metrics so downstream tooling can visualize job performance.\n- Allow specifying a soft timeout per source and gracefully cancel long-running checks.", "acceptanceCriteria": "- Configuration parsing succeeds for at least three CSV sources with varying priorities and thresholds.\n- Priority-aware scheduler runs higher-priority sources before lower ones when multiple are queued.\n- Schema and row validation detects injected column/row violations and surfaces them in the report.\n- Summary report includes run duration, status, and failure details for each source after a full run.\n- CLI accepts commands to rerun a single named source and exits with non-zero status when a check fails.", "deliverables": "GitHub URL with README, runner module, and 5+ tests covering scheduler and validation logic.", "difficulty": 2, "category": "Algorithms", "track": "Python", "expectedLanguage": "Python", "estimatedHours": 6, "prerequisites": [], "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}], "learningGain": {"correctness": 0.4, "design": 0.2}, "rationale": "A priority-aware CSV health-check runner lets Python developers practice correctness and performance tradeoffs without exceeding a 2-level effort."}',
     '894de0a8-bd49-4fef-aef3-177e91c687e1');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('162e5bd9-da1a-4fc6-9c6b-c2d780453b92', N'Build a reusable CSV transformation pipeline CLI', N'Data teams often encode business rules as monolithic scripts that are hard to adjust or test. Build a Python command-line tool that lets users define a sequence of lightweight transformation steps (filtering, enrichment, aggregation) declaratively and applies them to input datasets, while providing clear logs and modular operators.

Functional requirements:
1. Accept a YAML or JSON pipeline definition that lists named steps and the transformation they perform on CSV rows.
2. Support at least three operator types (e.g., row filtering, field renaming, arithmetic enrichment) that can be composed in order.
3. Stream input rows from a file, apply the configured steps sequentially, and write the resulting rows to a new CSV.
4. Emit human-readable logs that detail which step processed how many rows and highlight skipped records.
5. Provide a `--dry-run` flag that validates the pipeline without emitting output, reporting any invalid configs.

Stretch goals:
- Add a plugin system so additional operator modules can be registered without changing the core runner.
- Enable step-level metrics (duration, input/output counts) that are serialized alongside the transformed output.
- Allow conditional branching where a step can reroute rows to different downstream operators based on predicates.',
     N'- CLI loads a pipeline file and exits with a clear error when required fields are missing.
- Running the pipeline produces an output CSV where each row has passed through every configured step in order.
- Logs include step names, row counts processed, and summaries of dropped records.
- `--dry-run` validates config and reports validation failures without generating output.
- Plugin operators can be registered and invoked via the pipeline definition without modifying core runner.', N'GitHub repo with README describing usage, pipeline schema, and instructions for running built-in operators; include sample pipelines and logs.',
     3, N'OOP', N'Python', N'Python',
     10, N'[]',
     '765E1668-44D3-4E11-AF1A-589A2274B311', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "readability", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"readability": 0.5, "design": 0.3}', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('8c42a81e-1d68-443c-ae69-b568b2b0355e', '57cf3d44-537b-4f4b-8021-5a752949d25c', 7, N'Approved',
     N'Build a reusable CSV transformation pipeline CLI', N'Data teams often encode business rules as monolithic scripts that are hard to adjust or test. Build a Python command-line tool that lets users define a sequence of lightweight transformation steps (filtering, enrichment, aggregation) declaratively and applies them to input datasets, while providing clear logs and modular operators.

Functional requirements:
1. Accept a YAML or JSON pipeline definition that lists named steps and the transformation they perform on CSV rows.
2. Support at least three operator types (e.g., row filtering, field renaming, arithmetic enrichment) that can be composed in order.
3. Stream input rows from a file, apply the configured steps sequentially, and write the resulting rows to a new CSV.
4. Emit human-readable logs that detail which step processed how many rows and highlight skipped records.
5. Provide a `--dry-run` flag that validates the pipeline without emitting output, reporting any invalid configs.

Stretch goals:
- Add a plugin system so additional operator modules can be registered without changing the core runner.
- Enable step-level metrics (duration, input/output counts) that are serialized alongside the transformed output.
- Allow conditional branching where a step can reroute rows to different downstream operators based on predicates.',
     N'- CLI loads a pipeline file and exits with a clear error when required fields are missing.
- Running the pipeline produces an output CSV where each row has passed through every configured step in order.
- Logs include step names, row counts processed, and summaries of dropped records.
- `--dry-run` validates config and reports validation failures without generating output.
- Plugin operators can be registered and invoked via the pipeline definition without modifying core runner.', N'GitHub repo with README describing usage, pipeline schema, and instructions for running built-in operators; include sample pipelines and logs.',
     3, N'OOP', N'Python', N'Python',
     10, N'[]',
     N'[{"skill": "readability", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"readability": 0.5, "design": 0.3}',
     N'Designing a configurable CSV pipeline exercises Python readability and system design skills at a solid difficulty-3 level.', N'generate_tasks_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a reusable CSV transformation pipeline CLI", "description": "Data teams often encode business rules as monolithic scripts that are hard to adjust or test. Build a Python command-line tool that lets users define a sequence of lightweight transformation steps (filtering, enrichment, aggregation) declaratively and applies them to input datasets, while providing clear logs and modular operators.\n\nFunctional requirements:\n1. Accept a YAML or JSON pipeline definition that lists named steps and the transformation they perform on CSV rows.\n2. Support at least three operator types (e.g., row filtering, field renaming, arithmetic enrichment) that can be composed in order.\n3. Stream input rows from a file, apply the configured steps sequentially, and write the resulting rows to a new CSV.\n4. Emit human-readable logs that detail which step processed how many rows and highlight skipped records.\n5. Provide a `--dry-run` flag that validates the pipeline without emitting output, reporting any invalid configs.\n\nStretch goals:\n- Add a plugin system so additional operator modules can be registered without changing the core runner.\n- Enable step-level metrics (duration, input/output counts) that are serialized alongside the transformed output.\n- Allow conditional branching where a step can reroute rows to different downstream operators based on predicates.", "acceptanceCriteria": "- CLI loads a pipeline file and exits with a clear error when required fields are missing.\n- Running the pipeline produces an output CSV where each row has passed through every configured step in order.\n- Logs include step names, row counts processed, and summaries of dropped records.\n- `--dry-run` validates config and reports validation failures without generating output.\n- Plugin operators can be registered and invoked via the pipeline definition without modifying core runner.", "deliverables": "GitHub repo with README describing usage, pipeline schema, and instructions for running built-in operators; include sample pipelines and logs.", "difficulty": 3, "category": "OOP", "track": "Python", "expectedLanguage": "Python", "estimatedHours": 10, "prerequisites": [], "skillTags": [{"skill": "readability", "weight": 0.6}, {"skill": "design", "weight": 0.4}], "learningGain": {"readability": 0.5, "design": 0.3}, "rationale": "Designing a configurable CSV pipeline exercises Python readability and system design skills at a solid difficulty-3 level."}',
     '162e5bd9-da1a-4fc6-9c6b-c2d780453b92');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('2bb1302c-ab19-4918-a870-f4042ce1e601', N'Ship a secure credential issuance CLI with audit logging', N'Teams often need to distribute short-lived credentials for service accounts, but ad-hoc scripts leak secrets and lack traceability. Build a Python CLI that issues opaque tokens, stores their hashes in an append-only audit log, and enforces policy guards before handing over new credentials.

Functional requirements:
1. Accept a service name, expiration, and scope; validate inputs and refuse unsafe combinations.
2. Generate a random credential, encrypt it for transport, and persist only a cryptographic fingerprint plus metadata to the audit store.
3. Support multiple transports (stdout, file, webhook) while keeping the secret out of persisted logs.
4. Maintain an append-only audit log with timestamps, hashed credentials, and the user who requested issuance.
5. Provide a verification mode that checks whether a presented credential matches a stored hash without ever storing plaintext.

Stretch goals:
- Integrate a simple policy engine that refuses issuance if the service already holds the maximum number of active credentials.
- Add HMAC-signed webhooks so remote systems can prove authenticity when pulling secrets.
- Emit structured JSON logs compatible with SIEM ingestion.',
     N'- CLI rejects invalid input combinations with descriptive errors.
- Each issued credential appears in the audit log with only hashed material and metadata.
- Verification mode confirms valid credentials and rejects tampered ones without leaking values.
- Tests cover policy rules, log integrity, and transport guards.
- Documentation explains how to rotate credentials and why secrets are never stored in plaintext.', N'GitHub URL with README, CLI module, and test suite
Include sample audit log exports and usage documentation.',
     4, N'Security', N'Python', N'Python',
     20, N'["Secure REST API with FastAPI + JWT"]',
     '765E1668-44D3-4E11-AF1A-589A2274B311', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "security", "weight": 0.4}]', N'{"correctness": 0.5, "security": 0.45}', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('c9703997-9b91-4af3-8c47-9e0933c49efb', '57cf3d44-537b-4f4b-8021-5a752949d25c', 8, N'Approved',
     N'Ship a secure credential issuance CLI with audit logging', N'Teams often need to distribute short-lived credentials for service accounts, but ad-hoc scripts leak secrets and lack traceability. Build a Python CLI that issues opaque tokens, stores their hashes in an append-only audit log, and enforces policy guards before handing over new credentials.

Functional requirements:
1. Accept a service name, expiration, and scope; validate inputs and refuse unsafe combinations.
2. Generate a random credential, encrypt it for transport, and persist only a cryptographic fingerprint plus metadata to the audit store.
3. Support multiple transports (stdout, file, webhook) while keeping the secret out of persisted logs.
4. Maintain an append-only audit log with timestamps, hashed credentials, and the user who requested issuance.
5. Provide a verification mode that checks whether a presented credential matches a stored hash without ever storing plaintext.

Stretch goals:
- Integrate a simple policy engine that refuses issuance if the service already holds the maximum number of active credentials.
- Add HMAC-signed webhooks so remote systems can prove authenticity when pulling secrets.
- Emit structured JSON logs compatible with SIEM ingestion.',
     N'- CLI rejects invalid input combinations with descriptive errors.
- Each issued credential appears in the audit log with only hashed material and metadata.
- Verification mode confirms valid credentials and rejects tampered ones without leaking values.
- Tests cover policy rules, log integrity, and transport guards.
- Documentation explains how to rotate credentials and why secrets are never stored in plaintext.', N'GitHub URL with README, CLI module, and test suite
Include sample audit log exports and usage documentation.',
     4, N'Security', N'Python', N'Python',
     20, N'["Secure REST API with FastAPI + JWT"]',
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "security", "weight": 0.4}]', N'{"correctness": 0.5, "security": 0.45}',
     N'A CLI that issues hardened credentials and traces every step lets developers practice security-first correctness at difficulty 4 in Python.', N'generate_tasks_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"title": "Ship a secure credential issuance CLI with audit logging", "description": "Teams often need to distribute short-lived credentials for service accounts, but ad-hoc scripts leak secrets and lack traceability. Build a Python CLI that issues opaque tokens, stores their hashes in an append-only audit log, and enforces policy guards before handing over new credentials.\n\nFunctional requirements:\n1. Accept a service name, expiration, and scope; validate inputs and refuse unsafe combinations.\n2. Generate a random credential, encrypt it for transport, and persist only a cryptographic fingerprint plus metadata to the audit store.\n3. Support multiple transports (stdout, file, webhook) while keeping the secret out of persisted logs.\n4. Maintain an append-only audit log with timestamps, hashed credentials, and the user who requested issuance.\n5. Provide a verification mode that checks whether a presented credential matches a stored hash without ever storing plaintext.\n\nStretch goals:\n- Integrate a simple policy engine that refuses issuance if the service already holds the maximum number of active credentials.\n- Add HMAC-signed webhooks so remote systems can prove authenticity when pulling secrets.\n- Emit structured JSON logs compatible with SIEM ingestion.", "acceptanceCriteria": "- CLI rejects invalid input combinations with descriptive errors.\n- Each issued credential appears in the audit log with only hashed material and metadata.\n- Verification mode confirms valid credentials and rejects tampered ones without leaking values.\n- Tests cover policy rules, log integrity, and transport guards.\n- Documentation explains how to rotate credentials and why secrets are never stored in plaintext.", "deliverables": "GitHub URL with README, CLI module, and test suite\nInclude sample audit log exports and usage documentation.", "difficulty": 4, "category": "Security", "track": "Python", "expectedLanguage": "Python", "estimatedHours": 20, "prerequisites": ["Secure REST API with FastAPI + JWT"], "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "security", "weight": 0.4}], "learningGain": {"correctness": 0.5, "security": 0.45}, "rationale": "A CLI that issues hardened credentials and traces every step lets developers practice security-first correctness at difficulty 4 in Python."}',
     '2bb1302c-ab19-4918-a870-f4042ce1e601');

COMMIT TRANSACTION;

-- Verification:
SELECT COUNT(*) AS ApprovedCount FROM TaskDrafts WHERE BatchId = '57cf3d44-537b-4f4b-8021-5a752949d25c' AND Status = 'Approved';
SELECT COUNT(*) AS RejectedCount FROM TaskDrafts WHERE BatchId = '57cf3d44-537b-4f4b-8021-5a752949d25c' AND Status = 'Rejected';
SELECT COUNT(*) AS TaskBankSize FROM Tasks WHERE IsActive = 1;  -- target: 50