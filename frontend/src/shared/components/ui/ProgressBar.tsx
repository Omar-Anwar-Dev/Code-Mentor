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
    primary: 'bg-primary-500',
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

    const colors = {
        primary: '#4f46e5',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
    };

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    stroke="#e5e5e5"
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    stroke={colors[variant]}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-500 ease-out"
                />
            </svg>
            {showLabel && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-neutral-900">
                        {Math.round(percentage)}%
                    </span>
                </div>
            )}
        </div>
    );
};
