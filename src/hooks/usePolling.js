import { useEffect, useRef } from 'react';

// Calls `callback` every `intervalMs` while `enabled`, pausing when the tab is hidden.
// Plain polling: the backend has no push channel yet.
export function usePolling(callback, intervalMs, enabled = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        callbackRef.current();
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, enabled]);
}
