import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/endpoints';
import { tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (tokenStore.access ? tokenStore.user : null));

  // Refresh thất bại ở tầng API → đăng xuất.
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const finish = useCallback((auth) => {
    tokenStore.save(auth);
    setUser(auth.user);
    return auth.user;
  }, []);

  const login = useCallback(async (email, password) => finish(await authApi.login({ email, password })), [finish]);

  const register = useCallback(
    async (email, password, displayName) => finish(await authApi.register({ email, password, displayName })),
    [finish]
  );

  const logout = useCallback(async () => {
    const refresh = tokenStore.refresh;
    tokenStore.clear();
    setUser(null);
    if (refresh) authApi.logout(refresh).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, login, register, logout }),
    [user, login, register, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
