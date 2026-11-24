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
  columnGap: number;
  twoColumnOnWide: boolean;
  pageAnimation: 'slide' | 'none';
  layoutToken: string;
  onReachPrevChapter: () => void;
  onReachNextChapter: () => void;
  onPageStateChange: (
    charPos: number,
    chapterPercent: number,
    info: PaginatedPageInfo
  ) => void;
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
      columnGap,
      twoColumnOnWide,
      pageAnimation,
      layoutToken,
      onReachPrevChapter,
      onReachNextChapter,
      onPageStateChange,
      onImageClick,
    },
    ref
  ) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    const [page, setPage] = useState(0);
    const [stepPx, setStepPx] = useState(0);
    const [colWidthPx, setColWidthPx] = useState(0);
    const [suppressAnim, setSuppressAnim] = useState(true);

    const anchorCharPosRef = useRef(initialCharPos);
    const pageRef = useRef(0);
    const totalPagesRef = useRef(1);
    const stepPxRef = useRef(0);
    const columnsRef = useRef<1 | 2>(1);
    const lastChapterKeyRef = useRef('');

    const computeCharPosForPage = useCallback(
      (targetPage: number, step: number): number => {
        const track = trackRef.current;
        if (!track || step <= 0) return 0;
        const trackLeft = track.getBoundingClientRect().left;
        const pageLeftInTrack = targetPage * step;
        const nodes = track.querySelectorAll<HTMLElement>('[data-start]');
        for (const node of nodes) {
          const rect = node.getBoundingClientRect();
          // Undo current translateX offset to recover untransformed track X
          const nodeLeft = rect.left - trackLeft;
          const nodeRight = rect.right - trackLeft;
          if (nodeRight >= pageLeftInTrack + 4 && nodeLeft < pageLeftInTrack + step) {
            const start = Number(node.dataset.start);
            return Number.isFinite(start) ? start : 0;
          }
        }
        return 0;
      },
      []
    );

    const findPageForCharPos = useCallback((charPos: number, step: number, maxPages: number): number => {
      const track = trackRef.current;
      if (!track || step <= 0 || charPos <= 0) return 0;
      const trackLeft = track.getBoundingClientRect().left;
      const nodes = track.querySelectorAll<HTMLElement>('[data-start]');
      for (const node of nodes) {
        const start = Number(node.dataset.start);
        const end = Number(node.dataset.end);
        if ((charPos >= start && charPos <= end) || start >= charPos) {
          const nodeLeft = node.getBoundingClientRect().left - trackLeft;
          const idx = Math.floor(Math.max(0, nodeLeft + 2) / step);
          return Math.min(Math.max(0, maxPages - 1), idx);
        }
      }
      return 0;
    }, []);

    const emitState = useCallback(
      (nextPage: number, nextTotal: number, nextCols: 1 | 2, nextStep: number) => {
        const charPos = computeCharPosForPage(nextPage, nextStep);
        anchorCharPosRef.current = charPos;
        const pct = nextTotal <= 1 ? 1 : nextPage / (nextTotal - 1);
        onPageStateChange(charPos, pct, {
          page: nextPage,
          totalPages: nextTotal,
          columns: nextCols,
        });
      },
      [computeCharPosForPage, onPageStateChange]
    );

    const measureAndAnchor = useCallback(
      (anchorMode: 'initial' | 'preserve' | 'end') => {
        const viewport = viewportRef.current;
        const track = trackRef.current;
        if (!viewport || !track) return;

        const vw = viewport.clientWidth;
        const vh = viewport.clientHeight;
        if (vw <= 0 || vh <= 0) return;

        const innerW = Math.max(200, vw - paddingX * 2);
        const isLandscape = vw > vh;
        const nextCols: 1 | 2 =
          twoColumnOnWide && vw >= 1024 && isLandscape ? 2 : 1;
        const nextColW =
          nextCols === 2 ? Math.floor((innerW - columnGap) / 2) : innerW;
        const nextStep = innerW + columnGap;

        // Apply layout geometry directly so scrollWidth reflects final column count synchronously
        track.style.columnWidth = `${nextColW}px`;
        track.style.columnGap = `${columnGap}px`;

        const scrollW = track.scrollWidth;
        const nextTotal = Math.max(
          1,
          Math.ceil((scrollW + columnGap - 2) / nextStep)
        );

        let nextPage = 0;
        if (anchorMode === 'end') {
          nextPage = Math.max(0, nextTotal - 1);
        } else {
          const targetChar =
            anchorMode === 'initial' ? initialCharPos : anchorCharPosRef.current;
          nextPage = findPageForCharPos(targetChar, nextStep, nextTotal);
        }

        columnsRef.current = nextCols;
        stepPxRef.current = nextStep;
        totalPagesRef.current = nextTotal;
        pageRef.current = nextPage;

        setSuppressAnim(true);
        setColWidthPx(nextColW);
        setStepPx(nextStep);
        setPage(nextPage);

        emitState(nextPage, nextTotal, nextCols, nextStep);
      },
      [
        columnGap,
        emitState,
        findPageForCharPos,
        initialCharPos,
        paddingX,
        twoColumnOnWide,
      ]
    );

    // Chapter switch or typography/margin/font change
    useLayoutEffect(() => {
      const isNewChapter = lastChapterKeyRef.current !== chapterKey;
      lastChapterKeyRef.current = chapterKey;
      if (isNewChapter) {
        anchorCharPosRef.current = initialCharPos;
        measureAndAnchor(startFromEnd ? 'end' : 'initial');
      } else {
        measureAndAnchor('preserve');
      }
    }, [chapterKey, initialCharPos, startFromEnd, layoutToken, measureAndAnchor]);

    // ResizeObserver & FontFace readiness re-measure preserving anchor
    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const ro = new ResizeObserver(() => {
        measureAndAnchor('preserve');
      });
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
      };
    }, [measureAndAnchor]);

    const goToPageInternal = useCallback(
      (targetIndex: number, animate = true) => {
        const clamped = Math.max(0, Math.min(totalPagesRef.current - 1, targetIndex));
        pageRef.current = clamped;
        setSuppressAnim(!animate);
        setPage(clamped);
        emitState(clamped, totalPagesRef.current, columnsRef.current, stepPxRef.current);
      },
      [emitState]
    );

    useImperativeHandle(
      ref,
      () => ({
        prevPage: () => {
          if (pageRef.current > 0) {
            goToPageInternal(pageRef.current - 1, pageAnimation === 'slide');
            return true;
          }
          onReachPrevChapter();
          return false;
        },
        nextPage: () => {
          if (pageRef.current < totalPagesRef.current - 1) {
            goToPageInternal(pageRef.current + 1, pageAnimation === 'slide');
            return true;
          }
          onReachNextChapter();
          return false;
        },
        goToPage: (idx) => goToPageInternal(idx, pageAnimation === 'slide'),
        goToCharPos: (pos) => {
          const idx = findPageForCharPos(pos, stepPxRef.current, totalPagesRef.current);
          goToPageInternal(idx, false);
        },
        getCurrentCharPos: () => anchorCharPosRef.current,
        getPageInfo: () => ({
          page: pageRef.current,
          totalPages: totalPagesRef.current,
          columns: columnsRef.current,
        }),
      }),
      [
        findPageForCharPos,
        goToPageInternal,
        onReachNextChapter,
        onReachPrevChapter,
        pageAnimation,
      ]
    );

    const translateX = -page * stepPx;
    const animateNow = !suppressAnim && pageAnimation === 'slide';

    return (
      <div
        ref={viewportRef}
        className="relative h-full w-full overflow-hidden"
        style={{
          padding: `${paddingY}px ${paddingX}px`,
        }}
      >
        <div
          ref={trackRef}
          className="h-full will-change-transform"
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
