import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    label?: string;
    helperText?: string;
    error?: string;
    size?: 'sm' | 'md' | 'lg';
    options?: Array<{ value: string; label: string }>;
}

const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-4 py-3.5 text-base',
};

/**
 * Select — styled native `<select>` matching the Input visual treatment.
 * Either pass `options={[{value, label}]}` or pass `<option>` children
 * directly. Native semantics preserved — keyboard navigation, screen-reader
 * announcements, mobile picker UI all work without extra work.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            label,
            helperText,
            error,
            size = 'md',
            options,
            className = '',
            id,
            children,
            ...props
        },
        ref
    ) => {
        const selectId = id || `select-${React.useId()}`;
        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        className={`
                            w-full rounded-xl border bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-white
                            placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                            focus:outline-none focus:ring-2 focus:ring-offset-0 dark:focus:ring-offset-neutral-900
                            transition-all duration-200 appearance-none pr-10
                            ${sizeStyles[size]}
                            ${error
                                ? 'border-error-300 dark:border-error-500/50 focus:border-error-500 focus:ring-error-500/20'
                                : 'border-neutral-200 dark:border-neutral-700 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500/20 dark:focus:ring-primary-500/30'
                            }
                            ${props.disabled ? 'bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 cursor-not-allowed' : ''}
                            ${className}
                        `}
                        {...props}
                    >
                        {options
                            ? options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))
                            : children}
                    </select>
                    <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none"
                        aria-hidden
                    />
                </div>
                {(error || helperText) && (
                    <p
                        className={`mt-1.5 text-sm flex items-center gap-1 ${
                            error ? 'text-error-600 dark:text-error-400' : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                    >
                        {error && <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />}
                        <span>{error || helperText}</span>
                    </p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';
