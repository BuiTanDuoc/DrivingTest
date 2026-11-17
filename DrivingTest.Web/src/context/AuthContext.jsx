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

  /** Áp dụng cặp token mới (ví dụ sau khi đổi mật khẩu). */
  const applyAuth = useCallback((auth) => finish(auth), [finish]);

  /** Cập nhật thông tin hiển thị của user hiện tại (ví dụ sau khi đổi tên). */
  const updateUser = useCallback((patch) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      tokenStore.setUser(next);
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokenStore.refresh;
    tokenStore.clear();
    setUser(null);
    if (refresh) authApi.logout(refresh).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isAdmin: user?.role === 'Admin', login, register, logout, applyAuth, updateUser }),
    [user, login, register, logout, applyAuth, updateUser]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
