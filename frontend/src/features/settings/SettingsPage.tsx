// Sprint 13 T8: SettingsPage — Pillar 7 visuals.
// Back link in glass tile + brand-gradient header + owner-locked CYAN banner (byte-identical copy)
// + 2-col grid (ProfileEditSection full-width + Appearance + Account, all in glass-card).

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setTheme, toggleCompactMode } from '@/features/ui/uiSlice';
import { logoutThunk } from '@/features/auth/store/authSlice';
import { ProfileEditSection } from '@/features/profile/ProfileEditSection';
import { Button } from '@/components/ui';
import { Sun, Moon, Monitor, ArrowLeft, LogOut, ExternalLink, Info } from 'lucide-react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

/**
 * Lean honest Settings — only what's actually wired to a backend or a persisted UI store.
 * Replaces the Sprint 1 page (~860 LoC) which was 90 % fake toggles ("Save changes" calls
 * that did nothing). Notification preferences, privacy toggles, connected-accounts management,
 * and data-export/delete are deferred to a future sprint with a real `UserSettings` table +
 * endpoints. The honest banner below tells users that.
 *
 * Sprint 13 T8: ported to Pillar 7 Neon & Glass visuals. The cyan banner copy is owner-locked
 * and must remain byte-identical to the Pillar 7 preview.
 */
export const SettingsPage: React.FC = () => {
    useDocumentTitle('Settings');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const theme = useAppSelector((s) => s.ui.theme);
    const compactMode = useAppSelector((s) => s.ui.compactMode);
    const user = useAppSelector((s) => s.auth.user);

    const handleSignOut = async () => {
        try {
            await dispatch(logoutThunk()).unwrap();
        } finally {
            navigate('/login', { replace: true });
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            {/* Header with glass back tile */}
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to="/dashboard"
                    className="w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
                    aria-label="Back to dashboard"
                >
                    <ArrowLeft className="w-4 h-4 text-neutral-600 dark:text-neutral-300" aria-hidden />
                </Link>
                <div>
                    <h1 className="text-[24px] font-bold tracking-tight brand-gradient-text">Settings</h1>
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                        Account, appearance, and session controls.
                    </p>
                </div>
            </div>

            {/* Honest scope banner (cyan, owner-locked copy — byte-identical to Pillar 7 preview) */}
            <div className="glass-card border-cyan-200/60 dark:border-cyan-900/40 p-4 mb-6">
                <div className="flex items-start gap-3">
                    <Info
                        className="w-[18px] h-[18px] text-cyan-500 dark:text-cyan-300 shrink-0 mt-0.5"
                        aria-hidden
                    />
                    <div className="text-[13px] text-neutral-700 dark:text-neutral-200">
                        <p className="font-semibold text-cyan-700 dark:text-cyan-200 mb-1">What's wired today</p>
                        <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                            Profile fields and appearance preferences below persist for real. Notification preferences,
                            privacy toggles, connected-accounts, and data export/delete need a future{' '}
                            <code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded bg-cyan-100/60 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-200">
                                UserSettings
                            </code>{' '}
                            backend — not in MVP. CV privacy is on the{' '}
                            <Link
                                to="/cv/me"
                                className="underline font-medium hover:text-primary-600 dark:hover:text-primary-300"
                            >
                                Learning CV
                            </Link>{' '}
                            page.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Profile (real, S2-T11 wired) */}
                <div className="lg:col-span-2">
                    <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 mb-3">
                        Profile
                    </h2>
                    <ProfileEditSection />
                </div>

                {/* Appearance (real, persisted via Redux Persist) */}
                <div className="glass-card p-5">
                    <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                        Appearance
                    </h2>

                    <div className="mb-5">
                        <p className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                            Theme
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {(
                                [
                                    { id: 'light', label: 'Light', icon: Sun },
                                    { id: 'dark', label: 'Dark', icon: Moon },
                                ] as const
                            ).map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => dispatch(setTheme(t.id))}
                                    aria-pressed={theme === t.id}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors ${
                                        theme === t.id
                                            ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-500/15'
                                            : 'border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20'
                                    }`}
                                >
                                    <t.icon
                                        className={`w-[18px] h-[18px] ${
                                            theme === t.id
                                                ? 'text-primary-600 dark:text-primary-300'
                                                : 'text-neutral-500 dark:text-neutral-400'
                                        }`}
                                        aria-hidden
                                    />
                                    <span
                                        className={`text-[11.5px] font-medium ${
                                            theme === t.id
                                                ? 'text-primary-700 dark:text-primary-200'
                                                : 'text-neutral-600 dark:text-neutral-300'
                                        }`}
                                    >
                                        {t.label}
                                    </span>
                                </button>
                            ))}
                            <div
                                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-neutral-200 dark:border-white/10 opacity-55"
                                title="Coming soon"
                            >
                                <Monitor className="w-[18px] h-[18px] text-neutral-400 dark:text-neutral-500" aria-hidden />
                                <span className="text-[11.5px] font-medium text-neutral-400 dark:text-neutral-500">
                                    System
                                </span>
                                <span className="text-[9px] uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500">
                                    Soon
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-white/10">
                        <div className="min-w-0">
                            <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">
                                Compact mode
                            </p>
                            <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400">
                                Tighter spacing across the app.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => dispatch(toggleCompactMode())}
                            aria-pressed={compactMode}
                            aria-label="Toggle compact mode"
                            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                                compactMode ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'
                            }`}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    compactMode ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Account / Session */}
                <div className="glass-card p-5">
                    <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                        Account
                    </h2>

                    <div className="space-y-2 mb-5 text-[13px]">
                        <div className="flex justify-between gap-2">
                            <span className="text-neutral-500 dark:text-neutral-400">Email</span>
                            <span className="font-medium text-neutral-900 dark:text-neutral-50 truncate font-mono text-[12.5px]">
                                {user?.email ?? '—'}
                            </span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-neutral-500 dark:text-neutral-400">Role</span>
                            <span className="font-medium text-neutral-900 dark:text-neutral-50">
                                {user?.role ?? '—'}
                            </span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-neutral-500 dark:text-neutral-400">Joined</span>
                            <span className="font-medium text-neutral-900 dark:text-neutral-50">
                                {user?.createdAt
                                    ? new Date(user.createdAt).toLocaleDateString(undefined, {
                                          month: 'long',
                                          year: 'numeric',
                                      })
                                    : '—'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Link to="/cv/me">
                            <Button
                                variant="outline"
                                size="md"
                                rightIcon={<ExternalLink className="w-4 h-4" />}
                                className="w-full justify-between"
                            >
                                Manage Learning CV
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            size="md"
                            rightIcon={<LogOut className="w-4 h-4" />}
                            className="w-full justify-between"
                            onClick={handleSignOut}
                        >
                            Sign out
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
