import { createContext, useContext, useMemo, useState } from 'react';
import {
  loginRequest,
  signupCustomerRequest,
  signupProviderRequest,
} from '../services/authApi.js';

const AUTH_STORAGE_KEY = '4fix.auth';

const AuthContext = createContext(null);

function readStoredAuth() {
  try {
    const storedAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return storedAuth ? JSON.parse(storedAuth) : null;
  } catch (_error) {
    return null;
  }
}

function persistAuth(authState) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => readStoredAuth());

  function completeAuth(result) {
    const nextAuthState = {
      accessToken: result.accessToken,
      user: result.user,
    };

    persistAuth(nextAuthState);
    setAuthState(nextAuthState);
    return nextAuthState;
  }

  async function login(credentials) {
    return completeAuth(await loginRequest(credentials));
  }

  async function signupCustomer(payload) {
    return completeAuth(await signupCustomerRequest(payload));
  }

  async function signupProvider(payload) {
    return completeAuth(await signupProviderRequest(payload));
  }

  function logout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthState(null);
  }

  const value = useMemo(
    () => ({
      accessToken: authState?.accessToken || null,
      user: authState?.user || null,
      isAuthenticated: Boolean(authState?.accessToken && authState?.user),
      login,
      logout,
      signupCustomer,
      signupProvider,
    }),
    [authState],
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
