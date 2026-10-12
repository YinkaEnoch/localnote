import { useEffect } from 'react';

/**
 * Tracks the on-screen keyboard height and exposes it as
 * `--keyboard-height` on <html> so fixed toolbars / scroll containers
 * can lift above the keyboard on Android WebView + iOS Safari.
 */
export function useKeyboardInset() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;

    if (!root.style.getPropertyValue('--keyboard-height')) {
      root.style.setProperty('--keyboard-height', '0px');
    }

    const update = () => {
      try {
        const viewportHeight = vv ? vv.height : window.innerHeight;
        const offsetTop = vv ? vv.offsetTop : 0;
        const raw = window.innerHeight - viewportHeight - offsetTop;
        const keyboard = raw > 40 ? Math.round(raw) : 0;
        root.style.setProperty('--keyboard-height', `${keyboard}px`);
        root.classList.toggle('keyboard-open', keyboard > 0);
      } catch {
        /* never break typing because of inset tracking */
      }
    };

    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    let cleanupPlugin: (() => void) | undefined;
    (async () => {
      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        const show = await Keyboard.addListener('keyboardWillShow', (info) => {
          root.style.setProperty('--keyboard-height', `${Math.round(info.keyboardHeight)}px`);
          root.classList.add('keyboard-open');
        });
        const hide = await Keyboard.addListener('keyboardWillHide', () => {
          root.style.setProperty('--keyboard-height', '0px');
          root.classList.remove('keyboard-open');
        });
        cleanupPlugin = () => {
          void show.remove();
          void hide.remove();
        };
      } catch {
        /* web fallback (visualViewport) is enough */
      }
    })();

    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      cleanupPlugin?.();
      root.style.setProperty('--keyboard-height', '0px');
      root.classList.remove('keyboard-open');
    };
  }, []);
}
