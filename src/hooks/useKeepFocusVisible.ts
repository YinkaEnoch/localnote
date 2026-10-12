import { useEffect } from 'react';

/**
 * Keeps the focused field / caret visible above the keyboard + toolbar.
 * Attach to the scroll container; any focusin inside scrolls the target
 * into the visible area above the sticky toolbar.
 */
export function useKeepFocusVisible<T extends HTMLElement>(
  scrollRef: React.RefObject<T | null>,
  toolbarReservePx = 96,
) {
  useEffect(() => {
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scroller = () => scrollRef.current;

    const scrollTargetIntoView = (rect: { top: number; bottom: number }) => {
      const el = scroller();
      const vv = window.visualViewport;
      const viewportH = vv ? vv.height : window.innerHeight;
      const topInset = vv ? vv.offsetTop : 0;
      const visibleBottom = topInset + viewportH - toolbarReservePx;
      if (!el) return;
      if (rect.bottom > visibleBottom) {
        el.scrollBy({ top: rect.bottom - visibleBottom + 12, behavior: 'smooth' });
      } else if (rect.top < topInset + 76) {
        el.scrollBy({ top: rect.top - (topInset + 76) - 8, behavior: 'smooth' });
      }
    };

    const ensureVisible = (target: HTMLElement) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        timer = setTimeout(() => {
          try {
            const rect = target.getBoundingClientRect();
            scrollTargetIntoView(rect);
          } catch {
            /* no-op */
          }
        }, 60);
      });
    };

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      const el = scroller();
      if (!t || !el || !el.contains(t)) return;
      ensureVisible(t);
    };

    const onSelectionChange = () => {
      try {
        const sel = document.getSelection();
        if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
        const node = sel.anchorNode as Node | null;
        if (!node) return;
        const host: HTMLElement | null =
          node.nodeType === Node.ELEMENT_NODE
            ? (node as HTMLElement).closest('[contenteditable="true"], input, textarea')
            : node.parentElement?.closest('[contenteditable="true"], input, textarea') ?? null;
        const el = scroller();
        if (!host || !el || !el.contains(host)) return;
        const rects = sel.getRangeAt(0).getClientRects();
        const r = rects[0];
        if (!r) return;
        const vv = window.visualViewport;
        const viewportH = vv ? vv.height : window.innerHeight;
        const visibleBottom = (vv ? vv.offsetTop + viewportH : viewportH) - toolbarReservePx;
        if (r.bottom > visibleBottom) {
          el.scrollBy({ top: r.bottom - visibleBottom + 16, behavior: 'auto' });
        }
      } catch {
        /* no-op */
      }
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('selectionchange', onSelectionChange);
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, [scrollRef, toolbarReservePx]);
}
