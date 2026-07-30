/**
 * 前端 API 封装：同源请求，自动携带 Cookie（凭证）
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
}

/** 未登录则跳到登录页 */
export async function requireLogin() {
  try {
    const data = await api.me()
    return data.user
  } catch {
    const next = encodeURIComponent(location.pathname + location.search)
    location.href = `/login.html?next=${next}`
    return null
  }
}
