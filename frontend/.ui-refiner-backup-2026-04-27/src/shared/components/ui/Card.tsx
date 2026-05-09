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
    default: 'bg-white dark:bg-neutral-800/80 shadow-soft dark:shadow-none border border-neutral-100 dark:border-neutral-700/50',
    bordered: 'bg-white dark:bg-neutral-800/80 border-2 border-neutral-200 dark:border-neutral-700',
    elevated: 'bg-white dark:bg-neutral-800/80 shadow-lg dark:shadow-glow/5 border border-neutral-100 dark:border-neutral-700/50',
    glass: 'bg-white/60 dark:bg-neutral-800/30 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-soft dark:shadow-none',
    neon: 'bg-white dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-700 relative overflow-hidden',
};

const hoverStyles: Record<CardVariant, string> = {
    default: 'hover:shadow-lg dark:hover:shadow-glow/10 hover:scale-[1.02] hover:border-primary-100 dark:hover:border-primary-500/30',
    bordered: 'hover:border-primary-300 dark:hover:border-primary-500/50 hover:scale-[1.01]',
    elevated: 'hover:shadow-xl dark:hover:shadow-glow/15 hover:scale-[1.02]',
    glass: 'hover:bg-white/70 dark:hover:bg-neutral-800/40 hover:shadow-lg dark:hover:shadow-glow/10',
    neon: 'hover:border-transparent dark:hover:border-transparent',
};

export const Card: React.FC<CardProps> & {
    Header: React.FC<{ children: React.ReactNode; className?: string }>;
    Body: React.FC<{ children: React.ReactNode; className?: string }>;
    Footer: React.FC<{ children: React.ReactNode; className?: string }>;
} = ({ variant = 'default', className = '', children, hover = false, onClick }) => {
    const isNeon = variant === 'neon';

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
            {/* Neon border effect (only on hover) */}
            {isNeon && hover && (
                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-[-2px] bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur-sm" />
                    <div className="absolute inset-0 bg-white dark:bg-neutral-900 rounded-2xl" />
                </div>
            )}
            <div className="relative z-10">{children}</div>
        </div>
    );
};

Card.Header = ({ children, className = '' }) => (
    <div className={`px-6 py-4 border-b border-neutral-100 dark:border-neutral-700 ${className}`}>{children}</div>
);

Card.Body = ({ children, className = '' }) => (
    <div className={`px-6 py-4 ${className}`}>{children}</div>
);

Card.Footer = ({ children, className = '' }) => (
    <div className={`px-6 py-4 border-t border-neutral-100 dark:border-neutral-700 ${className}`}>{children}</div>
);

Card.Header.displayName = 'Card.Header';
Card.Body.displayName = 'Card.Body';
Card.Footer.displayName = 'Card.Footer';
