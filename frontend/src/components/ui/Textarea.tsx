/**
 * Textarea component with label and error handling
 */

import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, rows = 4, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    const baseStyles =
      'block w-full px-3 py-2 rounded-md border-1.5 border-gray-300 shadow-sm transition-all duration-150 ' +
      'hover:border-gray-400 hover:shadow-sm ' +
      'focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none ' +
      'placeholder:text-gray-400 text-gray-900 text-sm ' +
      'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500';

    const errorStyles =
      'border-red-500 hover:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-100 ' +
      'text-red-900 placeholder-red-300';

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`${baseStyles} ${error ? errorStyles : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${textareaId}-error`}
            className="mt-2 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
