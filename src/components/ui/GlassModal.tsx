import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconButton } from './IconButton';
import { IconClose } from './Icons';

export interface GlassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: 'dialog' | 'drawer-left' | 'sheet';
  size?: 'compact' | 'md' | 'lg';
  surface?: 'ui' | 'reader';
  headerActions?: ReactNode;
  hideClose?: boolean;
  children: ReactNode;
}

const DIALOG_SIZE: Record<NonNullable<GlassModalProps['size']>, string> = {
  compact: 'w-[min(390px,calc(100vw-32px))]',
  md: 'w-[min(560px,calc(100vw-32px))]',
  lg: 'w-[min(680px,calc(100vw-32px))]',
};

export function GlassModal({
  open,
  onOpenChange,
  title,
  description,
  variant = 'dialog',
  size = 'md',
  surface = 'ui',
  headerActions,
  hideClose = false,
  children,
}: GlassModalProps) {
  const isReader = surface === 'reader';

  const overlayClass =
    'fixed inset-0 z-90 bg-[var(--l3-scrim)] backdrop-blur-[8px] anim-fade-in';

  const surfaceStyle = isReader
    ? {
        background: 'var(--r-panel-bg)',
        color: 'var(--r-ink)',
        borderColor: 'var(--r-glass-border)',
      }
    : {
        background: 'var(--l3-bg)',
        color: 'var(--ink-primary)',
        borderColor: 'var(--l2-border)',
      };

  const dividerColor = isReader ? 'var(--r-divider)' : 'var(--divider)';

  let contentClass = '';
  if (variant === 'dialog') {
    contentClass = [
      'fixed left-1/2 top-1/2 z-95 -translate-x-1/2 -translate-y-1/2',
      DIALOG_SIZE[size],
      'max-h-[min(700px,calc(100dvh-40px))] rounded-[22px] border',
      'backdrop-blur-[30px] backdrop-saturate-[180%] shadow-[var(--l3-shadow)]',
      'flex flex-col overflow-hidden anim-modal-in focus:outline-none',
    ].join(' ');
  } else if (variant === 'drawer-left') {
    contentClass = [
      'fixed inset-y-0 left-0 z-95 w-[min(368px,88vw)] border-r',
      'backdrop-blur-[30px] backdrop-saturate-[180%] shadow-[var(--l3-shadow)]',
      'flex flex-col overflow-hidden pt-safe pb-safe anim-drawer-left-in focus:outline-none',
    ].join(' ');
  } else {
    contentClass = [
      'fixed inset-x-0 bottom-0 z-95 max-h-[85dvh] rounded-t-[24px] border-t',
      'backdrop-blur-[30px] backdrop-saturate-[180%] shadow-[var(--l3-shadow)]',
      'flex flex-col overflow-hidden pb-safe anim-sheet-up-in focus:outline-none',
    ].join(' ');
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content
          style={surfaceStyle}
          className={contentClass}
          aria-describedby={description ? undefined : undefined}
        >
          <div
            className="flex shrink-0 items-center justify-between gap-3 px-5 py-4"
            style={{ borderBottom: `1px solid ${dividerColor}` }}
          >
            <Dialog.Title className="m-0 truncate text-[16.5px] font-semibold tracking-[-0.01em]">
              {title}
            </Dialog.Title>
            <div className="flex shrink-0 items-center gap-1">
              {headerActions}
              {!hideClose && (
                <Dialog.Close asChild>
                  <IconButton
                    ariaLabel="关闭"
                    size="sm"
                    surface={surface}
                  >
                    <IconClose size={17} />
                  </IconButton>
                </Dialog.Close>
              )}
            </div>
          </div>

          {description ? (
            <Dialog.Description className="sr-only">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
