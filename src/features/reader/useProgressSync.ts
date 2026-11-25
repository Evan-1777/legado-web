import { useCallback, useEffect, useRef } from 'react';
import { saveBookProgress } from '@/api/client';
import type { Book, BookProgressPayload, EndpointConfig } from '@/api/types';
import { useBookshelfStore } from '@/stores/bookshelfStore';

export interface ProgressSnapshot {
  durChapterIndex: number;
  durChapterPos: number;
  durChapterTitle: string;
}

function buildPayload(
  book: Book | undefined,
  snap: ProgressSnapshot
): BookProgressPayload | null {
  if (!book) return null;
  return {
    url: book.bookUrl,
    name: book.name,
    author: book.author || '',
    durChapterIndex: snap.durChapterIndex,
    durChapterPos: Math.max(0, Math.round(snap.durChapterPos)),
    durChapterTime: Date.now(),
    durChapterTitle: snap.durChapterTitle,
  };
}

function signatureOf(payload: BookProgressPayload): string {
  return `${payload.url}::${payload.durChapterIndex}::${payload.durChapterPos}`;
}

export function useProgressSync(endpoint: EndpointConfig, book: Book | undefined) {
  const latestRef = useRef<ProgressSnapshot | null>(null);
  const lastSavedKeyRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookRef = useRef(book);
  const endpointRef = useRef(endpoint);
  const lastBookUrlRef = useRef<string>(book?.bookUrl ?? '');

  bookRef.current = book;
  endpointRef.current = endpoint;

  const patchBookProgress = useBookshelfStore((s) => s.patchBookProgress);

  /** Record the server-provided baseline without issuing a write request. */
  const seedSavedProgress = useCallback((snap: ProgressSnapshot) => {
    const payload = buildPayload(bookRef.current, snap);
    if (!payload) return;
    lastSavedKeyRef.current = signatureOf(payload);
  }, []);

  const flush = useCallback(
    (keepalive = false): Promise<void> => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const snap = latestRef.current;
      if (!snap) return Promise.resolve();
      const payload = buildPayload(bookRef.current, snap);
      if (!payload) return Promise.resolve();

      const sig = signatureOf(payload);
      if (sig === lastSavedKeyRef.current) return Promise.resolve();
      lastSavedKeyRef.current = sig;

      patchBookProgress(payload.url, {
        durChapterIndex: payload.durChapterIndex,
        durChapterPos: payload.durChapterPos,
        durChapterTime: payload.durChapterTime,
        durChapterTitle: payload.durChapterTitle,
      });

      return saveBookProgress(endpointRef.current, payload, keepalive)
        .catch(() => {
          // Allow retry on next update if a regular save failed.
          if (!keepalive) lastSavedKeyRef.current = '';
        })
        .then(() => undefined);
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
        void flush(false);
        return;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush(false);
      }, 2500);
    },
    [flush, patchBookProgress]
  );

  // A different book must never inherit the previous book's pending snapshot.
  const bookUrl = book?.bookUrl ?? '';
  useEffect(() => {
    if (lastBookUrlRef.current === bookUrl) return;
    lastBookUrlRef.current = bookUrl;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    latestRef.current = null;
    lastSavedKeyRef.current = '';
  }, [bookUrl]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flush(true);
      }
    };
    const onPageHide = () => {
      void flush(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      void flush(true);
    };
  }, [flush]);

  return { scheduleSave, flush, seedSavedProgress };
}
