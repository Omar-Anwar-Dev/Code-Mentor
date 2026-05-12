import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FieldProps {
    label?: string;
    helperText?: string;
    error?: string;
    htmlFor?: string;
    className?: string;
    children: React.ReactNode;
}

/**
 * Field — neutral container that wraps a form control with a label,
 * optional helper text, and inline error. Use this when composing
 * Select / Textarea / custom inputs that don't carry their own label.
 *
 * The built-in `<Input label="..." helperText="..." error="..."/>` already
 * handles all three; reach for `<Field>` when you need to wrap something
 * else (a chip-input row, a tag picker, a radio group, etc).
 */
export const Field: React.FC<FieldProps> = ({
    label,
    helperText,
    error,
    htmlFor,
    className = '',
    children,
}) => {
    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label
                    htmlFor={htmlFor}
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1.5"
                >
                    {label}
                </label>
            )}
            {children}
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
};
