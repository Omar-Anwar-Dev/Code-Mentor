import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setTheme } from '@/features/ui/uiSlice';
import { Button, Badge } from '@/components/ui';
import {
    Sparkles,
    ArrowRight,
    ScanSearch,
    BookOpen,
    MessageSquare,
    Map,
    Trophy,
    Target,
    Rocket,
    Code,
    TrendingUp,
    Github,
    Menu,
    X,
    Sun,
    Moon,
    FileCode,
    FlaskConical,
    Gauge,
    ShieldCheck,
    ListChecks,
    Wrench,
    UserPlus,
    LogIn,
} from 'lucide-react';

// Returns the right primary destination for the current viewer:
// — unauthenticated → /register (sign-up funnel)
// — authenticated admin → /admin
// — authenticated learner with assessment → /dashboard
// — authenticated learner without assessment → /assessment
function usePrimaryCtaDest(): { to: string; label: string } {
    const { isAuthenticated, user } = useAppSelector((s) => s.auth);
    if (!isAuthenticated || !user) return { to: '/register', label: 'Start free assessment' };
    if (user.role === 'Admin') return { to: '/admin', label: 'Open admin' };
    return user.hasCompletedAssessment
        ? { to: '/dashboard', label: 'Go to dashboard' }
        : { to: '/assessment', label: 'Continue your assessment' };
}

const AnimatedBackground: React.FC<{ subtle?: boolean }> = ({ subtle = false }) => {
    const a = subtle ? 0.5 : 1;
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            <div
                className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.45), rgba(168,85,247,0.4))', opacity: 0.7 * a }}
            />
            <div
                className="absolute top-1/3 -right-24 w-[360px] h-[360px] rounded-full blur-3xl animate-pulse"
                style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(59,130,246,0.35))', animationDelay: '1s', opacity: 0.7 * a }}
            />
            <div
                className="absolute -bottom-32 left-1/4 w-[300px] h-[300px] rounded-full blur-3xl animate-pulse"
                style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.35), rgba(249,115,22,0.3))', animationDelay: '2s', opacity: 0.6 * a }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)]" />
            <span className="absolute left-[18%] top-[28%] w-1.5 h-1.5 rounded-full bg-primary-400 animate-float opacity-60" />
            <span className="absolute right-[22%] top-[60%] w-1.5 h-1.5 rounded-full bg-secondary-400 animate-float opacity-50" style={{ animationDelay: '2.5s' }} />
            <span className="absolute left-[45%] bottom-[14%] w-2 h-2 rounded-full bg-fuchsia-400 animate-float opacity-50" style={{ animationDelay: '4s' }} />
        </div>
    );
};

const BrandLogo: React.FC<{ size?: 'sm' | 'md' | 'lg'; showWordmark?: boolean }> = ({ size = 'md', showWordmark = true }) => {
    const sz = size === 'lg' ? 56 : size === 'sm' ? 32 : 40;
    const inner = size === 'lg' ? 26 : size === 'sm' ? 14 : 18;
    return (
        <div className="inline-flex items-center gap-3">
            <div
                className="rounded-xl brand-gradient-bg flex items-center justify-center text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]"
                style={{ width: sz, height: sz }}
            >
                <Sparkles style={{ width: inner, height: inner }} />
            </div>
            {showWordmark && (
                <div className="flex flex-col leading-tight">
                    <span className={`font-semibold tracking-tight brand-gradient-text ${size === 'lg' ? 'text-[22px]' : size === 'sm' ? 'text-[14px]' : 'text-[17px]'}`}>
                        CodeMentor<span className="text-neutral-400 dark:text-neutral-500 ml-1 font-normal">AI</span>
                    </span>
                    {size === 'lg' && (
                        <span className="text-[12px] font-mono text-neutral-500 dark:text-neutral-400">benha · 2026</span>
                    )}
                </div>
            )}
        </div>
    );
};

const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
    const dispatch = useAppDispatch();
    const { theme } = useAppSelector((s) => s.ui);
    return (
        <button
            onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
            aria-label="Toggle theme"
            className={`w-9 h-9 rounded-xl glass flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors ${className}`}
        >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
    );
};

const LandingNav: React.FC = () => {
    const [mobile, setMobile] = useState(false);
    const { isAuthenticated, user } = useAppSelector((s) => s.auth);
    const homeDest = user?.role === 'Admin'
        ? '/admin'
        : user?.hasCompletedAssessment ? '/dashboard' : '/assessment';

    const navAnchors: Array<[string, string]> = [
        ['Features', 'features'],
        ['How it works', 'journey'],
        ['Project Audit', 'audit'],
    ];

    return (
        <nav className="sticky top-0 z-40 h-16 glass flex items-center px-5 lg:px-10 border-b border-neutral-200/40 dark:border-white/5">
            <Link to="/" className="flex items-center" aria-label="CodeMentor home">
                <BrandLogo />
            </Link>
            <div className="hidden md:flex items-center gap-1 ml-10">
                {navAnchors.map(([label, id]) => (
                    <a
                        key={label}
                        href={`#${id}`}
                        className="px-3 py-1.5 text-[13.5px] text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-300 rounded-lg hover:bg-primary-50/60 dark:hover:bg-white/5 transition-colors"
                    >
                        {label}
                    </a>
                ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
                <ThemeToggle className="hidden sm:flex" />
                {isAuthenticated && user ? (
                    <Link to={homeDest}>
                        <Button variant="gradient" size="md" rightIcon={<ArrowRight className="w-4 h-4" />} className="hidden sm:inline-flex">
                            {user.role === 'Admin' ? 'Open admin' : 'Go to dashboard'}
                        </Button>
                    </Link>
                ) : (
                    <>
                        <Link
                            to="/login"
                            className="hidden sm:inline-flex h-9 px-3 items-center text-[13.5px] text-neutral-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                        >
                            Sign in
                        </Link>
                        <Link to="/register">
                            <Button variant="gradient" size="md" rightIcon={<ArrowRight className="w-4 h-4" />} className="hidden sm:inline-flex">
                                Get started
                            </Button>
                        </Link>
                    </>
                )}
                <button
                    onClick={() => setMobile((m) => !m)}
                    className="md:hidden w-9 h-9 rounded-xl glass flex items-center justify-center text-neutral-700 dark:text-neutral-200"
                    aria-label="Menu"
                >
                    {mobile ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
            </div>
            {mobile && (
                <div className="absolute top-16 left-0 right-0 glass-frosted p-4 border-b border-neutral-200/40 dark:border-white/5 flex flex-col gap-2 md:hidden">
                    {navAnchors.map(([label, id]) => (
                        <a
                            key={label}
                            href={`#${id}`}
                            onClick={() => setMobile(false)}
                            className="px-3 py-2 text-[14px] text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-primary-50/60 dark:hover:bg-white/5"
                        >
                            {label}
                        </a>
                    ))}
                    <div className="flex gap-2 pt-2 border-t border-neutral-200/60 dark:border-white/10">
                        <Link to="/login" className="flex-1">
                            <Button variant="ghost" size="md" fullWidth>Sign in</Button>
                        </Link>
                        <Link to="/register" className="flex-1">
                            <Button variant="gradient" size="md" fullWidth>Get started</Button>
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};

const HeroSection: React.FC = () => {
    const primary = usePrimaryCtaDest();
    return (
        <section id="hero" className="relative overflow-hidden">
            <AnimatedBackground />
            <div className="relative max-w-6xl mx-auto px-6 lg:px-10 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
                <div className="inline-flex items-center gap-2 glass rounded-full pl-2 pr-3 py-1 mb-7">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full brand-gradient-bg text-white">
                        <Sparkles className="w-3 h-3" />
                    </span>
                    <span className="text-[12px] font-medium text-neutral-700 dark:text-neutral-200">AI-powered code review · 2026</span>
                </div>
                <h1 className="text-[44px] sm:text-[64px] lg:text-[72px] leading-[1.04] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 max-w-4xl mx-auto">
                    Real code feedback, <span className="brand-gradient-text whitespace-nowrap">in under five minutes.</span>
                </h1>
                <p className="mt-6 text-[17px] sm:text-[19px] text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl mx-auto">
                    Drop your code in, see what a senior would say — inline, line-by-line. Then ask the AI mentor anything that's still fuzzy.
                </p>
                <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
                    <Link to={primary.to}>
                        <Button variant="gradient" size="lg" leftIcon={<Sparkles className="w-4 h-4" />} rightIcon={<ArrowRight className="w-4 h-4" />}>
                            {primary.label}
                        </Button>
                    </Link>
                    <a href="#audit">
                        <Button variant="outline" size="lg" leftIcon={<ScanSearch className="w-4 h-4" />}>
                            Try project audit
                        </Button>
                    </a>
                </div>
                <p className="mt-7 font-mono text-[12px] text-neutral-500 dark:text-neutral-400">
                    Built by a 7-person CS team at Benha University · defending Sept 2026
                </p>

                {/* Visual proof block — code-annotation pattern (matches Pillar 1 §15 signature) */}
                <div className="mt-14 max-w-4xl mx-auto text-left">
                    <div className="glass-card overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200/60 dark:border-white/10">
                            <div className="flex items-center gap-2.5">
                                <FileCode className="w-3.5 h-3.5 text-neutral-500" />
                                <span className="font-mono text-[12px] text-neutral-700 dark:text-neutral-200">auth/user_lookup.py</span>
                                <Badge variant="error" size="sm">1 critical</Badge>
                                <Badge variant="primary" size="sm">mentor v2.3</Badge>
                            </div>
                            <span className="font-mono text-[11.5px] text-neutral-500">reviewed · 4m 12s</span>
                        </div>
                        <div className="font-mono text-[13px] leading-[1.8] grid grid-cols-[44px_28px_1fr]">
                            {[
                                { n: 1, jsx: <><span style={{ color: '#a78bfa' }}>def </span><span style={{ color: '#22d3ee' }}>get_user_by_email</span>(email):</> },
                                { n: 2, jsx: <span className="italic text-neutral-500">    # Look up a user record by their email address.</span> },
                                { n: 3, jsx: <>    query = <span style={{ color: '#34d399' }}>{`f"SELECT * FROM users WHERE email = '{email}'"`}</span></>, flag: true },
                                { n: 4, jsx: <>    cursor.<span style={{ color: '#22d3ee' }}>execute</span>(query)</> },
                                { n: 5, jsx: <><span style={{ color: '#a78bfa' }}>    return </span>cursor.<span style={{ color: '#22d3ee' }}>fetchone</span>()</> },
                            ].map((l) => (
                                <React.Fragment key={l.n}>
                                    <div
                                        className={`px-3 text-right select-none border-r ${l.flag ? 'border-primary-500 text-primary-700 dark:text-primary-300 font-semibold bg-primary-500/10' : 'border-neutral-200/60 dark:border-white/5 text-neutral-400'}`}
                                        style={l.flag ? { boxShadow: 'inset 4px 0 0 0 #8b5cf6' } : {}}
                                    >
                                        {l.n}
                                    </div>
                                    <div className={`flex items-center justify-center ${l.flag ? 'bg-primary-500/10' : ''}`}>
                                        {l.flag && (
                                            <span className="w-5 h-5 rounded-full bg-primary-500 text-white shadow-neon flex items-center justify-center">
                                                <MessageSquare className="w-2.5 h-2.5" />
                                            </span>
                                        )}
                                    </div>
                                    <div className={`pl-3 pr-4 whitespace-pre ${l.flag ? 'bg-primary-500/10 text-neutral-800 dark:text-neutral-100' : 'text-neutral-800 dark:text-neutral-100'}`}>
                                        {l.jsx}
                                    </div>
                                </React.Fragment>
                            ))}
                            <div className="col-span-3 px-4 pb-4 pt-3">
                                <div className="glass-frosted rounded-xl border border-primary-400/40 dark:border-primary-400/30 p-3.5">
                                    <div className="flex items-start gap-2.5">
                                        <div className="shrink-0 w-7 h-7 rounded-lg brand-gradient-bg flex items-center justify-center text-white">
                                            <Sparkles className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="text-[13px] text-neutral-700 dark:text-neutral-200 leading-relaxed">
                                            <span className="font-semibold text-neutral-900 dark:text-neutral-50">SQL injection risk.</span>{' '}
                                            Use parameterized queries via{' '}
                                            <code className="font-mono px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-primary-700 dark:text-primary-300">
                                                cursor.execute(query, params)
                                            </code>.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const FEATURES = [
    { icon: BookOpen, title: 'Adaptive Assessment', body: '30 questions that adapt to your level. Discover your strengths and gaps in 40 minutes, then get a personalized learning path.' },
    { icon: ScanSearch, title: 'Multi-layered Code Review', body: 'Static analyzers (Bandit, ESLint, Cppcheck…) plus LLM architectural review, unified into per-category scores and inline annotations.' },
    { icon: MessageSquare, title: 'Inline Annotations', body: "Mentor comments appear inline, anchored to the exact line. Click to see the suggestion, apply it, or ask the mentor a follow-up." },
    { icon: Sparkles, title: 'RAG-Powered Mentor Chat', body: 'Ask the mentor about your code. Answers are grounded in your actual submission — chunked, embedded, retrieved per query.' },
    { icon: Map, title: 'Personalized Learning Path', body: 'An ordered sequence of real coding tasks tuned to your weakest categories. Replace one with an AI-recommended task anytime.' },
    { icon: Trophy, title: 'Shareable Learning CV', body: 'A verifiable, public profile of your scored submissions. A data-backed alternative to course-completion certificates.' },
];

const FeaturesSection: React.FC = () => (
    <section id="features" className="max-w-7xl mx-auto px-6 lg:px-10 py-16 sm:py-24">
        <div className="max-w-3xl mb-12">
            <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300 mb-2">Features</div>
            <h2 className="text-[30px] sm:text-[40px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                Six pieces that work as one product.
            </h2>
            <p className="mt-3 text-[16px] text-neutral-600 dark:text-neutral-400 max-w-2xl">
                Assessment, review, annotations, chat, path, CV. Each step feeds the next — no isolated tools, no dead ends.
            </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
                <div key={f.title} className="glass-card p-6 hover:-translate-y-0.5 transition-transform duration-300">
                    <div className="w-11 h-11 rounded-xl bg-primary-500/10 dark:bg-primary-500/15 flex items-center justify-center text-primary-700 dark:text-primary-200 mb-5">
                        <f.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-[18px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{f.title}</h3>
                    <p className="mt-2 text-[14px] text-neutral-600 dark:text-neutral-300 leading-relaxed">{f.body}</p>
                </div>
            ))}
        </div>
    </section>
);

const JOURNEY = [
    { icon: Target, step: 1, title: 'Take the Assessment', body: 'Complete a quick skill assessment to help us understand your current level.' },
    { icon: Rocket, step: 2, title: 'Get Your Learning Path', body: 'Receive a personalized curriculum tailored to your goals and skill gaps.' },
    { icon: Code, step: 3, title: 'Code & Learn', body: 'Work through projects and challenges while getting real-time AI feedback.' },
    { icon: TrendingUp, step: 4, title: 'Track & Improve', body: 'Monitor your progress, earn achievements, and continuously level up.' },
];

const JourneySection: React.FC = () => (
    <section id="journey" className="relative py-20 sm:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="text-center mb-16">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary-500/10 dark:bg-primary-500/15 text-primary-700 dark:text-primary-200 text-[13px] font-medium mb-4">
                    Your Journey
                </span>
                <h2 className="text-[30px] sm:text-[40px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-4">
                    How It <span className="brand-gradient-text">Works</span>
                </h2>
                <p className="text-[16px] sm:text-[18px] text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                    A simple yet powerful learning process designed to maximize your growth.
                </p>
            </div>
            <div className="relative">
                <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-secondary-500 via-primary-500 to-fuchsia-500" />
                <div className="space-y-12 lg:space-y-4">
                    {JOURNEY.map((item, index) => {
                        const reverse = index % 2 !== 0;
                        return (
                            <div key={item.step} className="relative lg:grid lg:grid-cols-2 lg:gap-16 items-center">
                                <div className={`mb-8 lg:mb-0 ${reverse ? 'lg:text-left lg:pl-16 lg:col-start-2' : 'lg:text-right lg:pr-16'}`}>
                                    <div className={`inline-flex items-center gap-2 mb-4 ${reverse ? '' : 'lg:flex-row-reverse'}`}>
                                        <span className="w-10 h-10 rounded-full brand-gradient-bg flex items-center justify-center text-white font-bold text-[15px] shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
                                            {item.step}
                                        </span>
                                        <span className="text-[13px] font-medium text-primary-600 dark:text-primary-300 font-mono">Step {item.step}</span>
                                    </div>
                                    <h3 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-2">
                                        {item.title}
                                    </h3>
                                    <p className="text-[15px] sm:text-[16px] text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-md lg:max-w-none">
                                        {item.body}
                                    </p>
                                </div>
                                <div className={reverse ? 'lg:pr-16 lg:col-start-1 lg:row-start-1' : 'lg:pl-16'}>
                                    <div className="relative inline-block">
                                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 dark:from-primary-500/10 dark:to-purple-500/10 flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-2xl brand-gradient-bg flex items-center justify-center shadow-[0_12px_28px_-8px_rgba(139,92,246,.55)]">
                                                <item.icon className="w-7 h-7 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-neutral-950 border-4 border-primary-500" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    </section>
);

const AuditTeaser: React.FC = () => (
    <section id="audit" className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 brand-gradient-bg opacity-[0.10] dark:opacity-[0.15]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-10">
            <div className="glass-card p-8 sm:p-10 text-center">
                <div className="inline-flex items-center gap-2 mb-4">
                    <Badge variant="cyan" size="md">
                        <FlaskConical className="w-3 h-3 mr-1" />
                        F11 · standalone
                    </Badge>
                </div>
                <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                    Already have a project? Get an instant audit.
                </h2>
                <p className="mt-3 text-[15.5px] text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto leading-relaxed">
                    Skip the assessment. Upload a GitHub repo or ZIP plus a short description, and the AI returns an 8-section structured audit — overall score, security review, completeness against your description, and a top-5 prioritized fix list.
                </p>
                <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
                    <Link to="/audit/new">
                        <Button variant="gradient" size="lg" leftIcon={<ScanSearch className="w-4 h-4" />} rightIcon={<ArrowRight className="w-4 h-4" />}>
                            Audit my project
                        </Button>
                    </Link>
                </div>
                <div className="mt-7 grid sm:grid-cols-4 gap-3 text-left">
                    {[
                        { k: 'Overall score', icon: Gauge },
                        { k: 'Security review', icon: ShieldCheck },
                        { k: 'Completeness', icon: ListChecks },
                        { k: 'Top-5 fix list', icon: Wrench },
                    ].map((s) => (
                        <div key={s.k} className="glass rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
                            <s.icon className="w-3.5 h-3.5 text-primary-600 dark:text-primary-300" />
                            <span className="text-[12.5px] text-neutral-700 dark:text-neutral-200">{s.k}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </section>
);

const FinalCTA: React.FC = () => {
    const primary = usePrimaryCtaDest();
    return (
        <section className="relative py-20 sm:py-28 text-center max-w-3xl mx-auto px-6">
            <h2 className="text-[32px] sm:text-[44px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                Ready to ship like a <span className="brand-gradient-text">senior?</span>
            </h2>
            <p className="mt-3 text-[16px] text-neutral-600 dark:text-neutral-400">Free during the defense window. No credit card.</p>
            <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
                <Link to={primary.to}>
                    <Button variant="gradient" size="lg" leftIcon={<UserPlus className="w-4 h-4" />}>
                        {primary.to === '/register' ? 'Create account' : primary.label}
                    </Button>
                </Link>
                <Link to="/login">
                    <Button variant="glass" size="lg" leftIcon={<LogIn className="w-4 h-4" />}>
                        Sign in instead
                    </Button>
                </Link>
            </div>
        </section>
    );
};

const LandingFooter: React.FC = () => (
    <footer className="border-t border-neutral-200/60 dark:border-white/5 bg-white dark:bg-neutral-950/60 mt-6">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid md:grid-cols-[1fr_auto] gap-8 items-start">
            <div>
                <BrandLogo size="sm" />
                <div className="mt-4 text-[13.5px] text-neutral-600 dark:text-neutral-300 max-w-md">
                    Code Mentor — Benha University Faculty of Computers and AI · Class of 2026.
                </div>
                <div className="mt-1.5 text-[12.5px] text-neutral-500 dark:text-neutral-400">
                    Instructor: Prof. Mostafa El-Gendy · TA: Eng. Fatma Ibrahim
                </div>
            </div>
            <div className="flex items-center gap-4 md:self-center">
                <Link to="/privacy" className="text-[13px] text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-300 transition-colors">
                    Privacy
                </Link>
                <Link to="/terms" className="text-[13px] text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-300 transition-colors">
                    Terms
                </Link>
                <a
                    href="https://github.com/Omar-Anwar-Dev/Code-Mentor"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="GitHub repository"
                    className="w-9 h-9 rounded-xl glass flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                >
                    <Github className="w-4 h-4" />
                </a>
            </div>
        </div>
    </footer>
);

export const LandingPage: React.FC = () => (
    <div className="min-h-screen">
        <LandingNav />
        <main id="main-content">
            <HeroSection />
            <FeaturesSection />
            <JourneySection />
            <AuditTeaser />
            <FinalCTA />
        </main>
        <LandingFooter />
    </div>
);

export default LandingPage;
