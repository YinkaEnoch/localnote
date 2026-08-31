import { useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { TouchEvent } from 'react';

/**
 * The ordered "page" tabs navigable by horizontal swiping. These mirror the
 * BottomNavBar entries — swipe left moves to the next tab, swipe right to the
 * previous one (wrapping around the ends). Deeper screens (search/folder/editor)
 * are intentionally not part of the cycle so imprecise swipes never dump the user
 * out of a focused workflow.
 */
export const SWIPE_TAB_ROUTES = ['/', '/calendar', '/search', '/settings'];

/** Horizontal distance (px) a swipe must travel before it counts as navigation. */
const SWIPE_THRESHOLD_PX = 64;

/** Swipes slower than this are treated as accidental taps/drags and ignored. */
const MAX_SWIPE_DURATION_MS = 600;

/**
 * The primary axis must dominate the other by this factor; otherwise the gesture
 * is treated as a vertical scroll (which pages use a lot) and not a page swipe.
 */
const AXIS_DOMINANCE = 1.2;

interface DragState {
  startX: number;
  startY: number;
  startTime: number;
}

/** Only touch-capable devices (phones/tablets) trigger page swiping. */
function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && 'ontouchstart' in window;
}

/** Never hijack swipes that begin inside text inputs / rich-text editors. */
function startedOnEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return Boolean(
    el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]'),
  );
}

/**
 * Let the browser handle horizontal scrolling natively instead of navigating
 * pages when the touch starts inside a horizontally-scrollable region (e.g. the
 * filter-chip rows and section tabs on the notes home page).
 */
function startedInsideHorizontalScroll(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  const scroller = el.closest<HTMLElement>('*');
  // Walk up the tree looking for an element that can scroll horizontally.
  for (let node = scroller; node; node = node.parentElement) {
    if (node.scrollWidth > node.clientWidth + 1) {
      const style = getComputedStyle(node);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Enables swipe-left/right navigation between the main tab pages of the app.
 * Returns touch-handler props to spread onto the scrollable page container.
 *
 * Only horizontal, fast-enough swipes on touch devices that do not start inside
 * an editable field or a horizontally-scrollable region will move between pages.
 */
export function useSwipeNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const drag = useRef<DragState | null>(null);

  const onTouchStart = useCallback((event: TouchEvent) => {
    if (!isTouchDevice()) return;
    if (startedOnEditable(event.target)) return;
    if (startedInsideHorizontalScroll(event.target)) {
      drag.current = null;
      return;
    }
    const touch = event.touches[0];
    if (!touch) return;
    drag.current = { startX: touch.clientX, startY: touch.clientY, startTime: Date.now() };
  }, []);

  const onTouchMove = useCallback((event: TouchEvent) => {
    if (!drag.current || event.touches.length > 1) return;
    const touch = event.touches[0];
    if (!touch) return;
    const dx = touch.clientX - drag.current.startX;
    const dy = touch.clientY - drag.current.startY;
    // The moment the gesture reads as vertical, stop tracking it as a page swipe.
    if (Math.abs(dy) > Math.abs(dx) * AXIS_DOMINANCE) {
      drag.current = null;
    }
  }, []);

  const onTouchEnd = useCallback(
    (event: TouchEvent) => {
      const state = drag.current;
      drag.current = null;
      if (!state) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;
      const elapsed = Date.now() - state.startTime;

      // Too short, too slow, or not dominantly horizontal => ignore.
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
      if (Math.abs(dy) > Math.abs(dx) / AXIS_DOMINANCE) return;
      if (elapsed > MAX_SWIPE_DURATION_MS) return;

      const currentIndex = SWIPE_TAB_ROUTES.indexOf(location.pathname);
      if (currentIndex === -1) return; // not on a swipe-navigation page

      const count = SWIPE_TAB_ROUTES.length;
      // Swipe left (dx < 0) => next tab; swipe right (dx > 0) => previous tab.
      const nextIndex = dx < 0 ? (currentIndex + 1) % count : (currentIndex - 1 + count) % count;
      navigate(SWIPE_TAB_ROUTES[nextIndex]);
    },
    [location.pathname, navigate],
  );

  return { onTouchStart, onTouchMove, onTouchEnd };
}