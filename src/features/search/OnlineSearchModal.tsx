import { useEffect, useRef, useState } from 'react';
import { startBookSearch, type SearchSession } from '@/api/searchSocket';
import type { SearchBook } from '@/api/types';
import { GlassModal } from '@/components/ui/GlassModal';
import { IconCheck, IconPlus, IconSearch } from '@/components/ui/Icons';
import { toast } from '@/components/ui/Toast';
import { BookCover } from '@/features/bookshelf/BookCover';
import { navigate } from '@/router';
import { useBookshelfStore } from '@/stores/bookshelfStore';
import { useConnectionStore } from '@/stores/connectionStore';

export interface OnlineSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnlineSearchModal({
  open,
  onOpenChange,
}: OnlineSearchModalProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);

  const sessionRef = useRef<SearchSession | null>(null);
  const getActiveEndpoint = useConnectionStore((s) => s.getActiveEndpoint);
  const { books, addBook } = useBookshelfStore();

  const shelfUrlSet = new Set(books.map((b) => b.bookUrl));

  const stopSession = () => {
    sessionRef.current?.cancel();
    sessionRef.current = null;
    setSearching(false);
  };

  useEffect(() => {
    if (!open) {
      stopSession();
    }
    return () => {
      sessionRef.current?.cancel();
      sessionRef.current = null;
    };
  }, [open]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = keyword.trim();
    if (!q) return;

    stopSession();
    setResults([]);
    setError(null);
    setHasSearched(true);
    setSearching(true);

    sessionRef.current = startBookSearch(getActiveEndpoint(), q, {
      onBatch: (batch) => {
        setResults((prev) => [...prev, ...batch]);
      },
      onFinish: () => {
        setSearching(false);
        sessionRef.current = null;
      },
      onError: (msg) => {
        setSearching(false);
        setError(msg);
        sessionRef.current = null;
      },
    });
  };

  const handleAddToShelf = async (item: SearchBook) => {
    const key = `${item.bookUrl}::${item.origin}`;
    if (addingKey) return;
    setAddingKey(key);
    try {
      await addBook(item);
      toast.success(`已加入《${item.name}》`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加入书架失败');
    } finally {
      setAddingKey(null);
    }
  };

  const handleTryRead = async (item: SearchBook) => {
    const key = `${item.bookUrl}::${item.origin}`;
    if (addingKey) return;
    if (!shelfUrlSet.has(item.bookUrl)) {
      setAddingKey(key);
      try {
        await addBook(item);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '无法打开书籍');
        setAddingKey(null);
        return;
      }
      setAddingKey(null);
    }
    stopSession();
    onOpenChange(false);
    navigate({ view: 'reader', bookUrl: item.bookUrl });
  };

  return (
    <GlassModal
      open={open}
      onOpenChange={(next) => {
        if (!next) stopSession();
        onOpenChange(next);
      }}
      title="在线搜书"
      size="lg"
    >
      <div className="flex flex-col gap-4 p-5">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex flex-1 items-center">
            <IconSearch
              size={15}
              className="pointer-events-none absolute left-3 text-[var(--ink-tertiary)]"
            />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="书名或作者"
              aria-label="搜索书名或作者"
              autoFocus
              className="h-[38px] w-full rounded-[11px] border bg-[var(--l1-bg)] pl-[34px] pr-3 text-[14px] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)] focus:border-[var(--accent)] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-soft)]"
              style={{ borderColor: 'var(--l1-border)' }}
            />
          </div>
          {searching ? (
            <button
              type="button"
              onClick={stopSession}
              className="h-[38px] shrink-0 rounded-full bg-[var(--fill-control)] px-4 text-[13.5px] font-medium text-[var(--ink-primary)] hover:bg-[var(--fill-control-hover)]"
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!keyword.trim()}
              className="h-[38px] shrink-0 rounded-full bg-[var(--accent)] px-4 text-[13.5px] font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-45"
            >
              搜索
            </button>
          )}
        </form>

        {error && (
          <div className="rounded-[12px] bg-[var(--danger-soft)] px-3.5 py-2.5 text-[13px] text-[var(--danger)]">
            {error}
          </div>
        )}

        {searching && (
          <div className="flex items-center gap-2 text-[12.5px] text-[var(--ink-secondary)]">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
            <span>正在检索书源（已获取 {results.length} 条）</span>
          </div>
        )}

        {results.length > 0 && (
          <div
            className="overflow-hidden rounded-[14px] border bg-[var(--l1-bg)]"
            style={{ borderColor: 'var(--l1-border)' }}
          >
            {results.map((item, idx) => {
              const key = `${item.bookUrl}::${item.origin}`;
              const inShelf = shelfUrlSet.has(item.bookUrl);
              const busy = addingKey === key;

              return (
                <div
                  key={key}
                  style={idx > 0 ? { borderTop: '1px solid var(--divider)' } : undefined}
                  className="flex items-start gap-3.5 p-3.5"
                >
                  <BookCover
                    book={item}
                    compact
                    className="h-[66px] w-[48px] shrink-0 shadow-[0_3px_10px_rgba(0,0,0,0.14)]"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="truncate text-[14.5px] font-semibold text-[var(--ink-primary)]">
                        {item.name}
                      </span>
                      <span className="text-[12.5px] text-[var(--ink-secondary)]">
                        {item.author || '佚名'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[var(--ink-tertiary)]">
                      {item.originName && (
                        <span className="rounded-full bg-[var(--fill-control)] px-2 py-0.5 text-[var(--ink-secondary)]">
                          {item.originName}
                        </span>
                      )}
                      {item.kind && (
                        <span className="truncate">{item.kind.split(',')[0]}</span>
                      )}
                      {item.latestChapterTitle && (
                        <span className="truncate">· {item.latestChapterTitle}</span>
                      )}
                    </div>
                    {item.intro && (
                      <p className="m-0 mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-[var(--ink-secondary)]">
                        {item.intro.trim()}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                    {inShelf ? (
                      <button
                        type="button"
                        onClick={() => void handleTryRead(item)}
                        className="inline-flex h-8 items-center gap-1 rounded-full bg-[var(--success-soft)] px-3 text-[12.5px] font-medium text-[var(--success)]"
                      >
                        <IconCheck size={14} />
                        <span>阅读</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleTryRead(item)}
                          className="h-8 rounded-full bg-[var(--fill-control)] px-3 text-[12.5px] font-medium text-[var(--ink-primary)] hover:bg-[var(--fill-control-hover)] disabled:opacity-45"
                        >
                          试读
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleAddToShelf(item)}
                          className="inline-flex h-8 items-center gap-1 rounded-full bg-[var(--accent)] px-3 text-[12.5px] font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-45"
                        >
                          <IconPlus size={14} />
                          <span>书架</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!searching && hasSearched && !error && results.length === 0 && (
          <div className="py-12 text-center text-[13.5px] text-[var(--ink-secondary)]">
            未找到相关书籍
          </div>
        )}
      </div>
    </GlassModal>
  );
}
