import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    label?: string;
}

const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    className = '',
    label,
}) => {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <Loader2 className={`animate-spin text-primary-600 ${sizeStyles[size]}`} />
            {label && <p className="text-sm text-neutral-600">{label}</p>}
        </div>
    );
};

// Full page loading spinner
export const PageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
    return (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary-100 rounded-full" />
                    <div className="absolute inset-0 w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-neutral-600 font-medium">{message}</p>
            </div>
        </div>
    );
};

// Skeleton loader for content
interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circle' | 'rectangle';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangle' }) => {
    const baseStyles = 'animate-pulse bg-neutral-200';

    const variantStyles = {
        text: 'h-4 rounded',
        circle: 'rounded-full',
        rectangle: 'rounded-lg',
    };

    return <div className={`${baseStyles} ${variantStyles[variant]} ${className}`} />;
};
