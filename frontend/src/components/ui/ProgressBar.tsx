import React from 'react';

interface ProgressBarProps {
    value: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'success' | 'warning' | 'error';
    showLabel?: boolean;
    label?: string;
    className?: string;
    animated?: boolean;
}

const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
};

const variantStyles = {
    // Sprint 13: primary fill uses the signature 4-stop brand gradient.
    primary: 'brand-gradient-bg',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    max = 100,
    size = 'md',
    variant = 'primary',
    showLabel = false,
    label,
    className = '',
    animated = true,
}) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <div className={`w-full ${className}`}>
            {(showLabel || label) && (
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-neutral-700">
                        {label || 'Progress'}
                    </span>
                    <span className="text-sm font-medium text-neutral-500">
                        {Math.round(percentage)}%
                    </span>
                </div>
            )}
            <div
                className={`w-full bg-neutral-200 rounded-full overflow-hidden ${sizeStyles[size]}`}
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={max}
            >
                <div
                    className={`
            ${sizeStyles[size]} rounded-full
            ${variantStyles[variant]}
            ${animated ? 'transition-all duration-500 ease-out' : ''}
          `}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

// Circular Progress
interface CircularProgressProps {
    value: number;
    max?: number;
    size?: number;
    strokeWidth?: number;
    variant?: 'primary' | 'success' | 'warning' | 'error';
    showLabel?: boolean;
    className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
    value,
    max = 100,
    size = 120,
    strokeWidth = 8,
    variant = 'primary',
    showLabel = true,
    className = '',
}) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    const solidColors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
    };

    // Sprint 13: primary uses the signature 4-stop brand gradient via SVG
    // linearGradient + neon drop-shadow (matches Pillar 4 CircularProgress).
    const gradId = `cp-grad-${size}-${variant}`;
    const stroke = variant === 'primary' ? `url(#${gradId})` : solidColors[variant];

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                {variant === 'primary' && (
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="33%" stopColor="#3b82f6" />
                            <stop offset="66%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                    </defs>
                )}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    strokeOpacity={0.12}
                    fill="none"
                    className="text-neutral-400 dark:text-white"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    stroke={stroke}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-500 ease-out"
                    style={variant === 'primary' ? { filter: 'drop-shadow(0 0 6px rgba(139,92,246,.4))' } : undefined}
                />
            </svg>
            {showLabel && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono font-semibold brand-gradient-text" style={{ fontSize: size * 0.22 }}>
                        {Math.round(percentage)}%
                    </span>
                </div>
            )}
        </div>
    );
};
