# Dogfood Samples — M1 Internal Demo

Five small, deliberately-flawed (or deliberately-clean) code projects used to
exercise the full submission → AI feedback pipeline end-to-end. Each folder
holds one project; ZIP it before submitting.

| Sample | Track       | Expected feedback signal                              |
|--------|-------------|--------------------------------------------------------|
| 1      | Python      | Security score lower than other categories (SQL injection in `users.py`) |
| 2      | Python      | High overallScore, ≤1 recommendation                   |
| 3      | JavaScript  | Security signal flagged (eval + missing zero-check)    |
| 4      | C#          | Correctness recommendation (NullReferenceException risk) |
| 5      | Python      | Trivial input — should still produce a valid response  |

## Quick ZIP commands (Bash on Windows)

```bash
cd docs/demos/dogfood-samples
for d in sample-*; do (cd "$d" && zip -r "../$d.zip" .); done
```

Then upload each `.zip` via the Code Mentor frontend on the matching task,
or via `curl` against `POST /api/uploads/request-url` → SAS upload →
`POST /api/submissions`.
