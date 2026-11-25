import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBookContent, saveBookProgress } from '@/api/client';
import type { Book, EndpointConfig, ReaderWebChapter } from '@/api/types';
import {
  clearChapterCacheForBook,
  useChapterLoader,
} from '@/features/reader/useChapterLoader';
import { useProgressSync } from '@/features/reader/useProgressSync';

vi.mock('@/api/client', () => ({
  getBookContent: vi.fn(),
  saveBookProgress: vi.fn(),
  getBookshelf: vi.fn(),
  saveBook: vi.fn(),
  deleteBook: vi.fn(),
  testConnection: vi.fn(),
  isReaderWebChapter: (value: unknown) =>
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { paragraphs?: unknown }).paragraphs),
}));

const getBookContentMock = vi.mocked(getBookContent);
const saveBookProgressMock = vi.mocked(saveBookProgress);

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const endpoint: EndpointConfig = {
  id: 'ep-test',
  name: 'test',
  mode: 'direct',
  baseUrl: 'http://127.0.0.1:1122',
};

const book: Book = {
  bookUrl: 'book://u',
  name: '测试书',
  author: '作者',
  durChapterIndex: 1,
  durChapterPos: 500,
  durChapterTitle: '第1章',
};

function renderHook<T>(hook: () => T) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let current!: T;

  function Test() {
    current = hook();
    return null;
  }

  act(() => {
    root.render(createElement(Test));
  });

  return {
    get result() {
      return current;
    },
    rerender() {
      act(() => {
        root.render(createElement(Test));
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  saveBookProgressMock.mockReset().mockResolvedValue(undefined);
  getBookContentMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useProgressSync', () => {
  it('does not request when the seeded server snapshot is flushed unchanged', async () => {
    const harness = renderHook(() => useProgressSync(endpoint, book));

    act(() => {
      harness.result.seedSavedProgress({
        durChapterIndex: 1,
        durChapterPos: 500,
        durChapterTitle: '第1章',
      });
    });

    await act(async () => {
      await harness.result.flush(false);
    });

    expect(saveBookProgressMock).not.toHaveBeenCalled();
    harness.unmount();
  });

  it('saves once per distinct position and dedupes repeats', async () => {
    const harness = renderHook(() => useProgressSync(endpoint, book));

    act(() => {
      harness.result.scheduleSave(
        { durChapterIndex: 1, durChapterPos: 900, durChapterTitle: '第1章' },
        true
      );
    });
    await flushMicrotasks();

    expect(saveBookProgressMock).toHaveBeenCalledTimes(1);
    expect(saveBookProgressMock.mock.calls[0][1]).toMatchObject({
      durChapterIndex: 1,
      durChapterPos: 900,
    });

    await act(async () => {
      await harness.result.flush(false);
    });
    expect(saveBookProgressMock).toHaveBeenCalledTimes(1);

    harness.unmount();
  });

  it('allows retrying the same position after a network failure', async () => {
    saveBookProgressMock.mockRejectedValueOnce(new Error('offline'));
    const harness = renderHook(() => useProgressSync(endpoint, book));

    act(() => {
      harness.result.scheduleSave(
        { durChapterIndex: 1, durChapterPos: 1000, durChapterTitle: '第1章' },
        true
      );
    });
    await flushMicrotasks();
    expect(saveBookProgressMock).toHaveBeenCalledTimes(1);

    act(() => {
      harness.result.scheduleSave(
        { durChapterIndex: 1, durChapterPos: 1000, durChapterTitle: '第1章' },
        true
      );
    });
    await flushMicrotasks();
    expect(saveBookProgressMock).toHaveBeenCalledTimes(2);

    harness.unmount();
  });

  it('drops the pending snapshot when the book changes', async () => {
    let activeBook = book;
    const harness = renderHook(() => useProgressSync(endpoint, activeBook));

    act(() => {
      harness.result.scheduleSave(
        { durChapterIndex: 1, durChapterPos: 700, durChapterTitle: '第1章' },
        true
      );
    });
    await flushMicrotasks();
    expect(saveBookProgressMock).toHaveBeenCalledTimes(1);

    activeBook = { ...book, bookUrl: 'book://other' };
    harness.rerender();

    await act(async () => {
      await harness.result.flush(false);
    });
    expect(saveBookProgressMock).toHaveBeenCalledTimes(1);

    harness.unmount();
  });
});

const chapterBookUrl = 'book://chapters';
const chapters = [
  { url: 'c0', title: '第0章', bookUrl: chapterBookUrl, index: 0 },
  { url: 'c1', title: '第1章', bookUrl: chapterBookUrl, index: 1 },
  { url: 'c2', title: '第2章', bookUrl: chapterBookUrl, index: 2 },
];

function chapterPayload(index: number): ReaderWebChapter {
  return {
    title: `第${index}章`,
    characterCount: 5,
    paragraphs: [{ html: 'hello', start: 0, endExclusive: 5 }],
  };
}

describe('useChapterLoader', () => {
  it('binds body and index atomically, serves cache hits synchronously, and clears per book', async () => {
    const pending = new Map<number, (value: ReaderWebChapter) => void>();
    getBookContentMock.mockImplementation(
      (_endpoint, _bookUrl, index) =>
        new Promise<ReaderWebChapter>((resolve) => {
          pending.set(index, resolve);
        })
    );

    let activeIndex = 0;
    const harness = renderHook(() =>
      useChapterLoader({
        endpoint,
        bookUrl: chapterBookUrl,
        chapters,
        chapterIndex: activeIndex,
        enabled: true,
      })
    );

    pending.get(0)?.(chapterPayload(0));
    await flushMicrotasks();
    expect(harness.result.loadedIndex).toBe(0);
    expect(harness.result.chapter?.title).toBe('第0章');

    // Switching to an uncached chapter must never pair the new index with the
    // previous body.
    activeIndex = 2;
    harness.rerender();
    expect(harness.result.loadedIndex).not.toBe(2);
    expect(harness.result.chapter).toBeNull();

    pending.get(2)?.(chapterPayload(2));
    await flushMicrotasks();
    expect(harness.result.loadedIndex).toBe(2);
    expect(harness.result.chapter?.title).toBe('第2章');

    // Cached chapter resolves in the same render, with no stale body frame.
    activeIndex = 0;
    harness.rerender();
    expect(harness.result.loadedIndex).toBe(0);
    expect(harness.result.chapter?.title).toBe('第0章');

    // Per-book cache clearing forces an async reload instead of a stale hit.
    activeIndex = 2;
    harness.rerender();
    act(() => {
      clearChapterCacheForBook(chapterBookUrl);
    });
    activeIndex = 0;
    harness.rerender();
    expect(harness.result.loadedIndex).not.toBe(0);
    expect(harness.result.chapter).toBeNull();

    harness.unmount();
  });
});
