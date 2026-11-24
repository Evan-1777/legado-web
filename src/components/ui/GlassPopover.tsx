import type { ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';

export interface GlassPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  className?: string;
  surface?: 'ui' | 'reader';
}

export function GlassPopover({
  open,
  onOpenChange,
  trigger,
  children,
  align = 'end',
  side = 'bottom',
  sideOffset = 10,
  className = '',
  surface = 'reader',
}: GlassPopoverProps) {
  const isReader = surface === 'reader';

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          side={side}
          sideOffset={sideOffset}
          collisionPadding={12}
          style={{
            background: isReader ? 'var(--r-panel-bg)' : 'var(--l3-bg)',
            color: isReader ? 'var(--r-ink)' : 'var(--ink-primary)',
            borderColor: isReader ? 'var(--r-glass-border)' : 'var(--l2-border)',
            boxShadow: isReader
              ? 'var(--l3-shadow), var(--r-glass-highlight)'
              : 'var(--l3-shadow), var(--l2-highlight)',
          }}
          className={[
            'z-85 rounded-[20px] border backdrop-blur-[30px] backdrop-saturate-[180%]',
            'anim-popover-in focus:outline-none',
            className,
          ].join(' ')}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
