import { useEffect, type RefObject } from 'react';

/**
 * Closes popups/menus when the user presses outside the referenced element.
 * Listens to both `mousedown` and `touchstart` so it works with mouse,
 * touch, and the Android WebView. Optionally disabled while a flag is false.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (el && !el.contains(event.target as Node)) {
        onOutside();
      }
    };

    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [ref, onOutside, enabled]);
}