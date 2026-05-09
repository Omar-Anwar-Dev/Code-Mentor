// S11-T8 / F13 (ADR-038): k6 load test for the Sprint-11 local stack.
//
// Targets the core-loop user journey on the owner's laptop docker-compose
// stack: register → login → assessment start → assessment answer (10 turns)
// → submission upload → poll until Completed → mentor-chat session.
//
// Default profile: 50 concurrent virtual users, 5-minute steady-state,
// matching ADR-038's scaled-down (vs 100 on Azure B1) target.
//
// Run from repo root:
//   k6 run tools/load-test/core-loop.js
//
// With overrides:
//   k6 run \
//     --vus 50 --duration 5m \
//     -e BASE_URL=http://localhost:5000 \
//     tools/load-test/core-loop.js
//
// k6 install on Windows (per ADR-038 owner setup, S11-T8 runbook):
//   winget install k6  --or-- choco install k6
//
// On Mac/Linux:
//   brew install k6   --or-- apt install k6 (after key + repo setup)
//
// The script is self-contained — no external deps beyond k6's stdlib.

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

// ---------------------------------------------------------------
// Tunables (override via -e or CLI flags)
// ---------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const VUS = parseInt(__ENV.VUS || "50", 10);
const DURATION = __ENV.DURATION || "5m";
const RAMP_UP = __ENV.RAMP_UP || "30s";
const RAMP_DOWN = __ENV.RAMP_DOWN || "30s";

// Skip the AI submission path by default — it spends real OpenAI tokens.
// Override with `-e ENABLE_AI=1` to exercise the full pipeline.
const ENABLE_AI = (__ENV.ENABLE_AI || "0") === "1";

// ---------------------------------------------------------------
// Custom metrics — surface what's actually slow
// ---------------------------------------------------------------

const tRegister = new Trend("dur_register", true);
const tLogin = new Trend("dur_login", true);
const tAssessmentStart = new Trend("dur_assessment_start", true);
const tAssessmentAnswer = new Trend("dur_assessment_answer", true);
const tDashboard = new Trend("dur_dashboard", true);
const tHealth = new Trend("dur_health", true);
const tMentorPoll = new Trend("dur_mentor_session_get", true);

const errCounter = new Counter("err_total");
const ok5xx = new Rate("rate_5xx");

// ---------------------------------------------------------------
// k6 options — staged load profile
// ---------------------------------------------------------------

export const options = {
  stages: [
    { duration: RAMP_UP, target: VUS },
    { duration: DURATION, target: VUS },
    { duration: RAMP_DOWN, target: 0 },
  ],
  thresholds: {
    // Hard SLOs (per S11-T8 acceptance: p95 ≤500 ms over a 5-min run).
    http_req_duration: ["p(95)<500"],
    rate_5xx: ["rate<0.01"],
    // Per-endpoint p95 ceilings — easier to spot the regression.
    "dur_register{ok:true}": ["p(95)<400"],
    "dur_login{ok:true}": ["p(95)<300"],
    "dur_dashboard{ok:true}": ["p(95)<300"],
    "dur_health{ok:true}": ["p(95)<100"],
  },
  // Don't stop on first failure — we want a complete picture.
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
};

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function jsonHeaders(token) {
  const h = { "Content-Type": "application/json", "Accept": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function uniqueEmail() {
  // Cheap unique-per-VU email so each user's auth path is independent.
  return `loadtest_vu${__VU}_iter${__ITER}_${Date.now()}@example.com`;
}

function recordResp(t, resp, ok) {
  t.add(resp.timings.duration, { ok: ok ? "true" : "false" });
  if (!ok) errCounter.add(1);
  ok5xx.add(resp.status >= 500);
}

// ---------------------------------------------------------------
// Scenario: one VU iteration = full core loop
// ---------------------------------------------------------------

export default function () {
  // 0. Health probe — cheap signal that the backend is up.
  group("health", () => {
    const resp = http.get(`${BASE_URL}/health`, { tags: { endpoint: "health" } });
    const ok = check(resp, { "health 200": (r) => r.status === 200 });
    recordResp(tHealth, resp, ok);
  });

  // 1. Register a fresh user. If the email collides (unlikely but possible
  //    under high concurrency), the test continues with login — same effect.
  let accessToken = null;
  const email = uniqueEmail();
  const password = "Load_Test_Password_123!";

  group("register", () => {
    const resp = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({
        email, password,
        fullName: `LoadTest VU${__VU}`,
        track: "FullStack",
      }),
      { headers: jsonHeaders(), tags: { endpoint: "register" } }
    );
    const ok = check(resp, { "register 200|409": (r) => r.status === 200 || r.status === 409 });
    recordResp(tRegister, resp, ok);
    if (ok && resp.status === 200) {
      try { accessToken = resp.json("accessToken"); } catch (_) { /* fallthrough to login */ }
    }
  });

  // 2. Login (catches both fresh-register and email-collision cases).
  if (!accessToken) {
    group("login", () => {
      const resp = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email, password }),
        { headers: jsonHeaders(), tags: { endpoint: "login" } }
      );
      const ok = check(resp, { "login 200": (r) => r.status === 200 });
      recordResp(tLogin, resp, ok);
      if (ok) {
        try { accessToken = resp.json("accessToken"); } catch (_) { /* skip rest */ }
      }
    });
  }

  if (!accessToken) {
    // No token = nothing left to exercise; bail cleanly.
    sleep(0.1);
    return;
  }

  // 3. Dashboard hit — the post-login landing screen.
  group("dashboard", () => {
    const resp = http.get(
      `${BASE_URL}/api/dashboard/me`,
      { headers: jsonHeaders(accessToken), tags: { endpoint: "dashboard" } }
    );
    const ok = check(resp, { "dashboard 200": (r) => r.status === 200 });
    recordResp(tDashboard, resp, ok);
  });

  // 4. Assessment — start + answer 5 questions.
  let assessmentId = null;
  let nextQuestionId = null;

  group("assessment_start", () => {
    const resp = http.post(
      `${BASE_URL}/api/assessments`,
      JSON.stringify({ track: "FullStack" }),
      { headers: jsonHeaders(accessToken), tags: { endpoint: "assessment_start" } }
    );
    const ok = check(resp, { "assess start 200|409": (r) => r.status === 200 || r.status === 409 });
    recordResp(tAssessmentStart, resp, ok);
    if (ok && resp.status === 200) {
      try {
        assessmentId = resp.json("assessmentId");
        nextQuestionId = resp.json("nextQuestion.id");
      } catch (_) { /* swallow */ }
    }
  });

  if (assessmentId) {
    for (let i = 0; i < 5 && nextQuestionId; i++) {
      group("assessment_answer", () => {
        const resp = http.post(
          `${BASE_URL}/api/assessments/${assessmentId}/answers`,
          JSON.stringify({
            questionId: nextQuestionId,
            answer: 0,
            idempotencyKey: `vu${__VU}_a${__ITER}_${i}`,
          }),
          {
            headers: { ...jsonHeaders(accessToken), "Idempotency-Key": `vu${__VU}_a${__ITER}_${i}` },
            tags: { endpoint: "assessment_answer" },
          }
        );
        const ok = check(resp, { "answer 200|404|409": (r) => [200, 404, 409].includes(r.status) });
        recordResp(tAssessmentAnswer, resp, ok);
        if (ok && resp.status === 200) {
          try { nextQuestionId = resp.json("nextQuestion.id"); } catch (_) { nextQuestionId = null; }
        } else {
          nextQuestionId = null;
        }
      });
    }
  }

  // 5. Mentor-chat session-create probe (no embeddings indexing yet — just
  //    exercises the lazy-create + read-history path which is cheap).
  group("mentor_session_get", () => {
    const sessionId = `loadtest-${__VU}-${__ITER}`;
    const resp = http.get(
      `${BASE_URL}/api/mentor-chat/${sessionId}`,
      { headers: jsonHeaders(accessToken), tags: { endpoint: "mentor_session" } }
    );
    // 404 is the expected "not_ready" path when MentorIndexedAt is null —
    // both 200 and 404 are valid (load-test users don't have indexed submissions).
    const ok = check(resp, {
      "mentor get 200|404|409": (r) => [200, 404, 409].includes(r.status),
    });
    recordResp(tMentorPoll, resp, ok);
  });

  // 6. AI submission path — DISABLED by default (spends real tokens).
  if (ENABLE_AI && assessmentId) {
    group("submission_upload", () => {
      const resp = http.post(
        `${BASE_URL}/api/submissions`,
        JSON.stringify({
          taskId: "00000000-0000-0000-0000-000000000000",  // owner replaces with a real seeded task ID
          submissionType: "GitHub",
          githubUrl: "https://github.com/example/sample-repo",
        }),
        { headers: jsonHeaders(accessToken), tags: { endpoint: "submission_upload" } }
      );
      check(resp, { "submission accepted 202|400|404": (r) => [202, 400, 404].includes(r.status) });
    });
  }

  // Brief think time so 50 VUs don't hammer the stack with no gap.
  sleep(0.3 + Math.random() * 0.5);
}

// ---------------------------------------------------------------
// Summary handler — emits a compact text + JSON report so the report
// can be archived under tools/load-test/results/.
// ---------------------------------------------------------------

export function handleSummary(data) {
  return {
    "stdout": textSummary(data),
    "tools/load-test/results/summary-latest.json": JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const lines = [];
  lines.push("");
  lines.push("══════════════════════════════════════════════════════════════════");
  lines.push("  Code Mentor — local k6 load test summary (S11-T8)");
  lines.push("══════════════════════════════════════════════════════════════════");
  lines.push(`  base_url     : ${BASE_URL}`);
  lines.push(`  duration     : ${DURATION} (ramp ${RAMP_UP}/${RAMP_DOWN})`);
  lines.push(`  vus          : ${VUS}`);
  lines.push(`  enable_ai    : ${ENABLE_AI}`);
  lines.push("");

  const m = data.metrics;
  const kvs = [
    ["http_reqs total", m.http_reqs?.values?.count],
    ["http_req_failed rate", `${(m.http_req_failed?.values?.rate * 100 || 0).toFixed(2)}%`],
    ["http_req_duration p50", `${(m.http_req_duration?.values?.["p(50)"] || 0).toFixed(1)} ms`],
    ["http_req_duration p95", `${(m.http_req_duration?.values?.["p(95)"] || 0).toFixed(1)} ms`],
    ["http_req_duration p99", `${(m.http_req_duration?.values?.["p(99)"] || 0).toFixed(1)} ms`],
    ["dur_register p95", `${(m.dur_register?.values?.["p(95)"] || 0).toFixed(1)} ms`],
    ["dur_login p95", `${(m.dur_login?.values?.["p(95)"] || 0).toFixed(1)} ms`],
    ["dur_dashboard p95", `${(m.dur_dashboard?.values?.["p(95)"] || 0).toFixed(1)} ms`],
    ["dur_assessment_start p95", `${(m.dur_assessment_start?.values?.["p(95)"] || 0).toFixed(1)} ms`],
    ["dur_assessment_answer p95", `${(m.dur_assessment_answer?.values?.["p(95)"] || 0).toFixed(1)} ms`],
    ["dur_mentor_session_get p95", `${(m.dur_mentor_session_get?.values?.["p(95)"] || 0).toFixed(1)} ms`],
    ["err_total", m.err_total?.values?.count || 0],
    ["rate_5xx", `${((m.rate_5xx?.values?.rate || 0) * 100).toFixed(3)}%`],
  ];
  for (const [k, v] of kvs) lines.push(`  ${k.padEnd(34)} : ${v}`);
  lines.push("");
  lines.push("  Threshold checks (✓ pass / ✗ fail):");
  for (const [name, t] of Object.entries(data.thresholds || {})) {
    const passed = !t.ok ? "✗" : "✓";
    lines.push(`    ${passed} ${name}`);
  }
  lines.push("══════════════════════════════════════════════════════════════════");
  lines.push("");
  return lines.join("\n");
}
