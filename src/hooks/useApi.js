import { useCallback, useEffect, useRef, useState } from 'react';

// Runs `loader` whenever `deps` change; stale responses from earlier runs are ignored.
export function useApi(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const runIdRef = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const load = useCallback(async ({ silent = false } = {}) => {
    runIdRef.current += 1;
    const runId = runIdRef.current;

    if (!silent) {
      setState((current) => ({ ...current, loading: true, error: null }));
    }

    try {
      const data = await loaderRef.current();

      if (runId === runIdRef.current) {
        setState({ data, error: null, loading: false });
      }
    } catch (error) {
      if (runId === runIdRef.current) {
        setState((current) => ({ ...current, error, loading: false }));
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, deps);

  return {
    ...state,
    reload: load,
    refresh: () => load({ silent: true }),
  };
}

// Guards a mutation: one submission at a time, with its own error state.
export function useAction() {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const pendingRef = useRef(null);

  const run = useCallback(async (key, action) => {
    if (pendingRef.current) {
      return false;
    }

    pendingRef.current = key;
    setPending(key);
    setError('');

    try {
      await action();
      return true;
    } catch (actionError) {
      setError(actionError.message);
      return false;
    } finally {
      pendingRef.current = null;
      setPending(null);
    }
  }, []);

  return { pending, error, setError, run };
}
