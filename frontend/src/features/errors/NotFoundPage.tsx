import React, { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { setTheme } from '@/features/ui/uiSlice';
import { Button } from '@/components/ui';
import { Sparkles, Home, ClipboardList, CircleAlert, Sun, Moon } from 'lucide-react';

/**
 * S8-T11 + Sprint 13 T3: friendly 404 — 120-160px gradient "404" + floating
 * Sparkles + 2 CTAs, matching Pillar 2 misc.jsx reference.
 */
export const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { theme } = useAppSelector((s) => s.ui);
    const { isAuthenticated } = useAppSelector((s) => s.auth);

    useEffect(() => {
        const prev = document.title;
        document.title = 'Page not found · Code Mentor';
        return () => {
            document.title = prev;
        };
    }, []);

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* AnimatedBackground inline */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
                <div
                    className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse"
                    style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.45), rgba(168,85,247,0.4))', opacity: 0.7 }}
                />
                <div
                    className="absolute top-1/3 -right-24 w-[360px] h-[360px] rounded-full blur-3xl animate-pulse"
                    style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(59,130,246,0.35))', animationDelay: '1s', opacity: 0.7 }}
                />
                <div
                    className="absolute -bottom-32 left-1/4 w-[300px] h-[300px] rounded-full blur-3xl animate-pulse"
                    style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.35), rgba(249,115,22,0.3))', animationDelay: '2s', opacity: 0.6 }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)]" />
            </div>

            <Link to="/" className="fixed top-5 left-5 z-30 inline-flex items-center gap-2 no-print" aria-label="Home">
                <div className="w-8 h-8 rounded-xl brand-gradient-bg flex items-center justify-center text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
                    <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold tracking-tight text-[14px] brand-gradient-text">
                    CodeMentor<span className="text-neutral-400 dark:text-neutral-500 ml-1 font-normal">AI</span>
                </span>
            </Link>

            <button
                onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
                aria-label="Toggle theme"
                className="fixed top-5 right-5 z-30 w-9 h-9 rounded-xl glass flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors no-print"
            >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="relative flex flex-col items-center justify-center text-center min-h-screen px-6">
                <div className="relative inline-flex items-center justify-center">
                    <h1 className="text-[120px] sm:text-[160px] font-semibold tracking-tighter brand-gradient-text leading-none select-none">
                        404
                    </h1>
                    <span
                        className="absolute -top-1 right-[-10px] sm:right-[-14px] text-primary-400 animate-float pointer-events-none"
                        style={{ filter: 'drop-shadow(0 0 10px rgba(139,92,246,.7))' }}
                    >
                        <Sparkles className="w-7 h-7" />
                    </span>
                </div>
                <h2 className="mt-2 text-[24px] sm:text-[30px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                    We couldn't find that page.
                </h2>
                <p className="mt-3 text-[16px] text-neutral-600 dark:text-neutral-300 max-w-lg leading-relaxed">
                    It might've been moved, deleted, or maybe the URL has a typo. Try the homepage or browse the task library.
                </p>
                <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
                    <Button variant="gradient" size="lg" leftIcon={<Home className="w-4 h-4" />} onClick={() => navigate('/')}>
                        Go home
                    </Button>
                    {isAuthenticated && (
                        <Button
                            variant="glass"
                            size="lg"
                            leftIcon={<ClipboardList className="w-4 h-4" />}
                            onClick={() => navigate('/tasks')}
                        >
                            Browse tasks
                        </Button>
                    )}
                </div>
                <div className="mt-8 inline-flex items-center gap-2 font-mono text-[11.5px] text-neutral-500 dark:text-neutral-400">
                    <CircleAlert className="w-3 h-3" />
                    <span>
                        requested:{' '}
                        <span className="text-primary-700 dark:text-primary-300">{location.pathname}</span>
                    </span>
                </div>
            </div>
        </div>
    );
};
