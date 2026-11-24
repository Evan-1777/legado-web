import { useState, type ReactNode } from 'react';
import type { BookChapter } from '@/api/types';
import { AppleSlider } from '@/components/ui/AppleControls';
import { IconButton } from '@/components/ui/IconButton';
import {
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
  IconToc,
} from '@/components/ui/Icons';

export interface ReaderHudProps {
  visible: boolean;
  bookTitle: string;
  chapterTitle: string;
  chapters: BookChapter[];
  chapterIndex: number;
  refreshingToc: boolean;
  onBack: () => void;
  onRefreshToc: () => void;
  onOpenToc: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onJumpChapter: (index: number) => void;
  typographyTrigger: ReactNode;
}

export function ReaderHud({
  visible,
  bookTitle,
  chapterTitle,
  chapters,
  chapterIndex,
  refreshingToc,
  onBack,
  onRefreshToc,
  onOpenToc,
  onPrevChapter,
  onNextChapter,
  onJumpChapter,
  typographyTrigger,
}: ReaderHudProps) {
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const totalChapters = Math.max(1, chapters.length);
  const displayIndex = scrubIndex ?? chapterIndex;
  const displayChapter = chapters[displayIndex];
  const progressPct = Math.round(((displayIndex + 1) / totalChapters) * 100);

  return (
    <>
      {/* Layer 2 Floating Top Pill */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={[
          'glass-reader fixed left-1/2 z-60 flex h-[50px] w-[min(calc(100%-24px),860px)] -translate-x-1/2 items-center gap-1.5 rounded-full px-2.5',
          'transition-[opacity,transform] duration-220 ease-[var(--ease-apple)]',
          visible
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-4 opacity-0',
        ].join(' ')}
        style={{
          top: 'calc(12px + env(safe-area-inset-top))',
          color: 'var(--r-ink)',
        }}
      >
        <IconButton ariaLabel="返回书架" surface="reader" onClick={onBack}>
          <IconChevronLeft size={20} />
        </IconButton>

        <div className="min-w-0 flex-1 px-2 text-center">
          <div className="truncate text-[14px] font-semibold leading-tight">
            {bookTitle}
          </div>
          <div
            className="truncate text-[11.5px] leading-tight mt-0.5"
            style={{ color: 'var(--r-ink-muted)' }}
          >
            {chapterTitle}
          </div>
        </div>

        <IconButton
          ariaLabel="刷新目录"
          surface="reader"
          disabled={refreshingToc}
          onClick={onRefreshToc}
        >
          <IconRefresh
            size={17}
            className={refreshingToc ? 'animate-spin' : undefined}
          />
        </IconButton>

        <IconButton
          ariaLabel="目录"
          tooltip="目录 (T)"
          surface="reader"
          onClick={onOpenToc}
        >
          <IconToc size={18} />
        </IconButton>

        {typographyTrigger}
      </div>

      {/* Layer 2 Floating Bottom Capsule */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={[
          'glass-reader fixed left-1/2 z-60 flex w-[min(calc(100%-24px),640px)] -translate-x-1/2 items-center gap-2.5 rounded-[24px] px-3.5 py-2.5',
          'transition-[opacity,transform] duration-220 ease-[var(--ease-apple)]',
          visible
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0',
        ].join(' ')}
        style={{
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          color: 'var(--r-ink)',
        }}
      >
        {/* Scrubbing Preview Tooltip */}
        {scrubIndex !== null && displayChapter && (
          <div
            className="glass-reader-panel pointer-events-none absolute -top-12 left-1/2 max-w-[88%] -translate-x-1/2 truncate rounded-full px-3.5 py-1.5 text-[12px] font-medium"
            style={{ color: 'var(--r-ink)' }}
          >
            {displayChapter.title}
          </div>
        )}

        <IconButton
          ariaLabel="上一章"
          surface="reader"
          disabled={chapterIndex <= 0}
          onClick={onPrevChapter}
        >
          <IconChevronLeft size={19} />
        </IconButton>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div
            className="flex items-center justify-between px-0.5 text-[11px] tabular-nums"
            style={{ color: 'var(--r-ink-muted)' }}
          >
            <span>
              {displayIndex + 1} / {totalChapters}
            </span>
            <span>{progressPct}%</span>
          </div>
          <AppleSlider
            value={displayIndex}
            min={0}
            max={Math.max(0, totalChapters - 1)}
            step={1}
            ariaLabel="章节进度"
            surface="reader"
            onChange={(val) => setScrubIndex(val)}
            onCommit={(val) => {
              setScrubIndex(null);
              if (val !== chapterIndex) {
                onJumpChapter(val);
              }
            }}
          />
        </div>

        <IconButton
          ariaLabel="下一章"
          surface="reader"
          disabled={chapterIndex >= totalChapters - 1}
          onClick={onNextChapter}
        >
          <IconChevronRight size={19} />
        </IconButton>
      </div>
    </>
  );
}
