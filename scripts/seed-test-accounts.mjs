#!/usr/bin/env node
/**
 * 仅本地注册测试账号（默认拒绝非 localhost，除非 --force）
 * BASE_URL=http://127.0.0.1:8788 node scripts/seed-test-accounts.mjs
 */
const base = process.env.BASE_URL || 'http://127.0.0.1:8788'
const force = process.argv.includes('--force')

const USERS = [
  { username: 'demo', password: 'LocalDemo_pass1' },
  { username: 'alice', password: 'LocalAlice_pass1' },
  { username: 'bob', password: 'LocalBob_pass1' },
  { username: 'admin', password: 'LocalAdmin_pass1' },
]

function assertLocal() {
  let u
  try {
    u = new URL(base)
  } catch {
    throw new Error(`无效 BASE_URL: ${base}`)
  }
  const host = u.hostname
  const local = host === '127.0.0.1' || host === 'localhost'
  if (!local && !force) {
    console.error(`拒绝向非本地地址 seed：${base}`)
    console.error('如确需强制，请加 --force（不推荐用于生产）')
    process.exit(1)
  }
}

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

assertLocal()

for (const u of USERS) {
  let r = await req('/api/auth/register', u)
  if (r.status === 409 || r.data?.error?.includes('占用')) {
    r = await req('/api/auth/login', u)
  }
  console.log(u.username, r.status, r.data.ok ? 'ok' : r.data.error)
}

console.log('\n本地将 admin 设为管理员（D1）：')
console.log("npx wrangler d1 execute rugu-cloud-db --local --command=\"UPDATE users SET is_admin = 1 WHERE username = 'admin';\"")
