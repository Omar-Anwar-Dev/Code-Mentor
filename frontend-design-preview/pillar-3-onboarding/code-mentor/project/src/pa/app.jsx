// Page router + page-switcher pill

const PAGES = [
  { id:"landing",   label:"Landing",       icon:"House",       Comp: () => null },
  { id:"login",     label:"Login",         icon:"LogIn",       Comp: () => null },
  { id:"register",  label:"Register",      icon:"UserPlus",    Comp: () => null },
  { id:"ghsuccess", label:"GitHub Success",icon:"Github",      Comp: () => null },
  { id:"404",       label:"404",           icon:"CircleAlert", Comp: () => null },
  { id:"privacy",   label:"Privacy",       icon:"ShieldCheck", Comp: () => null },
  { id:"terms",     label:"Terms",         icon:"FileText",    Comp: () => null },
];

function PageSwitcher({ page, onNav }) {
  const [open, setOpen] = paUseState(false);
  return (
    <div className="fixed top-3 right-3 z-[200] no-print">
      <div className="glass-frosted rounded-full p-1 flex items-center gap-0.5 shadow-[0_10px_30px_-10px_rgba(15,23,42,.35)]">
        <button
          onClick={()=>setOpen(o=>!o)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10"
          aria-label="Toggle page switcher"
        >
          <Icon name={open ? "ChevronRight" : "ChevronLeft"} size={14}/>
        </button>
        {open && PAGES.map(p => (
          <button
            key={p.id}
            onClick={()=>onNav(p.id)}
            title={p.label}
            className={[
              "h-8 px-2.5 rounded-full text-[12px] font-medium flex items-center gap-1.5 transition-colors",
              page === p.id
                ? "bg-primary-500 text-white shadow-[0_4px_14px_-4px_rgba(139,92,246,.55)]"
                : "text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10"
            ].join(" ")}
          >
            <Icon name={p.icon} size={12}/>
            <span className="hidden sm:inline">{p.label}</span>
          </button>
        ))}
        {!open && (
          <div className="px-2.5 h-8 flex items-center gap-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300">
            <Icon name={PAGES.find(p=>p.id===page)?.icon || "House"} size={12}/>
            <span>{PAGES.find(p=>p.id===page)?.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [dark, setDark] = useTheme();
  const [page, setPage] = paUseState("landing");
  const onNav = (id) => {
    setPage(id);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const props = { onNav, dark, setDark };
  let Page = null;
  switch (page) {
    case "landing":   Page = <Landing {...props} />; break;
    case "login":     Page = <Login {...props} />; break;
    case "register":  Page = <Register {...props} />; break;
    case "ghsuccess": Page = <GitHubSuccess {...props} />; break;
    case "404":       Page = <NotFound {...props} />; break;
    case "privacy":   Page = <Privacy {...props} />; break;
    case "terms":     Page = <Terms {...props} />; break;
    default:          Page = <Landing {...props} />;
  }
  return (
    <>
      <PageSwitcher page={page} onNav={onNav} />
      {Page}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
