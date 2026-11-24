import { useCallback, useEffect, useRef, useState } from 'react';
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

export function useChapterLoader({
  endpoint,
  bookUrl,
  chapters,
  chapterIndex,
  enabled,
}: UseChapterLoaderParams) {
  const [chapter, setChapter] = useState<NormalizedChapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const prefetchControllerRef = useRef<AbortController | null>(null);

  const buildKey = useCallback(
    (idx: number) => `${endpoint.id}::${bookUrl}::${idx}`,
    [endpoint.id, bookUrl]
  );

  const computeTargetImgWidth = () => {
    if (typeof window === 'undefined') return 1080;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    return Math.min(2048, Math.round(Math.min(window.innerWidth, 960) * dpr));
  };

  useEffect(() => {
    if (!enabled || !bookUrl || chapterIndex < 0) return;

    const currentMeta = chapters[chapterIndex];
    const title = currentMeta?.title || `第 ${chapterIndex + 1} 章`;
    const key = buildKey(chapterIndex);

    const cached = chapterCache.get(key);
    if (cached && reloadNonce === 0) {
      touchLru(key, cached);
      setChapter(cached);
      setLoading(false);
      setError(null);
    }

    const controller = new AbortController();

    const loadCurrent = async () => {
      if (!cached || reloadNonce > 0) {
        setLoading(true);
        setError(null);
      }
      try {
        let resolved = cached;
        if (!resolved || reloadNonce > 0) {
          const raw = await getBookContent(
            endpoint,
            bookUrl,
            chapterIndex,
            controller.signal
          );
          if (controller.signal.aborted) return;
          resolved = normalizeChapter(raw, {
            bookUrl,
            endpoint,
            chapterTitle: title,
            targetImgWidth: computeTargetImgWidth(),
          });
          touchLru(key, resolved);
          setChapter(resolved);
          setLoading(false);
          setError(null);
        }

        // Silent prefetch for index + 1
        const nextIndex = chapterIndex + 1;
        if (nextIndex < chapters.length) {
          const nextKey = buildKey(nextIndex);
          if (!chapterCache.has(nextKey)) {
            prefetchControllerRef.current?.abort();
            const preCtrl = new AbortController();
            prefetchControllerRef.current = preCtrl;
            const nextTitle = chapters[nextIndex]?.title || `第 ${nextIndex + 1} 章`;
            void getBookContent(endpoint, bookUrl, nextIndex, preCtrl.signal)
              .then((rawNext) => {
                if (preCtrl.signal.aborted) return;
                const normNext = normalizeChapter(rawNext, {
                  bookUrl,
                  endpoint,
                  chapterTitle: nextTitle,
                  targetImgWidth: computeTargetImgWidth(),
                });
                touchLru(nextKey, normNext);
              })
              .catch(() => {
                // Silent prefetch failure does not disturb reading
              });
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : '加载章节正文失败');
      }
    };

    void loadCurrent();

    return () => {
      controller.abort();
    };
  }, [endpoint, bookUrl, chapters, chapterIndex, enabled, buildKey, reloadNonce]);

  useEffect(() => {
    return () => {
      prefetchControllerRef.current?.abort();
    };
  }, []);

  const retry = useCallback(() => {
    setReloadNonce((n) => n + 1);
  }, []);

  return { chapter, loading, error, retry };
}
