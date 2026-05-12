import React from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { setTheme } from '@/features/ui/uiSlice';
import { ToastContainer } from '@/components/ui/Toast';
import { Sparkles, Sun, Moon, ArrowLeft } from 'lucide-react';

const AnimatedBackground: React.FC = () => (
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
        <span className="absolute left-[18%] top-[28%] w-1.5 h-1.5 rounded-full bg-primary-400 animate-float opacity-60" />
        <span className="absolute right-[22%] top-[60%] w-1.5 h-1.5 rounded-full bg-secondary-400 animate-float opacity-50" style={{ animationDelay: '2.5s' }} />
        <span className="absolute left-[45%] bottom-[14%] w-2 h-2 rounded-full bg-fuchsia-400 animate-float opacity-50" style={{ animationDelay: '4s' }} />
    </div>
);

const BrandLogo: React.FC = () => (
    <div className="inline-flex items-center gap-3">
        <div
            className="rounded-xl brand-gradient-bg flex items-center justify-center text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]"
            style={{ width: 40, height: 40 }}
        >
            <Sparkles className="w-[18px] h-[18px]" />
        </div>
        <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight text-[17px] brand-gradient-text">
                CodeMentor<span className="text-neutral-400 dark:text-neutral-500 ml-1 font-normal">AI</span>
            </span>
        </div>
    </div>
);

const ThemeToggle: React.FC = () => {
    const dispatch = useAppDispatch();
    const { theme } = useAppSelector((s) => s.ui);
    return (
        <button
            onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
            aria-label="Toggle theme"
            className="w-9 h-9 rounded-xl glass flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
        >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
    );
};

export const AuthLayout: React.FC = () => {
    const location = useLocation();
    const { isAuthenticated, user } = useAppSelector((s) => s.auth);

    // Already-authenticated users should never see /login or /register again
    // (but GitHubSuccess needs to mount even when isAuthenticated is becoming true).
    const isGitHubCallback = location.pathname.startsWith('/auth/github');
    if (isAuthenticated && user && !isGitHubCallback) {
        const dest = user.role === 'Admin'
            ? '/admin'
            : user.hasCompletedAssessment ? '/dashboard' : '/assessment';
        return <Navigate to={dest} replace />;
    }

    const footerLink = isGitHubCallback ? (
        <Link to="/login" className="hover:text-primary-600 dark:hover:text-primary-300">
            Cancel sign-in
        </Link>
    ) : (
        <Link to="/" className="hover:text-primary-600 dark:hover:text-primary-300 inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3 h-3" /> Back to home
        </Link>
    );

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-5 sm:py-6 overflow-hidden">
            <AnimatedBackground />
            <div className="relative flex flex-col items-center w-full">
                <div className="mb-4">
                    <BrandLogo />
                </div>
                <div className="w-full max-w-md">
                    <Outlet />
                </div>
                <div className="mt-4 flex items-center gap-4 text-[13px] text-neutral-500 dark:text-neutral-400">
                    {footerLink}
                    <span className="opacity-50">·</span>
                    <ThemeToggle />
                </div>
            </div>
            <ToastContainer />
        </div>
    );
};
