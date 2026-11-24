import { create } from 'zustand';
import type { StoredFontMeta } from '@/storage/fontDb';
import { DEFAULT_FONT_ID, fontManager } from '@/storage/fontManager';
import { useSettingsStore } from './settingsStore';

interface FontStore {
  fonts: StoredFontMeta[];
  totalBytes: number;
  loading: boolean;
  importing: boolean;
  error: string | null;
  hydrated: boolean;
  refreshList: () => Promise<void>;
  hydrateForStartup: () => Promise<void>;
  ensureLoaded: (fontId: string) => Promise<boolean>;
  importFile: (file: File) => Promise<StoredFontMeta>;
  deleteFont: (fontId: string) => Promise<void>;
}

export const useFontStore = create<FontStore>((set, get) => ({
  fonts: [],
  totalBytes: 0,
  loading: false,
  importing: false,
  error: null,
  hydrated: false,

  refreshList: async () => {
    set({ loading: true, error: null });
    try {
      const fonts = await fontManager.listFonts();
      const totalBytes = fonts.reduce((sum, f) => sum + (f.size || 0), 0);
      set({ fonts, totalBytes, loading: false, hydrated: true });
    } catch (err) {
      set({
        loading: false,
        hydrated: true,
        error: err instanceof Error ? err.message : '读取字体库失败',
      });
    }
  },

  hydrateForStartup: async () => {
    const activeFontId = useSettingsStore.getState().settings.fontId;
    await get().refreshList();
    await fontManager.hydrateActiveFont(activeFontId);
  },

  ensureLoaded: async (fontId) => {
    return fontManager.ensureFontLoaded(fontId);
  },

  importFile: async (file) => {
    set({ importing: true, error: null });
    try {
      const meta = await fontManager.importFontFile(file);
      const fonts = [...get().fonts, meta];
      const totalBytes = fonts.reduce((sum, f) => sum + (f.size || 0), 0);
      set({ fonts, totalBytes, importing: false });
      return meta;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导入字体失败';
      set({ importing: false, error: msg });
      throw err;
    }
  },

  deleteFont: async (fontId) => {
    await fontManager.removeFont(fontId);
    const fonts = get().fonts.filter((f) => f.id !== fontId);
    const totalBytes = fonts.reduce((sum, f) => sum + (f.size || 0), 0);
    set({ fonts, totalBytes });

    const { settings, updateSettings } = useSettingsStore.getState();
    if (settings.fontId === fontId) {
      updateSettings({ fontId: DEFAULT_FONT_ID });
    }
  },
}));
