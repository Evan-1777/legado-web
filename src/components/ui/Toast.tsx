import { create } from 'zustand';

interface ToastState {
  message: string | null;
  tone: 'neutral' | 'error' | 'success';
  id: number;
  show: (message: string, tone?: 'neutral' | 'error' | 'success') => void;
  dismiss: () => void;
}

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  tone: 'neutral',
  id: 0,
  show: (message, tone = 'neutral') => {
    if (dismissTimer) clearTimeout(dismissTimer);
    const id = Date.now();
    set({ message, tone, id });
    dismissTimer = setTimeout(() => {
      set((state) => (state.id === id ? { message: null } : state));
    }, 2600);
  },
  dismiss: () => {
    if (dismissTimer) clearTimeout(dismissTimer);
    set({ message: null });
  },
}));

export const toast = {
  show: (message: string, tone: 'neutral' | 'error' | 'success' = 'neutral') =>
    useToastStore.getState().show(message, tone),
  error: (message: string) => useToastStore.getState().show(message, 'error'),
  success: (message: string) => useToastStore.getState().show(message, 'success'),
};

export function ToastViewport() {
  const { message, tone } = useToastStore();

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'pointer-events-none fixed left-1/2 z-120 -translate-x-1/2',
        'bottom-[calc(26px+env(safe-area-inset-bottom))]',
        'transition-all duration-200 ease-[var(--ease-apple)]',
        message ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
      ].join(' ')}
    >
      {message && (
        <div
          className={[
            'flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium',
            'backdrop-blur-[18px] shadow-[0_10px_28px_rgba(0,0,0,0.26)] border',
            tone === 'error'
              ? 'border-[var(--danger)]/35 bg-[#2a1414]/92 text-[#ffd6d4]'
              : tone === 'success'
                ? 'border-[var(--success)]/30 bg-[#14261a]/92 text-[#d4f7dc]'
                : 'border-white/12 bg-[#1d1d1f]/90 text-[#f5f5f7]',
          ].join(' ')}
        >
          {message}
        </div>
      )}
    </div>
  );
}
