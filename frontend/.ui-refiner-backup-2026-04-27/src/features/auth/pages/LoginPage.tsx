import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { loginThunk } from '@/features/auth/store/authSlice';
import { addToast } from '@/features/ui/store/uiSlice';
import { Button, Input } from '@/shared/components/ui';
import { Github, Sparkles, ArrowRight } from 'lucide-react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

interface LoginFormData {
    email: string;
    password: string;
    rememberMe: boolean;
}

export const LoginPage: React.FC = () => {
    useDocumentTitle('Sign in');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { loading, error } = useAppSelector((state) => state.auth);
    const [loginType, setLoginType] = useState<'user' | 'admin'>('user');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        defaultValues: {
            email: '',
            password: '',
            rememberMe: false,
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        const result = await dispatch(loginThunk({ email: data.email, password: data.password }));

        if (loginThunk.fulfilled.match(result)) {
            const isAdmin = result.payload.user.role === 'Admin';
            dispatch(addToast({
                type: 'success',
                title: isAdmin ? 'Welcome back, Admin!' : 'Welcome back!',
                message: 'Successfully signed in.',
            }));
            navigate(isAdmin ? '/admin' : '/dashboard');
        } else {
            dispatch(addToast({
                type: 'error',
                title: 'Sign-in failed',
                message: (result.payload as string) ?? 'Invalid email or password.',
            }));
        }
    };

    const handleGitHubLogin = () => {
        dispatch(addToast({
            type: 'info',
            title: 'GitHub sign-in coming soon',
            message: 'GitHub OAuth ships in the next sprint.',
        }));
    };

    return (
        <div className="animate-fade-in">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">CodeMentor AI</span>
            </div>

            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-900 dark:from-white dark:via-neutral-200 dark:to-white bg-clip-text text-transparent mb-2">Welcome back</h2>
                <p className="text-neutral-600 dark:text-neutral-400">Sign in to continue your learning journey</p>
            </div>

            {/* Demo login type selector */}
            <div className="flex gap-2 p-1.5 bg-neutral-100 dark:bg-neutral-800/50 rounded-2xl mb-6 backdrop-blur-sm">
                <button
                    type="button"
                    onClick={() => setLoginType('user')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${loginType === 'user'
                        ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-lg'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                >
                    Learner
                </button>
                <button
                    type="button"
                    onClick={() => setLoginType('admin')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${loginType === 'admin'
                        ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-lg'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                >
                    Admin
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    error={errors.email?.message}
                    {...register('email', {
                        required: 'Email is required',
                        pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address',
                        },
                    })}
                />

                <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    error={errors.password?.message}
                    {...register('password', {
                        required: 'Password is required',
                        minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters',
                        },
                    })}
                />

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500 dark:bg-neutral-800"
                            {...register('rememberMe')}
                        />
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                        Forgot password?
                    </Link>
                </div>

                {error && (
                    <div className="p-3 rounded-xl bg-error-50 dark:bg-error-900/30 text-error-700 dark:text-error-400 text-sm border border-error-100 dark:border-error-800">
                        {error}
                    </div>
                )}

                <Button type="submit" variant="gradient" fullWidth loading={loading} rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Sign in
                </Button>
            </form>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">Or continue with</span>
                </div>
            </div>

            <Button
                type="button"
                variant="glass"
                fullWidth
                leftIcon={<Github className="w-5 h-5" />}
                onClick={handleGitHubLogin}
                className="border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
            >
                GitHub
            </Button>

            <p className="mt-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                    Sign up for free
                </Link>
            </p>
        </div>
    );
};
