import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAppDispatch } from '@/app/store/hooks';
import { registerThunk } from '@/features/auth/store/authSlice';
import { addToast } from '@/features/ui/store/uiSlice';
import { Button } from '@/components/ui';
import { Github, ArrowRight, Code, ScanSearch, BookOpen } from 'lucide-react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

interface RegisterFormData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

const TRACKS = [
    { id: 'fullstack' as const, title: 'Full Stack', desc: 'React + .NET', icon: Code },
    { id: 'backend' as const, title: 'Backend', desc: 'ASP.NET + Python', icon: ScanSearch },
    { id: 'python' as const, title: 'Python', desc: 'Data + Web', icon: BookOpen },
];
type TrackId = (typeof TRACKS)[number]['id'];

const TrackCard: React.FC<{
    track: (typeof TRACKS)[number];
    selected: boolean;
    onSelect: (id: TrackId) => void;
}> = ({ track, selected, onSelect }) => (
    <button
        type="button"
        onClick={() => onSelect(track.id)}
        className={`flex flex-col items-start gap-1.5 p-2.5 rounded-lg border text-left transition-all ${
            selected
                ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-500/15 ring-2 ring-primary-400/30 dark:ring-primary-400/40'
                : 'border-neutral-200 dark:border-white/10 hover:border-primary-300 dark:hover:border-primary-400/60 bg-white/50 dark:bg-white/[0.02]'
        }`}
    >
        <div
            className={`w-7 h-7 rounded-md flex items-center justify-center ${
                selected
                    ? 'bg-primary-500 text-white shadow-[0_4px_14px_-4px_rgba(139,92,246,.55)]'
                    : 'bg-primary-500/10 text-primary-700 dark:text-primary-200'
            }`}
        >
            <track.icon className="w-3.5 h-3.5" />
        </div>
        <div>
            <div
                className={`text-[12.5px] font-semibold leading-tight ${
                    selected ? 'text-primary-700 dark:text-primary-200' : 'text-neutral-900 dark:text-neutral-100'
                }`}
            >
                {track.title}
            </div>
            <div className="text-[10.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">{track.desc}</div>
        </div>
    </button>
);

const Divider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-neutral-200 dark:bg-white/10" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 font-mono">
            {children}
        </span>
        <div className="flex-1 h-px bg-neutral-200 dark:bg-white/10" />
    </div>
);

export const RegisterPage: React.FC = () => {
    useDocumentTitle('Create account');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [track, setTrack] = useState<TrackId>('fullstack');
    const [agree, setAgree] = useState(true);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({
        defaultValues: { firstName: '', lastName: '', email: '', password: '' },
    });

    const onSubmit = async (data: RegisterFormData) => {
        if (!agree) return;
        // Persist track preference for AssessmentStart (Sprint 13 T4) to pick up.
        // registerThunk doesn't take a track param; the assessment flow handles
        // formal track selection.
        try {
            localStorage.setItem('codementor.preferredTrack', track);
        } catch {
            // ignore — localStorage may be disabled
        }

        const result = await dispatch(
            registerThunk({
                email: data.email,
                password: data.password,
                fullName: `${data.firstName.trim()} ${data.lastName.trim()}`.trim(),
                gitHubUsername: null,
            })
        );

        if (registerThunk.fulfilled.match(result)) {
            dispatch(addToast({
                type: 'success',
                title: 'Account created!',
                message: "Welcome to CodeMentor AI. Let's start your assessment.",
            }));
            navigate('/assessment', { replace: true });
        } else {
            dispatch(addToast({
                type: 'error',
                title: 'Registration failed',
                message: (result.payload as string) ?? 'Please check your details and try again.',
            }));
        }
    };

    const inputCls = (hasError?: boolean) =>
        `w-full h-10 px-3.5 text-[14px] rounded-xl bg-white dark:bg-neutral-900/60 border ${
            hasError ? 'border-error-400 dark:border-error-500/60' : 'border-neutral-200 dark:border-white/10'
        } text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all`;

    return (
        <div className="glass-card p-4 sm:p-5 animate-fade-in">
            <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                Create your account.
            </h1>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-3 flex flex-col gap-1.5">
                <div className="grid sm:grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="reg-first" className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">First name</label>
                        <input
                            id="reg-first"
                            placeholder="Layla"
                            className={inputCls(!!errors.firstName)}
                            {...register('firstName', { required: 'Required' })}
                        />
                        {errors.firstName && (
                            <div className="text-[12px] text-error-600 dark:text-error-400">{errors.firstName.message}</div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="reg-last" className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">Last name</label>
                        <input
                            id="reg-last"
                            placeholder="Ahmed"
                            className={inputCls(!!errors.lastName)}
                            {...register('lastName', { required: 'Required' })}
                        />
                        {errors.lastName && (
                            <div className="text-[12px] text-error-600 dark:text-error-400">{errors.lastName.message}</div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-email" className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">Email</label>
                    <input
                        id="reg-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@university.edu"
                        className={inputCls(!!errors.email)}
                        {...register('email', {
                            required: 'Email is required',
                            pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' },
                        })}
                    />
                    {errors.email && (
                        <div className="text-[12px] text-error-600 dark:text-error-400">{errors.email.message}</div>
                    )}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-password" className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">Password</label>
                    <input
                        id="reg-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className={inputCls(!!errors.password)}
                        {...register('password', {
                            required: 'Password is required',
                            minLength: { value: 8, message: 'Password must be at least 8 characters' },
                            pattern: {
                                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                                message: 'Must include uppercase, lowercase, and a number',
                            },
                        })}
                    />
                    {errors.password ? (
                        <div className="text-[12px] text-error-600 dark:text-error-400">{errors.password.message}</div>
                    ) : (
                        <div className="text-[12px] text-neutral-500 dark:text-neutral-400">At least 8 characters, with a number.</div>
                    )}
                </div>

                <div>
                    <label className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 block">
                        Choose your track
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {TRACKS.map((t) => (
                            <TrackCard key={t.id} track={t} selected={track === t.id} onSelect={setTrack} />
                        ))}
                    </div>
                </div>

                <label className="flex items-start gap-2 text-[12px] text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={agree}
                        onChange={(e) => setAgree(e.target.checked)}
                        className="mt-0.5 w-3.5 h-3.5 rounded border-neutral-300 dark:border-white/20 text-primary-500 focus:ring-primary-400 accent-primary-500"
                    />
                    <span>
                        I agree to the{' '}
                        <Link to="/privacy" className="text-primary-600 dark:text-primary-300 hover:underline">
                            Privacy
                        </Link>
                        {' '}and{' '}
                        <Link to="/terms" className="text-primary-600 dark:text-primary-300 hover:underline">
                            Terms
                        </Link>.
                    </span>
                </label>

                <Button
                    type="submit"
                    variant="gradient"
                    size="md"
                    fullWidth
                    disabled={!agree}
                    loading={isSubmitting}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="mt-0.5"
                >
                    Create account
                </Button>

                <Divider>or continue with</Divider>

                <Button
                    type="button"
                    variant="glass"
                    size="md"
                    fullWidth
                    leftIcon={<Github className="w-4 h-4" />}
                    onClick={() => {
                        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                        window.location.href = `${apiBase}/api/auth/github/login`;
                    }}
                >
                    Continue with GitHub
                </Button>
            </form>

            <div className="mt-4 pt-3 border-t border-neutral-200/60 dark:border-white/10 text-center text-[13px] text-neutral-600 dark:text-neutral-300">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-600 dark:text-primary-300 font-semibold hover:underline">
                    Sign in
                </Link>
            </div>
        </div>
    );
};
