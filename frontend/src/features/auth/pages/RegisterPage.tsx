import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAppDispatch } from '@/app/store/hooks';
import { registerThunk } from '@/features/auth/store/authSlice';
import { addToast } from '@/features/ui/store/uiSlice';
import { Button, Input } from '@/shared/components/ui';
import { Github, Sparkles, ArrowRight } from 'lucide-react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

interface RegisterFormData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
}

export const RegisterPage: React.FC = () => {
    useDocumentTitle('Create account');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>();

    const password = watch('password');

    const onSubmit = async (data: RegisterFormData) => {
        const result = await dispatch(registerThunk({
            email: data.email,
            password: data.password,
            fullName: data.name,
            gitHubUsername: null,
        }));

        if (registerThunk.fulfilled.match(result)) {
            dispatch(addToast({
                type: 'success',
                title: 'Account created!',
                message: "Welcome to CodeMentor AI. Let's start your assessment.",
            }));
            // replace so back button doesn't return to the register form.
            navigate('/assessment', { replace: true });
        } else {
            dispatch(addToast({
                type: 'error',
                title: 'Registration failed',
                message: (result.payload as string) ?? 'Please check your details and try again.',
            }));
        }
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

            <div className="text-center mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-900 dark:from-white dark:via-neutral-200 dark:to-white bg-clip-text text-transparent mb-2">Create your account</h2>
                <p className="text-neutral-600 dark:text-neutral-400">Start your personalized learning journey today</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                    label="Full Name"
                    placeholder="John Doe"
                    error={errors.name?.message}
                    {...register('name', {
                        required: 'Name is required',
                        minLength: {
                            value: 2,
                            message: 'Name must be at least 2 characters',
                        },
                    })}
                />

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
                            value: 8,
                            message: 'Password must be at least 8 characters',
                        },
                        pattern: {
                            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                            message: 'Password must include uppercase, lowercase, and number',
                        },
                    })}
                />

                <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="••••••••"
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: (value) => value === password || 'Passwords do not match',
                    })}
                />

                <label className="flex items-start gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 mt-0.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        {...register('acceptTerms', {
                            required: 'You must accept the terms and conditions',
                        })}
                    />
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        I agree to the{' '}
                        <Link to="/terms" className="text-primary-600 hover:underline">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="text-primary-600 hover:underline">
                            Privacy Policy
                        </Link>
                    </span>
                </label>
                {errors.acceptTerms && (
                    <p className="text-sm text-error-600">{errors.acceptTerms.message}</p>
                )}

                <Button type="submit" variant="gradient" fullWidth loading={isSubmitting} rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Create Account
                </Button>
            </form>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">Or sign up with</span>
                </div>
            </div>

            <Button
                type="button"
                variant="glass"
                fullWidth
                leftIcon={<Github className="w-5 h-5" />}
                onClick={() => {
                    dispatch(addToast({
                        type: 'info',
                        title: 'GitHub sign-up coming soon',
                        message: 'GitHub OAuth ships in the next sprint.',
                    }));
                }}
                className="border-neutral-200 dark:border-neutral-700"
            >
                GitHub
            </Button>

            <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                    Sign in
                </Link>
            </p>
        </div>
    );
};
