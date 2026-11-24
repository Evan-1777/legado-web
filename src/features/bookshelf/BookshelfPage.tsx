import { useEffect, useMemo, useState } from 'react';
import type { Book } from '@/api/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  IconAlertCircle,
  IconBookOpen,
  IconRefresh,
  IconSearchPlus,
  IconSettings,
  IconUpload,
} from '@/components/ui/Icons';
import { toast } from '@/components/ui/Toast';
import { navigate } from '@/router';
import { useBookshelfStore } from '@/stores/bookshelfStore';
import { useConnectionStore } from '@/stores/connectionStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { BookGrid } from './BookGrid';
import { BookList } from './BookList';
import { BookshelfHeader } from './BookshelfHeader';
import { UploadBookModal } from './UploadBookModal';

export interface BookshelfPageProps {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  resolvedDark: boolean;
  onToggleUiDark: () => void;
}

export function BookshelfPage({
  onOpenSearch,
  onOpenSettings,
  resolvedDark,
  onToggleUiDark,
}: BookshelfPageProps) {
  const {
    books,
    loading,
    hasLoaded,
    error,
    filterQuery,
    setFilterQuery,
    refresh,
    removeBook,
  } = useBookshelfStore();
  const activeEndpointId = useConnectionStore((s) => s.activeEndpointId);
  const { bookshelfView, bookshelfSort } = useSettingsStore((s) => s.settings);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void refresh();
  }, [activeEndpointId, refresh]);

  const visibleBooks = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    const filtered = q
      ? books.filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            (b.author || '').toLowerCase().includes(q)
        )
      : books;

    const list = [...filtered];
    if (bookshelfSort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
    } else if (bookshelfSort === 'latest') {
      list.sort((a, b) => (b.latestChapterTime ?? 0) - (a.latestChapterTime ?? 0));
    } else {
      list.sort((a, b) => (b.durChapterTime ?? 0) - (a.durChapterTime ?? 0));
    }
    return list;
  }, [books, filterQuery, bookshelfSort]);

  const handleOpenBook = (book: Book) => {
    navigate({ view: 'reader', bookUrl: book.bookUrl });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await removeBook(deleteTarget);
      toast.show(`已移出「${deleteTarget.name}」`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '移出失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-full bg-[var(--l0-bg)] pb-[calc(64px+env(safe-area-inset-bottom))]">
      <BookshelfHeader
        totalCount={books.length}
        filterQuery={filterQuery}
        onFilterChange={setFilterQuery}
        refreshing={loading}
        onRefresh={() => void refresh()}
        onOpenSearch={onOpenSearch}
        onOpenUpload={() => setUploadOpen(true)}
        onOpenSettings={onOpenSettings}
        resolvedDark={resolvedDark}
        onToggleUiDark={onToggleUiDark}
      />

      <main className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 sm:pt-7">
        {/* State 1: Initial Loading Skeleton */}
        {loading && !hasLoaded && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-8 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col">
                <div className="animate-shimmer aspect-[3/4.25] w-full rounded-[6px_10px_10px_6px]" />
                <div className="mt-2.5 h-3 w-3/4 rounded-md bg-[var(--fill-control)]" />
                <div className="mt-1.5 h-2.5 w-1/2 rounded-md bg-[var(--fill-control)]" />
              </div>
            ))}
          </div>
        )}

        {/* State 2: Connection / Load Error */}
        {!loading && error && books.length === 0 && (
          <div className="mx-auto my-24 flex max-w-[400px] flex-col items-center gap-3.5 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-[16px] border bg-[var(--l1-bg)] text-[var(--danger)] shadow-[var(--l1-shadow)]"
              style={{ borderColor: 'var(--l1-border)' }}
            >
              <IconAlertCircle size={26} />
            </div>
            <h2 className="m-0 text-[17px] font-semibold text-[var(--ink-primary)]">
              无法连接服务
            </h2>
            <p className="m-0 text-[13.5px] leading-relaxed text-[var(--ink-secondary)]">
              {error}
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                <IconRefresh size={15} />
                <span>重试</span>
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--fill-control)] px-4 text-[13.5px] font-medium text-[var(--ink-primary)] transition-colors hover:bg-[var(--fill-control-hover)]"
              >
                <IconSettings size={15} />
                <span>连接设置</span>
              </button>
            </div>
          </div>
        )}

        {/* State 3: Empty Bookshelf */}
        {!loading && !error && hasLoaded && books.length === 0 && (
          <div className="mx-auto my-24 flex max-w-[380px] flex-col items-center gap-3.5 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-[16px] border bg-[var(--l1-bg)] text-[var(--ink-secondary)] shadow-[var(--l1-shadow)]"
              style={{ borderColor: 'var(--l1-border)' }}
            >
              <IconBookOpen size={26} />
            </div>
            <h2 className="m-0 text-[17px] font-semibold text-[var(--ink-primary)]">
              书架为空
            </h2>
            <div className="mt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                <IconUpload size={15} />
                <span>上传本地书籍</span>
              </button>
              <button
                type="button"
                onClick={onOpenSearch}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--fill-control)] px-4 text-[13.5px] font-medium text-[var(--ink-primary)] transition-colors hover:bg-[var(--fill-control-hover)]"
              >
                <IconSearchPlus size={15} />
                <span>在线搜书</span>
              </button>
            </div>
          </div>
        )}

        {/* State 4: Filtered Empty */}
        {!loading && books.length > 0 && visibleBooks.length === 0 && (
          <div className="mx-auto my-20 flex max-w-[320px] flex-col items-center gap-3 text-center">
            <p className="m-0 text-[14.5px] text-[var(--ink-secondary)]">
              无匹配书籍
            </p>
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="h-8 rounded-full bg-[var(--fill-control)] px-3.5 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--fill-control-hover)]"
            >
              清除筛选
            </button>
          </div>
        )}

        {/* State 5: Normal Bookshelf */}
        {visibleBooks.length > 0 &&
          (bookshelfView === 'grid' ? (
            <BookGrid
              books={visibleBooks}
              onOpenBook={handleOpenBook}
              onRequestDelete={setDeleteTarget}
            />
          ) : (
            <BookList
              books={visibleBooks}
              onOpenBook={handleOpenBook}
              onRequestDelete={setDeleteTarget}
            />
          ))}
      </main>

      <UploadBookModal open={uploadOpen} onOpenChange={setUploadOpen} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
        title="移出书架"
        message={deleteTarget ? `确认将《${deleteTarget.name}》从书架移除？` : ''}
        confirmLabel="移出"
        destructive
        busy={deleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
