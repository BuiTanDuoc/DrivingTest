import i18n from '../i18n';

const BASE = import.meta.env.VITE_API_URL ?? '';
const K = { access: 'dt_access', exp: 'dt_access_exp', refresh: 'dt_refresh', user: 'dt_user' };

export class ApiError extends Error {
  constructor(status, problem, fallback) {
    super(problem?.detail || problem?.title || fallback || `HTTP ${status}`);
    this.status = status;
    this.title = problem?.title;
    // Lỗi validation của backend: { "Email": ["..."], "Password": ["..."] }
    this.errors = problem?.errors ?? null;
  }
}

export const tokenStore = {
  get access() { return localStorage.getItem(K.access); },
  get refresh() { return localStorage.getItem(K.refresh); },
  get expiresAt() { return Date.parse(localStorage.getItem(K.exp) ?? '') || 0; },
  get user() {
    try { return JSON.parse(localStorage.getItem(K.user)); } catch { return null; }
  },
  save(auth) {
    localStorage.setItem(K.access, auth.accessToken);
    localStorage.setItem(K.exp, auth.accessTokenExpiresAt);
    localStorage.setItem(K.refresh, auth.refreshToken);
    localStorage.setItem(K.user, JSON.stringify(auth.user));
  },
  setUser(user) { localStorage.setItem(K.user, JSON.stringify(user)); },
  clear() { Object.values(K).forEach((k) => localStorage.removeItem(k)); }
};

let refreshing = null;

/** Làm mới token (single-flight: nhiều request song song chỉ gọi refresh một lần). */
function refreshTokens() {
  if (!tokenStore.refresh) return Promise.resolve(false);
  refreshing ??= fetch(`${BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokenStore.refresh })
  })
    .then(async (res) => {
      if (!res.ok) throw new Error('refresh failed');
      tokenStore.save(await res.json());
      return true;
    })
    .catch(() => {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:logout'));
      return false;
    })
    .finally(() => { refreshing = null; });
  return refreshing;
}

function buildUrl(path, query) {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) params.set(k, String(v));
  });
  const qs = params.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ''}`;
}

export async function api(path, { method = 'GET', body, query, signal } = {}) {
  // Access token sắp hết hạn → làm mới trước, để cả endpoint ẩn danh vẫn nhận diện được người dùng.
  if (tokenStore.refresh && tokenStore.expiresAt - Date.now() < 30_000 && !path.startsWith('/api/auth/')) {
    await refreshTokens();
  }

  const send = () =>
    fetch(buildUrl(path, query), {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        'Accept-Language': i18n.language || 'vi',
        ...(tokenStore.access ? { Authorization: `Bearer ${tokenStore.access}` } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

  let res;
  try {
    res = await send();
    if (res.status === 401 && tokenStore.refresh && !path.startsWith('/api/auth/') && (await refreshTokens())) {
      res = await send();
    }
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError(0, null, i18n.t('common.network'));
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* không phải JSON */ }

  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
