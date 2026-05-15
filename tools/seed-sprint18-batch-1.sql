-- Sprint 18 task batch 1 -- applied via run_task_batch_s18.py at 2026-05-14T23:53:35Z
-- BatchId: 5631369e-444b-4535-b99e-930b37ef83b5
-- Drafts: 10 expected (3-4 per track, diff 2-3)
-- Reviewer: Claude single-reviewer per ADR-058 (extends ADR-056 + ADR-057)
SET XACT_ABORT ON;
BEGIN TRANSACTION;

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('725821c7-8b05-4d03-b6fb-375074876653', N'Build a Product Review Moderation Dashboard with Live Highlights', N'Create a focused moderation workspace that lets support and product ops monitor new product reviews, flag problematic content, and validate the final decision before it reaches the storefront. The dashboard surface should pull review records, show metadata, and surface items that need attention while the backend enforces review state transitions and summaries.

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
- Log state transitions with timestamps and display a mini-timeline per review in the UI.',
     N'- API returns paginated review lists filtered by state and includes highlight metadata for each record.
- Decision updates require notes of at least 20 chars and persist an audit entry per change.
- Front end filters, sorts, and displays review histories without full page reloads.
- Validation errors surface clearly in the UI and API responses for invalid states or missing data.
- README explains how to run both backend and frontend along with sample data for testing.', N'GitHub URL with both frontend and backend code, README covering setup + data seeding, and at least one automated test per API route.',
     2, N'OOP', N'FullStack', N'TypeScript',
     6, N'[]',
     '11111111-1111-1111-1111-111111111111', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "correctness", "weight": 0.7}, {"skill": "design", "weight": 0.3}]', N'{"correctness": 0.55, "design": 0.25}', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('2da2d42a-d5e0-4f85-8794-e10172b1355c', '5631369e-444b-4535-b99e-930b37ef83b5', 0, N'Approved',
     N'Build a Product Review Moderation Dashboard with Live Highlights', N'Create a focused moderation workspace that lets support and product ops monitor new product reviews, flag problematic content, and validate the final decision before it reaches the storefront. The dashboard surface should pull review records, show metadata, and surface items that need attention while the backend enforces review state transitions and summaries.

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
- Log state transitions with timestamps and display a mini-timeline per review in the UI.',
     N'- API returns paginated review lists filtered by state and includes highlight metadata for each record.
- Decision updates require notes of at least 20 chars and persist an audit entry per change.
- Front end filters, sorts, and displays review histories without full page reloads.
- Validation errors surface clearly in the UI and API responses for invalid states or missing data.
- README explains how to run both backend and frontend along with sample data for testing.', N'GitHub URL with both frontend and backend code, README covering setup + data seeding, and at least one automated test per API route.',
     2, N'OOP', N'FullStack', N'TypeScript',
     6, N'[]',
     N'[{"skill": "correctness", "weight": 0.7}, {"skill": "design", "weight": 0.3}]', N'{"correctness": 0.55, "design": 0.25}',
     N'This dashboard task ties easy-to-implement FullStack components with correctness-driven API flows and UI design decisions at a medium difficulty.', N'generate_tasks_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a Product Review Moderation Dashboard with Live Highlights", "description": "Create a focused moderation workspace that lets support and product ops monitor new product reviews, flag problematic content, and validate the final decision before it reaches the storefront. The dashboard surface should pull review records, show metadata, and surface items that need attention while the backend enforces review state transitions and summaries.\n\nFunctional requirements:\n- Design a simple API that lists incoming reviews with metadata (rating, text snippet, product, user) and supports marking reviews as pending, approved, or rejected.\n- Generate lightweight highlights (e.g., keywords, sentiment) from review text when it lands so the UI can show why it was flagged.\n- Allow reviewers to leave a decision note and change the state, storing an audit trail for each review action.\n- Build a single-page front end that streams the list, lets reviewers filter by state, and shows the latest audit trail per review.\n- Ensure both API and UI validate inputs and surface meaningful errors when states or note lengths are invalid.\n\nStretch goals:\n- Add a bulk decision tool for reviewers to approve or reject multiple similar reviews at once.\n- Show a confidence indicator from the highlight generator and let reviewers toggle whether machine suggestions influenced their decision.\n- Cache recent review lists in-memory on the backend to avoid repeated database queries for the same state filter.\n- Log state transitions with timestamps and display a mini-timeline per review in the UI.", "acceptanceCriteria": "- API returns paginated review lists filtered by state and includes highlight metadata for each record.\n- Decision updates require notes of at least 20 chars and persist an audit entry per change.\n- Front end filters, sorts, and displays review histories without full page reloads.\n- Validation errors surface clearly in the UI and API responses for invalid states or missing data.\n- README explains how to run both backend and frontend along with sample data for testing.", "deliverables": "GitHub URL with both frontend and backend code, README covering setup + data seeding, and at least one automated test per API route.", "difficulty": 2, "category": "OOP", "track": "FullStack", "expectedLanguage": "TypeScript", "estimatedHours": 6, "prerequisites": [], "skillTags": [{"skill": "correctness", "weight": 0.7}, {"skill": "design", "weight": 0.3}], "learningGain": {"correctness": 0.55, "design": 0.25}, "rationale": "This dashboard task ties easy-to-implement FullStack components with correctness-driven API flows and UI design decisions at a medium difficulty."}',
     '725821c7-8b05-4d03-b6fb-375074876653');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('b5e8f6b6-3bc4-4961-86cc-9f275919b777', N'Build a Neighborhood Event Feed with RSVP Insights', N'Local communities need a single pane to promote meetups, share details, and monitor interest without drowning in noise. Build a simple full-stack experience that lets organizers create short event blurbs and attendees browse, filter, and see RSVP trends in a clean interface.

Functional requirements:
- Provide CRUD endpoints for events (title, description, time, tags) from a REST API and store records in a lightweight database.
- Create a front-end that lists upcoming events, allows keyword/tag filtering, and highlights a single â€œfeaturedâ€ event per filter state.
- Track RSVPs by category (yes/maybe/no) and expose real-time tallies per event so attendees see how many people plan to join before they sign up.
- Ensure that each RSVP increments only once per simulated user session to keep counts believable.

Stretch goals:
- Add pagination or infinite scroll so the feed feels responsive when many events exist.
- Introduce a dropdown for event type and animate a banner when RSVP tallies cross a configurable milestone.
- Include a simple admin widget to mark events as canceled and visually dim them in the feed.',
     N'- Event creation, updates, and deletions work through documented API endpoints.
- Front-end filters respond to keyword/tag selections within two seconds and always show the current featured event.
- RSVP counts update immediately after a response, and a simulated repeat RSVP from the same session is ignored.
- README explains architecture choices, setup instructions, and how to seed sample data.
- Project includes at least one automated test covering a key API route or RSVP logic.', N'GitHub repo URL containing the source code, README, and any scripts used to bootstrap sample events.',
     2, N'OOP', N'FullStack', N'JavaScript',
     6, N'[]',
     '11111111-1111-1111-1111-111111111111', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "readability", "weight": 0.5}, {"skill": "design", "weight": 0.5}]', N'{"readability": 0.6, "design": 0.4}', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('c32ada41-7d96-4653-bfc6-2d94bca520ea', '5631369e-444b-4535-b99e-930b37ef83b5', 1, N'Approved',
     N'Build a Neighborhood Event Feed with RSVP Insights', N'Local communities need a single pane to promote meetups, share details, and monitor interest without drowning in noise. Build a simple full-stack experience that lets organizers create short event blurbs and attendees browse, filter, and see RSVP trends in a clean interface.

Functional requirements:
- Provide CRUD endpoints for events (title, description, time, tags) from a REST API and store records in a lightweight database.
- Create a front-end that lists upcoming events, allows keyword/tag filtering, and highlights a single â€œfeaturedâ€ event per filter state.
- Track RSVPs by category (yes/maybe/no) and expose real-time tallies per event so attendees see how many people plan to join before they sign up.
- Ensure that each RSVP increments only once per simulated user session to keep counts believable.

Stretch goals:
- Add pagination or infinite scroll so the feed feels responsive when many events exist.
- Introduce a dropdown for event type and animate a banner when RSVP tallies cross a configurable milestone.
- Include a simple admin widget to mark events as canceled and visually dim them in the feed.',
     N'- Event creation, updates, and deletions work through documented API endpoints.
- Front-end filters respond to keyword/tag selections within two seconds and always show the current featured event.
- RSVP counts update immediately after a response, and a simulated repeat RSVP from the same session is ignored.
- README explains architecture choices, setup instructions, and how to seed sample data.
- Project includes at least one automated test covering a key API route or RSVP logic.', N'GitHub repo URL containing the source code, README, and any scripts used to bootstrap sample events.',
     2, N'OOP', N'FullStack', N'JavaScript',
     6, N'[]',
     N'[{"skill": "readability", "weight": 0.5}, {"skill": "design", "weight": 0.5}]', N'{"readability": 0.6, "design": 0.4}',
     N'This 2-level FullStack brief focuses on readability and design through a real-world event feed with clean APIs and UI affordances.', N'generate_tasks_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a Neighborhood Event Feed with RSVP Insights", "description": "Local communities need a single pane to promote meetups, share details, and monitor interest without drowning in noise. Build a simple full-stack experience that lets organizers create short event blurbs and attendees browse, filter, and see RSVP trends in a clean interface.\n\nFunctional requirements:\n- Provide CRUD endpoints for events (title, description, time, tags) from a REST API and store records in a lightweight database.\n- Create a front-end that lists upcoming events, allows keyword/tag filtering, and highlights a single â€œfeaturedâ€ event per filter state.\n- Track RSVPs by category (yes/maybe/no) and expose real-time tallies per event so attendees see how many people plan to join before they sign up.\n- Ensure that each RSVP increments only once per simulated user session to keep counts believable.\n\nStretch goals:\n- Add pagination or infinite scroll so the feed feels responsive when many events exist.\n- Introduce a dropdown for event type and animate a banner when RSVP tallies cross a configurable milestone.\n- Include a simple admin widget to mark events as canceled and visually dim them in the feed.", "acceptanceCriteria": "- Event creation, updates, and deletions work through documented API endpoints.\n- Front-end filters respond to keyword/tag selections within two seconds and always show the current featured event.\n- RSVP counts update immediately after a response, and a simulated repeat RSVP from the same session is ignored.\n- README explains architecture choices, setup instructions, and how to seed sample data.\n- Project includes at least one automated test covering a key API route or RSVP logic.", "deliverables": "GitHub repo URL containing the source code, README, and any scripts used to bootstrap sample events.", "difficulty": 2, "category": "OOP", "track": "FullStack", "expectedLanguage": "JavaScript", "estimatedHours": 6, "prerequisites": [], "skillTags": [{"skill": "readability", "weight": 0.5}, {"skill": "design", "weight": 0.5}], "learningGain": {"readability": 0.6, "design": 0.4}, "rationale": "This 2-level FullStack brief focuses on readability and design through a real-world event feed with clean APIs and UI affordances."}',
     'b5e8f6b6-3bc4-4961-86cc-9f275919b777');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('df23942a-fc89-4406-8836-d0ece05704ea', N'Build a secure full-stack photo sharing board with audit trails', N'Capture the workflows that a small creative team needs when they share reference photos, annotate them, and prove who touched each asset â€” all through a secure, data-integrity-focused web tool.

1. Provide an authenticated React+TS dashboard where users can upload images, assign short descriptive tags, and create a secure share link that expires after a configured time window.
2. Persist each upload plus tag metadata and share link information in a hardened backend that records who performed each action and at what timestamp.
3. Protect each backend route with scoped authorization so only the owner or invitees can view/edit the upload, and ensure expired links reject access with clear responses.
4. Surface the audit trail for every asset in the UI, showing upload, tag edits, and share link creation along with the responsible user and time.
5. Include backend validation that sanitizes file names, enforces size limits, and rejects invalid tags to avoid downstream injection threats.

Stretch goals:

- Implement file hashing so the backend can detect duplicate uploads before storing them while still honoring unique tags.
- Let users revoke share links early and immediately block previously issued URLs.
- Add a lightweight websocket channel that notifies viewers when a new tag or comment appears on an asset.',
     N'- All API endpoints enforce authentication and return 4xx/2xx codes that reflect authorization and validation outcomes.
- Uploaded images plus metadata persist with timestamped audit entries showing the acting user in the database.
- Share links honor expiry and revocation checks before allowing downloads, and the UI clearly marks expired links.
- Frontend surfaces the audit trail in a table or list with user, action, and timestamp for every edit.
- File uploads reject entries exceeding size limits or containing invalid tags, with helpful error feedback surfaced to the user.', N'GitHub repo with README explaining your stack choices, secure upload flow, and instructions to run the app locally.
Include configuration for secrets (e.g., .env.example) and at least one automated test that covers a security check.',
     3, N'Security', N'FullStack', N'TypeScript',
     12, N'["Secure REST API with FastAPI + JWT"]',
     '11111111-1111-1111-1111-111111111111', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "security", "weight": 0.4}]', N'{"correctness": 0.5, "security": 0.3}', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('dca84af6-69b0-44dd-8015-e94a2f5c3374', '5631369e-444b-4535-b99e-930b37ef83b5', 2, N'Approved',
     N'Build a secure full-stack photo sharing board with audit trails', N'Capture the workflows that a small creative team needs when they share reference photos, annotate them, and prove who touched each asset â€” all through a secure, data-integrity-focused web tool.

1. Provide an authenticated React+TS dashboard where users can upload images, assign short descriptive tags, and create a secure share link that expires after a configured time window.
2. Persist each upload plus tag metadata and share link information in a hardened backend that records who performed each action and at what timestamp.
3. Protect each backend route with scoped authorization so only the owner or invitees can view/edit the upload, and ensure expired links reject access with clear responses.
4. Surface the audit trail for every asset in the UI, showing upload, tag edits, and share link creation along with the responsible user and time.
5. Include backend validation that sanitizes file names, enforces size limits, and rejects invalid tags to avoid downstream injection threats.

Stretch goals:

- Implement file hashing so the backend can detect duplicate uploads before storing them while still honoring unique tags.
- Let users revoke share links early and immediately block previously issued URLs.
- Add a lightweight websocket channel that notifies viewers when a new tag or comment appears on an asset.',
     N'- All API endpoints enforce authentication and return 4xx/2xx codes that reflect authorization and validation outcomes.
- Uploaded images plus metadata persist with timestamped audit entries showing the acting user in the database.
- Share links honor expiry and revocation checks before allowing downloads, and the UI clearly marks expired links.
- Frontend surfaces the audit trail in a table or list with user, action, and timestamp for every edit.
- File uploads reject entries exceeding size limits or containing invalid tags, with helpful error feedback surfaced to the user.', N'GitHub repo with README explaining your stack choices, secure upload flow, and instructions to run the app locally.
Include configuration for secrets (e.g., .env.example) and at least one automated test that covers a security check.',
     3, N'Security', N'FullStack', N'TypeScript',
     12, N'["Secure REST API with FastAPI + JWT"]',
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "security", "weight": 0.4}]', N'{"correctness": 0.5, "security": 0.3}',
     N'This task blends frontend and backend work to reinforce correct auth flows and secure handling of uploads/link sharing in a full-stack setting.', N'generate_tasks_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a secure full-stack photo sharing board with audit trails", "description": "Capture the workflows that a small creative team needs when they share reference photos, annotate them, and prove who touched each asset â€” all through a secure, data-integrity-focused web tool.\n\n1. Provide an authenticated React+TS dashboard where users can upload images, assign short descriptive tags, and create a secure share link that expires after a configured time window.\n2. Persist each upload plus tag metadata and share link information in a hardened backend that records who performed each action and at what timestamp.\n3. Protect each backend route with scoped authorization so only the owner or invitees can view/edit the upload, and ensure expired links reject access with clear responses.\n4. Surface the audit trail for every asset in the UI, showing upload, tag edits, and share link creation along with the responsible user and time.\n5. Include backend validation that sanitizes file names, enforces size limits, and rejects invalid tags to avoid downstream injection threats.\n\nStretch goals:\n\n- Implement file hashing so the backend can detect duplicate uploads before storing them while still honoring unique tags.\n- Let users revoke share links early and immediately block previously issued URLs.\n- Add a lightweight websocket channel that notifies viewers when a new tag or comment appears on an asset.", "acceptanceCriteria": "- All API endpoints enforce authentication and return 4xx/2xx codes that reflect authorization and validation outcomes.\n- Uploaded images plus metadata persist with timestamped audit entries showing the acting user in the database.\n- Share links honor expiry and revocation checks before allowing downloads, and the UI clearly marks expired links.\n- Frontend surfaces the audit trail in a table or list with user, action, and timestamp for every edit.\n- File uploads reject entries exceeding size limits or containing invalid tags, with helpful error feedback surfaced to the user.", "deliverables": "GitHub repo with README explaining your stack choices, secure upload flow, and instructions to run the app locally.\nInclude configuration for secrets (e.g., .env.example) and at least one automated test that covers a security check.", "difficulty": 3, "category": "Security", "track": "FullStack", "expectedLanguage": "TypeScript", "estimatedHours": 12, "prerequisites": ["Secure REST API with FastAPI + JWT"], "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "security", "weight": 0.4}], "learningGain": {"correctness": 0.5, "security": 0.3}, "rationale": "This task blends frontend and backend work to reinforce correct auth flows and secure handling of uploads/link sharing in a full-stack setting."}',
     'df23942a-fc89-4406-8836-d0ece05704ea');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('75649cb4-ce3f-460d-a40f-ba57e2f7385a', N'Ship an analytics-aware product listing grid with edge-cache hints', N'Your team wants to surface fast product listings while also keeping an eye on the data that drives cache decisions. Build a full-stack result grid that streams catalog data, tracks how often each tile is requested, and exposes the metrics that help tune caching layers.

- Requirements:
  - Render a responsive grid of product cards fetched from a REST endpoint, including imagery, price, and availability stamps.
  - Instrument the client so each card click increments a counter tied to that product and persists via the API.
  - Create an endpoint that returns the top N products by click velocity and total views without scanning every record on demand.
  - Tie an HTTP header or query option into the product list route that guides CDN/edge layers with an expected freshness policy based on the trending counters.
  - Store analytics (view + click counts) alongside the core product data while ensuring counts stay performant under frequent updates.

- Stretch goals:
  - Visualize the trending score on each card and allow users to sort the grid by it.
  - Cache the products response server-side and invalidate it when a productâ€™s trending rank changes by a configurable threshold.
  - Surface a lightweight admin dashboard that lets reviewers reset counters or mark products as "hot" so that analytics honor manual boosts.',
     N'- Product grid loads within 200ms for the first viewport and shows up-to-date stock/price info.
- Every card click issues a call that increments the backend counter and commits the delta to the datastore.
- Trending endpoint returns the top N items in under 300ms regardless of catalog size.
- Listing endpoint honors the freshness policy header/query parameter in its caching metadata.
- README explains how analytics storage stays performant and how cache hints are generated.', N'- GitHub repo with README, API docs, and automated tests covering analytics counters.',
     3, N'Databases', N'FullStack', N'TypeScript',
     10, N'["Book Catalog: Search + Pagination"]',
     '11111111-1111-1111-1111-111111111111', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "performance", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"performance": 0.6, "design": 0.4}', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('36893ede-d90a-45a4-b6c9-2f0c26da4dbd', '5631369e-444b-4535-b99e-930b37ef83b5', 3, N'Approved',
     N'Ship an analytics-aware product listing grid with edge-cache hints', N'Your team wants to surface fast product listings while also keeping an eye on the data that drives cache decisions. Build a full-stack result grid that streams catalog data, tracks how often each tile is requested, and exposes the metrics that help tune caching layers.

- Requirements:
  - Render a responsive grid of product cards fetched from a REST endpoint, including imagery, price, and availability stamps.
  - Instrument the client so each card click increments a counter tied to that product and persists via the API.
  - Create an endpoint that returns the top N products by click velocity and total views without scanning every record on demand.
  - Tie an HTTP header or query option into the product list route that guides CDN/edge layers with an expected freshness policy based on the trending counters.
  - Store analytics (view + click counts) alongside the core product data while ensuring counts stay performant under frequent updates.

- Stretch goals:
  - Visualize the trending score on each card and allow users to sort the grid by it.
  - Cache the products response server-side and invalidate it when a productâ€™s trending rank changes by a configurable threshold.
  - Surface a lightweight admin dashboard that lets reviewers reset counters or mark products as "hot" so that analytics honor manual boosts.',
     N'- Product grid loads within 200ms for the first viewport and shows up-to-date stock/price info.
- Every card click issues a call that increments the backend counter and commits the delta to the datastore.
- Trending endpoint returns the top N items in under 300ms regardless of catalog size.
- Listing endpoint honors the freshness policy header/query parameter in its caching metadata.
- README explains how analytics storage stays performant and how cache hints are generated.', N'- GitHub repo with README, API docs, and automated tests covering analytics counters.',
     3, N'Databases', N'FullStack', N'TypeScript',
     10, N'["Book Catalog: Search + Pagination"]',
     N'[{"skill": "performance", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"performance": 0.6, "design": 0.4}',
     N'This task pushes a mid-level full-stack engineer to balance cache-friendly analytics with thoughtful API/UX design, aligning tightly with the requested performance and design focus.', N'generate_tasks_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"title": "Ship an analytics-aware product listing grid with edge-cache hints", "description": "Your team wants to surface fast product listings while also keeping an eye on the data that drives cache decisions. Build a full-stack result grid that streams catalog data, tracks how often each tile is requested, and exposes the metrics that help tune caching layers.\n\n- Requirements:\n  - Render a responsive grid of product cards fetched from a REST endpoint, including imagery, price, and availability stamps.\n  - Instrument the client so each card click increments a counter tied to that product and persists via the API.\n  - Create an endpoint that returns the top N products by click velocity and total views without scanning every record on demand.\n  - Tie an HTTP header or query option into the product list route that guides CDN/edge layers with an expected freshness policy based on the trending counters.\n  - Store analytics (view + click counts) alongside the core product data while ensuring counts stay performant under frequent updates.\n\n- Stretch goals:\n  - Visualize the trending score on each card and allow users to sort the grid by it.\n  - Cache the products response server-side and invalidate it when a productâ€™s trending rank changes by a configurable threshold.\n  - Surface a lightweight admin dashboard that lets reviewers reset counters or mark products as \"hot\" so that analytics honor manual boosts.", "acceptanceCriteria": "- Product grid loads within 200ms for the first viewport and shows up-to-date stock/price info.\n- Every card click issues a call that increments the backend counter and commits the delta to the datastore.\n- Trending endpoint returns the top N items in under 300ms regardless of catalog size.\n- Listing endpoint honors the freshness policy header/query parameter in its caching metadata.\n- README explains how analytics storage stays performant and how cache hints are generated.", "deliverables": "- GitHub repo with README, API docs, and automated tests covering analytics counters.", "difficulty": 3, "category": "Databases", "track": "FullStack", "expectedLanguage": "TypeScript", "estimatedHours": 10, "prerequisites": ["Book Catalog: Search + Pagination"], "skillTags": [{"skill": "performance", "weight": 0.6}, {"skill": "design", "weight": 0.4}], "learningGain": {"performance": 0.6, "design": 0.4}, "rationale": "This task pushes a mid-level full-stack engineer to balance cache-friendly analytics with thoughtful API/UX design, aligning tightly with the requested performance and design focus."}',
     '75649cb4-ce3f-460d-a40f-ba57e2f7385a');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('0bdb96f1-059e-47bc-a5e5-9d7e8947e878', N'Ship an aggregate event query service with pagination and metrics', N'Support a neighborhood event feed by building a backend service that reads from a persistent store, enforces sensible pagination, and surfaces key counts for the UI. The service should treat the event catalog as a single source of truth while providing predictable responses when consumers request different slices of the timeline.

- Functional requirements:
  - Expose an API that returns a page of events ordered by start time with configurable page size and cursor tokens.
  - Provide per-request metadata that includes the total matching events and the percentage of events flagged as "recommended" within the current page.
  - Persist incoming events to a simple SQL table and allow replaying the pagination query against current data without in-memory caching.
  - Validate client input so page sizes stay within reasonable bounds and reject requests with stale cursors.

- Stretch goals:
  - Add an endpoint to estimate how many events occur within the next 24 hours by scanning indexed timestamp ranges.
  - Return a lightweight summary of tag counts (e.g., number of music vs. sports events) for the current result set.
  - Log slow pagination queries and expose an endpoint that reports the slowest request in the last hour, without storing full request bodies.
',
     N'- API returns paginated responses with consistent metadata for valid requests.
- SQL schema and migrations persist events so repeated queries return identical rows.
- Inputs outside allowed bounds (page size, cursor) produce 4xx responses with descriptive errors.
- Total count and recommended percentage reflect the current page and underlying data.
- README documents how to run migrations, invoke the API, and interpret the metadata fields.', N'GitHub URL with service code, migration scripts, and README describing running instructions plus at least three integration tests.',
     2, N'Databases', N'Backend', N'Python',
     6, N'[]',
     '11111111-1111-1111-1111-111111111111', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"correctness": 0.5, "design": 0.3}', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('f580927c-1c48-4c15-baee-3838fc3613a5', '5631369e-444b-4535-b99e-930b37ef83b5', 4, N'Approved',
     N'Ship an aggregate event query service with pagination and metrics', N'Support a neighborhood event feed by building a backend service that reads from a persistent store, enforces sensible pagination, and surfaces key counts for the UI. The service should treat the event catalog as a single source of truth while providing predictable responses when consumers request different slices of the timeline.

- Functional requirements:
  - Expose an API that returns a page of events ordered by start time with configurable page size and cursor tokens.
  - Provide per-request metadata that includes the total matching events and the percentage of events flagged as "recommended" within the current page.
  - Persist incoming events to a simple SQL table and allow replaying the pagination query against current data without in-memory caching.
  - Validate client input so page sizes stay within reasonable bounds and reject requests with stale cursors.

- Stretch goals:
  - Add an endpoint to estimate how many events occur within the next 24 hours by scanning indexed timestamp ranges.
  - Return a lightweight summary of tag counts (e.g., number of music vs. sports events) for the current result set.
  - Log slow pagination queries and expose an endpoint that reports the slowest request in the last hour, without storing full request bodies.
',
     N'- API returns paginated responses with consistent metadata for valid requests.
- SQL schema and migrations persist events so repeated queries return identical rows.
- Inputs outside allowed bounds (page size, cursor) produce 4xx responses with descriptive errors.
- Total count and recommended percentage reflect the current page and underlying data.
- README documents how to run migrations, invoke the API, and interpret the metadata fields.', N'GitHub URL with service code, migration scripts, and README describing running instructions plus at least three integration tests.',
     2, N'Databases', N'Backend', N'Python',
     6, N'[]',
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"correctness": 0.5, "design": 0.3}',
     N'Building a paginated query service with metrics reinforces correctness and design thinking at the medium backend level requested.', N'generate_tasks_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"title": "Ship an aggregate event query service with pagination and metrics", "description": "Support a neighborhood event feed by building a backend service that reads from a persistent store, enforces sensible pagination, and surfaces key counts for the UI. The service should treat the event catalog as a single source of truth while providing predictable responses when consumers request different slices of the timeline.\n\n- Functional requirements:\n  - Expose an API that returns a page of events ordered by start time with configurable page size and cursor tokens.\n  - Provide per-request metadata that includes the total matching events and the percentage of events flagged as \"recommended\" within the current page.\n  - Persist incoming events to a simple SQL table and allow replaying the pagination query against current data without in-memory caching.\n  - Validate client input so page sizes stay within reasonable bounds and reject requests with stale cursors.\n\n- Stretch goals:\n  - Add an endpoint to estimate how many events occur within the next 24 hours by scanning indexed timestamp ranges.\n  - Return a lightweight summary of tag counts (e.g., number of music vs. sports events) for the current result set.\n  - Log slow pagination queries and expose an endpoint that reports the slowest request in the last hour, without storing full request bodies.\n", "acceptanceCriteria": "- API returns paginated responses with consistent metadata for valid requests.\n- SQL schema and migrations persist events so repeated queries return identical rows.\n- Inputs outside allowed bounds (page size, cursor) produce 4xx responses with descriptive errors.\n- Total count and recommended percentage reflect the current page and underlying data.\n- README documents how to run migrations, invoke the API, and interpret the metadata fields.", "deliverables": "GitHub URL with service code, migration scripts, and README describing running instructions plus at least three integration tests.", "difficulty": 2, "category": "Databases", "track": "Backend", "expectedLanguage": "Python", "estimatedHours": 6, "prerequisites": [], "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}], "learningGain": {"correctness": 0.5, "design": 0.3}, "rationale": "Building a paginated query service with metrics reinforces correctness and design thinking at the medium backend level requested."}',
     '0bdb96f1-059e-47bc-a5e5-9d7e8947e878');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('efcae4c0-34e3-42ec-9867-4f7dde76713b', N'Build a secrets-safe webhook receiver with HMAC validation', N'Many services need to accept webhooks but still maintain confidence that incoming events are genuine and one-time. Build a backend microservice that receives JSON payloads, verifies a shared-secret signature, and stores the cleanest copy of each event while keeping replay and tampering risks at bay.

- Receive POST requests on a single endpoint, ensure the payload matches an HMAC signature header computed with a shared secret, and log any mismatches.
- Persist each verified event to a datastore/table with a deduplication key so retries do not create duplicate records and maintain a timestamp.
- Reject requests that reuse a nonce or timestamp outside a configurable window to block replay attacks, plus return informative error payloads.
- Record audit metadata (IP, signature header, verification outcome) alongside each stored event for later review.
- Provide a health-check endpoint that reports the freshness of the shared-secret configuration and datastore connectivity.

Stretch goals:
- Allow rotating the shared secret without downtime and support verifying events signed with the previous secret for a grace period.
- Emit metrics (counters or simple JSON stats) for accepted vs rejected events plus verification latency.
- Add an automated regression test that simulates a signed payload and a replay to prove the guards work.
- Expose a lightweight API to query stored events with pagination and optional filtering by status.',
     N'* All incoming payloads require a valid HMAC signature; invalid signatures are rejected with 400-series responses and logged.
* Replay attempts (duplicate nonce/timestamp) do not create new records and return a descriptive error.
* Verified events are persisted with audit metadata, unique key, and timestamp.
* Health-check endpoint reports both secret validity and datastore reachability.
* README documents the security guarantees, configuration options, and how to run the service locally.', N'GitHub URL with source, README, and automated verification tests demonstrating signature and replay defenses.',
     2, N'Security', N'Backend', N'Python',
     6, N'["Secure REST API with FastAPI + JWT"]',
     '11111111-1111-1111-1111-111111111111', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "security", "weight": 0.4}]', N'{"correctness": 0.5, "security": 0.3}', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('72da8405-de0e-4f78-82e9-982871fba3c6', '5631369e-444b-4535-b99e-930b37ef83b5', 5, N'Approved',
     N'Build a secrets-safe webhook receiver with HMAC validation', N'Many services need to accept webhooks but still maintain confidence that incoming events are genuine and one-time. Build a backend microservice that receives JSON payloads, verifies a shared-secret signature, and stores the cleanest copy of each event while keeping replay and tampering risks at bay.

- Receive POST requests on a single endpoint, ensure the payload matches an HMAC signature header computed with a shared secret, and log any mismatches.
- Persist each verified event to a datastore/table with a deduplication key so retries do not create duplicate records and maintain a timestamp.
- Reject requests that reuse a nonce or timestamp outside a configurable window to block replay attacks, plus return informative error payloads.
- Record audit metadata (IP, signature header, verification outcome) alongside each stored event for later review.
- Provide a health-check endpoint that reports the freshness of the shared-secret configuration and datastore connectivity.

Stretch goals:
- Allow rotating the shared secret without downtime and support verifying events signed with the previous secret for a grace period.
- Emit metrics (counters or simple JSON stats) for accepted vs rejected events plus verification latency.
- Add an automated regression test that simulates a signed payload and a replay to prove the guards work.
- Expose a lightweight API to query stored events with pagination and optional filtering by status.',
     N'* All incoming payloads require a valid HMAC signature; invalid signatures are rejected with 400-series responses and logged.
* Replay attempts (duplicate nonce/timestamp) do not create new records and return a descriptive error.
* Verified events are persisted with audit metadata, unique key, and timestamp.
* Health-check endpoint reports both secret validity and datastore reachability.
* README documents the security guarantees, configuration options, and how to run the service locally.', N'GitHub URL with source, README, and automated verification tests demonstrating signature and replay defenses.',
     2, N'Security', N'Backend', N'Python',
     6, N'["Secure REST API with FastAPI + JWT"]',
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "security", "weight": 0.4}]', N'{"correctness": 0.5, "security": 0.3}',
     N'This project lets backend-focused learners practice verifying HMAC-signed payloads and replay protections while keeping correctness requirements clear.', N'generate_tasks_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a secrets-safe webhook receiver with HMAC validation", "description": "Many services need to accept webhooks but still maintain confidence that incoming events are genuine and one-time. Build a backend microservice that receives JSON payloads, verifies a shared-secret signature, and stores the cleanest copy of each event while keeping replay and tampering risks at bay.\n\n- Receive POST requests on a single endpoint, ensure the payload matches an HMAC signature header computed with a shared secret, and log any mismatches.\n- Persist each verified event to a datastore/table with a deduplication key so retries do not create duplicate records and maintain a timestamp.\n- Reject requests that reuse a nonce or timestamp outside a configurable window to block replay attacks, plus return informative error payloads.\n- Record audit metadata (IP, signature header, verification outcome) alongside each stored event for later review.\n- Provide a health-check endpoint that reports the freshness of the shared-secret configuration and datastore connectivity.\n\nStretch goals:\n- Allow rotating the shared secret without downtime and support verifying events signed with the previous secret for a grace period.\n- Emit metrics (counters or simple JSON stats) for accepted vs rejected events plus verification latency.\n- Add an automated regression test that simulates a signed payload and a replay to prove the guards work.\n- Expose a lightweight API to query stored events with pagination and optional filtering by status.", "acceptanceCriteria": "* All incoming payloads require a valid HMAC signature; invalid signatures are rejected with 400-series responses and logged.\n* Replay attempts (duplicate nonce/timestamp) do not create new records and return a descriptive error.\n* Verified events are persisted with audit metadata, unique key, and timestamp.\n* Health-check endpoint reports both secret validity and datastore reachability.\n* README documents the security guarantees, configuration options, and how to run the service locally.", "deliverables": "GitHub URL with source, README, and automated verification tests demonstrating signature and replay defenses.", "difficulty": 2, "category": "Security", "track": "Backend", "expectedLanguage": "Python", "estimatedHours": 6, "prerequisites": ["Secure REST API with FastAPI + JWT"], "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "security", "weight": 0.4}], "learningGain": {"correctness": 0.5, "security": 0.3}, "rationale": "This project lets backend-focused learners practice verifying HMAC-signed payloads and replay protections while keeping correctness requirements clear."}',
     'efcae4c0-34e3-42ec-9867-4f7dde76713b');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('2c16efc4-c475-4cb8-a9c9-51ce7f4a2cf5', N'Build a bounded ingestion queue with async deduplication', N'Teams ingest tens of thousands of change events per minute, and a thin backend needs to persist only the latest non-duplicate updates while keeping a tight memory budget. Model a bounded in-memory queue that accepts events from multiple producers, deduplicates based on a key, and flushes summaries to a datastore in configurable batches.

Functional requirements
- Accept event objects (id, payload, timestamp) via a single async API and coalesce duplicates per rolling key window.
- Maintain a fixed maximum number of stored keys; evict the oldest or least-recently-used entry when capacity is reached.
- Provide a background flush process that batches the current queue state every N seconds and pushes summaries to a mock persistence layer in order of their last update.
- Expose visibility APIs for current queue size and the timestamp of the most recent flush.

Stretch goals
- Track per-key latency metrics for how long events sit before flushing and expose percentiles.
- Allow configuration of soft-cap thresholds that trigger early flushes under high-pressure scenarios.
- Add optimistic locking around the flush so concurrent pushes donâ€™t duplicate a batch.',
     N'- Queue accepts asynchronous event objects without blocking producers and returns success responses for valid payloads.
- Deduplication removes events with the same key if a newer timestamp arrives before the next flush.
- When capacity is reached, the eviction policy removes the least-recently-updated key and admits the new event.
- The background flusher runs at the configured interval, batches pending summaries, and records successful persistence calls.
- Monitoring endpoints report current queue length and last flush timestamp accurately after operations.', N'GitHub URL with README explaining the async queue design, configuration knobs, and instructions to run.',
     3, N'Algorithms', N'Backend', N'Python',
     10, N'["Priority Queue via Binary Heap"]',
     '11111111-1111-1111-1111-111111111111', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "performance", "weight": 0.4}]', N'{"correctness": 0.6, "performance": 0.35}', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('77873e0e-55a4-4a09-a2ff-69c3ef8e15c9', '5631369e-444b-4535-b99e-930b37ef83b5', 6, N'Approved',
     N'Build a bounded ingestion queue with async deduplication', N'Teams ingest tens of thousands of change events per minute, and a thin backend needs to persist only the latest non-duplicate updates while keeping a tight memory budget. Model a bounded in-memory queue that accepts events from multiple producers, deduplicates based on a key, and flushes summaries to a datastore in configurable batches.

Functional requirements
- Accept event objects (id, payload, timestamp) via a single async API and coalesce duplicates per rolling key window.
- Maintain a fixed maximum number of stored keys; evict the oldest or least-recently-used entry when capacity is reached.
- Provide a background flush process that batches the current queue state every N seconds and pushes summaries to a mock persistence layer in order of their last update.
- Expose visibility APIs for current queue size and the timestamp of the most recent flush.

Stretch goals
- Track per-key latency metrics for how long events sit before flushing and expose percentiles.
- Allow configuration of soft-cap thresholds that trigger early flushes under high-pressure scenarios.
- Add optimistic locking around the flush so concurrent pushes donâ€™t duplicate a batch.',
     N'- Queue accepts asynchronous event objects without blocking producers and returns success responses for valid payloads.
- Deduplication removes events with the same key if a newer timestamp arrives before the next flush.
- When capacity is reached, the eviction policy removes the least-recently-updated key and admits the new event.
- The background flusher runs at the configured interval, batches pending summaries, and records successful persistence calls.
- Monitoring endpoints report current queue length and last flush timestamp accurately after operations.', N'GitHub URL with README explaining the async queue design, configuration knobs, and instructions to run.',
     3, N'Algorithms', N'Backend', N'Python',
     10, N'["Priority Queue via Binary Heap"]',
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "performance", "weight": 0.4}]', N'{"correctness": 0.6, "performance": 0.35}',
     N'This backend-focused task pushes a junior-to-mid dev to balance correctness with throughput by building a deduplicating ingestion queue with eviction and batching constraints.', N'generate_tasks_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a bounded ingestion queue with async deduplication", "description": "Teams ingest tens of thousands of change events per minute, and a thin backend needs to persist only the latest non-duplicate updates while keeping a tight memory budget. Model a bounded in-memory queue that accepts events from multiple producers, deduplicates based on a key, and flushes summaries to a datastore in configurable batches.\n\nFunctional requirements\n- Accept event objects (id, payload, timestamp) via a single async API and coalesce duplicates per rolling key window.\n- Maintain a fixed maximum number of stored keys; evict the oldest or least-recently-used entry when capacity is reached.\n- Provide a background flush process that batches the current queue state every N seconds and pushes summaries to a mock persistence layer in order of their last update.\n- Expose visibility APIs for current queue size and the timestamp of the most recent flush.\n\nStretch goals\n- Track per-key latency metrics for how long events sit before flushing and expose percentiles.\n- Allow configuration of soft-cap thresholds that trigger early flushes under high-pressure scenarios.\n- Add optimistic locking around the flush so concurrent pushes donâ€™t duplicate a batch.", "acceptanceCriteria": "- Queue accepts asynchronous event objects without blocking producers and returns success responses for valid payloads.\n- Deduplication removes events with the same key if a newer timestamp arrives before the next flush.\n- When capacity is reached, the eviction policy removes the least-recently-updated key and admits the new event.\n- The background flusher runs at the configured interval, batches pending summaries, and records successful persistence calls.\n- Monitoring endpoints report current queue length and last flush timestamp accurately after operations.", "deliverables": "GitHub URL with README explaining the async queue design, configuration knobs, and instructions to run.", "difficulty": 3, "category": "Algorithms", "track": "Backend", "expectedLanguage": "Python", "estimatedHours": 10, "prerequisites": ["Priority Queue via Binary Heap"], "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "performance", "weight": 0.4}], "learningGain": {"correctness": 0.6, "performance": 0.35}, "rationale": "This backend-focused task pushes a junior-to-mid dev to balance correctness with throughput by building a deduplicating ingestion queue with eviction and batching constraints."}',
     '2c16efc4-c475-4cb8-a9c9-51ce7f4a2cf5');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('74229a28-8256-4c16-bc34-73f314fd091c', N'Build a transaction reconciler CLI with fuzzy matching', N'You are supporting a small business owner who receives bank statements, CSV exports from their payment processor, and manual cash entries. The goal is a Python CLI tool that quickly reconciles these records to highlight missing or duplicate transactions before month-end reporting. 

Functional requirements:
1. Accept multiple CSV inputs (bank, processor, manual) and normalize their columns so they can be compared reliably.
2. Match transactions across sources by amount and date, flagging exact matches, potential duplicates, and items only present in one feed.
3. Provide interactive prompts or summary output so the user can mark matches as confirmed or add notes before finalizing.
4. Export a reconciliation report that lists matched pairs, unresolved items, and user annotations.
5. Maintain a simple configuration file for common column mappings and tolerance thresholds.

Stretch goals:
1. Implement fuzzy string matching on payee descriptions to surface likely matches that donâ€™t align exactly.
2. Offer a dry-run mode that prints the reconciliation steps without persisting changes.
3. Support saving reconciliation presets per client to speed up future runs.',
     N'- CLI accepts at least three CSV files and normalizes their entries for comparison.
- Matching logic identifies exact matches, duplicates, and unmatched transactions with confidence scores or flags.
- Users can review matches via prompts or summary output and mark them as confirmed.
- Exported report clearly separates confirmed matches, unresolved entries, and user notes.
- Configuration file controls column aliases and matching tolerances without code changes.', N'GitHub repo with source, README describing CLI usage + sample CSVs, and reconciliation report output.',
     2, N'Algorithms', N'Python', N'Python',
     6, N'["FizzBuzz + Pytest Intro"]',
     '11111111-1111-1111-1111-111111111111', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"correctness": 0.4, "design": 0.2}', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('1384adea-6ca7-4ad5-b94d-b5112b082c69', '5631369e-444b-4535-b99e-930b37ef83b5', 7, N'Approved',
     N'Build a transaction reconciler CLI with fuzzy matching', N'You are supporting a small business owner who receives bank statements, CSV exports from their payment processor, and manual cash entries. The goal is a Python CLI tool that quickly reconciles these records to highlight missing or duplicate transactions before month-end reporting. 

Functional requirements:
1. Accept multiple CSV inputs (bank, processor, manual) and normalize their columns so they can be compared reliably.
2. Match transactions across sources by amount and date, flagging exact matches, potential duplicates, and items only present in one feed.
3. Provide interactive prompts or summary output so the user can mark matches as confirmed or add notes before finalizing.
4. Export a reconciliation report that lists matched pairs, unresolved items, and user annotations.
5. Maintain a simple configuration file for common column mappings and tolerance thresholds.

Stretch goals:
1. Implement fuzzy string matching on payee descriptions to surface likely matches that donâ€™t align exactly.
2. Offer a dry-run mode that prints the reconciliation steps without persisting changes.
3. Support saving reconciliation presets per client to speed up future runs.',
     N'- CLI accepts at least three CSV files and normalizes their entries for comparison.
- Matching logic identifies exact matches, duplicates, and unmatched transactions with confidence scores or flags.
- Users can review matches via prompts or summary output and mark them as confirmed.
- Exported report clearly separates confirmed matches, unresolved entries, and user notes.
- Configuration file controls column aliases and matching tolerances without code changes.', N'GitHub repo with source, README describing CLI usage + sample CSVs, and reconciliation report output.',
     2, N'Algorithms', N'Python', N'Python',
     6, N'["FizzBuzz + Pytest Intro"]',
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"correctness": 0.4, "design": 0.2}',
     N'Reconciling CSV feeds exercises correctness through matching logic and design by structuring reusable normalization and reporting layers.', N'generate_tasks_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a transaction reconciler CLI with fuzzy matching", "description": "You are supporting a small business owner who receives bank statements, CSV exports from their payment processor, and manual cash entries. The goal is a Python CLI tool that quickly reconciles these records to highlight missing or duplicate transactions before month-end reporting. \n\nFunctional requirements:\n1. Accept multiple CSV inputs (bank, processor, manual) and normalize their columns so they can be compared reliably.\n2. Match transactions across sources by amount and date, flagging exact matches, potential duplicates, and items only present in one feed.\n3. Provide interactive prompts or summary output so the user can mark matches as confirmed or add notes before finalizing.\n4. Export a reconciliation report that lists matched pairs, unresolved items, and user annotations.\n5. Maintain a simple configuration file for common column mappings and tolerance thresholds.\n\nStretch goals:\n1. Implement fuzzy string matching on payee descriptions to surface likely matches that donâ€™t align exactly.\n2. Offer a dry-run mode that prints the reconciliation steps without persisting changes.\n3. Support saving reconciliation presets per client to speed up future runs.", "acceptanceCriteria": "- CLI accepts at least three CSV files and normalizes their entries for comparison.\n- Matching logic identifies exact matches, duplicates, and unmatched transactions with confidence scores or flags.\n- Users can review matches via prompts or summary output and mark them as confirmed.\n- Exported report clearly separates confirmed matches, unresolved entries, and user notes.\n- Configuration file controls column aliases and matching tolerances without code changes.", "deliverables": "GitHub repo with source, README describing CLI usage + sample CSVs, and reconciliation report output.", "difficulty": 2, "category": "Algorithms", "track": "Python", "expectedLanguage": "Python", "estimatedHours": 6, "prerequisites": ["FizzBuzz + Pytest Intro"], "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}], "learningGain": {"correctness": 0.4, "design": 0.2}, "rationale": "Reconciling CSV feeds exercises correctness through matching logic and design by structuring reusable normalization and reporting layers."}',
     '74229a28-8256-4c16-bc34-73f314fd091c');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('d57aba33-b34e-4d1a-97dd-9437c087e7d8', N'Build a dynamic fare-matching CLI for rideshare promos', N'You are shipping a small pricing helper that matches incoming ride requests against a pool of promotional fare bands to maximize rider savings while keeping the system deterministic. The tool processes batches of ride requests, compares each against tiered promos, and reports optimal assignments plus fallback prices.

Functional requirements:
- Accept a JSON array of ride requests (origin, destination, distance, time window) via stdin or a file argument.
- Normalize each request into a scoring model that factors in distance, demand multiplier, and promo eligibility rules.
- Choose the promo tier that yields the lowest net fare while respecting capacity limits per tier.
- Output the matched promo, final fare, and reason for fallback if no promo applies, in JSON.
- Log summary statistics (requests processed, matches per tier) to stderr.

Stretch goals:
- Support a dry-run mode that simulates matches without consuming tier capacity.
- Allow custom promo definitions loaded from YAML that describe eligibility predicates and caps.
- Emit detailed debug traces for a single request via a `--trace` flag.',
     N'- The CLI handles valid JSON input and exits with 0 when matches complete.
- Each output entry includes promo name (or "base"), fare, and fallback reason when needed.
- Summary statistics appear on stderr after batch completion.
- Invalid inputs and capacity violations raise descriptive errors and exit with non-zero.
- README explains how to run the tool, config promos, and interpret outputs.', N'GitHub URL with README + unit tests covering promo selection logic.',
     2, N'Algorithms', N'Python', N'Python',
     6, N'["FizzBuzz + Pytest Intro"]',
     '11111111-1111-1111-1111-111111111111', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"correctness": 0.4, "design": 0.2}', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('139c7486-3ee6-4f46-9443-d6774e0b5cd3', '5631369e-444b-4535-b99e-930b37ef83b5', 8, N'Approved',
     N'Build a dynamic fare-matching CLI for rideshare promos', N'You are shipping a small pricing helper that matches incoming ride requests against a pool of promotional fare bands to maximize rider savings while keeping the system deterministic. The tool processes batches of ride requests, compares each against tiered promos, and reports optimal assignments plus fallback prices.

Functional requirements:
- Accept a JSON array of ride requests (origin, destination, distance, time window) via stdin or a file argument.
- Normalize each request into a scoring model that factors in distance, demand multiplier, and promo eligibility rules.
- Choose the promo tier that yields the lowest net fare while respecting capacity limits per tier.
- Output the matched promo, final fare, and reason for fallback if no promo applies, in JSON.
- Log summary statistics (requests processed, matches per tier) to stderr.

Stretch goals:
- Support a dry-run mode that simulates matches without consuming tier capacity.
- Allow custom promo definitions loaded from YAML that describe eligibility predicates and caps.
- Emit detailed debug traces for a single request via a `--trace` flag.',
     N'- The CLI handles valid JSON input and exits with 0 when matches complete.
- Each output entry includes promo name (or "base"), fare, and fallback reason when needed.
- Summary statistics appear on stderr after batch completion.
- Invalid inputs and capacity violations raise descriptive errors and exit with non-zero.
- README explains how to run the tool, config promos, and interpret outputs.', N'GitHub URL with README + unit tests covering promo selection logic.',
     2, N'Algorithms', N'Python', N'Python',
     6, N'["FizzBuzz + Pytest Intro"]',
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}]', N'{"correctness": 0.4, "design": 0.2}',
     N'This medium Python CLI task builds correctness by enforcing deterministic promo selection while rewarding thoughtful design around input/output surfaces.', N'generate_tasks_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a dynamic fare-matching CLI for rideshare promos", "description": "You are shipping a small pricing helper that matches incoming ride requests against a pool of promotional fare bands to maximize rider savings while keeping the system deterministic. The tool processes batches of ride requests, compares each against tiered promos, and reports optimal assignments plus fallback prices.\n\nFunctional requirements:\n- Accept a JSON array of ride requests (origin, destination, distance, time window) via stdin or a file argument.\n- Normalize each request into a scoring model that factors in distance, demand multiplier, and promo eligibility rules.\n- Choose the promo tier that yields the lowest net fare while respecting capacity limits per tier.\n- Output the matched promo, final fare, and reason for fallback if no promo applies, in JSON.\n- Log summary statistics (requests processed, matches per tier) to stderr.\n\nStretch goals:\n- Support a dry-run mode that simulates matches without consuming tier capacity.\n- Allow custom promo definitions loaded from YAML that describe eligibility predicates and caps.\n- Emit detailed debug traces for a single request via a `--trace` flag.", "acceptanceCriteria": "- The CLI handles valid JSON input and exits with 0 when matches complete.\n- Each output entry includes promo name (or \"base\"), fare, and fallback reason when needed.\n- Summary statistics appear on stderr after batch completion.\n- Invalid inputs and capacity violations raise descriptive errors and exit with non-zero.\n- README explains how to run the tool, config promos, and interpret outputs.", "deliverables": "GitHub URL with README + unit tests covering promo selection logic.", "difficulty": 2, "category": "Algorithms", "track": "Python", "expectedLanguage": "Python", "estimatedHours": 6, "prerequisites": ["FizzBuzz + Pytest Intro"], "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "design", "weight": 0.4}], "learningGain": {"correctness": 0.4, "design": 0.2}, "rationale": "This medium Python CLI task builds correctness by enforcing deterministic promo selection while rewarding thoughtful design around input/output surfaces."}',
     'd57aba33-b34e-4d1a-97dd-9437c087e7d8');

INSERT INTO Tasks
    (Id, Title, Description, AcceptanceCriteria, Deliverables, Difficulty, Category, Track,
     ExpectedLanguage, EstimatedHours, PrerequisitesJson, CreatedBy, IsActive, CreatedAt, UpdatedAt,
     SkillTagsJson, LearningGainJson, Source, ApprovedById, ApprovedAt, EmbeddingJson, PromptVersion)
VALUES
    ('f2232b16-b02f-449a-961d-ad73630b3768', N'Build a streaming CSV profile dashboard with adaptive sampling', N'Data teams often work with CSV exports that can spike to millions of rows; downloading the entire file defeats the purpose of a quick health check. Build a lightweight Python service that reads CSV files incrementally, keeps a rolling sketch of numeric distributions, and serves a small dashboard summarizing the sample so teams can decide whether the dataset needs a full pipeline.

- Ingest CSV data without loading it all into memory, tracking column statistics (counts, min/max/avg, percentiles) as you stream.
- Maintain an adaptive sample set per numeric column that prioritizes recent rows and preserves diversity across value ranges.
- Expose a small command-line dashboard (or simple TUI) that reports the current sample size, cardinality estimates, and top anomalies for each column.
- Allow the user to pause/resume ingestion so dashboards stabilize before reporting.
- Persist checkpoints so a restart resumes without reprocessing the entire input.

Stretch goals:
- Add a configuration layer that lets users define column groups and custom anomaly thresholds.
- Emit lightweight log events when distributions shift beyond a configurable delta.
- Provide a hook for downstream code to request the current sample batch for deeper inspection.',
     N'- Streamed ingestion never loads the entire CSV into RAM (use chunked reads and generators).
- Dashboard output updates within one second after each chunk and reports percentiles plus anomaly counts per column.
- Sample preservation respects recency while ensuring coverage across observed value ranges (show runtime stats proving it).
- Checkpoints allow a restart to continue from the last processed row without reprocessing earlier data.
- README explains trade-offs in sampling strategy and how to run the dashboard.', N'Repo with source, README covering setup/running instructions, and sample CSV used for tests.',
     3, N'Algorithms', N'Python', N'Python',
     10, N'[]',
     '11111111-1111-1111-1111-111111111111', 1, SYSUTCDATETIME(), SYSUTCDATETIME(),
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "performance", "weight": 0.4}]', N'{"correctness": 0.6, "performance": 0.4}', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL, N'generate_tasks_v1');

INSERT INTO TaskDrafts
    (Id, BatchId, PositionInBatch, Status, Title, Description, AcceptanceCriteria, Deliverables,
     Difficulty, Category, Track, ExpectedLanguage, EstimatedHours, PrerequisitesJson,
     SkillTagsJson, LearningGainJson, Rationale, PromptVersion, GeneratedAt, GeneratedById,
     DecidedById, DecidedAt, RejectionReason, OriginalDraftJson, ApprovedTaskId)
VALUES
    ('b8acb311-8896-43e9-a41a-5bac33e020a3', '5631369e-444b-4535-b99e-930b37ef83b5', 9, N'Approved',
     N'Build a streaming CSV profile dashboard with adaptive sampling', N'Data teams often work with CSV exports that can spike to millions of rows; downloading the entire file defeats the purpose of a quick health check. Build a lightweight Python service that reads CSV files incrementally, keeps a rolling sketch of numeric distributions, and serves a small dashboard summarizing the sample so teams can decide whether the dataset needs a full pipeline.

- Ingest CSV data without loading it all into memory, tracking column statistics (counts, min/max/avg, percentiles) as you stream.
- Maintain an adaptive sample set per numeric column that prioritizes recent rows and preserves diversity across value ranges.
- Expose a small command-line dashboard (or simple TUI) that reports the current sample size, cardinality estimates, and top anomalies for each column.
- Allow the user to pause/resume ingestion so dashboards stabilize before reporting.
- Persist checkpoints so a restart resumes without reprocessing the entire input.

Stretch goals:
- Add a configuration layer that lets users define column groups and custom anomaly thresholds.
- Emit lightweight log events when distributions shift beyond a configurable delta.
- Provide a hook for downstream code to request the current sample batch for deeper inspection.',
     N'- Streamed ingestion never loads the entire CSV into RAM (use chunked reads and generators).
- Dashboard output updates within one second after each chunk and reports percentiles plus anomaly counts per column.
- Sample preservation respects recency while ensuring coverage across observed value ranges (show runtime stats proving it).
- Checkpoints allow a restart to continue from the last processed row without reprocessing earlier data.
- README explains trade-offs in sampling strategy and how to run the dashboard.', N'Repo with source, README covering setup/running instructions, and sample CSV used for tests.',
     3, N'Algorithms', N'Python', N'Python',
     10, N'[]',
     N'[{"skill": "correctness", "weight": 0.6}, {"skill": "performance", "weight": 0.4}]', N'{"correctness": 0.6, "performance": 0.4}',
     N'This project pushes a Python developer to balance correctness guarantees around sampled statistics with real-time performance constraints in a streaming CSV context.', N'generate_tasks_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"title": "Build a streaming CSV profile dashboard with adaptive sampling", "description": "Data teams often work with CSV exports that can spike to millions of rows; downloading the entire file defeats the purpose of a quick health check. Build a lightweight Python service that reads CSV files incrementally, keeps a rolling sketch of numeric distributions, and serves a small dashboard summarizing the sample so teams can decide whether the dataset needs a full pipeline.\n\n- Ingest CSV data without loading it all into memory, tracking column statistics (counts, min/max/avg, percentiles) as you stream.\n- Maintain an adaptive sample set per numeric column that prioritizes recent rows and preserves diversity across value ranges.\n- Expose a small command-line dashboard (or simple TUI) that reports the current sample size, cardinality estimates, and top anomalies for each column.\n- Allow the user to pause/resume ingestion so dashboards stabilize before reporting.\n- Persist checkpoints so a restart resumes without reprocessing the entire input.\n\nStretch goals:\n- Add a configuration layer that lets users define column groups and custom anomaly thresholds.\n- Emit lightweight log events when distributions shift beyond a configurable delta.\n- Provide a hook for downstream code to request the current sample batch for deeper inspection.", "acceptanceCriteria": "- Streamed ingestion never loads the entire CSV into RAM (use chunked reads and generators).\n- Dashboard output updates within one second after each chunk and reports percentiles plus anomaly counts per column.\n- Sample preservation respects recency while ensuring coverage across observed value ranges (show runtime stats proving it).\n- Checkpoints allow a restart to continue from the last processed row without reprocessing earlier data.\n- README explains trade-offs in sampling strategy and how to run the dashboard.", "deliverables": "Repo with source, README covering setup/running instructions, and sample CSV used for tests.", "difficulty": 3, "category": "Algorithms", "track": "Python", "expectedLanguage": "Python", "estimatedHours": 10, "prerequisites": [], "skillTags": [{"skill": "correctness", "weight": 0.6}, {"skill": "performance", "weight": 0.4}], "learningGain": {"correctness": 0.6, "performance": 0.4}, "rationale": "This project pushes a Python developer to balance correctness guarantees around sampled statistics with real-time performance constraints in a streaming CSV context."}',
     'f2232b16-b02f-449a-961d-ad73630b3768');

COMMIT TRANSACTION;

-- Verification:
SELECT COUNT(*) AS ApprovedCount FROM TaskDrafts WHERE BatchId = '5631369e-444b-4535-b99e-930b37ef83b5' AND Status = 'Approved';
SELECT COUNT(*) AS RejectedCount FROM TaskDrafts WHERE BatchId = '5631369e-444b-4535-b99e-930b37ef83b5' AND Status = 'Rejected';
SELECT COUNT(*) AS TaskBankSize FROM Tasks WHERE IsActive = 1;