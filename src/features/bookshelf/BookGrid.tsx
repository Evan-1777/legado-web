import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Book } from '@/api/types';
import { IconBookOpen, IconMoreHorizontal, IconTrash } from '@/components/ui/Icons';
import { BookCover } from './BookCover';

export function calcBookProgress(book: Book): number {
  const total = book.totalChapterNum ?? 0;
  const idx = book.durChapterIndex ?? 0;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((idx + 1) / total) * 100)));
}

export interface BookCollectionProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
  onRequestDelete: (book: Book) => void;
}

export function BookGrid({
  books,
  onOpenBook,
  onRequestDelete,
}: BookCollectionProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-8 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {books.map((book) => {
        const pct = calcBookProgress(book);
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
            className="group relative flex cursor-pointer flex-col text-left outline-none focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
          >
            <div className="relative aspect-[3/4.25] w-full">
              <BookCover
                book={book}
                progressPercent={pct}
                className="h-full w-full shadow-[var(--cover-shadow)] transition-[transform,box-shadow] duration-300 ease-[var(--ease-apple)] group-hover:-translate-y-1 group-hover:scale-[1.012] group-hover:shadow-[var(--cover-shadow-hover)] group-active:translate-y-0 group-active:scale-[0.99]"
              />

              {/* Context Menu Trigger */}
              <div
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                className="absolute right-2 top-2 z-10"
              >
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      aria-label={`更多操作：${book.name}`}
                      className={[
                        'touch-visible flex h-7 w-7 items-center justify-center rounded-full',
                        'bg-[#1c1c1e]/60 text-white backdrop-blur-[12px]',
                        'opacity-0 transition-[opacity,transform,background-color] duration-150',
                        'group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100',
                        'hover:scale-105 hover:bg-[#1c1c1e]/82',
                      ].join(' ')}
                    >
                      <IconMoreHorizontal size={15} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={6}
                      style={{
                        background: 'var(--l3-bg)',
                        borderColor: 'var(--l2-border)',
                        boxShadow: 'var(--l3-shadow)',
                      }}
                      className="z-80 min-w-[144px] rounded-[14px] border p-1.5 backdrop-blur-[28px] backdrop-saturate-[180%] anim-popover-in"
                    >
                      <DropdownMenu.Item
                        onSelect={() => onOpenBook(book)}
                        className="flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] text-[var(--ink-primary)] outline-none data-[highlighted]:bg-[var(--fill-control)]"
                      >
                        <IconBookOpen size={15} />
                        <span>继续阅读</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onSelect={() => onRequestDelete(book)}
                        className="flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] text-[var(--danger)] outline-none data-[highlighted]:bg-[var(--danger-soft)]"
                      >
                        <IconTrash size={15} />
                        <span>移出书架</span>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </div>

            <div className="px-0.5 pt-2.5">
              <div className="truncate text-[14px] font-semibold leading-[1.32] text-[var(--ink-primary)]">
                {book.name}
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-[12px] text-[var(--ink-secondary)]">
                <span className="truncate">{book.author || '佚名'}</span>
                {pct > 0 && (
                  <span className="shrink-0 tabular-nums text-[var(--ink-tertiary)]">
                    {pct}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
