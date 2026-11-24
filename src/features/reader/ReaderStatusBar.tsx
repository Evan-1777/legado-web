export interface ReaderStatusBarProps {
  visible: boolean;
  bookTitle: string;
  chapterTitle: string;
  modeLabel: string;
  progressLabel: string;
}

export function ReaderHeaderBar({
  visible,
  bookTitle,
  chapterTitle,
}: Pick<ReaderStatusBarProps, 'visible' | 'bookTitle' | 'chapterTitle'>) {
  if (!visible) {
    return <div className="shrink-0 pt-safe" />;
  }

  return (
    <div
      className="flex shrink-0 select-none items-center justify-between gap-4 px-6 text-[11.5px] opacity-80"
      style={{
        height: 'calc(34px + env(safe-area-inset-top))',
        paddingTop: 'env(safe-area-inset-top)',
        color: 'var(--r-ink-muted)',
      }}
    >
      <span className="truncate font-medium">{bookTitle}</span>
      <span className="truncate text-right">{chapterTitle}</span>
    </div>
  );
}

export function ReaderFooterBar({
  visible,
  modeLabel,
  progressLabel,
}: Pick<ReaderStatusBarProps, 'visible' | 'modeLabel' | 'progressLabel'>) {
  if (!visible) {
    return <div className="shrink-0 pb-safe" />;
  }

  return (
    <div
      className="flex shrink-0 select-none items-center justify-between gap-4 px-6 text-[11.5px] tabular-nums opacity-80"
      style={{
        height: 'calc(32px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        color: 'var(--r-ink-muted)',
      }}
    >
      <span>{modeLabel}</span>
      <span>{progressLabel}</span>
    </div>
  );
}
