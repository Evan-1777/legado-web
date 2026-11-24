import { useCallback, useEffect, useRef } from 'react';
import { saveBookProgress } from '@/api/client';
import type { Book, BookProgressPayload, EndpointConfig } from '@/api/types';
import { useBookshelfStore } from '@/stores/bookshelfStore';

export interface ProgressSnapshot {
  durChapterIndex: number;
  durChapterPos: number;
  durChapterTitle: string;
}

export function useProgressSync(endpoint: EndpointConfig, book: Book | undefined) {
  const latestRef = useRef<ProgressSnapshot | null>(null);
  const lastSavedKeyRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookRef = useRef(book);
  const endpointRef = useRef(endpoint);

  bookRef.current = book;
  endpointRef.current = endpoint;

  const patchBookProgress = useBookshelfStore((s) => s.patchBookProgress);

  const buildPayload = (snap: ProgressSnapshot): BookProgressPayload | null => {
    const b = bookRef.current;
    if (!b) return null;
    return {
      url: b.bookUrl,
      name: b.name,
      author: b.author || '',
      durChapterIndex: snap.durChapterIndex,
      durChapterPos: Math.max(0, Math.round(snap.durChapterPos)),
      durChapterTime: Date.now(),
      durChapterTitle: snap.durChapterTitle,
    };
  };

  const flush = useCallback(
    (keepalive = false) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const snap = latestRef.current;
      if (!snap) return;
      const payload = buildPayload(snap);
      if (!payload) return;

      const sig = `${payload.url}::${payload.durChapterIndex}::${payload.durChapterPos}`;
      if (sig === lastSavedKeyRef.current) return;
      lastSavedKeyRef.current = sig;

      patchBookProgress(payload.url, {
        durChapterIndex: payload.durChapterIndex,
        durChapterPos: payload.durChapterPos,
        durChapterTime: payload.durChapterTime,
        durChapterTitle: payload.durChapterTitle,
      });

      void saveBookProgress(endpointRef.current, payload, keepalive).catch(() => {
        // Allow retry on next update if regular save failed
        if (!keepalive) lastSavedKeyRef.current = '';
      });
    },
    [patchBookProgress]
  );

  const scheduleSave = useCallback(
    (snap: ProgressSnapshot, immediate = false) => {
      latestRef.current = snap;
      const b = bookRef.current;
      if (b) {
        patchBookProgress(b.bookUrl, {
          durChapterIndex: snap.durChapterIndex,
          durChapterPos: Math.max(0, Math.round(snap.durChapterPos)),
          durChapterTime: Date.now(),
          durChapterTitle: snap.durChapterTitle,
        });
      }

      if (immediate) {
        flush(false);
        return;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        flush(false);
      }, 2500);
    },
    [flush, patchBookProgress]
  );

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush(true);
      }
    };
    const onPageHide = () => {
      flush(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      flush(true);
    };
  }, [flush]);

  return { scheduleSave, flush };
}
