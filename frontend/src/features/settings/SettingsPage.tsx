// Sprint 14 T10: SettingsPage expanded to wire all 4 new backend surfaces from Sprint 14:
//   - Notification preferences (T2 + T5)
//   - Privacy toggles (T6)
//   - Connected Accounts (T7)
//   - Data Export + Account Delete (T8 + T9)
//
// The Sprint-13 cyan "What's wired today" banner is REMOVED — the new sections are the
// affirmation; carrying the "honest gap" disclosure forward would now be misleading.
// (Owner can re-add a success banner at the T11 walkthrough if desired — draft options
// proposed at the bottom of the T10 progress entry.)

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setTheme, toggleCompactMode, addToast } from '@/features/ui/uiSlice';
import { logoutThunk } from '@/features/auth/store/authSlice';
import { ProfileEditSection } from '@/features/profile/ProfileEditSection';
import { Button } from '@/components/ui';
import {
    Sun, Moon, Monitor, ArrowLeft, LogOut, ExternalLink, Bell, Shield, Github,
    Download, Trash2, AlertTriangle, Lock, Loader2, CheckCircle2, Mail,
} from 'lucide-react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { authApi } from '@/features/auth/api/authApi';
import {
    settingsApi,
    type UserSettingsDto,
    type UserSettingsPatchRequest,
    type DeletionRequestStatus,
} from './api/settingsApi';

// =============================================================================
// Component
// =============================================================================

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
            {/* Header */}
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
                        Notifications, privacy, connected accounts, data, and session controls.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Profile (existing — Sprint 2-T11 wired) */}
                <div className="lg:col-span-2">
                    <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 mb-3">Profile</h2>
                    <ProfileEditSection />
                </div>

                {/* NEW S14-T10: Notification preferences */}
                <div className="lg:col-span-2">
                    <NotificationPrefsSection />
                </div>

                {/* NEW S14-T10: Privacy toggles */}
                <div className="lg:col-span-2">
                    <PrivacyTogglesSection />
                </div>

                {/* NEW S14-T10: Connected Accounts */}
                <div className="lg:col-span-2">
                    <ConnectedAccountsSection />
                </div>

                {/* Appearance (existing — Redux Persist) */}
                <div className="glass-card p-5">
                    <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 mb-4">Appearance</h2>

                    <div className="mb-5">
                        <p className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-200 mb-2">Theme</p>
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                { id: 'light', label: 'Light', icon: Sun },
                                { id: 'dark', label: 'Dark', icon: Moon },
                            ] as const).map((t) => (
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
                                    <t.icon className={`w-[18px] h-[18px] ${
                                        theme === t.id ? 'text-primary-600 dark:text-primary-300' : 'text-neutral-500 dark:text-neutral-400'
                                    }`} aria-hidden />
                                    <span className={`text-[11.5px] font-medium ${
                                        theme === t.id ? 'text-primary-700 dark:text-primary-200' : 'text-neutral-600 dark:text-neutral-300'
                                    }`}>{t.label}</span>
                                </button>
                            ))}
                            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-neutral-200 dark:border-white/10 opacity-55" title="Coming soon">
                                <Monitor className="w-[18px] h-[18px] text-neutral-400 dark:text-neutral-500" aria-hidden />
                                <span className="text-[11.5px] font-medium text-neutral-400 dark:text-neutral-500">System</span>
                                <span className="text-[9px] uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500">Soon</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-white/10">
                        <div className="min-w-0">
                            <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">Compact mode</p>
                            <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400">Tighter spacing across the app.</p>
                        </div>
                        <Switch
                            checked={compactMode}
                            onChange={() => dispatch(toggleCompactMode())}
                            label="Toggle compact mode"
                        />
                    </div>
                </div>

                {/* Account (existing) */}
                <div className="glass-card p-5">
                    <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 mb-4">Account</h2>

                    <div className="space-y-2 mb-5 text-[13px]">
                        <div className="flex justify-between gap-2">
                            <span className="text-neutral-500 dark:text-neutral-400">Email</span>
                            <span className="font-medium text-neutral-900 dark:text-neutral-50 truncate font-mono text-[12.5px]">{user?.email ?? '—'}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-neutral-500 dark:text-neutral-400">Role</span>
                            <span className="font-medium text-neutral-900 dark:text-neutral-50">{user?.role ?? '—'}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-neutral-500 dark:text-neutral-400">Joined</span>
                            <span className="font-medium text-neutral-900 dark:text-neutral-50">
                                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Link to="/cv/me">
                            <Button variant="outline" size="md" rightIcon={<ExternalLink className="w-4 h-4" />} className="w-full justify-between">
                                Manage Learning CV
                            </Button>
                        </Link>
                        <Button variant="outline" size="md" rightIcon={<LogOut className="w-4 h-4" />} className="w-full justify-between" onClick={handleSignOut}>
                            Sign out
                        </Button>
                    </div>
                </div>

                {/* NEW S14-T10: Data export + Danger Zone */}
                <div className="lg:col-span-2">
                    <DataAndDangerZoneSection />
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// Section: Notification preferences (S14-T2 + T5)
// =============================================================================

interface PrefRow {
    label: string;
    helper: string;
    emailKey: keyof Pick<UserSettingsDto, 'notifSubmissionEmail' | 'notifAuditEmail' | 'notifWeaknessEmail' | 'notifBadgeEmail' | 'notifSecurityEmail'>;
    inAppKey: keyof Pick<UserSettingsDto, 'notifSubmissionInApp' | 'notifAuditInApp' | 'notifWeaknessInApp' | 'notifBadgeInApp' | 'notifSecurityInApp'>;
    alwaysOn?: boolean;
}

const PREF_ROWS: PrefRow[] = [
    { label: 'Submission feedback', helper: 'When your AI code review is ready.', emailKey: 'notifSubmissionEmail', inAppKey: 'notifSubmissionInApp' },
    { label: 'Project audit complete', helper: 'When your full-project audit finishes.', emailKey: 'notifAuditEmail', inAppKey: 'notifAuditInApp' },
    { label: 'Recurring weakness', helper: 'When the same pattern shows up in 3 of your last 5 reviews.', emailKey: 'notifWeaknessEmail', inAppKey: 'notifWeaknessInApp' },
    { label: 'Badge earned / Level up', helper: 'When you unlock a new badge or level.', emailKey: 'notifBadgeEmail', inAppKey: 'notifBadgeInApp' },
    { label: 'Account security', helper: 'Login from new device, password changed, account events. Always on.', emailKey: 'notifSecurityEmail', inAppKey: 'notifSecurityInApp', alwaysOn: true },
];

const NotificationPrefsSection: React.FC = () => {
    const dispatch = useAppDispatch();
    const [settings, setSettings] = useState<UserSettingsDto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        settingsApi.getSettings()
            .then((s) => { if (!cancelled) { setSettings(s); setLoading(false); } })
            .catch(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const togglePref = useCallback(async (key: keyof UserSettingsDto, current: boolean) => {
        if (!settings) return;
        const next = !current;
        // Optimistic update
        setSettings({ ...settings, [key]: next });
        try {
            const patch = { [key]: next } as UserSettingsPatchRequest;
            const updated = await settingsApi.patchSettings(patch);
            setSettings(updated);
        } catch {
            // Revert + notify
            setSettings(settings);
            dispatch(addToast({ type: 'error', title: 'Could not update preference', message: 'Please try again.' }));
        }
    }, [settings, dispatch]);

    return (
        <div className="glass-card p-5">
            <div className="flex items-start gap-3 mb-4">
                <Bell className="w-5 h-5 text-primary-500 dark:text-primary-300 mt-0.5" aria-hidden />
                <div>
                    <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Notifications</h2>
                    <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">Pick where each kind of notification reaches you.</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Loading preferences…
                </div>
            ) : !settings ? (
                <div className="text-[13px] text-red-600 dark:text-red-400 py-4">Couldn't load preferences. Reload the page to retry.</div>
            ) : (
                <div className="overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-2 text-[12px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400 pb-2 border-b border-neutral-200 dark:border-white/10 mb-2">
                        <div>Event</div>
                        <div className="text-center"><Mail className="w-3.5 h-3.5 inline mr-1" aria-hidden />Email</div>
                        <div className="text-center"><Bell className="w-3.5 h-3.5 inline mr-1" aria-hidden />In-app</div>
                    </div>
                    {PREF_ROWS.map((row) => (
                        <div key={row.label} className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-1 items-center py-2.5 border-b last:border-b-0 border-neutral-100 dark:border-white/5">
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">{row.label}</p>
                                <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400">{row.helper}</p>
                            </div>
                            <Checkbox
                                checked={settings[row.emailKey]}
                                onChange={() => togglePref(row.emailKey, settings[row.emailKey])}
                                disabled={row.alwaysOn}
                                label={`${row.label} email`}
                            />
                            <Checkbox
                                checked={settings[row.inAppKey]}
                                onChange={() => togglePref(row.inAppKey, settings[row.inAppKey])}
                                disabled={row.alwaysOn}
                                label={`${row.label} in-app`}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// =============================================================================
// Section: Privacy toggles (S14-T6)
// =============================================================================

const PrivacyTogglesSection: React.FC = () => {
    const dispatch = useAppDispatch();
    const [settings, setSettings] = useState<UserSettingsDto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        settingsApi.getSettings()
            .then((s) => { if (!cancelled) { setSettings(s); setLoading(false); } })
            .catch(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const toggle = async (key: 'profileDiscoverable' | 'publicCvDefault' | 'showInLeaderboard') => {
        if (!settings) return;
        const next = !settings[key];
        setSettings({ ...settings, [key]: next });
        try {
            const updated = await settingsApi.patchSettings({ [key]: next });
            setSettings(updated);
        } catch {
            setSettings(settings);
            dispatch(addToast({ type: 'error', title: 'Could not update privacy setting' }));
        }
    };

    const rows: Array<{ key: 'profileDiscoverable' | 'publicCvDefault' | 'showInLeaderboard'; label: string; helper: string }> = [
        { key: 'profileDiscoverable', label: 'Profile discoverable', helper: 'Off hides your public CV page from anyone with the link (acts as a master kill switch).' },
        { key: 'publicCvDefault', label: 'New CVs default to public', helper: 'When on, your next Learning CV creation auto-publishes with a shareable link.' },
        { key: 'showInLeaderboard', label: 'Show in leaderboard', helper: 'Reserved for the post-MVP leaderboard surface. No current effect.' },
    ];

    return (
        <div className="glass-card p-5">
            <div className="flex items-start gap-3 mb-4">
                <Shield className="w-5 h-5 text-emerald-500 dark:text-emerald-300 mt-0.5" aria-hidden />
                <div>
                    <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Privacy</h2>
                    <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">Control who can see your public surfaces.</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Loading…
                </div>
            ) : !settings ? (
                <div className="text-[13px] text-red-600 dark:text-red-400 py-4">Couldn't load privacy settings.</div>
            ) : (
                <div>
                    {rows.map((r) => (
                        <div key={r.key} className="flex items-center justify-between py-3 border-b last:border-b-0 border-neutral-100 dark:border-white/5">
                            <div className="min-w-0 pr-4">
                                <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">{r.label}</p>
                                <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400">{r.helper}</p>
                            </div>
                            <Switch checked={settings[r.key]} onChange={() => toggle(r.key)} label={r.label} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// =============================================================================
// Section: Connected Accounts (S14-T7)
// =============================================================================

const ConnectedAccountsSection: React.FC = () => {
    const dispatch = useAppDispatch();
    // Redux store's User model doesn't carry gitHubUsername; fetch via /api/auth/me to know
    // the current link state (Sprint 14 backend reads the same field).
    const [githubLogin, setGithubLogin] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [unlinking, setUnlinking] = useState(false);
    const [showSafetyModal, setShowSafetyModal] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        authApi.me()
            .then((me) => { if (!cancelled) { setGithubLogin(me.gitHubUsername ?? null); setLoading(false); } })
            .catch(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    // S14-T7 hotfix (2026-05-13 walkthrough): backend redirects to /settings#github-link=ok|err&detail=...
    // after the GitHub link callback. Read it once on mount, show a toast,
    // strip the fragment so it doesn't replay on refresh.
    useEffect(() => {
        const hash = window.location.hash.startsWith('#')
            ? window.location.hash.slice(1)
            : window.location.hash;
        if (!hash) return;
        const params = new URLSearchParams(hash);
        const status = params.get('github-link');
        if (!status) return;
        const detail = params.get('detail') ?? '';
        if (status === 'ok') {
            dispatch(addToast({
                type: 'success',
                title: 'GitHub linked',
                message: detail ? `Linked as @${detail}.` : 'Your GitHub account is now linked.',
            }));
            authApi.me().then((me) => setGithubLogin(me.gitHubUsername ?? null)).catch(() => {});
        } else {
            dispatch(addToast({
                type: 'error',
                title: 'GitHub link failed',
                message: detail || 'GitHub authorization did not complete. Please try again.',
            }));
        }
        window.history.replaceState(null, '', window.location.pathname);
    }, [dispatch]);

    const isLinked = Boolean(githubLogin);

    const handleLink = async () => {
        try {
            const { authorizeUrl } = await settingsApi.initiateGitHubLink();
            window.location.href = authorizeUrl;
        } catch (err: any) {
            const msg = err?.response?.status === 503 ? 'GitHub OAuth isn\'t configured on this environment.' : 'Could not start GitHub link.';
            dispatch(addToast({ type: 'error', title: msg }));
        }
    };

    const handleUnlink = async () => {
        if (!confirm('Disconnect GitHub from your Code Mentor account?')) return;
        setUnlinking(true);
        try {
            const res = await settingsApi.unlinkGitHub();
            if (res.unlinked) {
                setGithubLogin(null);
                dispatch(addToast({ type: 'success', title: 'GitHub disconnected' }));
            } else {
                setGithubLogin(null);
                dispatch(addToast({ type: 'info', title: 'Already disconnected' }));
            }
        } catch (err: any) {
            // S14-T7 safety guard: 409 with set_password_first
            if (err?.response?.status === 409) {
                const body = err?.response?.data ?? err?.body;
                if (body?.error === 'set_password_first') {
                    setShowSafetyModal(body.message ?? 'Set a password on your account before disconnecting GitHub — otherwise you won\'t be able to log back in.');
                    return;
                }
            }
            dispatch(addToast({ type: 'error', title: 'Could not disconnect GitHub' }));
        } finally {
            setUnlinking(false);
        }
    };

    return (
        <div className="glass-card p-5">
            <div className="flex items-start gap-3 mb-4">
                <Github className="w-5 h-5 text-neutral-700 dark:text-neutral-200 mt-0.5" aria-hidden />
                <div>
                    <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Connected Accounts</h2>
                    <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">External providers linked to your account.</p>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white/10 flex items-center justify-center shrink-0">
                        <Github className="w-5 h-5 text-white" aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">GitHub</p>
                        {loading ? (
                            <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400">Checking link status…</p>
                        ) : isLinked ? (
                            <p className="text-[11.5px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" aria-hidden /> Linked as <span className="font-mono">@{githubLogin}</span>
                            </p>
                        ) : (
                            <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400">Not connected. Linking lets Code Mentor fetch your repos for review.</p>
                        )}
                    </div>
                </div>
                {isLinked ? (
                    <Button variant="outline" size="sm" onClick={handleUnlink} disabled={unlinking}>
                        {unlinking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disconnect'}
                    </Button>
                ) : (
                    <Button variant="primary" size="sm" onClick={handleLink}>Connect</Button>
                )}
            </div>

            {showSafetyModal && (
                <ConfirmOverlay
                    icon={<Lock className="w-6 h-6 text-amber-500" aria-hidden />}
                    title="Set a password first"
                    body={showSafetyModal}
                    confirmLabel="Got it"
                    onConfirm={() => setShowSafetyModal(null)}
                    onCancel={() => setShowSafetyModal(null)}
                    confirmVariant="primary"
                    singleAction
                />
            )}
        </div>
    );
};

// =============================================================================
// Section: Data export + Danger Zone (S14-T8 + T9)
// =============================================================================

const DataAndDangerZoneSection: React.FC = () => {
    const dispatch = useAppDispatch();
    const user = useAppSelector((s) => s.auth.user);
    const [exportRequesting, setExportRequesting] = useState(false);
    const [deletionStatus, setDeletionStatus] = useState<DeletionRequestStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmEmail, setConfirmEmail] = useState('');
    const [deleteRequesting, setDeleteRequesting] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        let cancelled = false;
        settingsApi.getAccountDeletionStatus()
            .then((s) => { if (!cancelled) { setDeletionStatus(s); setStatusLoading(false); } })
            .catch(() => { if (!cancelled) setStatusLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const handleExport = async () => {
        setExportRequesting(true);
        try {
            await settingsApi.requestDataExport();
            // S14-T11 hotfix (2026-05-13 walkthrough): the download arrives as an
            // in-app notification (NOT a direct file download). Make this explicit
            // in the toast so the user knows to watch the bell.
            dispatch(addToast({
                type: 'success',
                title: 'Data export started',
                message: 'Watch the bell icon — your download link will appear in a notification within ~30 seconds.',
            }));
            // Ping the bell to refetch in seconds, not minutes. The default 60s
            // poll is too slow — users perceived "nothing happened" and re-clicked
            // 4×, queueing 4 separate exports.
            const ping = () => window.dispatchEvent(new CustomEvent('cm:notifications-refresh'));
            window.setTimeout(ping, 1_500);
            window.setTimeout(ping, 8_000);
            window.setTimeout(ping, 20_000);
            // Keep the button disabled for 10s after success — prevents rapid
            // re-click ZIP duplication while waiting for the bell.
            window.setTimeout(() => setExportRequesting(false), 10_000);
            return;
        } catch {
            dispatch(addToast({ type: 'error', title: 'Could not start data export' }));
            setExportRequesting(false);
        }
    };

    const handleDeleteSubmit = async () => {
        if (confirmEmail !== user?.email) return; // shouldn't happen — button gated
        setDeleteRequesting(true);
        try {
            const res = await settingsApi.requestAccountDeletion();
            setDeletionStatus(res.status);
            setShowDeleteModal(false);
            setConfirmEmail('');
            dispatch(addToast({ type: 'info', title: 'Account scheduled for deletion', message: res.message }));
        } catch {
            dispatch(addToast({ type: 'error', title: 'Could not request deletion' }));
        } finally {
            setDeleteRequesting(false);
        }
    };

    const handleCancelDeletion = async () => {
        setCancelling(true);
        try {
            const res = await settingsApi.cancelAccountDeletion();
            if (res.cancelled) {
                dispatch(addToast({ type: 'success', title: 'Deletion cancelled', message: 'Your account is back to active.' }));
                setDeletionStatus({ requestId: null, hasActiveRequest: false, requestedAt: null, hardDeleteAtUtc: null, reason: null });
            }
        } catch {
            dispatch(addToast({ type: 'error', title: 'Could not cancel deletion' }));
        } finally {
            setCancelling(false);
        }
    };

    const pending = deletionStatus?.hasActiveRequest;

    return (
        <div className="space-y-6">
            {/* Data section */}
            <div className="glass-card p-5">
                <div className="flex items-start gap-3 mb-4">
                    <Download className="w-5 h-5 text-cyan-500 dark:text-cyan-300 mt-0.5" aria-hidden />
                    <div>
                        <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Your data</h2>
                        <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                            Download a copy of everything tied to your account — submissions, audits, assessments, badges, notifications.
                        </p>
                    </div>
                </div>

                <Button variant="outline" size="md" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport} disabled={exportRequesting}>
                    {exportRequesting ? 'Export queued — watch the bell' : 'Download my data'}
                </Button>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2">
                    The export is built in the background (usually under a minute). A notification with a 1-hour download link will appear in the bell icon at the top of the page — and you'll also get an email if email is configured.
                </p>
            </div>

            {/* Danger zone */}
            <div className="glass-card border-red-200/60 dark:border-red-900/40 p-5">
                <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5" aria-hidden />
                    <div>
                        <h2 className="text-[16px] font-semibold text-red-700 dark:text-red-300">Danger zone</h2>
                        <p className="text-[12.5px] text-neutral-600 dark:text-neutral-300">
                            Account deletion has a 30-day cooling-off window. Log back in any time during those 30 days to cancel.
                        </p>
                    </div>
                </div>

                {statusLoading ? (
                    <div className="flex items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Checking deletion status…
                    </div>
                ) : pending ? (
                    <div className="bg-red-50/60 dark:bg-red-500/10 border border-red-200/60 dark:border-red-900/40 rounded-lg p-4">
                        <p className="text-[13px] font-medium text-red-700 dark:text-red-300 mb-1">Your account is scheduled for deletion</p>
                        <p className="text-[12px] text-neutral-700 dark:text-neutral-200">
                            Hard-delete fires on{' '}
                            <strong>{new Date(deletionStatus!.hardDeleteAtUtc!).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}</strong>{' '}
                            UTC unless you cancel. Logging out and back in also cancels.
                        </p>
                        <div className="mt-3">
                            <Button variant="primary" size="sm" onClick={handleCancelDeletion} disabled={cancelling}>
                                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel deletion'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button variant="outline" size="md" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setShowDeleteModal(true)} className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-500/10">
                        Delete my account
                    </Button>
                )}
            </div>

            {showDeleteModal && (
                <ConfirmOverlay
                    icon={<AlertTriangle className="w-6 h-6 text-red-500" aria-hidden />}
                    title="Delete your account?"
                    body={
                        <div className="space-y-3 text-left">
                            <p>Your account will be soft-deleted now and permanently deleted in 30 days unless you log back in.</p>
                            <ul className="text-[12.5px] list-disc pl-5 text-neutral-600 dark:text-neutral-300 space-y-1">
                                <li>Your public CV page will return 404 immediately.</li>
                                <li>After 30 days: your submissions stay anonymized (UserId removed); everything else is purged.</li>
                                <li>Logging in any time before the 30 days cancels the deletion automatically.</li>
                            </ul>
                            <div className="mt-4">
                                <label htmlFor="confirm-email" className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                                    Type your email to confirm
                                </label>
                                <input
                                    id="confirm-email"
                                    type="email"
                                    value={confirmEmail}
                                    onChange={(e) => setConfirmEmail(e.target.value)}
                                    placeholder={user?.email ?? ''}
                                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-white/10 bg-white dark:bg-neutral-900 text-[13px] font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                    autoFocus
                                />
                            </div>
                        </div>
                    }
                    confirmLabel={deleteRequesting ? 'Deleting…' : 'Delete account'}
                    onConfirm={handleDeleteSubmit}
                    onCancel={() => { setShowDeleteModal(false); setConfirmEmail(''); }}
                    confirmDisabled={confirmEmail !== user?.email || deleteRequesting}
                    confirmVariant="danger"
                />
            )}
        </div>
    );
};

// =============================================================================
// Primitives: Checkbox, Switch, ConfirmOverlay
// =============================================================================

interface CheckboxProps {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
    label: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, disabled, label }) => (
    <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        aria-pressed={checked}
        aria-label={label}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center justify-self-center transition-all ${
            disabled
                ? 'border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5 cursor-not-allowed'
                : checked
                    ? 'border-primary-500 bg-primary-500 hover:bg-primary-600'
                    : 'border-neutral-300 dark:border-white/15 hover:border-primary-400'
        }`}
    >
        {checked && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
            </svg>
        )}
    </button>
);

interface SwitchProps {
    checked: boolean;
    onChange: () => void;
    label: string;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, label }) => (
    <button
        type="button"
        onClick={onChange}
        aria-pressed={checked}
        aria-label={label}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            checked ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'
        }`}
    >
        <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                checked ? 'translate-x-5' : 'translate-x-0'
            }`}
        />
    </button>
);

interface ConfirmOverlayProps {
    icon: React.ReactNode;
    title: string;
    body: React.ReactNode;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmDisabled?: boolean;
    confirmVariant?: 'primary' | 'danger';
    singleAction?: boolean;
}

const ConfirmOverlay: React.FC<ConfirmOverlayProps> = ({
    icon, title, body, confirmLabel, onConfirm, onCancel, confirmDisabled, confirmVariant = 'primary', singleAction,
}) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-overlay-title"
        onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-start gap-3 mb-3">
                <div className="shrink-0">{icon}</div>
                <h3 id="confirm-overlay-title" className="text-[18px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</h3>
            </div>
            <div className="text-[13px] text-neutral-600 dark:text-neutral-300 mb-5">{body}</div>
            <div className={`flex gap-2 ${singleAction ? 'justify-end' : 'justify-end'}`}>
                {!singleAction && (
                    <Button variant="outline" size="md" onClick={onCancel}>Cancel</Button>
                )}
                <Button
                    variant={confirmVariant === 'danger' ? 'primary' : 'primary'}
                    size="md"
                    onClick={onConfirm}
                    disabled={confirmDisabled}
                    className={confirmVariant === 'danger' ? '!bg-red-600 hover:!bg-red-700 !border-red-600' : ''}
                >
                    {confirmLabel}
                </Button>
            </div>
        </div>
    </div>
);
