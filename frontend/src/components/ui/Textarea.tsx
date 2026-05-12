import React from 'react';
import { AlertCircle } from 'lucide-react';

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
    label?: string;
    helperText?: string;
    error?: string;
    size?: 'sm' | 'md' | 'lg';
    /** Show a live character counter below the textarea. Requires `maxLength`. */
    showCharCount?: boolean;
}

const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-4 py-3.5 text-base',
};

/**
 * Textarea — multi-line input matching the Input visual treatment.
 * Default `rows={4}`. When `showCharCount` is true AND `maxLength` is set,
 * a live "N / max" counter renders in the footer row alongside helper/error.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
        {
            label,
            helperText,
            error,
            size = 'md',
            showCharCount = false,
            className = '',
            id,
            rows = 4,
            maxLength,
            value,
            defaultValue,
            onChange,
            ...props
        },
        ref
    ) => {
        const textareaId = id || `textarea-${React.useId()}`;
        // Track value when uncontrolled so the char counter still works.
        const [internalValue, setInternalValue] = React.useState<string>(
            typeof defaultValue === 'string' ? defaultValue : ''
        );
        const currentLength =
            typeof value === 'string'
                ? value.length
                : internalValue.length;

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            if (value === undefined) setInternalValue(e.target.value);
            onChange?.(e);
        };

        const showCounter = showCharCount && typeof maxLength === 'number';

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    rows={rows}
                    maxLength={maxLength}
                    value={value}
                    defaultValue={value === undefined ? defaultValue : undefined}
                    onChange={handleChange}
                    className={`
                        w-full rounded-xl border bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-white
                        placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                        focus:outline-none focus:ring-2 focus:ring-offset-0 dark:focus:ring-offset-neutral-900
                        transition-all duration-200 resize-y
                        ${sizeStyles[size]}
                        ${error
                            ? 'border-error-300 dark:border-error-500/50 focus:border-error-500 focus:ring-error-500/20'
                            : 'border-neutral-200 dark:border-neutral-700 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500/20 dark:focus:ring-primary-500/30'
                        }
                        ${props.disabled ? 'bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 cursor-not-allowed' : ''}
                        ${className}
                    `}
                    {...props}
                />
                {(error || helperText || showCounter) && (
                    <div className="mt-1.5 flex items-start justify-between gap-2 text-sm">
                        <p
                            className={`flex items-center gap-1 ${
                                error ? 'text-error-600 dark:text-error-400' : 'text-neutral-500 dark:text-neutral-400'
                            }`}
                        >
                            {error && <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />}
                            <span>{error || helperText}</span>
                        </p>
                        {showCounter && (
                            <span
                                className={`flex-shrink-0 font-mono text-xs ${
                                    currentLength >= (maxLength ?? Infinity)
                                        ? 'text-error-600 dark:text-error-400'
                                        : 'text-neutral-500 dark:text-neutral-400'
                                }`}
                            >
                                {currentLength}/{maxLength}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
