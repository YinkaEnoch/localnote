import { useEffect, type RefObject } from 'react';

/**
 * Closes popups/menus when the user presses outside the referenced element,
 * or presses Escape. Listens in the CAPTURE phase so handlers that call
 * stopPropagation() (e.g. the Tiptap editor surface) can't swallow the event
 * before it reaches us. Covers mouse, touch, and the Android WebView.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (el && !el.contains(event.target as Node)) {
        onOutside();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOutside();
      }
    };

    // Capture phase: fires before any stopPropagation() in the tree.
    document.addEventListener('mousedown', handlePointer, true);
    document.addEventListener('touchstart', handlePointer, { capture: true, passive: true });
    document.addEventListener('click', handlePointer, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointer, true);
      document.removeEventListener('touchstart', handlePointer, true);
      document.removeEventListener('click', handlePointer, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [ref, onOutside, enabled]);
}