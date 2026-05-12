import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAppDispatch } from '@/app/store/hooks';
import { completeGitHubLoginThunk } from '@/features/auth/store/authSlice';
import { addToast } from '@/features/ui/store/uiSlice';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

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
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-purple-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 px-4">
            <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-lg">
                    <Sparkles className="h-8 w-8 animate-pulse text-white" />
                </div>
                <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Finishing your GitHub sign-in…
                </h1>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    Hang tight, this only takes a moment.
                </p>
            </div>
        </div>
    );
};
