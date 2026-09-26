const AUTH_STORAGE_KEY = '4fix.auth';

// Only providers and admins have sessions in V1. A customer session saved by an older
// version of the app is discarded (the backend refuses those tokens anyway).
export function readStoredAuth() {
  try {
    const storedAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const parsed = storedAuth ? JSON.parse(storedAuth) : null;

    if (parsed?.user?.role === 'CUSTOMER') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function persistAuth(authState) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
}

export function clearStoredAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
