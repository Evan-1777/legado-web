import { create } from 'zustand';
import { deleteBook, getBookshelf, saveBook } from '@/api/client';
import type { Book, SearchBook } from '@/api/types';
import { useConnectionStore } from './connectionStore';

interface BookshelfStore {
  books: Book[];
  loading: boolean;
  hasLoaded: boolean;
  error: string | null;
  filterQuery: string;
  setFilterQuery: (query: string) => void;
  refresh: () => Promise<void>;
  addBook: (book: Book | SearchBook) => Promise<void>;
  removeBook: (book: Book) => Promise<void>;
  patchBookProgress: (
    bookUrl: string,
    patch: Partial<
      Pick<
        Book,
        'durChapterIndex' | 'durChapterPos' | 'durChapterTime' | 'durChapterTitle' | 'totalChapterNum'
      >
    >
  ) => void;
  findBook: (bookUrl: string) => Book | undefined;
}

let activeController: AbortController | null = null;

export const useBookshelfStore = create<BookshelfStore>((set, get) => ({
  books: [],
  loading: false,
  hasLoaded: false,
  error: null,
  filterQuery: '',

  setFilterQuery: (filterQuery) => set({ filterQuery }),

  refresh: async () => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;

    const endpoint = useConnectionStore.getState().getActiveEndpoint();
    set({ loading: true, error: null });

    try {
      const books = await getBookshelf(endpoint, controller.signal);
      if (controller.signal.aborted) return;
      set({ books, loading: false, hasLoaded: true, error: null });
      useConnectionStore.getState().setStatus('connected');
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : '加载书架失败';
      set({ loading: false, hasLoaded: true, error: msg });
      useConnectionStore.getState().setStatus('error');
    }
  },

  addBook: async (book) => {
    const endpoint = useConnectionStore.getState().getActiveEndpoint();
    await saveBook(endpoint, book);
    await get().refresh();
  },

  removeBook: async (book) => {
    const endpoint = useConnectionStore.getState().getActiveEndpoint();
    await deleteBook(endpoint, book);
    set((state) => ({
      books: state.books.filter((b) => b.bookUrl !== book.bookUrl),
    }));
  },

  patchBookProgress: (bookUrl, patch) => {
    set((state) => ({
      books: state.books.map((b) =>
        b.bookUrl === bookUrl ? { ...b, ...patch } : b
      ),
    }));
  },

  findBook: (bookUrl) => get().books.find((b) => b.bookUrl === bookUrl),
}));
