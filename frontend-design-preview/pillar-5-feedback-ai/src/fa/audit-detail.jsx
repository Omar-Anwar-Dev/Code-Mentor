// Audit Detail — 8-section structured report

function AuditDetailPage() {
  const radarAxes = ["Code Quality","Security","Performance","Architecture","Maintainability","Completeness"];
  const radarVals = [78, 68, 82, 72, 76, 80];

  return (
    <AppLayout active="audit" title="Audit · todo-api">
      <div className="max-w-4xl mx-auto px-1 animate-fade-in space-y-6">
        <div>
          <a href="#" onClick={e=>{e.preventDefault(); window.__faGoto?.("audits-history");}} className="inline-flex items-center gap-1.5 text-[13px] text-primary-600 dark:text-primary-300 hover:underline">
            <Icon name="ArrowLeft" size={14}/> Back to my audits
          </a>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">todo-api</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Attempt #1 · started 12m ago</p>
        </div>

        <StatusBanner status="completed"/>

        <SourceTimelineCard
          source="github.com/layla-ahmed/todo-api"
          timeline={[
            { label:"Received",           time:"14:08", done:true },
            { label:"Started processing", time:"14:08", done:true },
            { label:"Completed",          time:"14:14", done:true },
          ]}
        />

        {/* D.1 Score card */}
        <Card variant="glass">
          <CardBody className="p-6 flex items-center justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                <Icon name="Sparkles" size={13} className="text-primary-500"/>Overall score
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-[48px] font-bold tracking-tight text-amber-600 dark:text-amber-400 leading-none">74</span>
                <span className="text-[22px] text-slate-400 dark:text-slate-500">/ 100</span>
              </div>
            </div>
            <GradePill grade="C"/>
          </CardBody>
        </Card>

        {/* D.2 ScoreRadar */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="TrendingUp" size={16} className="text-primary-500"/>Score breakdown</span>}/>
          <CardBody className="p-6 pt-2">
            <div className="flex items-center justify-center h-80">
              <FaRadarChart axes={radarAxes} values={radarVals} size={340}/>
            </div>
            <div className="grid sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
              {radarAxes.map((a,i) => (
                <div key={a} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/8">
                  <span className="text-[12.5px] text-slate-600 dark:text-slate-300">{a}</span>
                  <span className="text-[13px] font-mono font-semibold text-slate-900 dark:text-slate-50">{radarVals[i]}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* D.3 Strengths */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="CircleCheck" size={16} className="text-emerald-500"/>Strengths</span>}/>
          <CardBody className="p-6 pt-2">
            <ul className="space-y-2 text-[13.5px] text-slate-700 dark:text-slate-200">
              {["Auth boundary is clean — every protected endpoint goes through the same current_user dependency. Easy to reason about.",
                "Migrations are non-destructive — you've kept the Alembic history linear without any squash hacks.",
                "Per-user isolation enforced at the query layer, not in Python — much harder to accidentally leak data.",
                "Health and readiness endpoints actually do what their names suggest. Most projects collapse them into one liar."
              ].map((s,i) => (
                <li key={i} className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span><span>{s}</span></li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* D.4 Critical issues */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="ShieldAlert" size={16} className="text-red-500"/>Critical issues <span className="text-[12px] font-mono text-slate-400">(2)</span></span>}/>
          <CardBody className="p-6 pt-2 space-y-4">
            <IssueBlock severity="high" title="Possible SQL injection in /tags/search" file="app/api/tags.py:42"
              body="The query parameter is interpolated into a raw SQLAlchemy text() call. Any user can read tags they shouldn't see."
              fix={<>Use parametrized queries with <code className="font-mono">:query</code> bind, or — better — let the ORM build the WHERE clause.</>}/>
            <IssueBlock severity="high" title="Hardcoded SECRET_KEY fallback in settings.py" file="app/core/settings.py:18"
              body="If the env var is unset, the code falls back to 'change-me-in-prod'. That string ships to prod by accident."
              fix="Fail loud at startup. Raise if the secret is missing."/>
          </CardBody>
        </Card>

        {/* D.5 Warnings */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="TriangleAlert" size={16} className="text-amber-500"/>Warnings <span className="text-[12px] font-mono text-slate-400">(4)</span></span>}/>
          <CardBody className="p-6 pt-2 space-y-4">
            <IssueBlock severity="warning" title="No rate limit on /auth/login" file="app/api/auth.py:24" body="Brute-force enumeration is trivial without a rate limit." fix="Add a per-IP rate limit via slowapi or Redis-based throttling."/>
            <IssueBlock severity="warning" title="Tests directory contains 6 tests for 23 endpoints" file="tests/" body="Auth tests are missing entirely." fix="Aim for one happy-path + one error test per endpoint, at minimum."/>
            <IssueBlock severity="warning" title="N+1 query in /tasks list endpoint" file="app/api/tasks.py:67" body="Each task triggers an extra SELECT for its tags." fix={<>Use <code className="font-mono">joinedload(Task.tags)</code>.</>}/>
            <IssueBlock severity="warning" title="No CORS allowlist — allow_origins=['*']" file="app/main.py:31" body="Acceptable in dev, not for portfolio publishing." fix="Restrict to your real frontend origin via env var."/>
          </CardBody>
        </Card>

        {/* D.6 Suggestions */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="Lightbulb" size={16} className="text-slate-500"/>Suggestions <span className="text-[12px] font-mono text-slate-400">(3)</span></span>}/>
          <CardBody className="p-6 pt-2 space-y-4">
            <IssueBlock severity="info" title="Consider Pydantic v2 model_config for shared settings" file="app/schemas/*.py" body="You're repeating Config classes across schemas."/>
            <IssueBlock severity="info" title="Migrate from print to structured logging" file="app/api/auth.py:31, app/api/tasks.py:88" body="Two stray prints survived. Replace with logger.info."/>
            <IssueBlock severity="info" title="Add a pre-commit hook for ruff format" file="pyproject.toml" body="Saves you from inconsistent formatting in PRs."/>
          </CardBody>
        </Card>

        {/* D.7 Missing features */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="Target" size={16} className="text-fuchsia-500"/>Missing or incomplete features</span>}/>
          <CardBody className="p-6 pt-2">
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mb-3">Capabilities mentioned in your project description but not yet implemented in the code.</p>
            <ul className="space-y-2 text-[13.5px] text-slate-700 dark:text-slate-200">
              <li className="flex items-start gap-2"><span className="text-fuchsia-500 mt-0.5">○</span><span>Bulk task import — endpoint exists in tasks.py but the router doesn't expose it; no Pydantic schema for the input.</span></li>
              <li className="flex items-start gap-2"><span className="text-fuchsia-500 mt-0.5">○</span><span>Pagination ordering — listed as a goal in your description but the /tasks endpoint uses default ID order with no ?order_by param.</span></li>
            </ul>
          </CardBody>
        </Card>

        {/* D.8 Recommendations */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="Lightbulb" size={16} className="text-primary-500"/>Top recommended improvements</span>}/>
          <CardBody className="p-6 pt-2 space-y-4">
            {[
              { t:"Plug the SQL-injection hole in /tags/search", h:"Replace text(f'...{query}') with text('... :q').bindparams(q=query). Add a regression test." },
              { t:"Fail-loud on missing secrets",                h:"Drop the or 'change-me-in-prod' fallback. Validate at startup with Pydantic Settings." },
              { t:"Add rate limiting to auth endpoints",         h:"slowapi works with FastAPI dependency injection. Limit /auth/login and /auth/register to 5 req/min/IP." },
              { t:"Triple the test count, starting with auth",   h:"One happy + one failure case per endpoint. Use httpx.AsyncClient against a Postgres test DB." },
              { t:"Document the bulk-import status",             h:"Either finish the endpoint OR remove the unreachable code path. Either way, mention it in the README." },
            ].map((r,i) => (
              <div key={i} className="flex gap-3">
                <PriorityCircle n={i+1}/>
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-slate-900 dark:text-slate-50">{r.t}</div>
                  <div className="text-[12.5px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{r.h}</div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* D.9 Tech stack */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="Code2" size={16} className="text-cyan-500"/>Tech stack assessment</span>}/>
          <CardBody className="p-6 pt-2">
            <p className="text-[13.5px] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {`FastAPI + SQLAlchemy + Postgres is a sensible, boring stack for a learning project — and that's a compliment. Boring stacks let the project's real problems surface (auth, isolation, schema design) instead of being hidden behind shiny library choices.\n\nTwo small flags. (1) SQLAlchemy 1.x-style queries in a few places — you're on 2.0, lean on the new select() API uniformly. (2) Alembic is set up but the autogenerate diffs aren't reviewed before commit — there's a migration that adds an index your model doesn't declare.`}
            </p>
          </CardBody>
        </Card>

        {/* D.10 Inline annotations */}
        <Card variant="glass" className="p-0 overflow-hidden">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="FileText" size={16} className="text-primary-500"/>Inline annotations <span className="text-[12px] font-mono text-slate-400">(3)</span></span>}/>
          <ul className="divide-y divide-slate-200/60 dark:divide-white/8">
            {/* File 1 expanded */}
            <li>
              <div className="w-full px-6 py-3 flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <Icon name="ChevronDown" size={14} className="text-slate-500"/>
                  <code className="font-mono text-[12.5px] text-slate-800 dark:text-slate-100">app/api/tags.py</code>
                </div>
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400">1 finding</span>
              </div>
              <div className="px-6 pb-4 pt-1">
                <div className="rounded-lg border border-red-200/60 dark:border-red-500/30 p-3 space-y-2 bg-white/40 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-medium text-slate-900 dark:text-slate-50">Raw text() with user input</span>
                    <SeverityBadge s="critical"/>
                  </div>
                  <div className="font-mono text-[11.5px] text-slate-500 dark:text-slate-400">Line 42</div>
                  <PrismBlock lang="python" code={`results = db.execute(\n    text(f"SELECT * FROM tags WHERE name LIKE '%{query}%'")\n)`}/>
                  <p className="text-[13px] text-slate-700 dark:text-slate-300">User-supplied <code className="font-mono">query</code> is interpolated into raw SQL. Even with the % wrapping, this is a SQL injection.</p>
                  <p className="text-[12.5px] text-slate-600 dark:text-slate-400"><strong>Explanation:</strong> SQLAlchemy's text() does not bind parameters from f-strings. The string is sent to the DB as-is.</p>
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[12.5px]">
                    <strong>Fix:</strong> Use <code className="font-mono">text('SELECT * FROM tags WHERE name LIKE :pattern').bindparams(pattern=f'%{`{query}`}%')</code>. Or — better — write it via the ORM: <code className="font-mono">db.query(Tag).filter(Tag.name.ilike(f'%{`{query}`}%'))</code>.
                  </div>
                  <PrismBlock lang="python" code={`pattern = f"%{query}%"\nresults = db.query(Tag).filter(Tag.name.ilike(pattern)).all()`} className="ring-emerald-500/20"/>
                </div>
              </div>
            </li>
            {[{ f:"app/core/settings.py" },{ f:"app/api/tasks.py" }].map(({ f }) => (
              <li key={f}>
                <button className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <Icon name="ChevronRight" size={14} className="text-slate-400"/>
                    <code className="font-mono text-[12.5px] text-slate-800 dark:text-slate-100">{f}</code>
                  </div>
                  <span className="text-[11.5px] text-slate-500 dark:text-slate-400">1 finding</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="text-center text-[11px] font-mono text-slate-400 dark:text-slate-500 py-4">
          Audit produced by gpt-4o-mini · prompt audit-v3.2 · 14,820 in / 3,140 out tokens · completed Mon May 12 2026, 14:14
        </div>
      </div>

      <MentorChatFloatingCTA/>
    </AppLayout>
  );
}
window.AuditDetailPage = AuditDetailPage;
