import React from 'react';

type CardVariant = 'default' | 'bordered' | 'elevated' | 'glass' | 'neon';

interface CardProps {
    variant?: CardVariant;
    className?: string;
    children: React.ReactNode;
    hover?: boolean;
    onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
    default: 'bg-white dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-white/5 shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_-12px_rgba(15,23,42,.1)]',
    bordered: 'bg-white dark:bg-neutral-800/60 border-2 border-neutral-200 dark:border-white/10',
    elevated: 'bg-white dark:bg-neutral-800/80 border border-neutral-200/40 dark:border-white/5 shadow-[0_4px_8px_rgba(15,23,42,.06),0_24px_48px_-16px_rgba(15,23,42,.16)]',
    glass: 'glass-card',
    neon: 'glass-card glass-card-neon',
};

const hoverStyles: Record<CardVariant, string> = {
    default: 'hover:-translate-y-0.5 hover:border-primary-200 dark:hover:border-primary-500/30 hover:shadow-[0_4px_8px_rgba(15,23,42,.06),0_16px_40px_-12px_rgba(139,92,246,.18)]',
    bordered: 'hover:-translate-y-0.5 hover:border-primary-300 dark:hover:border-primary-500/50',
    elevated: 'hover:-translate-y-0.5 hover:shadow-[0_6px_12px_rgba(15,23,42,.08),0_32px_64px_-20px_rgba(139,92,246,.2)]',
    glass: 'hover:bg-white/80 dark:hover:bg-white/10',
    neon: 'hover:-translate-y-0.5',
};

export const Card: React.FC<CardProps> & {
    Header: React.FC<{ children: React.ReactNode; className?: string }>;
    Body: React.FC<{ children: React.ReactNode; className?: string }>;
    Footer: React.FC<{ children: React.ReactNode; className?: string }>;
} = ({ variant = 'default', className = '', children, hover = false, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`
                rounded-2xl overflow-hidden transition-all duration-300
                ${variantStyles[variant]}
                ${hover ? `cursor-pointer ${hoverStyles[variant]}` : ''}
                ${onClick ? 'cursor-pointer' : ''}
                ${className}
            `}
        >
            {children}
        </div>
    );
};

Card.Header = ({ children, className = '' }) => (
    <div className={`px-6 py-4 border-b border-neutral-100 dark:border-white/5 ${className}`}>{children}</div>
);

Card.Body = ({ children, className = '' }) => (
    <div className={`px-6 py-4 ${className}`}>{children}</div>
);

Card.Footer = ({ children, className = '' }) => (
    <div className={`px-6 py-4 border-t border-neutral-100 dark:border-white/5 ${className}`}>{children}</div>
);

Card.Header.displayName = 'Card.Header';
Card.Body.displayName = 'Card.Body';
Card.Footer.displayName = 'Card.Footer';
