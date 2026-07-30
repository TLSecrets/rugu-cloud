#!/usr/bin/env node
/**
 * 注册计划中的测试账号（幂等：已存在则尝试登录）
 * BASE_URL=https://rugu-cloud.pages.dev node scripts/seed-test-accounts.mjs
 */
const base = process.env.BASE_URL || 'http://127.0.0.1:8788'

const USERS = [
  { username: 'demo', password: 'demo1234' },
  { username: 'alice', password: 'alice1234' },
  { username: 'bob', password: 'bob1234' },
  { username: 'admin', password: 'admin1234' },
]

async function req(path, body, cookie = '') {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  })
  const set = res.headers.getSetCookie?.() || []
  let nextCookie = cookie
  for (const c of set) {
    nextCookie = c.split(';')[0]
  }
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data, cookie: nextCookie }
}

for (const u of USERS) {
  let r = await req('/api/auth/register', u)
  if (r.status === 409 || r.data?.error?.includes('占用')) {
    r = await req('/api/auth/login', u)
  }
  console.log(u.username, r.status, r.data.ok ? 'ok' : r.data.error)
}

console.log('\n将 admin 设为管理员（D1 Console）：')
console.log("UPDATE users SET is_admin = 1 WHERE username = 'admin';")
