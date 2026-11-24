import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  ariaLabel: string;
  children: ReactNode;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  surface?: 'ui' | 'reader';
  tooltip?: string;
}

const SIZE_CLASS: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      ariaLabel,
      children,
      active = false,
      size = 'md',
      surface = 'ui',
      tooltip,
      className = '',
      type = 'button',
      ...rest
    },
    ref
  ) {
    const baseStyle =
      surface === 'reader'
        ? active
          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'text-[var(--r-ink)] hover:bg-[var(--r-control)] active:bg-[var(--r-control-hover)]'
        : active
          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'text-[var(--ink-primary)] hover:bg-[var(--fill-control)] active:bg-[var(--fill-control-hover)]';

    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        title={tooltip ?? ariaLabel}
        className={[
          'relative inline-flex shrink-0 items-center justify-center rounded-full',
          'transition-[background-color,transform,color] duration-150 ease-[var(--ease-apple)]',
          'active:scale-[0.94] disabled:pointer-events-none disabled:opacity-35',
          SIZE_CLASS[size],
          baseStyle,
          className,
        ].join(' ')}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
