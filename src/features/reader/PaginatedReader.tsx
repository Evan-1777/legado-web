import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { NormalizedChapter } from '@/api/types';
import { ChapterView } from './ChapterView';
import {
  computePaginatedLayout,
  computeTotalPages,
  measureContentRightEdge,
  resolveCharPosPage,
  resolvePageCharPos,
} from './paginationEngine';

export type PaginatedStateReason =
  | 'init'
  | 'navigate'
  | 'reflow'
  | 'chapter-end';

export interface PaginatedPageInfo {
  page: number;
  totalPages: number;
  columns: 1 | 2;
}

export interface PaginatedReaderHandle {
  prevPage: () => boolean;
  nextPage: () => boolean;
  goToPage: (pageIndex: number) => void;
  goToCharPos: (charPos: number) => void;
  getCurrentCharPos: () => number;
  getPageInfo: () => PaginatedPageInfo;
}

export interface PaginatedReaderProps {
  chapter: NormalizedChapter;
  chapterKey: string;
  initialCharPos: number;
  startFromEnd?: boolean;
  paddingX: number;
  paddingY: number;
  maxWidth: number;
  columnGap: number;
  twoColumnOnWide: boolean;
  pageAnimation: 'slide' | 'none';
  layoutToken: string;
  interactionEnabled?: boolean;
  onReachPrevChapter: () => void;
  onReachNextChapter: () => void;
  onPageStateChange: (
    charPos: number,
    chapterPercent: number,
    info: PaginatedPageInfo,
    reason: PaginatedStateReason
  ) => void;
  onInteractionStart?: () => void;
  onImageClick?: (src: string, alt: string) => void;
}

export const PaginatedReader = forwardRef<PaginatedReaderHandle, PaginatedReaderProps>(
  function PaginatedReader(
    {
      chapter,
      chapterKey,
      initialCharPos,
      startFromEnd = false,
      paddingX,
      paddingY,
      maxWidth,
      columnGap,
      twoColumnOnWide,
      pageAnimation,
      layoutToken,
      interactionEnabled = true,
      onReachPrevChapter,
      onReachNextChapter,
      onPageStateChange,
      onInteractionStart,
      onImageClick,
    },
    ref
  ) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    const [page, setPage] = useState(0);
    const [stepPx, setStepPx] = useState(0);
    const [colWidthPx, setColWidthPx] = useState(0);
    const [columns, setColumns] = useState<1 | 2>(1);
    const [suppressAnim, setSuppressAnim] = useState(true);

    // Single source of truth for reading position. Only explicit navigation
    // writes this ref; reflow is strictly read-only to prevent drift.
    const anchorCharPosRef = useRef(initialCharPos);
    const pageRef = useRef(0);
    const totalPagesRef = useRef(1);
    const stepPxRef = useRef(0);
    const columnsRef = useRef<1 | 2>(1);
    const lastChapterKeyRef = useRef('');
    const dragSuppressUntilRef = useRef(0);

    const emitState = useCallback(
      (
        charPos: number,
        nextPage: number,
        nextTotal: number,
        nextCols: 1 | 2,
        reason: PaginatedStateReason
      ) => {
        const pct = nextTotal <= 1 ? 1 : nextPage / (nextTotal - 1);
        onPageStateChange(
          charPos,
          pct,
          { page: nextPage, totalPages: nextTotal, columns: nextCols },
          reason
        );
      },
      [onPageStateChange]
    );

    const measureAndAnchor = useCallback(
      (anchorMode: 'initial' | 'preserve' | 'end') => {
        const viewport = viewportRef.current;
        const track = trackRef.current;
        if (!viewport || !track) return;

        const vw = viewport.clientWidth;
        const vh = viewport.clientHeight;
        if (vw <= 0 || vh <= 0) return;

        const layout = computePaginatedLayout({
          viewportWidth: vw,
          viewportHeight: vh,
          paddingX,
          maxWidth,
          columnGap,
          twoColumnOnWide,
        });

        // Apply geometry synchronously so scrollWidth measures the final columns.
        viewport.style.padding = `${paddingY}px ${layout.effectivePaddingX}px`;
        viewport.style.setProperty(
          '--r-page-height',
          `${Math.max(0, vh - paddingY * 2)}px`
        );
        track.style.columnWidth = `${layout.columnWidth}px`;
        track.style.columnGap = `${columnGap}px`;

        const contentRight = measureContentRightEdge(track);
        const nextTotal = computeTotalPages(
          contentRight,
          track.scrollWidth,
          columnGap,
          layout.stepPx
        );

        let nextPage = 0;
        let charPos = anchorCharPosRef.current;

        if (anchorMode === 'end') {
          nextPage = Math.max(0, nextTotal - 1);
          charPos = resolvePageCharPos(
            track,
            nextPage,
            layout.stepPx,
            chapter.characterCount
          );
          anchorCharPosRef.current = charPos;
        } else if (anchorMode === 'initial') {
          anchorCharPosRef.current = initialCharPos;
          charPos = initialCharPos;
          nextPage = resolveCharPosPage(
            track,
            initialCharPos,
            layout.stepPx,
            nextTotal
          );
        } else {
          // Preserve: resolve the page from the untouched anchor.
          nextPage = resolveCharPosPage(
            track,
            charPos,
            layout.stepPx,
            nextTotal
          );
        }

        columnsRef.current = layout.columns;
        stepPxRef.current = layout.stepPx;
        totalPagesRef.current = nextTotal;
        pageRef.current = nextPage;

        setSuppressAnim(true);
        setColumns(layout.columns);
        setColWidthPx(layout.columnWidth);
        setStepPx(layout.stepPx);
        setPage(nextPage);

        // Avoid a single-frame offset flash while the browser reflows.
        track.style.transition = 'none';
        track.style.transform = `translate3d(${-nextPage * layout.stepPx}px, 0, 0)`;

        emitState(
          charPos,
          nextPage,
          nextTotal,
          layout.columns,
          anchorMode === 'initial'
            ? 'init'
            : anchorMode === 'end'
              ? 'chapter-end'
              : 'reflow'
        );
      },
      [
        chapter.characterCount,
        columnGap,
        emitState,
        initialCharPos,
        maxWidth,
        paddingX,
        paddingY,
        twoColumnOnWide,
      ]
    );

    // Chapter switch, retry content, or typography/margin/font change.
    useLayoutEffect(() => {
      const isNewChapter = lastChapterKeyRef.current !== chapterKey;
      lastChapterKeyRef.current = chapterKey;
      if (isNewChapter) {
        anchorCharPosRef.current = initialCharPos;
        measureAndAnchor(startFromEnd ? 'end' : 'initial');
      } else {
        measureAndAnchor('preserve');
      }
    }, [
      chapterKey,
      chapter,
      initialCharPos,
      startFromEnd,
      layoutToken,
      measureAndAnchor,
    ]);

    // Viewport resize and font readiness re-measure while preserving anchor.
    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      let raf = 0;
      let lastW = viewport.clientWidth;
      let lastH = viewport.clientHeight;

      const schedule = () => {
        const w = viewport.clientWidth;
        const h = viewport.clientHeight;
        if (w === lastW && h === lastH) return;
        lastW = w;
        lastH = h;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          raf = 0;
          measureAndAnchor('preserve');
        });
      };

      const ro = new ResizeObserver(schedule);
      ro.observe(viewport);

      let cancelled = false;
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        void document.fonts.ready.then(() => {
          if (!cancelled) measureAndAnchor('preserve');
        });
      }

      return () => {
        cancelled = true;
        ro.disconnect();
        if (raf) cancelAnimationFrame(raf);
      };
    }, [measureAndAnchor]);

    // Async decoded images change line boxes after layout: re-measure in place.
    useEffect(() => {
      const track = trackRef.current;
      if (!track) return;
      const onLoad = (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (target?.tagName === 'IMG') measureAndAnchor('preserve');
      };
      track.addEventListener('load', onLoad, true);
      return () => track.removeEventListener('load', onLoad, true);
    }, [measureAndAnchor]);

    const goToPageInternal = useCallback(
      (targetIndex: number, animate = true) => {
        const track = trackRef.current;
        const step = stepPxRef.current;
        const total = totalPagesRef.current;
        const clamped = Math.max(0, Math.min(total - 1, targetIndex));
        const charPos =
          clamped === 0
            ? 0
            : resolvePageCharPos(
                track,
                clamped,
                step,
                anchorCharPosRef.current
              );

        anchorCharPosRef.current = charPos;
        pageRef.current = clamped;

        setSuppressAnim(!animate);
        setPage(clamped);
        emitState(charPos, clamped, total, columnsRef.current, 'navigate');
      },
      [emitState]
    );

    const goToCharPosInternal = useCallback(
      (pos: number) => {
        const track = trackRef.current;
        const step = stepPxRef.current;
        const total = totalPagesRef.current;
        const target = Math.max(0, pos);
        const idx = resolveCharPosPage(track, target, step, total);
        anchorCharPosRef.current = target;
        pageRef.current = idx;
        setSuppressAnim(true);
        setPage(idx);
        emitState(target, idx, total, columnsRef.current, 'navigate');
      },
      [emitState]
    );

    const flipPrev = useCallback(() => {
      if (pageRef.current > 0) {
        goToPageInternal(pageRef.current - 1, pageAnimation === 'slide');
        return true;
      }
      onReachPrevChapter();
      return false;
    }, [goToPageInternal, onReachPrevChapter, pageAnimation]);

    const flipNext = useCallback(() => {
      if (pageRef.current < totalPagesRef.current - 1) {
        goToPageInternal(pageRef.current + 1, pageAnimation === 'slide');
        return true;
      }
      onReachNextChapter();
      return false;
    }, [goToPageInternal, onReachNextChapter, pageAnimation]);

    useImperativeHandle(
      ref,
      () => ({
        prevPage: flipPrev,
        nextPage: flipNext,
        goToPage: (idx) => goToPageInternal(idx, pageAnimation === 'slide'),
        goToCharPos: goToCharPosInternal,
        getCurrentCharPos: () => anchorCharPosRef.current,
        getPageInfo: () => ({
          page: pageRef.current,
          totalPages: totalPagesRef.current,
          columns: columnsRef.current,
        }),
      }),
      [
        flipNext,
        flipPrev,
        goToCharPosInternal,
        goToPageInternal,
        pageAnimation,
      ]
    );

    // Finger-following horizontal drag with boundary damping (no React renders
    // during the drag frame; the transform is written directly).
    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport || !interactionEnabled) return;

      let dragging = false;
      let locked = false;
      let startX = 0;
      let startY = 0;
      let dx = 0;
      let startTime = 0;

      const applyDrag = (offset: number) => {
        const track = trackRef.current;
        if (!track) return;
        const base = -pageRef.current * stepPxRef.current;
        track.style.transition = 'none';
        track.style.transform = `translate3d(${base + offset}px, 0, 0)`;
      };

      const settle = () => {
        const track = trackRef.current;
        if (!track) return;
        const base = -pageRef.current * stepPxRef.current;
        track.style.transition =
          pageAnimation === 'slide'
            ? 'transform 300ms var(--ease-apple)'
            : 'none';
        track.style.transform = `translate3d(${base}px, 0, 0)`;
      };

      const onTouchStart = (event: TouchEvent) => {
        if (event.touches.length !== 1) return;
        dragging = true;
        locked = false;
        dx = 0;
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = performance.now();
      };

      const onTouchMove = (event: TouchEvent) => {
        if (!dragging) return;
        if (event.touches.length !== 1) {
          dragging = false;
          return;
        }
        const touch = event.touches[0];
        const rawDx = touch.clientX - startX;
        const rawDy = touch.clientY - startY;

        if (!locked) {
          if (Math.abs(rawDx) < 8 && Math.abs(rawDy) < 8) return;
          if (Math.abs(rawDx) > Math.abs(rawDy) * 1.15) {
            locked = true;
            onInteractionStart?.();
          } else {
            dragging = false;
            return;
          }
        }

        event.preventDefault();
        const atFirst = pageRef.current <= 0;
        const atLast = pageRef.current >= totalPagesRef.current - 1;
        let offset = rawDx;
        if (atFirst && rawDx > 0) offset = rawDx * 0.32;
        else if (atLast && rawDx < 0) offset = rawDx * 0.32;
        dx = offset;
        applyDrag(offset);
      };

      const finish = () => {
        if (!dragging) return;
        dragging = false;
        if (!locked) return;

        const width = viewport.clientWidth || 1;
        const elapsed = Math.max(1, performance.now() - startTime);
        const velocity = Math.abs(dx) / elapsed;
        const commit =
          Math.abs(dx) >= width * 0.18 ||
          (Math.abs(dx) >= 24 && velocity >= 0.35);

        dragSuppressUntilRef.current = performance.now() + 250;
        locked = false;

        if (commit) {
          if (dx < 0) flipNext();
          else flipPrev();
        } else {
          settle();
        }
      };

      const onCancel = () => {
        if (dragging && locked) settle();
        dragging = false;
        locked = false;
      };

      const onClickCapture = (event: MouseEvent) => {
        if (performance.now() < dragSuppressUntilRef.current) {
          event.stopPropagation();
          event.preventDefault();
        }
      };

      viewport.addEventListener('touchstart', onTouchStart, { passive: true });
      viewport.addEventListener('touchmove', onTouchMove, { passive: false });
      viewport.addEventListener('touchend', finish);
      viewport.addEventListener('touchcancel', onCancel);
      viewport.addEventListener('click', onClickCapture, true);

      return () => {
        viewport.removeEventListener('touchstart', onTouchStart);
        viewport.removeEventListener('touchmove', onTouchMove);
        viewport.removeEventListener('touchend', finish);
        viewport.removeEventListener('touchcancel', onCancel);
        viewport.removeEventListener('click', onClickCapture, true);
      };
    }, [flipNext, flipPrev, interactionEnabled, onInteractionStart, pageAnimation]);

    const translateX = -page * stepPx;
    const animateNow = !suppressAnim && pageAnimation === 'slide';

    return (
      <div
        ref={viewportRef}
        className="relative h-full w-full overflow-hidden"
        style={{
          padding: `${paddingY}px ${paddingX}px`,
          touchAction: 'pan-y',
        }}
      >
        {columns === 2 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 w-px -translate-x-1/2 opacity-70"
            style={{
              top: paddingY,
              bottom: paddingY,
              background: 'var(--r-divider)',
            }}
          />
        )}
        <div
          ref={trackRef}
          className="paginated-track h-full will-change-transform"
          style={{
            columnWidth: colWidthPx > 0 ? `${colWidthPx}px` : undefined,
            columnGap: `${columnGap}px`,
            columnFill: 'auto',
            transform: `translate3d(${translateX}px, 0, 0)`,
            transition: animateNow
              ? 'transform 300ms var(--ease-apple)'
              : 'none',
          }}
        >
          <ChapterView chapter={chapter} onImageClick={onImageClick} />
        </div>
      </div>
    );
  }
);
