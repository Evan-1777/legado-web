import { useEffect, useMemo, useRef, useState } from 'react';
import type { BookChapter } from '@/api/types';
import { GlassModal } from '@/components/ui/GlassModal';
import { IconButton } from '@/components/ui/IconButton';
import { IconArrowUpDown, IconRefresh, IconSearch } from '@/components/ui/Icons';

export interface TocDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapters: BookChapter[];
  currentIndex: number;
  refreshing: boolean;
  onRefresh: () => void;
  onSelectChapter: (index: number) => void;
}

const ROW_HEIGHT = 44;
const OVERSCAN = 10;

export function TocDrawer({
  open,
  onOpenChange,
  chapters,
  currentIndex,
  refreshing,
  onRefresh,
  onSelectChapter,
}: TocDrawerProps) {
  const [query, setQuery] = useState('');
  const [reversed, setReversed] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    const base = reversed ? [...chapters].reverse() : chapters;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => c.title.toLowerCase().includes(q));
  }, [chapters, reversed, query]);

  // Center active chapter whenever drawer opens
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;

    const frame = requestAnimationFrame(() => {
      const h = el.clientHeight || 600;
      setViewportHeight(h);
      const pos = items.findIndex((c) => c.index === currentIndex);
      if (pos >= 0) {
        const targetTop = Math.max(0, pos * ROW_HEIGHT - h / 2 + ROW_HEIGHT / 2);
        el.scrollTop = targetTop;
        setScrollTop(targetTop);
      } else {
        el.scrollTop = 0;
        setScrollTop(0);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, currentIndex, items]);

  const totalHeight = items.length * ROW_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIdx = Math.min(items.length, startIdx + visibleCount);
  const slice = items.slice(startIdx, endIdx);

  return (
    <GlassModal
      open={open}
      onOpenChange={onOpenChange}
      title={`目录 (${chapters.length})`}
      variant="drawer-left"
      surface="reader"
      headerActions={
        <>
          <IconButton
            ariaLabel={reversed ? '正序排列' : '倒序排列'}
            surface="reader"
            size="sm"
            active={reversed}
            onClick={() => setReversed((r) => !r)}
          >
            <IconArrowUpDown size={16} />
          </IconButton>
          <IconButton
            ariaLabel="刷新目录"
            surface="reader"
            size="sm"
            disabled={refreshing}
            onClick={onRefresh}
          >
            <IconRefresh
              size={16}
              className={refreshing ? 'animate-spin' : undefined}
            />
          </IconButton>
        </>
      }
    >
      <div
        className="shrink-0 px-4 py-3"
        style={{ borderBottom: '1px solid var(--r-divider)' }}
      >
        <div className="relative flex items-center">
          <IconSearch
            size={14}
            className="pointer-events-none absolute left-3 opacity-60"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (listRef.current) {
                listRef.current.scrollTop = 0;
                setScrollTop(0);
              }
            }}
            placeholder="搜索章节"
            aria-label="搜索章节"
            style={{ background: 'var(--r-control)', color: 'var(--r-ink)' }}
            className="h-[34px] w-full rounded-[10px] border border-transparent pl-8 pr-3 text-[13.5px] placeholder:opacity-55 focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      </div>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setScrollTop(el.scrollTop);
          if (el.clientHeight !== viewportHeight) {
            setViewportHeight(el.clientHeight);
          }
        }}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5"
      >
        {items.length === 0 ? (
          <div
            className="py-12 text-center text-[13px]"
            style={{ color: 'var(--r-ink-muted)' }}
          >
            无匹配章节
          </div>
        ) : (
          <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
            {slice.map((ch, i) => {
              const rowIdx = startIdx + i;
              const active = ch.index === currentIndex;
              return (
                <button
                  key={`${ch.index}-${ch.url}`}
                  type="button"
                  onClick={() => {
                    onSelectChapter(ch.index);
                    onOpenChange(false);
                  }}
                  style={{
                    top: `${rowIdx * ROW_HEIGHT}px`,
                    height: `${ROW_HEIGHT}px`,
                    background: active ? 'var(--accent-soft)' : undefined,
                    color: active ? 'var(--accent)' : 'var(--r-ink)',
                  }}
                  className={[
                    'absolute inset-x-0 flex items-center justify-between gap-2.5 rounded-[10px] px-3 text-left text-[13.5px] transition-colors',
                    active ? 'font-semibold' : 'hover:bg-[var(--r-control)]',
                  ].join(' ')}
                >
                  <span className="truncate">{ch.title}</span>
                  <span
                    className="shrink-0 text-[11px] tabular-nums"
                    style={{
                      color: active ? 'var(--accent)' : 'var(--r-ink-muted)',
                    }}
                  >
                    {ch.index + 1}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </GlassModal>
  );
}
