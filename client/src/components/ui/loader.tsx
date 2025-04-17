import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary';
  withText?: boolean;
  text?: string;
}

export function Loader({
  size = 'md',
  variant = 'default',
  withText = false,
  text = 'Loading...',
  className,
  ...props
}: LoaderProps) {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const variantMap = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        withText && 'gap-2',
        className
      )}
      {...props}
    >
      <Loader2 className={cn('animate-spin', sizeMap[size], variantMap[variant])} />
      {withText && <span className="text-muted-foreground">{text}</span>}
    </div>
  );
}
