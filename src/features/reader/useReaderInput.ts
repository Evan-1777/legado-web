import { useEffect, useRef } from 'react';
import type { ReadingMode, TapZoneLayout } from '@/stores/settingsStore';

export interface UseReaderInputOptions {
  readingMode: ReadingMode;
  tapZoneLayout: TapZoneLayout;
  hudVisible: boolean;
  overlayOpen: boolean;
  onToggleHud: () => void;
  onHideHud: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onToggleToc: () => void;
  onToggleAa: () => void;
  onCloseOverlay: () => void;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useReaderInput(options: UseReaderInputOptions) {
  const optsRef = useRef(options);
  optsRef.current = options;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);

  // Desktop keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableElement(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const opts = optsRef.current;

      if (e.key === 'Escape') {
        if (opts.overlayOpen) {
          opts.onCloseOverlay();
        } else if (opts.hudVisible) {
          opts.onHideHud();
        }
        return;
      }

      if (opts.overlayOpen) return;

      const lower = e.key.toLowerCase();
      if (lower === 't') {
        e.preventDefault();
        opts.onToggleToc();
        return;
      }
      if (lower === 'a') {
        e.preventDefault();
        opts.onToggleAa();
        return;
      }
      if (e.key === '[') {
        e.preventDefault();
        opts.onPrevChapter();
        return;
      }
      if (e.key === ']') {
        e.preventDefault();
        opts.onNextChapter();
        return;
      }

      if (opts.readingMode === 'paginated') {
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          opts.onHideHud();
          opts.onPrevPage();
        } else if (
          e.key === 'ArrowRight' ||
          e.key === 'PageDown' ||
          e.key === ' '
        ) {
          e.preventDefault();
          opts.onHideHud();
          opts.onNextPage();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleStageClick = (e: React.MouseEvent<HTMLElement>) => {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input, [role="slider"]')) return;

    const opts = optsRef.current;
    if (opts.overlayOpen) {
      opts.onCloseOverlay();
      return;
    }

    if (opts.readingMode === 'scroll') {
      opts.onToggleHud();
      return;
    }

    // Paginated 3-zone tap: left 28% / center 44% / right 28%
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / Math.max(1, rect.width);

    if (relX < 0.28) {
      opts.onHideHud();
      if (opts.tapZoneLayout === 'left-handed') {
        opts.onNextPage();
      } else {
        opts.onPrevPage();
      }
    } else if (relX > 0.72) {
      opts.onHideHud();
      if (opts.tapZoneLayout === 'left-handed') {
        opts.onPrevPage();
      } else {
        opts.onNextPage();
      }
    } else {
      opts.onToggleHud();
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1) return;
    swipedRef.current = false;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || e.changedTouches.length === 0) return;

    const opts = optsRef.current;
    if (opts.readingMode !== 'paginated' || opts.overlayOpen) return;

    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;

    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      swipedRef.current = true;
      opts.onHideHud();
      if (dx < 0) {
        opts.onNextPage();
      } else {
        opts.onPrevPage();
      }
    }
  };

  return {
    handleStageClick,
    handleTouchStart,
    handleTouchEnd,
  };
}
