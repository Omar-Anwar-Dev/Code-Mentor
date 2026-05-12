import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { loginThunk } from '@/features/auth/store/authSlice';
import { addToast } from '@/features/ui/store/uiSlice';
import { Button } from '@/components/ui';
import { Github, ArrowRight } from 'lucide-react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

interface LoginFormData {
    email: string;
    password: string;
}

const Divider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-neutral-200 dark:bg-white/10" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 font-mono">
            {children}
        </span>
        <div className="flex-1 h-px bg-neutral-200 dark:bg-white/10" />
    </div>
);

export const LoginPage: React.FC = () => {
    useDocumentTitle('Sign in');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { loading } = useAppSelector((state) => state.auth);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        defaultValues: { email: '', password: '' },
    });

    const onSubmit = async (data: LoginFormData) => {
        const result = await dispatch(loginThunk({ email: data.email, password: data.password }));
        if (loginThunk.fulfilled.match(result)) {
            const u = result.payload.user;
            const isAdmin = u.role === 'Admin';
            dispatch(addToast({
                type: 'success',
                title: isAdmin ? 'Welcome back, Admin!' : 'Welcome back!',
                message: 'Successfully signed in.',
            }));
            const dest = isAdmin
                ? '/admin'
                : u.hasCompletedAssessment ? '/dashboard' : '/assessment';
            navigate(dest, { replace: true });
        } else {
            dispatch(addToast({
                type: 'error',
                title: 'Sign-in failed',
                message: (result.payload as string) ?? 'Invalid email or password.',
            }));
        }
    };

    const handleGitHubLogin = () => {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        window.location.href = `${apiBase}/api/auth/github/login`;
    };

    const inputCls = (hasError?: boolean) =>
        `w-full h-10 px-3.5 text-[14px] rounded-xl bg-white dark:bg-neutral-900/60 border ${
            hasError ? 'border-error-400 dark:border-error-500/60' : 'border-neutral-200 dark:border-white/10'
        } text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all`;

    return (
        <div className="glass-card p-5 sm:p-6 animate-fade-in">
            <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                Welcome back.
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                Sign in to continue your learning path.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="login-email" className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                        Email
                    </label>
                    <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@university.edu"
                        className={inputCls(!!errors.email)}
                        {...register('email', {
                            required: 'Email is required',
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: 'Invalid email address',
                            },
                        })}
                    />
                    {errors.email && (
                        <div className="text-[12px] text-error-600 dark:text-error-400">{errors.email.message}</div>
                    )}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="login-password" className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                        Password
                    </label>
                    <input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className={inputCls(!!errors.password)}
                        {...register('password', {
                            required: 'Password is required',
                            minLength: { value: 6, message: 'Password must be at least 6 characters' },
                        })}
                    />
                    {errors.password && (
                        <div className="text-[12px] text-error-600 dark:text-error-400">{errors.password.message}</div>
                    )}
                </div>

                <Button
                    type="submit"
                    variant="gradient"
                    size="md"
                    fullWidth
                    loading={loading}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="mt-0.5"
                >
                    Sign in
                </Button>

                <Divider>or continue with</Divider>

                <Button
                    type="button"
                    variant="glass"
                    size="md"
                    fullWidth
                    leftIcon={<Github className="w-4 h-4" />}
                    onClick={handleGitHubLogin}
                >
                    Continue with GitHub
                </Button>
            </form>

            <div className="mt-4 pt-3 border-t border-neutral-200/60 dark:border-white/10 text-center text-[13px] text-neutral-600 dark:text-neutral-300">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary-600 dark:text-primary-300 font-semibold hover:underline">
                    Sign up
                </Link>
            </div>
        </div>
    );
};
