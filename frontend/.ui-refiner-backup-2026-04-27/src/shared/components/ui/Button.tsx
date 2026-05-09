import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient' | 'neon' | 'glass';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:ring-primary-500 shadow-sm dark:bg-primary-500 dark:hover:bg-primary-600',
    secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 active:bg-neutral-300 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700',
    outline: 'border-2 border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 active:bg-neutral-100 focus:ring-neutral-400 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:border-neutral-500',
    ghost: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200 focus:ring-neutral-400 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white',
    danger: 'bg-error-600 text-white hover:bg-error-700 active:bg-error-800 focus:ring-error-500 shadow-sm',
    gradient: 'bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 text-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 dark:hover:shadow-neon',
    neon: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 dark:shadow-neon-cyan/20',
    glass: 'bg-white/10 backdrop-blur-md border border-white/20 text-neutral-900 hover:bg-white/20 dark:text-white dark:border-white/10 dark:hover:bg-white/10 transition-all duration-300',
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            loading = false,
            leftIcon,
            rightIcon,
            fullWidth = false,
            disabled,
            className = '',
            children,
            ...props
        },
        ref
    ) => {
        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={`
          btn-base font-medium
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${loading ? 'cursor-wait' : ''}
          ${className}
        `}
                {...props}
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : leftIcon ? (
                    <span className="flex-shrink-0">{leftIcon}</span>
                ) : null}
                {children && <span>{children}</span>}
                {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = 'Button';
