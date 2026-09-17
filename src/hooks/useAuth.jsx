import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setUnauthorizedHandler } from '../services/api.js';
import {
  loginRequest,
  meRequest,
  signupCustomerRequest,
  signupProviderRequest,
} from '../services/authApi.js';
import { clearStoredAuth, persistAuth, readStoredAuth } from '../services/authStorage.js';
import { buildLoginPath } from '../utils/roles.js';
import { getCurrentLocation, navigate } from './useRoute.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => readStoredAuth());

  const completeAuth = useCallback((result) => {
    const nextAuthState = {
      accessToken: result.accessToken,
      user: result.user,
    };

    persistAuth(nextAuthState);
    setAuthState(nextAuthState);
    return nextAuthState;
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setAuthState(null);
  }, []);

  const updateUser = useCallback((user) => {
    setAuthState((current) => {
      if (!current) {
        return current;
      }

      const nextAuthState = { ...current, user };
      persistAuth(nextAuthState);
      return nextAuthState;
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Concurrent requests can all fail with 401; only the first should redirect.
      if (!readStoredAuth()) {
        return;
      }

      clearStoredAuth();
      setAuthState(null);
      navigate(buildLoginPath(getCurrentLocation()), { replace: true });
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const hasToken = Boolean(authState?.accessToken);

  // Revalidate a stored session once; an expired token is cleared by the 401 handler.
  useEffect(() => {
    if (!hasToken) {
      return;
    }

    meRequest()
      .then((result) => updateUser(result.user))
      .catch(() => {});
  }, [hasToken, updateUser]);

  const value = useMemo(
    () => ({
      accessToken: authState?.accessToken || null,
      user: authState?.user || null,
      isAuthenticated: Boolean(authState?.accessToken && authState?.user),
      login: async (credentials) => completeAuth(await loginRequest(credentials)),
      signupCustomer: async (payload) => completeAuth(await signupCustomerRequest(payload)),
      signupProvider: async (payload) => completeAuth(await signupProviderRequest(payload)),
      logout,
      updateUser,
    }),
    [authState, completeAuth, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
