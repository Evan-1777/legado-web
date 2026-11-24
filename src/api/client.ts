import { isLikelyMixedContent, resolveHttpUrl } from './endpoint';
import type {
  Book,
  BookChapter,
  BookProgressPayload,
  ConnectionTestResult,
  EndpointConfig,
  ReaderWebChapter,
  ReturnData,
  SearchBook,
} from './types';

export const TIMEOUT_PROBE_MS = 5_000;
export const TIMEOUT_STANDARD_MS = 15_000;
export const TIMEOUT_CONTENT_MS = 45_000;

export class ApiError extends Error {
  readonly status?: number;
  readonly isTimeout: boolean;
  readonly isMixedContent: boolean;

  constructor(
    message: string,
    opts?: { status?: number; isTimeout?: boolean; isMixedContent?: boolean }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = opts?.status;
    this.isTimeout = Boolean(opts?.isTimeout);
    this.isMixedContent = Boolean(opts?.isMixedContent);
  }
}

export function unwrapReturnData<T>(payload: ReturnData<T>, fallbackMsg = '请求失败'): T {
  if (!payload || typeof payload !== 'object') {
    throw new ApiError(fallbackMsg);
  }
  if (!payload.isSuccess) {
    throw new ApiError(payload.errorMsg || fallbackMsg);
  }
  return payload.data as T;
}

function createCombinedSignal(
  timeoutMs: number,
  externalSignal?: AbortSignal
): { signal: AbortSignal; cleanup: () => void; didTimeout: () => boolean } {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Request timeout', 'TimeoutError'));
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    },
  };
}

async function requestJson<T>(
  endpoint: EndpointConfig,
  path: string,
  options: {
    method?: 'GET' | 'POST';
    query?: Record<string, string | number | boolean | undefined | null>;
    body?: unknown;
    timeoutMs?: number;
    signal?: AbortSignal;
    keepalive?: boolean;
  } = {}
): Promise<ReturnData<T>> {
  const {
    method = 'GET',
    query,
    body,
    timeoutMs = TIMEOUT_STANDARD_MS,
    signal: externalSignal,
    keepalive = false,
  } = options;

  const url = resolveHttpUrl(endpoint, path, query);
  const { signal, cleanup, didTimeout } = createCombinedSignal(timeoutMs, externalSignal);

  const init: RequestInit = {
    method,
    signal,
    keepalive,
  };

  if (body !== undefined) {
    // Only send standard Content-Type header to match KtorServer CORS allowHeader(ContentType)
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let parsed: ReturnData<T>;
    try {
      parsed = JSON.parse(text) as ReturnData<T>;
    } catch {
      throw new ApiError(
        res.ok ? '服务端返回了非 JSON 响应' : `HTTP ${res.status}`,
        { status: res.status }
      );
    }
    if (!res.ok && parsed.isSuccess !== false) {
      throw new ApiError(parsed.errorMsg || `HTTP ${res.status}`, { status: res.status });
    }
    return parsed;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (didTimeout()) {
      throw new ApiError('请求超时，请检查网络连接或服务端状态', { isTimeout: true });
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    const mixed = isLikelyMixedContent(endpoint);
    const message = mixed
      ? '浏览器拦截了 HTTPS 到 HTTP 的直连请求，请切换为同源反代路径'
      : err instanceof Error
        ? `无法连接到服务端（${err.message}）`
        : '无法连接到服务端';
    throw new ApiError(message, { isMixedContent: mixed });
  } finally {
    cleanup();
  }
}

export async function getBookshelf(
  endpoint: EndpointConfig,
  signal?: AbortSignal
): Promise<Book[]> {
  const res = await requestJson<Book[]>(endpoint, '/getBookshelf', {
    timeoutMs: TIMEOUT_STANDARD_MS,
    signal,
  });
  if (!res.isSuccess && res.errorMsg?.includes('还没有添加小说')) {
    return [];
  }
  const data = unwrapReturnData(res, '获取书架失败');
  return Array.isArray(data) ? data : [];
}

export async function testConnection(
  endpoint: EndpointConfig
): Promise<ConnectionTestResult> {
  const start = performance.now();
  try {
    const res = await requestJson<Book[]>(endpoint, '/getBookshelf', {
      timeoutMs: TIMEOUT_PROBE_MS,
    });
    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    if (!res.isSuccess && res.errorMsg?.includes('还没有添加小说')) {
      return { ok: true, latencyMs, bookCount: 0 };
    }
    const books = unwrapReturnData(res, '服务响应异常');
    return {
      ok: true,
      latencyMs,
      bookCount: Array.isArray(books) ? books.length : 0,
    };
  } catch (err) {
    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    const apiErr = err instanceof ApiError ? err : null;
    return {
      ok: false,
      latencyMs,
      error: err instanceof Error ? err.message : '连接失败',
      isMixedContent: apiErr?.isMixedContent ?? isLikelyMixedContent(endpoint),
    };
  }
}

export async function saveBook(
  endpoint: EndpointConfig,
  book: Book | SearchBook
): Promise<void> {
  const res = await requestJson<unknown>(endpoint, '/saveBook', {
    method: 'POST',
    body: book,
  });
  unwrapReturnData(res, '加入书架失败');
}

export async function deleteBook(
  endpoint: EndpointConfig,
  book: Book
): Promise<void> {
  const res = await requestJson<unknown>(endpoint, '/deleteBook', {
    method: 'POST',
    body: book,
  });
  unwrapReturnData(res, '移出书架失败');
}

export async function addLocalBook(
  endpoint: EndpointConfig,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  const url = resolveHttpUrl(endpoint, '/addLocalBook');
  const formData = new FormData();
  formData.append('fileName', file.name);
  formData.append('fileData', file, file.name);

  if (onProgress && typeof XMLHttpRequest !== 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.timeout = 120_000;
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          onProgress(Math.min(99, Math.round((ev.loaded / ev.total) * 100)));
        }
      };
      xhr.onload = () => {
        try {
          const parsed = JSON.parse(xhr.responseText) as ReturnData<unknown>;
          unwrapReturnData(parsed, '上传书籍失败');
          onProgress(100);
          resolve();
        } catch (e) {
          reject(e instanceof Error ? e : new ApiError('上传书籍失败'));
        }
      };
      xhr.onerror = () => reject(new ApiError('上传失败，请检查网络连接'));
      xhr.ontimeout = () => reject(new ApiError('上传超时', { isTimeout: true }));
      xhr.send(formData);
    });
    return;
  }

  const res = await fetch(url, { method: 'POST', body: formData });
  const parsed = (await res.json()) as ReturnData<unknown>;
  unwrapReturnData(parsed, '上传书籍失败');
}

export async function getChapterList(
  endpoint: EndpointConfig,
  bookUrl: string,
  signal?: AbortSignal
): Promise<BookChapter[]> {
  const res = await requestJson<BookChapter[]>(endpoint, '/getChapterList', {
    query: { url: bookUrl },
    timeoutMs: TIMEOUT_CONTENT_MS,
    signal,
  });
  const data = unwrapReturnData(res, '获取目录失败');
  return Array.isArray(data) ? data : [];
}

export async function refreshToc(
  endpoint: EndpointConfig,
  bookUrl: string,
  signal?: AbortSignal
): Promise<BookChapter[]> {
  const res = await requestJson<BookChapter[]>(endpoint, '/refreshToc', {
    query: { url: bookUrl },
    timeoutMs: TIMEOUT_CONTENT_MS,
    signal,
  });
  const data = unwrapReturnData(res, '刷新目录失败');
  return Array.isArray(data) ? data : [];
}

export function isReaderWebChapter(value: unknown): value is ReaderWebChapter {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ReaderWebChapter).paragraphs)
  );
}

export async function getBookContent(
  endpoint: EndpointConfig,
  bookUrl: string,
  index: number,
  signal?: AbortSignal
): Promise<ReaderWebChapter | string> {
  const res = await requestJson<ReaderWebChapter | string>(
    endpoint,
    '/getBookContent',
    {
      query: { url: bookUrl, index, format: 'semantic' },
      timeoutMs: TIMEOUT_CONTENT_MS,
      signal,
    }
  );
  const data = unwrapReturnData(res, '获取章节正文失败');
  if (isReaderWebChapter(data)) {
    return data;
  }
  return typeof data === 'string' ? data : '';
}

export async function saveBookProgress(
  endpoint: EndpointConfig,
  payload: BookProgressPayload,
  keepalive = false
): Promise<void> {
  // Exact field set matching BookController.saveBookProgress (url + BookProgress entity)
  const body: BookProgressPayload = {
    url: payload.url,
    name: payload.name,
    author: payload.author,
    durChapterIndex: payload.durChapterIndex,
    durChapterPos: payload.durChapterPos,
    durChapterTime: payload.durChapterTime,
    durChapterTitle: payload.durChapterTitle,
  };

  if (keepalive) {
    const url = resolveHttpUrl(endpoint, '/saveBookProgress');
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      });
    } catch {
      // Keepalive flush on page hide is best-effort
    }
    return;
  }

  const res = await requestJson<unknown>(endpoint, '/saveBookProgress', {
    method: 'POST',
    body,
    timeoutMs: TIMEOUT_STANDARD_MS,
  });
  unwrapReturnData(res, '保存阅读进度失败');
}

export async function getReadConfig(
  endpoint: EndpointConfig
): Promise<Record<string, unknown> | null> {
  const res = await requestJson<string | Record<string, unknown>>(
    endpoint,
    '/getReadConfig',
    { timeoutMs: TIMEOUT_STANDARD_MS }
  );
  if (!res.isSuccess) {
    if (res.errorMsg?.includes('没有配置')) return null;
    throw new ApiError(res.errorMsg || '读取云端配置失败');
  }
  const raw = res.data;
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return typeof raw === 'object' ? raw : null;
}

export async function saveReadConfig(
  endpoint: EndpointConfig,
  config: Record<string, unknown>
): Promise<void> {
  const res = await requestJson<unknown>(endpoint, '/saveReadConfig', {
    method: 'POST',
    body: config,
    timeoutMs: TIMEOUT_STANDARD_MS,
  });
  unwrapReturnData(res, '保存云端配置失败');
}
