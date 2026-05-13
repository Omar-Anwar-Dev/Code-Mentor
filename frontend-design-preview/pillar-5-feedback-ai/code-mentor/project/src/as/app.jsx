// Assessment app — page switcher + router

const AS_PAGES = [
  { key:"start",    label:"Start",    icon:"Play" },
  { key:"question", label:"Question", icon:"HelpCircle" },
  { key:"results",  label:"Results",  icon:"Trophy" },
];

function AsPageSwitcher({ page, setPage }) {
  const [open, setOpen] = asUseState(true);
  return (
    <div className="fixed top-3 right-3 z-[200] no-print">
      {open ? (
        <div className="glass-frosted rounded-full p-1 flex items-center gap-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,.4)]">
          {AS_PAGES.map(p => (
            <button
              key={p.key}
              onClick={()=>setPage(p.key)}
              className={[
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-medium transition-colors ring-brand",
                p.key === page
                  ? "bg-primary-500 text-white shadow-[0_0_0_3px_rgba(139,92,246,.18)]"
                  : "text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10"
              ].join(" ")}
            >
              <Icon name={p.icon} size={11}/>
              {p.label}
            </button>
          ))}
          <button
            onClick={()=>setOpen(false)}
            aria-label="Collapse"
            className="w-7 h-7 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-white/10 inline-flex items-center justify-center"
          >
            <Icon name="ChevronUp" size={12}/>
          </button>
        </div>
      ) : (
        <button
          onClick={()=>setOpen(true)}
          className="glass-frosted rounded-full h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 shadow-[0_10px_30px_-10px_rgba(15,23,42,.4)]"
        >
          <Icon name="LayoutGrid" size={13}/>
          Pages
        </button>
      )}
    </div>
  );
}

function AssessmentApp() {
  const [dark, setDark] = useTheme();
  const [page, setPage] = asUseState("start");

  const onBegin    = () => setPage("question");
  const onExit     = () => setPage("start");
  const onGenerate = () => setPage("start"); // preview-only

  return (
    <>
      <AsPageSwitcher page={page} setPage={setPage}/>
      {page === "start"    && <AssessmentStart    dark={dark} setDark={setDark} onBegin={onBegin}/>}
      {page === "question" && <AssessmentQuestion dark={dark} setDark={setDark} onExit={onExit}/>}
      {page === "results"  && <AssessmentResults  dark={dark} setDark={setDark} onGenerate={onGenerate}/>}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AssessmentApp/>);
