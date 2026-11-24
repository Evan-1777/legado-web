import { create } from 'zustand';
import { getReadConfig, saveReadConfig } from '@/api/client';
import { DEFAULT_FONT_ID } from '@/storage/fontManager';
import { useConnectionStore } from './connectionStore';

export const SETTINGS_STORAGE_KEY = 'legado_web_settings_v1';
export const SETTINGS_VERSION = 1;

export type UiTheme = 'system' | 'light' | 'dark';
export type ReaderTheme = 'white' | 'sepia' | 'gray' | 'dark' | 'oled' | 'auto';
export type FontWeightValue = 300 | 400 | 500 | 600;
export type TextAlignValue = 'justify' | 'left';
export type ReadingMode = 'scroll' | 'paginated';
export type PageAnimation = 'slide' | 'none';
export type TapZoneLayout = 'default' | 'left-handed';
export type BookshelfView = 'grid' | 'list';
export type BookshelfSort = 'recent' | 'name' | 'latest';

export interface ReaderSettings {
  theme: ReaderTheme;
  fontId: string;
  fontSize: number;
  fontWeight: FontWeightValue;
  letterSpacing: number;
  lineHeight: number;
  paragraphSpacing: number;
  firstLineIndent: boolean;
  textAlign: TextAlignValue;
  maxWidth: number;
  paddingX: number;
  paddingY: number;
  columnGap: number;
  readingMode: ReadingMode;
  twoColumnOnWide: boolean;
  pageAnimation: PageAnimation;
  tapZoneLayout: TapZoneLayout;
  showHeaderFooter: boolean;
}

export interface AppSettings extends ReaderSettings {
  version: number;
  uiTheme: UiTheme;
  bookshelfView: BookshelfView;
  bookshelfSort: BookshelfSort;
  autoSyncReadConfig: boolean;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  theme: 'sepia',
  fontId: DEFAULT_FONT_ID,
  fontSize: 19,
  fontWeight: 400,
  letterSpacing: 0.015,
  lineHeight: 1.82,
  paragraphSpacing: 16,
  firstLineIndent: true,
  textAlign: 'justify',
  maxWidth: 720,
  paddingX: 32,
  paddingY: 20,
  columnGap: 48,
  readingMode: 'scroll',
  twoColumnOnWide: true,
  pageAnimation: 'slide',
  tapZoneLayout: 'default',
  showHeaderFooter: true,
};

export const DEFAULT_SETTINGS: AppSettings = {
  version: SETTINGS_VERSION,
  uiTheme: 'system',
  bookshelfView: 'grid',
  bookshelfSort: 'recent',
  autoSyncReadConfig: false,
  ...DEFAULT_READER_SETTINGS,
};

const VALID_UI_THEMES = new Set<UiTheme>(['system', 'light', 'dark']);
const VALID_READER_THEMES = new Set<ReaderTheme>([
  'white',
  'sepia',
  'gray',
  'dark',
  'oled',
  'auto',
]);
const VALID_WEIGHTS: FontWeightValue[] = [300, 400, 500, 600];
const VALID_ALIGNS = new Set<TextAlignValue>(['justify', 'left']);
const VALID_MODES = new Set<ReadingMode>(['scroll', 'paginated']);
const VALID_ANIMS = new Set<PageAnimation>(['slide', 'none']);
const VALID_TAPS = new Set<TapZoneLayout>(['default', 'left-handed']);
const VALID_VIEWS = new Set<BookshelfView>(['grid', 'list']);
const VALID_SORTS = new Set<BookshelfSort>(['recent', 'name', 'latest']);

function clampNum(val: unknown, fallback: number, min: number, max: number, precision = 0): number {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n)) return fallback;
  const clamped = Math.min(max, Math.max(min, n));
  if (precision <= 0) return Math.round(clamped);
  const factor = 10 ** precision;
  return Math.round(clamped * factor) / factor;
}

function clampWeight(val: unknown, fallback: FontWeightValue): FontWeightValue {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  let nearest = VALID_WEIGHTS[0];
  let diff = Math.abs(n - nearest);
  for (const w of VALID_WEIGHTS) {
    const d = Math.abs(n - w);
    if (d < diff) {
      diff = d;
      nearest = w;
    }
  }
  return nearest;
}

export function sanitizeSettings(raw: unknown, base: AppSettings = DEFAULT_SETTINGS): AppSettings {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    version: SETTINGS_VERSION,
    uiTheme: VALID_UI_THEMES.has(obj.uiTheme as UiTheme)
      ? (obj.uiTheme as UiTheme)
      : base.uiTheme,
    theme: VALID_READER_THEMES.has(obj.theme as ReaderTheme)
      ? (obj.theme as ReaderTheme)
      : base.theme,
    fontId:
      typeof obj.fontId === 'string' && obj.fontId.trim()
        ? obj.fontId.trim()
        : base.fontId,
    fontSize: clampNum(obj.fontSize, base.fontSize, 12, 32, 0),
    fontWeight: clampWeight(obj.fontWeight, base.fontWeight),
    letterSpacing: clampNum(obj.letterSpacing, base.letterSpacing, 0, 0.16, 3),
    lineHeight: clampNum(obj.lineHeight, base.lineHeight, 1.3, 2.4, 2),
    paragraphSpacing: clampNum(obj.paragraphSpacing, base.paragraphSpacing, 0, 36, 0),
    firstLineIndent:
      typeof obj.firstLineIndent === 'boolean'
        ? obj.firstLineIndent
        : base.firstLineIndent,
    textAlign: VALID_ALIGNS.has(obj.textAlign as TextAlignValue)
      ? (obj.textAlign as TextAlignValue)
      : base.textAlign,
    maxWidth: clampNum(obj.maxWidth, base.maxWidth, 480, 1080, 0),
    paddingX: clampNum(obj.paddingX, base.paddingX, 12, 96, 0),
    paddingY: clampNum(obj.paddingY, base.paddingY, 8, 72, 0),
    columnGap: clampNum(obj.columnGap, base.columnGap, 24, 80, 0),
    readingMode: VALID_MODES.has(obj.readingMode as ReadingMode)
      ? (obj.readingMode as ReadingMode)
      : base.readingMode,
    twoColumnOnWide:
      typeof obj.twoColumnOnWide === 'boolean'
        ? obj.twoColumnOnWide
        : base.twoColumnOnWide,
    pageAnimation: VALID_ANIMS.has(obj.pageAnimation as PageAnimation)
      ? (obj.pageAnimation as PageAnimation)
      : base.pageAnimation,
    tapZoneLayout: VALID_TAPS.has(obj.tapZoneLayout as TapZoneLayout)
      ? (obj.tapZoneLayout as TapZoneLayout)
      : base.tapZoneLayout,
    showHeaderFooter:
      typeof obj.showHeaderFooter === 'boolean'
        ? obj.showHeaderFooter
        : base.showHeaderFooter,
    bookshelfView: VALID_VIEWS.has(obj.bookshelfView as BookshelfView)
      ? (obj.bookshelfView as BookshelfView)
      : base.bookshelfView,
    bookshelfSort: VALID_SORTS.has(obj.bookshelfSort as BookshelfSort)
      ? (obj.bookshelfSort as BookshelfSort)
      : base.bookshelfSort,
    autoSyncReadConfig:
      typeof obj.autoSyncReadConfig === 'boolean'
        ? obj.autoSyncReadConfig
        : base.autoSyncReadConfig,
  };
}

export function loadPersistedSettings(storage: Pick<Storage, 'getItem'> = localStorage): AppSettings {
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return sanitizeSettings(JSON.parse(raw), DEFAULT_SETTINGS);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function persistSettings(
  settings: AppSettings,
  storage: Pick<Storage, 'setItem'> = localStorage
): void {
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Pure non-binary sync payload for Legado POST /saveReadConfig.
 * Font binaries live strictly in local IndexedDB.
 */
export function buildSyncPayload(settings: AppSettings): Record<string, unknown> {
  return {
    legadoWebVersion: SETTINGS_VERSION,
    uiTheme: settings.uiTheme,
    theme: settings.theme,
    fontId: settings.fontId,
    fontSize: settings.fontSize,
    fontWeight: settings.fontWeight,
    letterSpacing: settings.letterSpacing,
    lineHeight: settings.lineHeight,
    paragraphSpacing: settings.paragraphSpacing,
    firstLineIndent: settings.firstLineIndent,
    textAlign: settings.textAlign,
    maxWidth: settings.maxWidth,
    paddingX: settings.paddingX,
    paddingY: settings.paddingY,
    columnGap: settings.columnGap,
    readingMode: settings.readingMode,
    twoColumnOnWide: settings.twoColumnOnWide,
    pageAnimation: settings.pageAnimation,
    tapZoneLayout: settings.tapZoneLayout,
    showHeaderFooter: settings.showHeaderFooter,
  };
}

const SYNC_TRIGGER_KEYS: ReadonlySet<keyof AppSettings> = new Set([
  'theme',
  'fontId',
  'fontSize',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'paragraphSpacing',
  'firstLineIndent',
  'textAlign',
  'maxWidth',
  'paddingX',
  'paddingY',
  'columnGap',
  'readingMode',
  'twoColumnOnWide',
  'pageAnimation',
  'tapZoneLayout',
  'showHeaderFooter',
]);

let autoSyncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutoSync(settings: AppSettings) {
  if (!settings.autoSyncReadConfig) return;
  if (autoSyncTimer) clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(() => {
    const endpoint = useConnectionStore.getState().getActiveEndpoint();
    void saveReadConfig(endpoint, buildSyncPayload(settings)).catch(() => {
      // Silent background sync failure; manual sync surfaces explicit error
    });
  }, 1500);
}

interface SettingsStore {
  settings: AppSettings;
  updateSettings: (
    patch: Partial<AppSettings> | ((prev: AppSettings) => Partial<AppSettings>)
  ) => void;
  resetReaderSettings: () => void;
  resetAllSettings: () => void;
  exportSyncPayload: () => Record<string, unknown>;
  applySyncPayload: (raw: unknown) => AppSettings;
  pullCloudConfig: () => Promise<boolean>;
  pushCloudConfig: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: loadPersistedSettings(),

  updateSettings: (patchInput) => {
    const current = get().settings;
    const patch =
      typeof patchInput === 'function' ? patchInput(current) : patchInput;
    const next = sanitizeSettings({ ...current, ...patch }, current);
    persistSettings(next);
    set({ settings: next });

    const shouldSync = (Object.keys(patch) as (keyof AppSettings)[]).some((k) =>
      SYNC_TRIGGER_KEYS.has(k)
    );
    if (shouldSync) {
      scheduleAutoSync(next);
    }
  },

  resetReaderSettings: () => {
    const current = get().settings;
    const next: AppSettings = {
      ...current,
      ...DEFAULT_READER_SETTINGS,
    };
    persistSettings(next);
    set({ settings: next });
    scheduleAutoSync(next);
  },

  resetAllSettings: () => {
    const next: AppSettings = { ...DEFAULT_SETTINGS };
    persistSettings(next);
    set({ settings: next });
  },

  exportSyncPayload: () => buildSyncPayload(get().settings),

  applySyncPayload: (raw) => {
    const current = get().settings;
    // Preserve local bookshelf layout and autoSync preference when pulling cloud config
    const merged = sanitizeSettings(raw, current);
    const next: AppSettings = {
      ...merged,
      bookshelfView: current.bookshelfView,
      bookshelfSort: current.bookshelfSort,
      autoSyncReadConfig: current.autoSyncReadConfig,
    };
    persistSettings(next);
    set({ settings: next });
    return next;
  },

  pullCloudConfig: async () => {
    const endpoint = useConnectionStore.getState().getActiveEndpoint();
    const raw = await getReadConfig(endpoint);
    if (!raw) return false;
    get().applySyncPayload(raw);
    return true;
  },

  pushCloudConfig: async () => {
    const endpoint = useConnectionStore.getState().getActiveEndpoint();
    await saveReadConfig(endpoint, get().exportSyncPayload());
  },
}));
