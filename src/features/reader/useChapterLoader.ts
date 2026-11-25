import { useCallback, useEffect, useState } from 'react';
import { getBookContent } from '@/api/client';
import type { BookChapter, EndpointConfig, NormalizedChapter } from '@/api/types';
import { normalizeChapter } from '@/engine/chapterNormalizer';

const MAX_CACHE_ENTRIES = 15;

// Session-scoped LRU cache keyed by `${endpointId}::${bookUrl}::${index}`
const chapterCache = new Map<string, NormalizedChapter>();

function touchLru(key: string, value: NormalizedChapter) {
  chapterCache.delete(key);
  chapterCache.set(key, value);
  while (chapterCache.size > MAX_CACHE_ENTRIES) {
    const oldest = chapterCache.keys().next().value;
    if (oldest !== undefined) chapterCache.delete(oldest);
  }
}

export function clearChapterCacheForBook(bookUrl: string) {
  for (const key of chapterCache.keys()) {
    if (key.includes(`::${bookUrl}::`)) {
      chapterCache.delete(key);
    }
  }
}

export interface UseChapterLoaderParams {
  endpoint: EndpointConfig;
  bookUrl: string;
  chapters: BookChapter[];
  chapterIndex: number;
  enabled: boolean;
}

interface LoadedChapter {
  index: number;
  key: string;
  data: NormalizedChapter;
}

export function useChapterLoader({
  endpoint,
  bookUrl,
  chapters,
  chapterIndex,
  enabled,
}: UseChapterLoaderParams) {
  // The chapter and its index travel together so a chapter key can never be
  // paired with another chapter's body.
  const [state, setState] = useState<LoadedChapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const buildKey = useCallback(
    (idx: number) => `${endpoint.id}::${bookUrl}::${idx}`,
    [endpoint.id, bookUrl]
  );

  const computeTargetImgWidth = () => {
    if (typeof window === 'undefined') return 1080;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    return Math.min(2048, Math.round(Math.min(window.innerWidth, 960) * dpr));
  };

  const syncKey =
    enabled && bookUrl && chapterIndex >= 0 ? buildKey(chapterIndex) : '';
  const syncCached =
    syncKey && reloadNonce === 0 ? chapterCache.get(syncKey) : undefined;

  let chapter: NormalizedChapter | null = null;
  let loadedIndex: number | null = null;
  if (syncCached) {
    // Cache hits resolve in the same render: zero stale-body frame on switch.
    chapter = syncCached;
    loadedIndex = chapterIndex;
  } else if (state && syncKey && state.key === syncKey) {
    chapter = state.data;
    loadedIndex = state.index;
  }

  useEffect(() => {
    if (!enabled || !bookUrl || chapterIndex < 0) return;

    const key = buildKey(chapterIndex);
    const cached = reloadNonce === 0 ? chapterCache.get(key) : undefined;
    const controller = new AbortController();
    const prefetchers: AbortController[] = [];
    let disposed = false;

    if (cached) {
      touchLru(key, cached);
      setState({ index: chapterIndex, key, data: cached });
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }

    const prefetchNeighbor = (idx: number) => {
      if (disposed || idx < 0 || idx >= chapters.length) return;
      const nKey = buildKey(idx);
      if (chapterCache.has(nKey)) return;
      const preCtrl = new AbortController();
      prefetchers.push(preCtrl);
      const title = chapters[idx]?.title || `第 ${idx + 1} 章`;
      void getBookContent(endpoint, bookUrl, idx, preCtrl.signal)
        .then((raw) => {
          if (preCtrl.signal.aborted) return;
          const normalized = normalizeChapter(raw, {
            bookUrl,
            endpoint,
            chapterTitle: title,
            targetImgWidth: computeTargetImgWidth(),
          });
          touchLru(nKey, normalized);
        })
        .catch(() => {
          // Silent prefetch failure never disturbs reading.
        });
    };

    const run = async () => {
      if (!cached) {
        try {
          const raw = await getBookContent(
            endpoint,
            bookUrl,
            chapterIndex,
            controller.signal
          );
          if (controller.signal.aborted) return;
          const title =
            chapters[chapterIndex]?.title || `第 ${chapterIndex + 1} 章`;
          const normalized = normalizeChapter(raw, {
            bookUrl,
            endpoint,
            chapterTitle: title,
            targetImgWidth: computeTargetImgWidth(),
          });
          touchLru(key, normalized);
          setState({ index: chapterIndex, key, data: normalized });
          setLoading(false);
          setError(null);
        } catch (err) {
          if (controller.signal.aborted) return;
          setLoading(false);
          setError(err instanceof Error ? err.message : '加载章节正文失败');
          return;
        }
      }
      prefetchNeighbor(chapterIndex + 1);
      prefetchNeighbor(chapterIndex - 1);
    };

    void run();

    return () => {
      disposed = true;
      controller.abort();
      for (const preCtrl of prefetchers) preCtrl.abort();
    };
  }, [
    endpoint,
    bookUrl,
    chapters,
    chapterIndex,
    enabled,
    buildKey,
    reloadNonce,
  ]);

  const retry = useCallback(() => {
    setReloadNonce((n) => n + 1);
  }, []);

  return { chapter, loadedIndex, loading, error, retry };
}
