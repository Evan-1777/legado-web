import { resolveWsUrl } from './endpoint';
import type { EndpointConfig, SearchBook } from './types';

export interface SearchSessionCallbacks {
  onBatch: (books: SearchBook[]) => void;
  onFinish: () => void;
  onError: (message: string) => void;
}

export interface SearchSession {
  cancel: () => void;
}

export function startBookSearch(
  endpoint: EndpointConfig,
  keyword: string,
  callbacks: SearchSessionCallbacks,
  timeoutMs = 35_000
): SearchSession {
  const trimmed = keyword.trim();
  if (!trimmed) {
    callbacks.onFinish();
    return { cancel: () => {} };
  }

  let closed = false;
  let finished = false;
  const seenUrls = new Set<string>();
  let ws: WebSocket | null = null;

  const finishOnce = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    callbacks.onFinish();
  };

  const errorOnce = (msg: string) => {
    if (finished || closed) return;
    finished = true;
    clearTimeout(timer);
    callbacks.onError(msg);
  };

  const timer = setTimeout(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    finishOnce();
  }, timeoutMs);

  try {
    const url = resolveWsUrl(endpoint, '/searchBook');
    ws = new WebSocket(url);

    ws.onopen = () => {
      if (closed || !ws) return;
      ws.send(JSON.stringify({ key: trimmed }));
    };

    ws.onmessage = (event) => {
      if (closed) return;
      const raw = typeof event.data === 'string' ? event.data.trim() : '';
      if (!raw) return;
      if (raw === 'Search finish') {
        finishOnce();
        ws?.close();
        return;
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const fresh: SearchBook[] = [];
          for (const item of parsed) {
            if (!item || typeof item !== 'object') continue;
            const book = item as SearchBook;
            const dedupeKey = `${book.bookUrl}::${book.origin}`;
            if (!book.bookUrl || seenUrls.has(dedupeKey)) continue;
            seenUrls.add(dedupeKey);
            fresh.push(book);
          }
          if (fresh.length > 0) {
            callbacks.onBatch(fresh);
          }
        }
      } catch {
        // Ignore non-JSON heartbeat frames
      }
    };

    ws.onerror = () => {
      errorOnce('搜索连接失败，请确认 Legado WebSocket 端口或反代路径已启用');
    };

    ws.onclose = () => {
      if (!closed && !finished) {
        finishOnce();
      }
    };
  } catch (err) {
    errorOnce(err instanceof Error ? err.message : '无法建立搜索连接');
  }

  return {
    cancel: () => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    },
  };
}
