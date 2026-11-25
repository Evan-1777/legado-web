import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { NormalizedChapter } from '@/api/types';
import { IconChevronLeft, IconChevronRight } from '@/components/ui/Icons';
import { ChapterView } from './ChapterView';

export interface ScrollReaderProps {
  chapter: NormalizedChapter;
  chapterKey: string;
  initialCharPos: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onPosChange: (
    charPos: number,
    chapterPercent: number,
    options?: { userInitiated?: boolean }
  ) => void;
  onScrollStart?: () => void;
  onImageClick?: (src: string, alt: string) => void;
}

export function ScrollReader({
  chapter,
  chapterKey,
  initialCharPos,
  hasPrev,
  hasNext,
  onPrevChapter,
  onNextChapter,
  onPosChange,
  onScrollStart,
  onImageClick,
}: ScrollReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const restoringRef = useRef(false);
  const lastAppliedKeyRef = useRef<string>('');
  const anchorCharPosRef = useRef(initialCharPos);
  const lastWidthRef = useRef(0);

  const locateCurrentCharPos = useCallback((): {
    charPos: number;
    pct: number;
  } => {
    const el = containerRef.current;
    if (!el) return { charPos: 0, pct: 0 };

    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
    const pct = Math.max(0, Math.min(1, el.scrollTop / maxScroll));

    const containerTop = el.getBoundingClientRect().top + 16;
    const nodes = el.querySelectorAll<HTMLElement>('[data-start]');
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (rect.bottom >= containerTop) {
        const start = Number(node.dataset.start);
        return { charPos: Number.isFinite(start) ? start : 0, pct };
      }
    }
    return { charPos: chapter.characterCount, pct };
  }, [chapter.characterCount]);

  const scrollToCharPos = useCallback((el: HTMLElement, charPos: number) => {
    if (charPos <= 0) {
      el.scrollTop = 0;
      return;
    }
    const nodes = el.querySelectorAll<HTMLElement>('[data-start]');
    let target: HTMLElement | null = null;
    for (const node of nodes) {
      const start = Number(node.dataset.start);
      const end = Number(node.dataset.end);
      if (charPos >= start && charPos <= end) {
        target = node;
        break;
      }
      if (start >= charPos) {
        target = node;
        break;
      }
    }
    if (!target) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    const offset =
      target.getBoundingClientRect().top -
      el.getBoundingClientRect().top +
      el.scrollTop -
      16;
    el.scrollTop = Math.max(0, offset);
  }, []);

  // Restore position when switching chapter or remounting after a mode switch.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (lastAppliedKeyRef.current === chapterKey) return;
    lastAppliedKeyRef.current = chapterKey;

    anchorCharPosRef.current = initialCharPos;
    lastWidthRef.current = el.clientWidth;
    restoringRef.current = true;
    scrollToCharPos(el, initialCharPos);

    const frame = requestAnimationFrame(() => {
      restoringRef.current = false;
      const { charPos, pct } = locateCurrentCharPos();
      anchorCharPosRef.current = charPos;
      onPosChange(charPos, pct, { userInitiated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [
    chapterKey,
    initialCharPos,
    locateCurrentCharPos,
    onPosChange,
    scrollToCharPos,
  ]);

  // Width changes reflow text without changing scrollHeight; re-anchor to the
  // paragraph currently under the reading line.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    lastWidthRef.current = el.clientWidth;
    let raf = 0;
    let cancelled = false;

    const ro = new ResizeObserver(() => {
      const width = el.clientWidth;
      if (Math.abs(width - lastWidthRef.current) < 1) return;
      lastWidthRef.current = width;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (cancelled) return;
        restoringRef.current = true;
        scrollToCharPos(el, anchorCharPosRef.current);
        requestAnimationFrame(() => {
          if (!cancelled) restoringRef.current = false;
        });
      });
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollToCharPos]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const handleScroll = () => {
      if (!restoringRef.current) onScrollStart?.();
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const { charPos, pct } = locateCurrentCharPos();
        if (!restoringRef.current) anchorCharPosRef.current = charPos;
        onPosChange(charPos, pct, {
          userInitiated: !restoringRef.current,
        });
      });
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [locateCurrentCharPos, onPosChange, onScrollStart]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto overscroll-y-contain"
      style={{
        padding:
          'var(--r-pad-y) var(--r-pad-x) calc(var(--r-pad-y) + 72px)',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <article className="mx-auto" style={{ maxWidth: 'var(--r-max-width)' }}>
        <ChapterView chapter={chapter} onImageClick={onImageClick} />

        <nav
          aria-label="章节导航"
          onClick={(e) => e.stopPropagation()}
          className="mt-11 flex items-center justify-between pt-6"
          style={{
            borderTop: '1px solid var(--r-divider)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <button
            type="button"
            disabled={!hasPrev}
            onClick={onPrevChapter}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--r-control)] px-4 text-[13.5px] font-medium text-[var(--r-ink)] transition-opacity hover:opacity-80 disabled:opacity-35"
          >
            <IconChevronLeft size={16} />
            <span>上一章</span>
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={onNextChapter}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--r-control)] px-4 text-[13.5px] font-medium text-[var(--r-ink)] transition-opacity hover:opacity-80 disabled:opacity-35"
          >
            <span>下一章</span>
            <IconChevronRight size={16} />
          </button>
        </nav>
      </article>
    </div>
  );
}
