/**
 * 前端 API 封装：同源请求，自动携带 Cookie
 */
async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = { ok: false, error: '服务器返回非 JSON' }
  }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  me: () => request('/api/auth/me'),
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/api/auth/logout', { method: 'POST', body: '{}' }),

  listBanks: () => request('/api/banks'),
  createBank: (body) => request('/api/banks', { method: 'POST', body: JSON.stringify(body) }),
  updateBank: (id, body) =>
    request(`/api/banks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteBank: (id) => request(`/api/banks/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  listQuestions: (bankId) =>
    request(`/api/questions?bankId=${encodeURIComponent(bankId)}`),
  createQuestion: (body) =>
    request('/api/questions', { method: 'POST', body: JSON.stringify(body) }),
  updateQuestion: (id, body) =>
    request(`/api/questions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteQuestion: (id) =>
    request(`/api/questions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  clearQuestions: (bankId) =>
    request('/api/questions/clear', { method: 'POST', body: JSON.stringify({ bankId }) }),
  bulkQuestions: (body) =>
    request('/api/questions/bulk', { method: 'POST', body: JSON.stringify(body) }),

  getSettings: () => request('/api/settings'),
  patchSettings: (body) =>
    request('/api/settings', { method: 'PATCH', body: JSON.stringify(body) }),

  listFavorites: () => request('/api/favorites'),
  addFavorite: (body) =>
    request('/api/favorites', { method: 'POST', body: JSON.stringify(body) }),
  removeFavorite: (questionId) =>
    request(`/api/favorites?questionId=${encodeURIComponent(questionId)}`, { method: 'DELETE' }),

  listNotes: () => request('/api/notes'),
  upsertNote: (body) =>
    request('/api/notes', { method: 'POST', body: JSON.stringify(body) }),
  removeNote: (questionId) =>
    request(`/api/notes?questionId=${encodeURIComponent(questionId)}`, { method: 'DELETE' }),

  listWrongs: (includeRemoved = false) =>
    request(`/api/wrongs${includeRemoved ? '?includeRemoved=1' : ''}`),
  recordWrong: (body) =>
    request('/api/wrongs', { method: 'POST', body: JSON.stringify(body) }),
  patchWrong: (body) =>
    request('/api/wrongs', { method: 'PATCH', body: JSON.stringify(body) }),
  removeWrong: (questionId) =>
    request(`/api/wrongs?questionId=${encodeURIComponent(questionId)}`, { method: 'DELETE' }),

  listTags: () => request('/api/tags'),
  addTag: (name) =>
    request('/api/tags', { method: 'POST', body: JSON.stringify({ name }) }),
  removeTag: (name) =>
    request(`/api/tags?name=${encodeURIComponent(name)}`, { method: 'DELETE' }),

  search: (q, bankId) => {
    const params = new URLSearchParams({ q })
    if (bankId) params.set('bankId', bankId)
    return request(`/api/search?${params}`)
  },

  learningClear: (body) =>
    request('/api/learning/clear', { method: 'POST', body: JSON.stringify(body || {}) }),

  aiChat: (body) =>
    request('/api/ai/chat', { method: 'POST', body: JSON.stringify(body) }),

  adminListUsers: () => request('/api/admin/users'),
  adminGetUser: (id) => request(`/api/admin/users/${encodeURIComponent(id)}`),
  adminCreateUser: (body) =>
    request('/api/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateUser: (id, body) =>
    request(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  adminDeleteUser: (id) =>
    request(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
