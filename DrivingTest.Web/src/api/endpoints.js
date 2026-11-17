import { api } from './client';

export const authApi = {
  register: (body) => api('/api/auth/register', { method: 'POST', body }),
  login: (body) => api('/api/auth/login', { method: 'POST', body }),
  logout: (refreshToken) => api('/api/auth/logout', { method: 'POST', body: { refreshToken } })
};

export const catalogApi = {
  topics: () => api('/api/topics'),
  examInfo: () => api('/api/exam-info'),
  homeStats: () => api('/api/stats/home')
};

export const questionsApi = {
  list: (query) => api('/api/questions', { query }),
  check: (id, answerId) => api(`/api/questions/${id}/check`, { method: 'POST', body: { answerId } }),
  review: (query) => api('/api/questions/review', { query }),
  bookmarks: (query) => api('/api/bookmarks', { query }),
  addBookmark: (id) => api(`/api/bookmarks/${id}`, { method: 'PUT' }),
  removeBookmark: (id) => api(`/api/bookmarks/${id}`, { method: 'DELETE' })
};

export const examApi = {
  start: () => api('/api/exams', { method: 'POST' }),
  active: () => api('/api/exams/active'), // null nếu không có bài đang làm
  saveAnswer: (id, body) => api(`/api/exams/${id}/answers`, { method: 'PUT', body }),
  submit: (id) => api(`/api/exams/${id}/submit`, { method: 'POST' }),
  result: (id) => api(`/api/exams/${id}/result`),
  history: (query) => api('/api/exams/history', { query })
};

export const profileApi = {
  get: () => api('/api/profile'),
  update: (displayName) => api('/api/profile', { method: 'PUT', body: { displayName } }),
  // Trả về cặp token mới (các thiết bị khác bị đăng xuất)
  changePassword: (currentPassword, newPassword) =>
    api('/api/profile/change-password', { method: 'POST', body: { currentPassword, newPassword } })
};

export const adminApi = {
  list: (query) => api('/api/admin/questions', { query }),
  get: (id) => api(`/api/admin/questions/${id}`),
  create: (body) => api('/api/admin/questions', { method: 'POST', body }),
  update: (id, body) => api(`/api/admin/questions/${id}`, { method: 'PUT', body }),
  remove: (id) => api(`/api/admin/questions/${id}`, { method: 'DELETE' })
};

export const statsApi = {
  me: () => api('/api/stats/me')
};
