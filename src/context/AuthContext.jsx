import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { authApi, tokenStore, userStore } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => userStore.get());
  const [token, setToken] = useState(() => tokenStore.get());

  const login = useCallback(async (credentials) => {
    const result = await authApi.login(credentials);

    tokenStore.set(result.token);

    const nextUser = {
      userId: result.userId,
      fullName: result.fullName,
      email: result.email,
      role: result.role ?? 'USER',
    };

    userStore.set(nextUser);
    setToken(result.token);
    setUser(nextUser);

    return result;
  }, []);

  const register = useCallback(
    async (payload) => {
      await authApi.register(payload);

      // Registration does not return a token, so sign the new user in
      // straight away with the credentials they just chose.
      return login({ email: payload.email, password: payload.password });
    },
    [login],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    userStore.clear();
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((previous) => {
      const next = { ...(previous ?? {}), ...patch };
      userStore.set(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('savesmart:unauthorized', handleUnauthorized);

    return () =>
      window.removeEventListener('savesmart:unauthorized', handleUnauthorized);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      updateUser,
    }),
    [user, token, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
}
