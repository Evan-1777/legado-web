import { useEffect, useState } from 'react';
import { ToastViewport } from '@/components/ui/Toast';
import { BookshelfPage } from '@/features/bookshelf/BookshelfPage';
import { ReaderPage } from '@/features/reader/ReaderPage';
import { OnlineSearchModal } from '@/features/search/OnlineSearchModal';
import {
  SettingsModal,
  type SettingsTabId,
} from '@/features/settings/SettingsModal';
import { useAppRoute } from '@/router';
import { useFontStore } from '@/stores/fontStore';
import { useSettingsStore } from '@/stores/settingsStore';

function useSystemDark(): boolean {
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    setDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return dark;
}

export function App() {
  const route = useAppRoute();
  const systemDark = useSystemDark();
  const { settings, updateSettings } = useSettingsStore();
  const hydrateForStartup = useFontStore((s) => s.hydrateForStartup);

  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>('connection');

  const resolvedUiDark =
    settings.uiTheme === 'dark' ||
    (settings.uiTheme === 'system' && systemDark);

  // Sync root UI theme attribute & PWA status bar theme-color
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-ui-theme',
      resolvedUiDark ? 'dark' : 'light'
    );
    const meta = document.getElementById('meta-theme-color');
    if (meta) {
      if (route.view === 'reader') {
        const effective =
          settings.theme === 'auto'
            ? systemDark
              ? 'dark'
              : 'white'
            : settings.theme;
        const themeColors: Record<string, string> = {
          white: '#ffffff',
          sepia: '#f7f1e3',
          gray: '#edeff2',
          dark: '#1c1c1e',
          oled: '#000000',
        };
        meta.setAttribute('content', themeColors[effective] ?? '#ffffff');
      } else {
        meta.setAttribute('content', resolvedUiDark ? '#000000' : '#f5f5f7');
      }
    }
  }, [resolvedUiDark, route.view, settings.theme, systemDark]);

  // Hydrate persisted custom fonts from IndexedDB on startup
  useEffect(() => {
    void hydrateForStartup();
  }, [hydrateForStartup]);

  const openSettings = (tab: SettingsTabId = 'connection') => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  const toggleUiDark = () => {
    updateSettings({ uiTheme: resolvedUiDark ? 'light' : 'dark' });
  };

  return (
    <>
      {route.view === 'bookshelf' ? (
        <BookshelfPage
          onOpenSearch={() => setSearchOpen(true)}
          onOpenSettings={() => openSettings('connection')}
          resolvedDark={resolvedUiDark}
          onToggleUiDark={toggleUiDark}
        />
      ) : (
        <ReaderPage
          bookUrl={route.bookUrl}
          systemDark={systemDark}
          onOpenFontLibrary={() => openSettings('fonts')}
        />
      )}

      <OnlineSearchModal open={searchOpen} onOpenChange={setSearchOpen} />

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        activeTab={settingsTab}
        onTabChange={setSettingsTab}
      />

      <ToastViewport />
    </>
  );
}
