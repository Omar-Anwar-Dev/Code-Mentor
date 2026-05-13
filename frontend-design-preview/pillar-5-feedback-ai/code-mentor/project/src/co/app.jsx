// Core Learning — page switcher + router

const CO_PAGES = [
  { key:"dashboard",        label:"Dashboard",        icon:"House" },
  { key:"learning-path",    label:"Learning Path",    icon:"Map" },
  { key:"project-details",  label:"Project Details",  icon:"FileText" },
  { key:"tasks-library",    label:"Tasks Library",    icon:"ClipboardList" },
  { key:"task-detail",      label:"Task Detail",      icon:"FileCode" },
];

function CoPageSwitcher({ page, setPage }) {
  const [open, setOpen] = coUseState(true);
  return (
    <div className="fixed top-3 right-3 z-[200] no-print">
      {open ? (
        <div className="glass-frosted rounded-full p-1 flex items-center gap-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,.4)]">
          {CO_PAGES.map(p => (
            <button key={p.key} onClick={()=>setPage(p.key)}
              className={[
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-medium transition-colors ring-brand",
                p.key === page ? "bg-primary-500 text-white shadow-[0_0_0_3px_rgba(139,92,246,.18)]" : "text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10"
              ].join(" ")}>
              <Icon name={p.icon} size={11}/>{p.label}
            </button>
          ))}
          <button onClick={()=>setOpen(false)} aria-label="Collapse" className="w-7 h-7 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-white/10 inline-flex items-center justify-center">
            <Icon name="ChevronUp" size={12}/>
          </button>
        </div>
      ) : (
        <button onClick={()=>setOpen(true)} className="glass-frosted rounded-full h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 shadow-[0_10px_30px_-10px_rgba(15,23,42,.4)]">
          <Icon name="LayoutGrid" size={13}/>Pages
        </button>
      )}
    </div>
  );
}

function CoreApp() {
  const [page, setPage] = coUseState("dashboard");
  // Allow children (nav links, internal anchors) to route by key
  coUseEffect(() => {
    window.__coGoto = (key) => {
      const map = { dashboard:"dashboard", "learning-path":"learning-path", tasks:"tasks-library", "task-detail":"task-detail", "tasks-library":"tasks-library", "project-details":"project-details" };
      if (map[key]) setPage(map[key]);
    };
  }, []);
  return (
    <>
      <CoPageSwitcher page={page} setPage={setPage}/>
      {page === "dashboard"       && <Dashboard/>}
      {page === "learning-path"   && <LearningPathPage/>}
      {page === "project-details" && <ProjectDetailsPage/>}
      {page === "tasks-library"   && <TasksLibraryPage/>}
      {page === "task-detail"     && <TaskDetailPage/>}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CoreApp/>);
