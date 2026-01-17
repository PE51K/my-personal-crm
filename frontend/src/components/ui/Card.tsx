/**
 * Card component for content containers
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  interactive?: boolean;
}

const paddingStyles: Record<CardProps['padding'] & string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const shadowStyles: Record<CardProps['shadow'] & string, string> = {
  none: '',
  sm: 'shadow-card',
  md: 'shadow-md',
  lg: 'shadow-lg',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      padding = 'md',
      shadow = 'sm',
      hover = false,
      interactive = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'bg-white rounded-lg border border-gray-200';
    const hoverStyles = hover || interactive
      ? 'transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer'
      : '';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${paddingStyles[padding]} ${shadowStyles[shadow]} ${hoverStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * Card header component
 */
interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}: CardHeaderProps): ReactNode {
  return (
    <div className={`flex items-start justify-between ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * Card body component
 */
interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps): ReactNode {
  return <div className={`mt-4 ${className}`}>{children}</div>;
}
