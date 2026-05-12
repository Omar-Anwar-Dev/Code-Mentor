import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Github, LoaderCircle, ShieldCheck, KeyRound } from 'lucide-react';
import { useAppDispatch } from '@/app/store/hooks';
import { completeGitHubLoginThunk } from '@/features/auth/store/authSlice';
import { addToast } from '@/features/ui/store/uiSlice';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { Badge } from '@/components/ui';

// ADR-039: The backend's /api/auth/github/callback redirects here with the
// access/refresh tokens encoded in the URL fragment. We persist the tokens to
// Redux (which Redux Persist mirrors to localStorage), strip the fragment from
// the browser address bar, then route the user onward.
export const GitHubSuccessPage: React.FC = () => {
    useDocumentTitle('Signing in with GitHub…');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    // StrictMode double-invokes effects in dev — dedupe so we don't dispatch the
    // completion thunk twice and double-fetch /auth/me.
    const handled = useRef(false);
    const [pct, setPct] = useState(20);

    useEffect(() => {
        const id = window.setInterval(() => setPct((p) => (p < 90 ? p + 7 : p)), 220);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        const fragment = window.location.hash.startsWith('#')
            ? window.location.hash.slice(1)
            : window.location.hash;
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access');
        const refreshToken = params.get('refresh');

        // Strip the fragment immediately so the tokens never linger in browser
        // history or get exposed via window.location to extensions/back nav.
        window.history.replaceState(null, '', window.location.pathname);

        if (!accessToken || !refreshToken) {
            dispatch(addToast({
                type: 'error',
                title: 'GitHub sign-in failed',
                message: 'Missing authentication tokens. Please try again.',
            }));
            navigate('/login', { replace: true });
            return;
        }

        void dispatch(completeGitHubLoginThunk({ accessToken, refreshToken })).then((result) => {
            if (completeGitHubLoginThunk.fulfilled.match(result)) {
                const u = result.payload.user;
                const isAdmin = u.role === 'Admin';
                dispatch(addToast({
                    type: 'success',
                    title: 'Signed in with GitHub',
                    message: `Welcome${u.name ? `, ${u.name}` : ''}!`,
                }));
                const dest = isAdmin
                    ? '/admin'
                    : u.hasCompletedAssessment ? '/dashboard' : '/assessment';
                navigate(dest, { replace: true });
            } else {
                dispatch(addToast({
                    type: 'error',
                    title: 'GitHub sign-in failed',
                    message: (result.payload as string) ?? 'Could not complete GitHub sign-in.',
                }));
                navigate('/login', { replace: true });
            }
        });
    }, [dispatch, navigate]);

    return (
        <>
            <div className="glass-card p-8 sm:p-10 text-center flex flex-col items-center">
                <div className="relative mb-5">
                    <div className="w-20 h-20 rounded-2xl brand-gradient-bg flex items-center justify-center text-white animate-glow-pulse shadow-[0_18px_40px_-10px_rgba(139,92,246,.6)]">
                        <Sparkles className="w-9 h-9" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-neutral-900 flex items-center justify-center border border-neutral-200 dark:border-white/10">
                        <Github className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-200" />
                    </div>
                </div>
                <h2 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                    Signing you in via GitHub…
                </h2>
                <p className="mt-1.5 text-[13px] font-mono text-neutral-500 dark:text-neutral-400">
                    Capturing your access token securely…
                </p>

                <div className="mt-6 w-full h-1.5 rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
                    <div
                        className="h-full brand-gradient-bg transition-[width] duration-300 ease-out"
                        style={{ width: `${pct}%` }}
                    />
                </div>

                <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
                    <Badge variant="info" size="sm">
                        <LoaderCircle className="w-3 h-3 mr-1 animate-spin" />
                        handshake
                    </Badge>
                    <Badge variant="primary" size="sm">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        PKCE
                    </Badge>
                    <Badge variant="cyan" size="sm">
                        <KeyRound className="w-3 h-3 mr-1" />
                        scope: user:email
                    </Badge>
                </div>
            </div>

            <p className="mt-5 text-center font-mono text-[11.5px] text-neutral-500 dark:text-neutral-400">
                You should be redirected automatically. If nothing happens after 5 seconds,{' '}
                <button
                    onClick={() => navigate('/login', { replace: true })}
                    className="text-primary-600 dark:text-primary-300 hover:underline"
                >
                    click here to continue.
                </button>
            </p>
        </>
    );
};
