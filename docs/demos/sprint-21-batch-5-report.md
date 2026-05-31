# Sprint 21 -- content batch 5 (ADR-062, final extension)

- batchId: `6858132d-33d7-4125-ae2e-b340c7f962a3`
- generated: 2026-05-16T18:33:01Z
- total drafts: 60 / target 60
- approved: 60
- rejected: 0
- reject rate: 0.0%
- total tokens: 65124
- total retries: 0
- wall time: 256.3s

## Files emitted

- ``docs/demos/sprint-21-batch-5-drafts.json`` -- per-draft details
- ``tools/seed-sprint21-batch-5.sql`` -- SQL to apply against the dev DB

## Owner action (per ADR-062 §3 + S21-T10 commit gate)

1. Spot-check 5 random Approved drafts in the drafts JSON.
2. ``sqlcmd -S <server> -d CodeMentor -i tools/seed-sprint21-batch-5.sql``.
3. Verify bank count: ``SELECT COUNT(*) FROM Questions WHERE IsActive = 1``.
   Expected: 147 + 60 = 207.
4. (Optional) ``ai-service/.venv/Scripts/python ai-service/tools/backfill_question_embeddings.py`` to populate EmbeddingJson on the new rows.
