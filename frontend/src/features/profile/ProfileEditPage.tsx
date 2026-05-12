// Sprint 13 T7: ProfileEditPage — standalone profile edit (Pillar 6 reference).
// Distinct from the inline ProfileEditSection on /profile. Single-card focused
// form with avatar preview + 4 fields + danger zone. Wires to PATCH /api/auth/me
// via the same authApi.updateProfile used by ProfileEditSection.

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button, Textarea } from '@/components/ui';
import {
    ArrowLeft,
    Github,
    Save,
    TriangleAlert,
    Trash2,
    Upload,
} from 'lucide-react';
import { addToast } from '@/features/ui/store/uiSlice';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { authApi } from '@/features/auth/api/authApi';
import { ApiError } from '@/shared/lib/http';
import { setUser } from '@/features/auth/store/authSlice';

interface FormData {
    fullName: string;
    gitHubUsername: string;
    profilePictureUrl: string;
    shortBio: string;
}

const URL_PATTERN = /^https?:\/\/[\w.-]+(\:[0-9]+)?(\/[\w./?#=&%-]*)?$/i;

export const ProfileEditPage: React.FC = () => {
    useDocumentTitle('Edit profile');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const user = useAppSelector((s) => s.auth.user);
    const [busy, setBusy] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<FormData>({
        defaultValues: {
            fullName: user?.name ?? '',
            // gitHubUsername isn't persisted on the User Redux slice — it lives only
            // on the backend response. Initial value defaults to empty; the form
            // round-trips through PATCH /api/auth/me which returns the canonical value.
            gitHubUsername: '',
            profilePictureUrl: user?.avatar ?? '',
            shortBio: '',
        },
    });

    useEffect(() => {
        if (user) {
            reset({
                fullName: user.name ?? '',
                gitHubUsername: '',
                profilePictureUrl: user.avatar ?? '',
                shortBio: '',
            });
        }
    }, [user, reset]);

    if (!user) {
        return (
            <div className="max-w-2xl mx-auto py-12 text-center">
                <p className="text-neutral-600 dark:text-neutral-400">Sign in to edit your profile.</p>
            </div>
        );
    }

    const onSubmit = async (data: FormData) => {
        setBusy(true);
        try {
            const updated = await authApi.patchMe({
                fullName: data.fullName.trim() || null,
                gitHubUsername: data.gitHubUsername.trim() || null,
                profilePictureUrl: data.profilePictureUrl.trim() || null,
            });
            // Map BackendUser → User shape (matches ProfileEditSection behaviour).
            dispatch(
                setUser({
                    id: updated.id,
                    email: updated.email,
                    name: updated.fullName,
                    role: updated.roles.includes('Admin') ? 'Admin' : 'Learner',
                    avatar: updated.profilePictureUrl ?? undefined,
                    hasCompletedAssessment: user.hasCompletedAssessment,
                    createdAt: updated.createdAt,
                }),
            );
            reset({
                fullName: updated.fullName,
                gitHubUsername: updated.gitHubUsername ?? '',
                profilePictureUrl: updated.profilePictureUrl ?? '',
                shortBio: data.shortBio,
            });
            setLastSaved(new Date());
            dispatch(addToast({ type: 'success', title: 'Profile updated' }));
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Could not save changes';
            dispatch(addToast({ type: 'error', title: 'Save failed', message: msg }));
        } finally {
            setBusy(false);
        }
    };

    const initials =
        user.name
            ?.split(' ')
            .map((n) => n[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || user.email[0].toUpperCase();

    const inputCls = (hasError?: boolean) =>
        `w-full h-10 px-3.5 text-[14px] rounded-xl bg-white dark:bg-neutral-900/60 border ${
            hasError ? 'border-error-400 dark:border-error-500/60' : 'border-neutral-200 dark:border-white/10'
        } text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all`;

    return (
        <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
            <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 text-[12.5px] text-primary-600 dark:text-primary-300 hover:underline"
            >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
            </Link>

            <div>
                <h1 className="text-[26px] font-bold tracking-tight brand-gradient-text">Edit your profile</h1>
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">
                    These changes hit{' '}
                    <code className="font-mono text-[11.5px] text-cyan-700 dark:text-cyan-300">
                        PATCH /api/auth/me
                    </code>{' '}
                    — your email is bound to your account and can&apos;t be changed here.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="glass-card p-6 space-y-5">
                    {/* Avatar preview + replace */}
                    <div className="flex items-center gap-4 pb-4 border-b border-neutral-200 dark:border-white/10">
                        {user.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-16 h-16 rounded-2xl border border-neutral-200 dark:border-neutral-700 object-cover shrink-0"
                            />
                        ) : (
                            <div
                                className="w-16 h-16 rounded-2xl text-white font-bold flex items-center justify-center shrink-0 shadow-[0_8px_24px_-8px_rgba(139,92,246,.5)]"
                                style={{
                                    fontSize: 24,
                                    background:
                                        'linear-gradient(135deg,#06b6d4 0%,#3b82f6 33%,#8b5cf6 66%,#ec4899 100%)',
                                }}
                            >
                                {initials}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">
                                Profile picture
                            </div>
                            <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                Paste an image URL below — PNG, JPG, or WebP. Recommended ≥256×256.
                            </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" leftIcon={<Upload className="w-3.5 h-3.5" />} disabled>
                            Replace
                        </Button>
                    </div>

                    {/* Fields */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">Full name</label>
                        <input
                            className={inputCls(!!errors.fullName)}
                            placeholder="Layla Ahmed"
                            {...register('fullName', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 chars' } })}
                        />
                        {errors.fullName ? (
                            <div className="text-[12px] text-error-600 dark:text-error-400">{errors.fullName.message}</div>
                        ) : (
                            <div className="text-[12px] text-neutral-500 dark:text-neutral-400">
                                Shown across the app and on your public CV.
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">Email</label>
                        <input className={`${inputCls()} opacity-60 cursor-not-allowed`} value={user.email} disabled />
                        <div className="text-[12px] text-neutral-500 dark:text-neutral-400">
                            Email cannot be changed. Contact support if you need to migrate accounts.
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">GitHub username</label>
                        <div className="relative">
                            <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                            <input
                                className={`${inputCls(!!errors.gitHubUsername)} pl-9`}
                                placeholder="layla-ahmed"
                                {...register('gitHubUsername', {
                                    pattern: { value: /^[a-z0-9-]{0,39}$/i, message: 'Use letters, digits, or hyphen' },
                                })}
                            />
                        </div>
                        {errors.gitHubUsername ? (
                            <div className="text-[12px] text-error-600 dark:text-error-400">{errors.gitHubUsername.message}</div>
                        ) : (
                            <div className="text-[12px] text-neutral-500 dark:text-neutral-400">
                                Used to verify repository submissions.
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">Profile picture URL</label>
                        <input
                            className={inputCls(!!errors.profilePictureUrl)}
                            placeholder="https://..."
                            {...register('profilePictureUrl', {
                                validate: (v) => !v || URL_PATTERN.test(v) || 'Must be a full https:// URL.',
                            })}
                        />
                        {errors.profilePictureUrl && (
                            <div className="text-[12px] text-error-600 dark:text-error-400">{errors.profilePictureUrl.message}</div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">Short bio (optional)</label>
                        <Textarea
                            rows={3}
                            placeholder="Tell us a bit about yourself"
                            showCharCount
                            maxLength={160}
                            {...register('shortBio', { maxLength: 160 })}
                        />
                        <div className="text-[12px] text-neutral-500 dark:text-neutral-400">
                            160 character limit. Shown on your public CV header.
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-white/10">
                        <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400">
                            {lastSaved ? `Last saved ${formatRelative(lastSaved.toISOString())}` : 'Not saved yet'}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="ghost" size="md" onClick={() => navigate('/profile')}>
                                Discard
                            </Button>
                            <Button
                                type="submit"
                                variant="gradient"
                                size="md"
                                leftIcon={<Save className="w-3.5 h-3.5" />}
                                loading={busy}
                                disabled={busy || !isDirty}
                            >
                                Save changes
                            </Button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Danger zone */}
            <div className="glass-card border border-red-200/60 dark:border-red-900/40 p-6">
                <div className="flex items-center gap-2 mb-2">
                    <TriangleAlert className="w-4 h-4 text-red-500" />
                    <h3 className="text-[14.5px] font-semibold text-red-700 dark:text-red-300">Danger zone</h3>
                </div>
                <p className="text-[12.5px] text-neutral-600 dark:text-neutral-300 mb-3">
                    Deleting your account also deletes your submissions, audits, and learning CV. This is permanent and cannot be undone.
                </p>
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        disabled
                        title="Account deletion ships post-MVP"
                    >
                        Delete account…
                    </Button>
                </div>
            </div>
        </div>
    );
};

function formatRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return new Date(iso).toLocaleString();
}
