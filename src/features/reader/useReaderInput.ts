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
  onFirstPage?: () => void;
  onLastPage?: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onToggleToc: () => void;
  onToggleAa: () => void;
  onCloseOverlay: () => void;
  onToggleFullscreen: () => void;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

const WHEEL_STEP_PX = 24;
const WHEEL_COOLDOWN_MS = 260;
const WHEEL_IDLE_RESET_MS = 140;

export function useReaderInput(options: UseReaderInputOptions) {
  const optsRef = useRef(options);
  optsRef.current = options;

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
      if (lower === 'f') {
        e.preventDefault();
        opts.onToggleFullscreen();
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
        if (
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowUp' ||
          e.key === 'PageUp' ||
          (e.key === ' ' && e.shiftKey)
        ) {
          e.preventDefault();
          opts.onHideHud();
          opts.onPrevPage();
        } else if (
          e.key === 'ArrowRight' ||
          e.key === 'ArrowDown' ||
          e.key === 'PageDown' ||
          (e.key === ' ' && !e.shiftKey)
        ) {
          e.preventDefault();
          opts.onHideHud();
          opts.onNextPage();
        } else if (e.key === 'Home') {
          e.preventDefault();
          opts.onHideHud();
          opts.onFirstPage?.();
        } else if (e.key === 'End') {
          e.preventDefault();
          opts.onHideHud();
          opts.onLastPage?.();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Wheel / trackpad paging with axis merging and inertia cooldown. A single
  // physical swipe must never skip multiple pages.
  useEffect(() => {
    let accum = 0;
    let lastEventAt = 0;
    let lastFlipAt = 0;
    let lastDirection = 0;

    const onWheel = (event: WheelEvent) => {
      const opts = optsRef.current;
      if (opts.readingMode !== 'paginated' || opts.overlayOpen) return;
      if (event.ctrlKey) return;

      const dx = event.deltaX;
      const dy = event.deltaY;
      const axis = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
      if (axis === 0) return;

      const now = performance.now();
      if (now - lastEventAt > WHEEL_IDLE_RESET_MS) accum = 0;
      lastEventAt = now;

      const direction = axis > 0 ? 1 : -1;

      // Same-direction inertia inside the cooldown is discarded, not queued.
      if (now - lastFlipAt < WHEEL_COOLDOWN_MS && direction === lastDirection) {
        accum = 0;
        event.preventDefault();
        return;
      }

      event.preventDefault();
      if (direction !== Math.sign(accum)) accum = 0;
      accum += axis;

      if (Math.abs(accum) < WHEEL_STEP_PX) return;
      if (now - lastFlipAt < WHEEL_COOLDOWN_MS) return;

      if (accum > 0) opts.onNextPage();
      else opts.onPrevPage();
      opts.onHideHud();
      lastFlipAt = now;
      lastDirection = direction;
      accum = 0;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  const handleStageClick = (e: React.MouseEvent<HTMLElement>) => {
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

  return { handleStageClick };
}
