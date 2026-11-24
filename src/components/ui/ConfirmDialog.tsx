import { GlassModal } from './GlassModal';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  destructive = true,
  busy = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <GlassModal
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
      title={title}
      description={message}
      variant="dialog"
      size="compact"
    >
      <div className="flex flex-col gap-5 p-5">
        <p className="m-0 text-[14px] leading-relaxed text-[var(--ink-secondary)]">
          {message}
        </p>
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-full bg-[var(--fill-control)] px-4 text-[13.5px] font-medium text-[var(--ink-primary)] transition-colors hover:bg-[var(--fill-control-hover)] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onConfirm()}
            className={[
              'h-9 rounded-full px-4 text-[13.5px] font-medium text-white transition-[background-color,transform] active:scale-[0.97] disabled:opacity-50',
              destructive
                ? 'bg-[var(--danger)] hover:bg-[var(--danger-hover)]'
                : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]',
            ].join(' ')}
          >
            {busy ? '处理中…' : confirmLabel}
          </button>
        </div>
      </div>
    </GlassModal>
  );
}
