import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';

/**
 * The brand property React Router stores inside every history entry's state
 * ({ usr, key, idx }). `idx` is the entry's 0-based position in the app's own
 * navigation stack. We use it as the source of truth for "is there a page to
 * go back to" — unlike the native WebView's `canGoBack()`, which does not
 * reliably track single-document `pushState` (SPA) history entries and reports
 * false even after in-app navigation.
 */
function getHistoryIndex(): number {
  const idx: unknown = window.history.state?.idx;
  return typeof idx === 'number' && Number.isFinite(idx) ? idx : 0;
}

/**
 * Wires up Android's hardware/gesture back button so it navigates within the
 * app instead of closing it.
 *
 * Android does not handle the system back button out of the box for a Capacitor
 * WebView unless the `@capacitor/app` plugin is used. Without a `backButton`
 * listener the activity's default back behavior runs and the whole app closes
 * on every back press. Registering a listener disables that default and gives
 * us control of each back press.
 *
 * Decision on each back press:
 *   - history index > 0  => go back one step inside the app (React Router pop).
 *   - otherwise          => already at the app root; exit the app.
 *
 * This must be rendered *inside* the Router so it can call `useNavigate`.
 */
export function AndroidBackHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Back-button behavior only differs on Android; nowhere to wire up on web.
    if (Capacitor.getPlatform() !== 'android') return;

    let disposed = false;
    let removeListener: (() => void) | null = null;

    App.addListener('backButton', () => {
      if (getHistoryIndex() > 0) {
        navigate(-1);
      } else {
        // Nowhere to go back to — this is the app's entry point.
        void App.exitApp();
      }
    }).then((handle) => {
      // Resolve the async race for StrictMode double-mount in dev: if the
      // effect was already cleaned up, drop this registration immediately.
      if (disposed) {
        handle.remove();
      } else {
        removeListener = handle.remove;
      }
    });

    return () => {
      disposed = true;
      removeListener?.();
    };
  }, [navigate]);

  return null;
}