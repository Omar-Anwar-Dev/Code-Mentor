// Code Mentor — Design System Showcase
// Single-page reference. Theme toggle writes `dark` on <html>.

const { useState: u, useEffect: e } = React;

function Nav({ dark, setDark }) {
  return (
    <nav className="sticky top-0 z-50 h-16 glass flex items-center px-6 lg:px-10 border-b border-slate-200/40 dark:border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-[0_4px_14px_-4px_rgba(139,92,246,.6)]">
          <Icon name="Sparkles" size={18}/>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">CodeMentor</span>
          <span className="text-[11px] font-mono text-slate-500 -mt-0.5">benha · 2026</span>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-2 mx-auto">
        <Badge tone="primary" icon="Layers">Design System v1</Badge>
        <Badge tone="cyan" icon="Radio">live preview</Badge>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <a href="#colors"      className="hidden lg:inline-flex text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 px-2.5">Colors</a>
        <a href="#typography"  className="hidden lg:inline-flex text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 px-2.5">Type</a>
        <a href="#buttons"     className="hidden lg:inline-flex text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 px-2.5">Buttons</a>
        <a href="#neon"        className="hidden lg:inline-flex text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 px-2.5">Neon</a>
        <a href="#annotation"  className="hidden lg:inline-flex text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 px-2.5">Annotation</a>
        <button
          onClick={() => setDark(d => !d)}
          aria-label="Toggle theme"
          className="w-9 h-9 rounded-xl glass flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
        >
          <Icon name={dark ? "Sun" : "Moon"} size={16}/>
        </button>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200/60 dark:border-white/5 mt-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
            <Icon name="Sparkles" size={14}/>
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">CodeMentor — Design System v1</div>
            <div className="text-[12px] text-slate-500">7-person CS team · Benha University · defending Sept 2026</div>
          </div>
        </div>
        <div className="font-mono text-[11.5px] text-slate-500">commit · ds-v1.0.0 · generated 2026-05-12</div>
      </div>
    </footer>
  );
}

function App() {
  const [dark, setDark] = u(true);
  e(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [dark]);

  return (
    <div className="min-h-screen">
      <Nav dark={dark} setDark={setDark} />
      <HeroSection />
      <ColorsSection />
      <TypographySection />
      <ButtonsSection />
      <CardsSection />
      <InputsSection />
      <BadgesSection />
      <ProgressSection />
      <TabsModalSection />
      <ToastsSection />
      <GlassShowcase />
      <NeonShowcase />
      <IconsSection />
      <EmptyStateSection />
      <CodeAnnotationSection />
      <Footer />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
