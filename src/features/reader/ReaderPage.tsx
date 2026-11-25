import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { getChapterList, refreshToc } from '@/api/client';
import type { BookChapter } from '@/api/types';
import { IconButton } from '@/components/ui/IconButton';
import {
  IconAlertCircle,
  IconChevronLeft,
  IconClose,
  IconRefresh,
  IconTypographyAa,
} from '@/components/ui/Icons';
import { toast } from '@/components/ui/Toast';
import { navigate } from '@/router';
import { resolveFontCssFamily } from '@/storage/fontManager';
import { useBookshelfStore } from '@/stores/bookshelfStore';
import { useConnectionStore } from '@/stores/connectionStore';
import { useFontStore } from '@/stores/fontStore';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  PaginatedReader,
  type PaginatedPageInfo,
  type PaginatedReaderHandle,
  type PaginatedStateReason,
} from './PaginatedReader';
import { ReaderHud } from './ReaderHud';
import { ReaderFooterBar, ReaderHeaderBar } from './ReaderStatusBar';
import { ScrollReader } from './ScrollReader';
import { TocDrawer } from './TocDrawer';
import { TypographyPopover } from './TypographyPopover';
import {
  clearChapterCacheForBook,
  useChapterLoader,
} from './useChapterLoader';
import { useProgressSync } from './useProgressSync';
import { useFullscreen } from './useFullscreen';
import { useReaderInput } from './useReaderInput';

export interface ReaderPageProps {
  bookUrl: string;
  systemDark: boolean;
  onOpenFontLibrary: () => void;
}

export function ReaderPage({
  bookUrl,
  systemDark,
  onOpenFontLibrary,
}: ReaderPageProps) {
  const endpoint = useConnectionStore((s) => s.getActiveEndpoint());
  const {
    books,
    refresh: refreshBookshelf,
    patchBookProgress,
    hasLoaded: bookshelfHasLoaded,
  } = useBookshelfStore();
  const book = useMemo(
    () => books.find((b) => b.bookUrl === bookUrl),
    [books, bookUrl]
  );
  const bookReady = Boolean(book) || bookshelfHasLoaded;

  const settings = useSettingsStore((s) => s.settings);
  const { fonts: customFonts, ensureLoaded } = useFontStore();

  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [tocLoading, setTocLoading] = useState(true);
  const [tocRefreshing, setTocRefreshing] = useState(false);
  const [tocError, setTocError] = useState<string | null>(null);

  const [chapterIndex, setChapterIndex] = useState<number>(0);
  const [initialCharPos, setInitialCharPos] = useState<number>(0);
  const [startFromEnd, setStartFromEnd] = useState(false);
  const liveCharPosRef = useRef<number>(0);
  const [hydratedBookUrl, setHydratedBookUrl] = useState<string>('');

  // Hydrate during render so the first chapter cannot be requested before the
  // saved reading position is known (direct /read links race /getBookshelf).
  if (book && hydratedBookUrl !== book.bookUrl) {
    const nextIndex = Math.max(0, book.durChapterIndex ?? 0);
    const nextPos = Math.max(0, book.durChapterPos ?? 0);
    setHydratedBookUrl(book.bookUrl);
    setChapterIndex(nextIndex);
    setInitialCharPos(nextPos);
    setStartFromEnd(false);
    liveCharPosRef.current = nextPos;
  }

  const [hudVisible, setHudVisible] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [aaOpen, setAaOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<{ src: string; alt: string } | null>(
    null
  );

  const [chapterPct, setChapterPct] = useState(0);
  const [pageInfo, setPageInfo] = useState<PaginatedPageInfo>({
    page: 0,
    totalPages: 1,
    columns: 1,
  });

  const paginatedRef = useRef<PaginatedReaderHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const {
    supported: fullscreenSupported,
    isFullscreen,
    toggle: toggleFullscreen,
  } = useFullscreen({
    target: rootRef,
    onError: (message) => toast.error(message),
  });

  // Ensure bookshelf is loaded if user directly opened /read?url=...
  useEffect(() => {
    if (books.length === 0) {
      void refreshBookshelf();
    }
  }, [books.length, refreshBookshelf]);

  // Ensure active custom font is loaded when reading
  useEffect(() => {
    void ensureLoaded(settings.fontId);
  }, [settings.fontId, ensureLoaded]);

  // Fetch TOC
  const loadToc = useCallback(async () => {
    const controller = new AbortController();
    setTocLoading(true);
    setTocError(null);
    try {
      const list = await getChapterList(endpoint, bookUrl, controller.signal);
      setChapters(list);
      setTocLoading(false);
      if (list.length > 0) {
        patchBookProgress(bookUrl, { totalChapterNum: list.length });
        setChapterIndex((prev) => Math.min(prev, list.length - 1));
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setTocLoading(false);
      setTocError(err instanceof Error ? err.message : '获取目录失败');
    }
    return () => controller.abort();
  }, [endpoint, bookUrl, patchBookProgress]);

  useEffect(() => {
    void loadToc();
  }, [loadToc]);

  const handleRefreshToc = useCallback(async () => {
    if (tocRefreshing) return;
    setTocRefreshing(true);
    try {
      const list = await refreshToc(endpoint, bookUrl);
      clearChapterCacheForBook(bookUrl);
      setChapters(list);
      if (list.length > 0) {
        patchBookProgress(bookUrl, { totalChapterNum: list.length });
        setChapterIndex((prev) => Math.min(prev, list.length - 1));
      }
      toast.success(`目录已更新（共 ${list.length} 章）`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刷新目录失败');
    } finally {
      setTocRefreshing(false);
    }
  }, [endpoint, bookUrl, patchBookProgress, tocRefreshing]);

  const {
    chapter,
    loadedIndex,
    error: chapterError,
    retry: retryChapter,
  } = useChapterLoader({
    endpoint,
    bookUrl,
    chapters,
    chapterIndex,
    enabled:
      bookReady &&
      (!book || hydratedBookUrl === book.bookUrl) &&
      !tocLoading &&
      !tocError,
  });

  const { scheduleSave, flush, seedSavedProgress } = useProgressSync(
    endpoint,
    book
  );
  const contentReady = Boolean(chapter) && loadedIndex === chapterIndex;

  const seededBookRef = useRef<string>('');
  useEffect(() => {
    if (!book || hydratedBookUrl !== book.bookUrl) return;
    if (seededBookRef.current === book.bookUrl) return;
    seededBookRef.current = book.bookUrl;
    seedSavedProgress({
      durChapterIndex: book.durChapterIndex ?? 0,
      durChapterPos: book.durChapterPos ?? 0,
      durChapterTitle: book.durChapterTitle || book.name,
    });
  }, [book, hydratedBookUrl, seedSavedProgress]);

  const currentChapterTitle =
    chapter?.title ||
    chapters[chapterIndex]?.title ||
    book?.durChapterTitle ||
    `第 ${chapterIndex + 1} 章`;

  const goToChapter = useCallback(
    (nextIndex: number, fromEnd = false) => {
      if (nextIndex < 0 || (chapters.length > 0 && nextIndex >= chapters.length)) {
        return;
      }
      void flush(false);
      setStartFromEnd(fromEnd);
      setInitialCharPos(0);
      liveCharPosRef.current = 0;
      setChapterIndex(nextIndex);
      if (!fromEnd) {
        const nextTitle =
          chapters[nextIndex]?.title || `第 ${nextIndex + 1} 章`;
        scheduleSave(
          {
            durChapterIndex: nextIndex,
            durChapterPos: 0,
            durChapterTitle: nextTitle,
          },
          true
        );
      }
      // fromEnd: never persist position 0; the chapter-end layout callback
      // commits the real last-page offset once it is known.
    },
    [chapters, flush, scheduleSave]
  );

  const handlePrevChapter = useCallback(
    (fromEnd = false) => {
      if (chapterIndex <= 0) {
        toast.show('已是第一章');
        return;
      }
      goToChapter(chapterIndex - 1, fromEnd);
    },
    [chapterIndex, goToChapter]
  );

  const handleNextChapter = useCallback(() => {
    if (chapters.length > 0 && chapterIndex >= chapters.length - 1) {
      toast.show('已是最新章节');
      return;
    }
    goToChapter(chapterIndex + 1, false);
  }, [chapterIndex, chapters.length, goToChapter]);

  const handleScrollPosChange = useCallback(
    (
      charPos: number,
      pct: number,
      options?: { userInitiated?: boolean }
    ) => {
      setChapterPct(pct);
      liveCharPosRef.current = charPos;
      if (!options?.userInitiated) return;
      scheduleSave({
        durChapterIndex: chapterIndex,
        durChapterPos: charPos,
        durChapterTitle: currentChapterTitle,
      });
    },
    [chapterIndex, currentChapterTitle, scheduleSave]
  );

  const handlePaginatedStateChange = useCallback(
    (
      charPos: number,
      pct: number,
      info: PaginatedPageInfo,
      reason: PaginatedStateReason
    ) => {
      setChapterPct(pct);
      setPageInfo(info);
      liveCharPosRef.current = charPos;

      // Reflow and initial layout are local-only: never overwrite cloud
      // progress from a measurement pass.
      if (reason === 'init' || reason === 'reflow') return;

      const snapshot = {
        durChapterIndex: chapterIndex,
        durChapterPos: charPos,
        durChapterTitle: currentChapterTitle,
      };

      if (reason === 'chapter-end') {
        setStartFromEnd(false);
        scheduleSave(snapshot, true);
        return;
      }
      scheduleSave(snapshot, false);
    },
    [chapterIndex, currentChapterTitle, scheduleSave]
  );

  const handleBackToShelf = useCallback(async () => {
    await Promise.race([
      flush(false),
      new Promise<void>((resolve) => setTimeout(resolve, 800)),
    ]);
    navigate({ view: 'bookshelf' });
  }, [flush]);

  // Mode switches adjust state during render so the newly mounted reader
  // receives the live character offset on its very first layout pass.
  const [observedReadingMode, setObservedReadingMode] = useState(
    settings.readingMode
  );
  if (observedReadingMode !== settings.readingMode) {
    setObservedReadingMode(settings.readingMode);
    setInitialCharPos(liveCharPosRef.current);
    setStartFromEnd(false);
  }

  const overlayOpen = tocOpen || aaOpen || Boolean(lightboxImg);

  const { handleStageClick } = useReaderInput({
    readingMode: settings.readingMode,
    tapZoneLayout: settings.tapZoneLayout,
    hudVisible,
    overlayOpen,
    onToggleHud: () => setHudVisible((v) => !v),
    onHideHud: () => setHudVisible(false),
    onPrevPage: () => paginatedRef.current?.prevPage(),
    onNextPage: () => paginatedRef.current?.nextPage(),
    onFirstPage: () => paginatedRef.current?.goToPage(0),
    onLastPage: () => {
      const handle = paginatedRef.current;
      if (handle) handle.goToPage(handle.getPageInfo().totalPages - 1);
    },
    onPrevChapter: () => handlePrevChapter(false),
    onNextChapter: () => handleNextChapter(),
    onToggleToc: () => {
      setAaOpen(false);
      setTocOpen((v) => !v);
    },
    onToggleAa: () => {
      setTocOpen(false);
      setAaOpen((v) => !v);
    },
    onCloseOverlay: () => {
      setTocOpen(false);
      setAaOpen(false);
      setLightboxImg(null);
    },
    onToggleFullscreen: toggleFullscreen,
  });

  const resolvedReaderTheme =
    settings.theme === 'auto'
      ? systemDark
        ? 'dark'
        : 'white'
      : settings.theme;

  const fontCssFamily = useMemo(
    () => resolveFontCssFamily(settings.fontId, customFonts),
    [settings.fontId, customFonts]
  );

  const readerVars = useMemo(
    () =>
      ({
        '--r-font': fontCssFamily,
        '--r-size': `${settings.fontSize}px`,
        '--r-weight': String(settings.fontWeight),
        '--r-letter-spacing': `${settings.letterSpacing}em`,
        '--r-lh': String(settings.lineHeight),
        '--r-para-gap': `${settings.paragraphSpacing}px`,
        '--r-indent': settings.firstLineIndent ? '2em' : '0',
        '--r-align': settings.textAlign,
        '--r-max-width': `${settings.maxWidth}px`,
        '--r-pad-x': `${settings.paddingX}px`,
        '--r-pad-y': `${settings.paddingY}px`,
        '--r-col-gap': `${settings.columnGap}px`,
      }) as CSSProperties,
    [fontCssFamily, settings]
  );

  const layoutToken = [
    settings.fontId,
    settings.fontSize,
    settings.fontWeight,
    settings.letterSpacing,
    settings.lineHeight,
    settings.paragraphSpacing,
    settings.firstLineIndent,
    settings.textAlign,
    settings.paddingX,
    settings.paddingY,
    settings.maxWidth,
    settings.columnGap,
    settings.twoColumnOnWide,
  ].join('|');

  const bookTitle = book?.name || '阅读';
  const totalChapters = Math.max(1, chapters.length);
  const overallPct = (
    ((chapterIndex + chapterPct) / totalChapters) *
    100
  ).toFixed(1);

  const modeLabel =
    settings.readingMode === 'scroll'
      ? '滚动'
      : pageInfo.columns === 2
        ? '双栏分页'
        : '分页';

  const progressLabel =
    settings.readingMode === 'paginated'
      ? `${pageInfo.page + 1} / ${pageInfo.totalPages} · ${overallPct}%`
      : `${overallPct}%`;

  const pageLabel =
    settings.readingMode === 'paginated'
      ? `第 ${pageInfo.page + 1} / ${pageInfo.totalPages} 页`
      : undefined;

  const chapterKey = `${bookUrl}::${chapterIndex}`;

  return (
    <div
      ref={rootRef}
      data-reader-theme={resolvedReaderTheme}
      style={{
        ...readerVars,
        background: 'var(--r-bg)',
        color: 'var(--r-ink)',
      }}
      className="fixed inset-0 z-40 flex flex-col overflow-hidden transition-[background-color,color] duration-220 ease-[var(--ease-apple)]"
    >
      <ReaderHeaderBar
        visible={settings.showHeaderFooter}
        bookTitle={bookTitle}
        chapterTitle={currentChapterTitle}
      />

      {/* Main Reading Stage */}
      <div
        onClick={handleStageClick}
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        {(tocLoading || !contentReady) && !tocError && !chapterError && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--r-ink-muted)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {(tocError || chapterError) && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-full flex-col items-center justify-center gap-3.5 px-6 text-center"
          >
            <IconAlertCircle size={28} className="text-[var(--danger)]" />
            <div className="text-[15px] font-semibold">
              {tocError ? '目录加载失败' : '正文加载失败'}
            </div>
            <p
              className="m-0 max-w-[360px] text-[13px] leading-relaxed"
              style={{ color: 'var(--r-ink-muted)' }}
            >
              {tocError || chapterError}
            </p>
            <div className="mt-1 flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleBackToShelf}
                style={{ background: 'var(--r-control)', color: 'var(--r-ink)' }}
                className="inline-flex h-9 items-center gap-1 rounded-full px-4 text-[13px] font-medium"
              >
                <IconChevronLeft size={15} />
                <span>书架</span>
              </button>
              <button
                type="button"
                onClick={() => (tocError ? void loadToc() : retryChapter())}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-[13px] font-medium text-white"
              >
                <IconRefresh size={14} />
                <span>重试</span>
              </button>
            </div>
          </div>
        )}

        {!tocError && !chapterError && chapter && contentReady && (
          settings.readingMode === 'scroll' ? (
            <ScrollReader
              chapter={chapter}
              chapterKey={chapterKey}
              initialCharPos={initialCharPos}
              hasPrev={chapterIndex > 0}
              hasNext={chapters.length === 0 || chapterIndex < chapters.length - 1}
              onPrevChapter={() => handlePrevChapter(false)}
              onNextChapter={handleNextChapter}
              onPosChange={handleScrollPosChange}
              onScrollStart={() => {
                if (hudVisible) setHudVisible(false);
              }}
              onImageClick={(src, alt) => setLightboxImg({ src, alt })}
            />
          ) : (
            <PaginatedReader
              ref={paginatedRef}
              chapter={chapter}
              chapterKey={chapterKey}
              initialCharPos={initialCharPos}
              startFromEnd={startFromEnd}
              paddingX={settings.paddingX}
              paddingY={settings.paddingY}
              maxWidth={settings.maxWidth}
              columnGap={settings.columnGap}
              twoColumnOnWide={settings.twoColumnOnWide}
              pageAnimation={settings.pageAnimation}
              layoutToken={layoutToken}
              interactionEnabled={!overlayOpen}
              onReachPrevChapter={() => handlePrevChapter(true)}
              onReachNextChapter={handleNextChapter}
              onPageStateChange={handlePaginatedStateChange}
              onInteractionStart={() => setHudVisible(false)}
              onImageClick={(src, alt) => setLightboxImg({ src, alt })}
            />
          )
        )}
      </div>

      <ReaderFooterBar
        visible={settings.showHeaderFooter}
        modeLabel={modeLabel}
        progressLabel={progressLabel}
      />

      {/* Layer 2 Floating HUD */}
      <ReaderHud
        visible={hudVisible}
        bookTitle={bookTitle}
        chapterTitle={currentChapterTitle}
        chapters={chapters}
        chapterIndex={chapterIndex}
        pageLabel={pageLabel}
        refreshingToc={tocRefreshing}
        fullscreenSupported={fullscreenSupported}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onBack={handleBackToShelf}
        onRefreshToc={() => void handleRefreshToc()}
        onOpenToc={() => {
          setAaOpen(false);
          setTocOpen(true);
        }}
        onPrevChapter={() => handlePrevChapter(false)}
        onNextChapter={handleNextChapter}
        onJumpChapter={(idx) => goToChapter(idx, false)}
        typographyTrigger={
          <TypographyPopover
            open={aaOpen}
            onOpenChange={(next) => {
              if (next) setTocOpen(false);
              setAaOpen(next);
            }}
            onOpenFontLibrary={onOpenFontLibrary}
            trigger={
              <IconButton
                ariaLabel="排版与主题"
                tooltip="排版与主题 (A)"
                surface="reader"
                active={aaOpen}
                onClick={() => setAaOpen((v) => !v)}
              >
                <IconTypographyAa size={19} />
              </IconButton>
            }
          />
        }
      />

      {/* P1 TOC Slide-Over Drawer */}
      <TocDrawer
        open={tocOpen}
        onOpenChange={setTocOpen}
        chapters={chapters}
        currentIndex={chapterIndex}
        refreshing={tocRefreshing}
        onRefresh={() => void handleRefreshToc()}
        onSelectChapter={(idx) => goToChapter(idx, false)}
      />

      {/* Layer 3 Image Lightbox */}
      {lightboxImg && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="插图预览"
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/82 p-5 backdrop-blur-[10px] anim-fade-in"
        >
          <button
            type="button"
            aria-label="关闭预览"
            onClick={() => setLightboxImg(null)}
            className="absolute right-4 top-[calc(14px+env(safe-area-inset-top))] flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <IconClose size={18} />
          </button>
          <img
            src={lightboxImg.src}
            alt={lightboxImg.alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88dvh] max-w-[94vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
