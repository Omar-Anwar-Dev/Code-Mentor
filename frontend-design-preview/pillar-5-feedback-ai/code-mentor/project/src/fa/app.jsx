// Page switcher + router for Feedback & AI

const FA_PAGES = [
  { key:"submission-form",   label:"Submission Form",   Comp:SubmissionFormPage },
  { key:"submission-detail", label:"Submission Detail", Comp:SubmissionDetailPage },
  { key:"audit-new",         label:"Audit New",         Comp:AuditNewPage },
  { key:"audit-detail",      label:"Audit Detail",      Comp:AuditDetailPage },
  { key:"audits-history",    label:"Audits History",    Comp:AuditsHistoryPage },
];

function FaPageSwitcher({ page, setPage }) {
  const [open, setOpen] = faUseState(true);
  return (
    <div className="fixed top-3 right-3 z-[60]">
      {open ? (
        <div className="glass-frosted rounded-full p-1 flex items-center gap-1 shadow-[0_18px_50px_-18px_rgba(15,23,42,.6)]">
          {FA_PAGES.map(p => (
            <button key={p.key} onClick={()=>setPage(p.key)} className={[
              "px-3 h-8 rounded-full text-[11.5px] font-medium transition-colors ring-brand whitespace-nowrap",
              p.key === page ? "bg-primary-500 text-white shadow-[0_6px_16px_-6px_rgba(139,92,246,.7)]" : "text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-white/10",
            ].join(" ")}>{p.label}</button>
          ))}
          <button onClick={()=>setOpen(false)} className="ml-1 h-8 w-8 rounded-full text-slate-500 hover:bg-white/40 dark:hover:bg-white/10 inline-flex items-center justify-center" aria-label="Hide"><Icon name="ChevronUp" size={14}/></button>
        </div>
      ) : (
        <button onClick={()=>setOpen(true)} className="glass-frosted rounded-full px-3 h-9 inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200"><Icon name="LayoutGrid" size={13}/> Pages</button>
      )}
    </div>
  );
}

function FaApp() {
  const [page, setPage] = faUseState("submission-detail");
  faUseEffect(() => { window.__faGoto = setPage; }, []);
  const Comp = (FA_PAGES.find(p => p.key === page) || FA_PAGES[0]).Comp;
  return (
    <>
      <FaPageSwitcher page={page} setPage={setPage}/>
      <Comp/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<FaApp/>);
