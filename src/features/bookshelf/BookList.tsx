import { IconButton } from '@/components/ui/IconButton';
import { IconTrash } from '@/components/ui/Icons';
import { BookCover } from './BookCover';
import { calcBookProgress, type BookCollectionProps } from './BookGrid';

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp || timestamp <= 0) return '';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 30) return `${days} 天前`;
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BookList({
  books,
  onOpenBook,
  onRequestDelete,
}: BookCollectionProps) {
  return (
    <div
      className="overflow-hidden rounded-[18px] border bg-[var(--l1-bg)] shadow-[var(--l1-shadow)]"
      style={{ borderColor: 'var(--l1-border)' }}
    >
      {books.map((book, idx) => {
        const pct = calcBookProgress(book);
        const chapterLine = book.durChapterTitle || book.latestChapterTitle || '';
        const timeStr = formatRelativeTime(book.durChapterTime);

        return (
          <div
            key={book.bookUrl}
            role="button"
            tabIndex={0}
            onClick={() => onOpenBook(book)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenBook(book);
              }
            }}
            style={idx > 0 ? { borderTop: '1px solid var(--divider)' } : undefined}
            className="flex cursor-pointer items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-[var(--fill-control)] sm:gap-4 sm:px-5"
          >
            <BookCover
              book={book}
              compact
              className="h-[64px] w-[46px] shrink-0 shadow-[0_3px_10px_rgba(0,0,0,0.14)]"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2.5">
                <span className="truncate text-[15px] font-semibold text-[var(--ink-primary)]">
                  {book.name}
                </span>
                <span className="shrink-0 text-[12.5px] text-[var(--ink-secondary)]">
                  {book.author || '佚名'}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[12.5px] text-[var(--ink-tertiary)]">
                <span className="truncate">{chapterLine}</span>
                {timeStr && (
                  <span className="hidden shrink-0 sm:inline">· {timeStr}</span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              <div className="flex w-[76px] flex-col items-end gap-1.5 sm:w-[112px]">
                <span className="text-[12px] font-medium tabular-nums text-[var(--ink-secondary)]">
                  {pct}%
                </span>
                <div className="h-[4px] w-full overflow-hidden rounded-full bg-[var(--fill-control)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <IconButton
                ariaLabel={`移出书架：${book.name}`}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDelete(book);
                }}
              >
                <IconTrash size={16} className="text-[var(--ink-secondary)] hover:text-[var(--danger)]" />
              </IconButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}
