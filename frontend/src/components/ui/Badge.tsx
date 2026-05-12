import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'cyan' | 'fuchsia';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
    variant?: BadgeVariant;
    size?: BadgeSize;
    className?: string;
    children: React.ReactNode;
    dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-neutral-100 text-neutral-700 dark:bg-white/5 dark:text-neutral-300',
    primary: 'bg-primary-50 text-primary-700 border border-primary-200/60 dark:bg-primary-500/15 dark:text-primary-200 dark:border-primary-400/30',
    success: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300',
    warning: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300',
    error: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-300',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    cyan: 'bg-cyan-50 text-cyan-700 border border-cyan-200/60 dark:bg-secondary-500/15 dark:text-cyan-200 dark:border-secondary-400/30',
    fuchsia: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200/60 dark:bg-accent-500/15 dark:text-fuchsia-200 dark:border-accent-400/30',
};

const dotStyles: Record<BadgeVariant, string> = {
    default: 'bg-neutral-500',
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    info: 'bg-blue-500',
    cyan: 'bg-secondary-500',
    fuchsia: 'bg-accent-500',
};

const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1 text-sm',
};

export const Badge: React.FC<BadgeProps> = ({
    variant = 'default',
    size = 'md',
    className = '',
    children,
    dot = false,
}) => {
    return (
        <span
            className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
        >
            {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />}
            {children}
        </span>
    );
};
