import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildSyncPayload,
  DEFAULT_READER_SETTINGS,
  DEFAULT_SETTINGS,
  loadPersistedSettings,
  persistSettings,
  sanitizeSettings,
  SETTINGS_STORAGE_KEY,
  useSettingsStore,
} from '@/stores/settingsStore';

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.getState().resetAllSettings();
});

describe('settingsStore persistence and schema safety', () => {
  it('round-trips all typography, margin, and interaction preferences via localStorage', () => {
    const store = useSettingsStore.getState();
    store.updateSettings({
      theme: 'oled',
      fontSize: 23,
      fontWeight: 500,
      letterSpacing: 0.06,
      lineHeight: 2.04,
      paragraphSpacing: 24,
      firstLineIndent: false,
      textAlign: 'left',
      maxWidth: 840,
      paddingX: 56,
      paddingY: 38,
      columnGap: 64,
      readingMode: 'paginated',
      twoColumnOnWide: false,
      pageAnimation: 'none',
      tapZoneLayout: 'left-handed',
      showHeaderFooter: false,
      bookshelfView: 'list',
      bookshelfSort: 'name',
    });

    const reloaded = loadPersistedSettings();
    expect(reloaded.theme).toBe('oled');
    expect(reloaded.fontSize).toBe(23);
    expect(reloaded.fontWeight).toBe(500);
    expect(reloaded.letterSpacing).toBe(0.06);
    expect(reloaded.lineHeight).toBe(2.04);
    expect(reloaded.paragraphSpacing).toBe(24);
    expect(reloaded.firstLineIndent).toBe(false);
    expect(reloaded.textAlign).toBe('left');
    expect(reloaded.maxWidth).toBe(840);
    expect(reloaded.paddingX).toBe(56);
    expect(reloaded.paddingY).toBe(38);
    expect(reloaded.columnGap).toBe(64);
    expect(reloaded.readingMode).toBe('paginated');
    expect(reloaded.twoColumnOnWide).toBe(false);
    expect(reloaded.pageAnimation).toBe('none');
    expect(reloaded.tapZoneLayout).toBe('left-handed');
    expect(reloaded.showHeaderFooter).toBe(false);
    expect(reloaded.bookshelfView).toBe('list');
    expect(reloaded.bookshelfSort).toBe('name');
  });

  it('merges partial legacy JSON with defaults and clamps out-of-range values', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        theme: 'invalid-theme',
        fontSize: 99,
        fontWeight: 520,
        letterSpacing: -2,
        lineHeight: 5.5,
        paragraphSpacing: 120,
        maxWidth: 200,
        paddingX: 500,
        paddingY: 2,
        columnGap: 10,
      })
    );

    const parsed = loadPersistedSettings();
    expect(parsed.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(parsed.fontSize).toBe(32);
    expect(parsed.fontWeight).toBe(500);
    expect(parsed.letterSpacing).toBe(0);
    expect(parsed.lineHeight).toBe(2.4);
    expect(parsed.paragraphSpacing).toBe(36);
    expect(parsed.maxWidth).toBe(480);
    expect(parsed.paddingX).toBe(96);
    expect(parsed.paddingY).toBe(8);
    expect(parsed.columnGap).toBe(24);
    expect(parsed.bookshelfView).toBe(DEFAULT_SETTINGS.bookshelfView);
  });

  it('supports functional updates without dropping rapid increments', () => {
    const { updateSettings } = useSettingsStore.getState();
    updateSettings((s) => ({ fontSize: s.fontSize + 1 }));
    updateSettings((s) => ({ fontSize: s.fontSize + 1 }));
    expect(useSettingsStore.getState().settings.fontSize).toBe(
      DEFAULT_READER_SETTINGS.fontSize + 2
    );
  });

  it('resetReaderSettings resets typography while keeping bookshelf & sync preferences', () => {
    const store = useSettingsStore.getState();
    store.updateSettings({
      fontSize: 28,
      paddingX: 72,
      bookshelfView: 'list',
      bookshelfSort: 'latest',
      autoSyncReadConfig: true,
    });

    useSettingsStore.getState().resetReaderSettings();
    const after = useSettingsStore.getState().settings;
    expect(after.fontSize).toBe(DEFAULT_READER_SETTINGS.fontSize);
    expect(after.paddingX).toBe(DEFAULT_READER_SETTINGS.paddingX);
    expect(after.bookshelfView).toBe('list');
    expect(after.bookshelfSort).toBe('latest');
    expect(after.autoSyncReadConfig).toBe(true);
  });

  it('exports only non-binary JSON preference fields for cloud sync', () => {
    const settings = sanitizeSettings({ fontSize: 21, theme: 'dark' });
    persistSettings(settings);
    const payload = buildSyncPayload(settings);
    expect(payload.fontSize).toBe(21);
    expect(payload.theme).toBe('dark');
    expect(JSON.stringify(payload)).not.toContain('buffer');
    expect(Object.values(payload).every((v) => !(v instanceof ArrayBuffer))).toBe(
      true
    );
  });
});
