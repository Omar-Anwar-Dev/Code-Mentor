import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { authApi } from '@/features/auth/api/authApi';
import { setUser } from '@/features/auth/store/authSlice';
import { addToast } from '@/features/ui/store/uiSlice';
import { Button, Input } from '@/shared/components/ui';
import { ApiError } from '@/shared/lib/http';
import { Save } from 'lucide-react';

interface ProfileFormData {
    fullName: string;
    gitHubUsername: string;
    profilePictureUrl: string;
}

/**
 * S2-T11: Profile edit section backed by PATCH /api/auth/me.
 * Email is immutable (not in the form). Other gamification/mock fields on the page
 * come from later sprints; this section only handles the fields the backend supports today.
 */
export const ProfileEditSection: React.FC = () => {
    const dispatch = useAppDispatch();
    const user = useAppSelector((s) => s.auth.user);
    const [saving, setSaving] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isDirty },
        reset,
    } = useForm<ProfileFormData>({
        defaultValues: {
            fullName: user?.name ?? '',
            gitHubUsername: '',
            profilePictureUrl: user?.avatar ?? '',
        },
    });

    const onSubmit = async (data: ProfileFormData) => {
        setSaving(true);
        try {
            const updated = await authApi.patchMe({
                fullName: data.fullName.trim() || null,
                gitHubUsername: data.gitHubUsername.trim() || null,
                profilePictureUrl: data.profilePictureUrl.trim() || null,
            });

            dispatch(
                setUser({
                    id: updated.id,
                    email: updated.email,
                    name: updated.fullName,
                    role: updated.roles.includes('Admin') ? 'Admin' : 'Learner',
                    avatar: updated.profilePictureUrl ?? undefined,
                    hasCompletedAssessment: user?.hasCompletedAssessment ?? true,
                    createdAt: updated.createdAt,
                }),
            );
            dispatch(addToast({ type: 'success', title: 'Profile updated', message: 'Changes saved.' }));
            reset({
                fullName: updated.fullName,
                gitHubUsername: updated.gitHubUsername ?? '',
                profilePictureUrl: updated.profilePictureUrl ?? '',
            });
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to save profile';
            dispatch(addToast({ type: 'error', title: 'Save failed', message: msg }));
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Edit profile</h3>

            <Input
                label="Full name"
                {...register('fullName', {
                    required: 'Full name is required',
                    minLength: { value: 2, message: 'Must be at least 2 characters' },
                    maxLength: { value: 100, message: 'Keep under 100 characters' },
                })}
                error={errors.fullName?.message}
            />

            <Input
                label="Email"
                value={user.email}
                disabled
                helperText="Email cannot be changed."
            />

            <Input
                label="GitHub username"
                placeholder="your-github-handle"
                {...register('gitHubUsername', {
                    maxLength: { value: 40, message: 'GitHub usernames are max 40 characters' },
                    pattern: { value: /^[a-zA-Z0-9-]*$/, message: 'Letters, numbers, and hyphens only' },
                })}
                error={errors.gitHubUsername?.message}
            />

            <Input
                label="Profile picture URL"
                placeholder="https://..."
                {...register('profilePictureUrl', {
                    maxLength: { value: 500, message: 'URL too long' },
                })}
                error={errors.profilePictureUrl?.message}
            />

            <div className="flex justify-end">
                <Button type="submit" variant="gradient" loading={saving} disabled={!isDirty} leftIcon={<Save className="w-4 h-4" />}>
                    Save changes
                </Button>
            </div>
        </form>
    );
};
