// Audits History — list, filter bar, pagination, empty state preview, delete modal

function AuditsHistoryPage() {
  const audits = [
    { project:"todo-api",               source:"github", status:"completed", aiAvailable:true,  date:"May 11, 2026", finished:"finished 12m ago", score:74, grade:"C"  },
    { project:"code-mentor-frontend",   source:"github", status:"completed", aiAvailable:true,  date:"May 7, 2026",  finished:"finished 2d ago",  score:82, grade:"B"  },
    { project:"capstone-notebook-app",  source:"zip",    status:"completed", aiAvailable:false, date:"May 3, 2026",  finished:"finished 6d ago",  score:61, grade:"D"  },
    { project:"trie-fuzzy-search",      source:"github", status:"failed",    aiAvailable:false, date:"Apr 28, 2026", finished:"—",                score:null, grade:null },
    { project:"jwt-refresh-demo",       source:"github", status:"completed", aiAvailable:true,  date:"Apr 22, 2026", finished:"finished 20d ago", score:88, grade:"B+" },
  ];

  return (
    <AppLayout active="audit" title="My Audits">
      <div className="max-w-5xl mx-auto px-1 py-2 space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight inline-flex items-center gap-2">
              <Icon name="Sparkles" size={18} className="text-primary-500"/>
              <span className="brand-gradient-text">My audits</span>
            </h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Past project audits — newest first. Reports are kept forever; uploaded code is deleted after 90 days.</p>
          </div>
          <Button variant="primary" leftIcon="Plus" onClick={()=>window.__faGoto?.("audit-new")}>New audit</Button>
        </div>

        {/* Filter bar */}
        <Card variant="glass">
          <CardBody className="p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center gap-2 text-[13.5px] font-medium text-slate-800 dark:text-slate-100">
                <Icon name="Filter" size={14}/> Filter
              </div>
              <button className="text-[11.5px] text-primary-600 dark:text-primary-300 hover:underline inline-flex items-center gap-1"><Icon name="X" size={11}/> Clear all</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { l:"From date", t:"date", v:"2026-04-01" },
                { l:"To date",   t:"date", v:"" },
                { l:"Min score", t:"number", v:"60" },
                { l:"Max score", t:"number", v:"" },
              ].map((f,i) => (
                <div key={i} className="space-y-1">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">{f.l}</label>
                  <input type={f.t} defaultValue={f.v} min={f.t==="number"?0:undefined} max={f.t==="number"?100:undefined}
                    className="w-full h-9 px-2.5 text-[13px] rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 outline-none ring-brand focus:border-primary-400"/>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* List */}
        <ul className="space-y-3">
          {audits.map((a,i) => (
            <li key={a.project}>
              <Card variant="glass">
                <CardBody className="p-4 flex items-center gap-4">
                  <Icon name={a.source === "github" ? "Github" : "FileArchive"} size={22} className="text-slate-400 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <button onClick={()=>{ if (a.status==="completed") window.__faGoto?.("audit-detail"); }} className="text-[14.5px] font-semibold text-slate-900 dark:text-slate-50 hover:text-primary-600 dark:hover:text-primary-300 truncate text-left">{a.project}</button>
                    <div className="mt-1 flex flex-wrap items-center text-[11.5px] text-slate-500 dark:text-slate-400 gap-x-2 gap-y-1">
                      <AuditStatusPill status={a.status} aiAvailable={a.aiAvailable}/>
                      <span>·</span>
                      <span>{a.date}</span>
                      {a.finished !== "—" ? <><span>·</span><span>{a.finished}</span></> : null}
                    </div>
                  </div>
                  <div className="shrink-0 hidden sm:block text-right">
                    <div className="text-[22px] font-bold leading-none text-slate-900 dark:text-slate-50 font-mono">{a.score ?? "—"}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{a.grade ? `Grade ${a.grade}` : "no score"}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" rightIcon="ChevronRight" onClick={()=>{ if (a.status==="completed") window.__faGoto?.("audit-detail"); }}>Open</Button>
                    <button className="p-2 rounded-md text-slate-500 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" aria-label="Delete"><Icon name="Trash2" size={14}/></button>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>

        {/* Pagination */}
        <div className="flex items-center justify-between text-[13px]">
          <div className="text-slate-500 dark:text-slate-400">Page 1 of 1 · 5 audits</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon="ChevronLeft" disabled>Previous</Button>
            <Button variant="outline" size="sm" rightIcon="ChevronRight" disabled>Next</Button>
          </div>
        </div>

        {/* Empty state preview */}
        <div className="text-center text-[11.5px] uppercase tracking-[0.18em] font-mono text-slate-400 dark:text-slate-500 pt-4">↓ Empty state preview ↓</div>
        <Card variant="glass">
          <CardBody className="p-12 text-center space-y-3">
            <Icon name="Sparkles" size={40} className="text-slate-300 dark:text-slate-600 mx-auto"/>
            <div className="text-[16px] font-semibold text-slate-800 dark:text-slate-100">No audits match these filters</div>
            <div className="text-[13px] text-slate-500 dark:text-slate-400">Try widening the date range or adjusting the score bounds.</div>
            <div className="flex justify-center">
              <Button variant="outline" leftIcon="X">Clear filters</Button>
            </div>
          </CardBody>
        </Card>

        {/* Delete modal preview */}
        <div className="text-center text-[11.5px] uppercase tracking-[0.18em] font-mono text-slate-400 dark:text-slate-500 pt-4">↓ Delete confirm modal preview ↓</div>
        <div className="relative max-w-md mx-auto">
          <div className="glass-frosted rounded-2xl p-6 shadow-[0_30px_80px_-20px_rgba(15,23,42,.5)] glow-md">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 inline-flex items-center gap-2"><Icon name="Trash2" size={16} className="text-red-500"/>Delete this audit?</h3>
              <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><Icon name="X" size={16}/></button>
            </div>
            <p className="text-[13px] text-slate-700 dark:text-slate-300"><strong>code-mentor-frontend</strong> will be hidden from your audit list. The underlying report metadata is kept for analytics; the uploaded code follows the standard 90-day retention.</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="outline" size="md">Cancel</Button>
              <Button variant="danger" size="md" leftIcon="Trash2">Delete</Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
window.AuditsHistoryPage = AuditsHistoryPage;
