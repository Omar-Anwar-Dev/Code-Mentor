import React from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: string;
    helperText?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-4 py-3.5 text-base',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            helperText,
            error,
            leftIcon,
            rightIcon,
            size = 'md',
            type = 'text',
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const [showPassword, setShowPassword] = React.useState(false);
        const inputId = id || `input-${React.useId()}`;
        const isPassword = type === 'password';
        const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        type={inputType}
                        className={`
              w-full rounded-xl border bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-white
              placeholder:text-neutral-400 dark:placeholder:text-neutral-500
              focus:outline-none focus:ring-2 focus:ring-offset-0 dark:focus:ring-offset-neutral-900
              transition-all duration-200
              ${sizeStyles[size]}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon || isPassword ? 'pr-10' : ''}
              ${error
                                ? 'border-error-300 dark:border-error-500/50 focus:border-error-500 focus:ring-error-500/20'
                                : 'border-neutral-200 dark:border-neutral-700 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500/20 dark:focus:ring-primary-500/30'
                            }
              ${props.disabled ? 'bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 cursor-not-allowed' : ''}
              ${className}
            `}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    )}
                    {!isPassword && rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {(error || helperText) && (
                    <p
                        className={`mt-1.5 text-sm flex items-center gap-1 ${error ? 'text-error-600' : 'text-neutral-500'
                            }`}
                    >
                        {error && <AlertCircle className="w-4 h-4" />}
                        {error || helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
