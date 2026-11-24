import { useCallback, useEffect, useState, type RefObject } from 'react';

export interface UseFullscreenOptions {
  target: RefObject<HTMLElement | null>;
  onError?: (message: string) => void;
}

export interface UseFullscreenResult {
  supported: boolean;
  isFullscreen: boolean;
  toggle: () => void;
}

/**
 * Native Fullscreen API binding for a single element.
 * State always follows `document.fullscreenElement` so Esc / system exits stay in sync.
 */
export function useFullscreen({
  target,
  onError,
}: UseFullscreenOptions): UseFullscreenResult {
  const [supported, setSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setSupported(Boolean(document.fullscreenEnabled));
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === target.current);
    };
    onChange();
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [target]);

  const toggle = useCallback(() => {
    const fail = () => onError?.('无法进入全屏');
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(fail);
      return;
    }
    const el = target.current;
    if (!el) return;
    void el.requestFullscreen().catch(fail);
  }, [onError, target]);

  return { supported, isFullscreen, toggle };
}
