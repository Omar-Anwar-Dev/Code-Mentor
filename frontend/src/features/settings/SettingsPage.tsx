import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setTheme, toggleCompactMode } from '@/features/ui/uiSlice';
import { logoutThunk } from '@/features/auth/store/authSlice';
import { ProfileEditSection } from '@/features/profile/ProfileEditSection';
import { Card, Button } from '@/components/ui';
import { Sun, Moon, Monitor, ArrowLeft, LogOut, ExternalLink, Info } from 'lucide-react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

/**
 * Lean honest Settings — only what's actually wired to a backend or a persisted UI store.
 * Replaces the Sprint 1 page (~860 LoC) which was 90 % fake toggles ("Save changes" calls
 * that did nothing). Notification preferences, privacy toggles, connected-accounts management,
 * and data-export/delete are deferred to a future sprint with a real `UserSettings` table +
 * endpoints. The honest banner below tells users that.
 */
export const SettingsPage: React.FC = () => {
    useDocumentTitle('Settings');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const theme = useAppSelector(s => s.ui.theme);
    const compactMode = useAppSelector(s => s.ui.compactMode);
    const user = useAppSelector(s => s.auth.user);

    const handleSignOut = async () => {
        try {
            await dispatch(logoutThunk()).unwrap();
        } finally {
            navigate('/login', { replace: true });
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <Link to="/dashboard" className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors" aria-label="Back to dashboard">
                    <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Settings</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Account, appearance, and session controls.</p>
                </div>
            </div>

            {/* Honest scope banner */}
            <Card className="p-4 mb-6 border-info-200 dark:border-info-900/40 bg-info-50/60 dark:bg-info-900/10">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-info-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-sm">
                        <p className="font-semibold text-info-800 dark:text-info-300 mb-1">What's wired today</p>
                        <p className="text-info-700 dark:text-info-400">
                            Profile fields and appearance preferences below persist for real. Notification preferences,
                            privacy toggles, connected-accounts, and data export/delete need a future <code className="px-1 rounded bg-info-100/60 dark:bg-info-900/30">UserSettings</code> backend — not in MVP.
                            CV privacy is on the <Link to="/cv/me" className="underline font-medium">Learning CV</Link> page.
                        </p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Profile (real, S2-T11 wired) */}
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">Profile</h2>
                    <ProfileEditSection />
                </div>

                {/* Appearance (real, persisted via Redux Persist) */}
                <Card className="p-5">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Appearance</h2>

                    <div className="mb-5">
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Theme</p>
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                { id: 'light', label: 'Light', icon: Sun },
                                { id: 'dark', label: 'Dark', icon: Moon },
                            ] as const).map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => dispatch(setTheme(t.id))}
                                    aria-pressed={theme === t.id}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors ${theme === t.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'}`}
                                >
                                    <t.icon className={`w-5 h-5 ${theme === t.id ? 'text-primary-600' : 'text-neutral-500'}`} aria-hidden="true" />
                                    <span className={`text-xs font-medium ${theme === t.id ? 'text-primary-600' : 'text-neutral-600 dark:text-neutral-400'}`}>{t.label}</span>
                                </button>
                            ))}
                            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 opacity-60" title="Coming soon">
                                <Monitor className="w-5 h-5 text-neutral-400" aria-hidden="true" />
                                <span className="text-xs font-medium text-neutral-400">System</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        <div className="min-w-0">
                            <p className="font-medium text-neutral-900 dark:text-white text-sm">Compact mode</p>
                            <p className="text-xs text-neutral-500">Tighter spacing across the app.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => dispatch(toggleCompactMode())}
                            aria-pressed={compactMode}
                            aria-label="Toggle compact mode"
                            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${compactMode ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${compactMode ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </Card>

                {/* Account / Session */}
                <Card className="p-5">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Account</h2>

                    <div className="space-y-2 mb-5 text-sm">
                        <div className="flex justify-between gap-2">
                            <span className="text-neutral-500">Email</span>
                            <span className="font-medium text-neutral-900 dark:text-white truncate">{user?.email ?? '—'}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-neutral-500">Role</span>
                            <span className="font-medium text-neutral-900 dark:text-white">{user?.role ?? '—'}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-neutral-500">Joined</span>
                            <span className="font-medium text-neutral-900 dark:text-white">
                                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Link to="/cv/me">
                            <Button variant="outline" className="w-full justify-between" rightIcon={<ExternalLink className="w-4 h-4" />}>
                                Manage Learning CV
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            rightIcon={<LogOut className="w-4 h-4" />}
                            onClick={handleSignOut}
                        >
                            Sign out
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};
