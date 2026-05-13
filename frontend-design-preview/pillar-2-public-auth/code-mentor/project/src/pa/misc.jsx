// 404 + small layout shells used by legal pages

function NotFound({ onNav, dark, setDark }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <div className="fixed top-5 left-5 z-30 no-print"><BrandLogo size="sm"/></div>
      <div className="fixed top-5 right-5 z-30 no-print"><ThemeToggle dark={dark} setDark={setDark}/></div>
      <div className="relative flex flex-col items-center justify-center text-center min-h-screen px-6">
        <div className="relative inline-flex items-center justify-center">
          <h1 className="text-[120px] sm:text-[160px] font-semibold tracking-tighter brand-gradient-text leading-none select-none">
            404
          </h1>
          <span className="absolute -top-1 right-[-10px] sm:right-[-14px] text-primary-400 animate-float pointer-events-none" style={{filter:"drop-shadow(0 0 10px rgba(139,92,246,.7))"}}>
            <Icon name="Sparkles" size={28}/>
          </span>
        </div>
        <h2 className="mt-2 text-[24px] sm:text-[30px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">We couldn't find that page.</h2>
        <p className="mt-3 text-[16px] text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed">
          It might've been moved, deleted, or maybe the URL has a typo. Try the homepage or browse the task library.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
          <Button variant="gradient" size="lg" leftIcon="House" onClick={()=>onNav("landing")}>Go home</Button>
          <Button variant="glass" size="lg" leftIcon="ClipboardList">Browse tasks</Button>
        </div>
        <div className="mt-8 inline-flex items-center gap-2 font-mono text-[11.5px] text-slate-500 dark:text-slate-400">
          <Icon name="CircleAlert" size={12}/>
          <span>requested: <span className="text-primary-700 dark:text-primary-300">/this/path/does-not-exist</span></span>
        </div>
      </div>
    </div>
  );
}

window.NotFound = NotFound;
