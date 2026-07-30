/** CORS 白名单、安全响应头、KV 限流 */

const DEV_ORIGINS = new Set([
  'http://127.0.0.1:8788',
  'http://localhost:8788',
  'http://127.0.0.1:8787',
  'http://localhost:8787',
])

/** @param {string | null} origin */
export function isAllowedOrigin(origin) {
  if (!origin) return false
  if (DEV_ORIGINS.has(origin)) return true
  try {
    const u = new URL(origin)
    if (u.protocol !== 'https:') return false
    if (u.hostname === 'rugu-cloud.pages.dev') return true
    if (u.hostname.endsWith('.rugu-cloud.pages.dev')) return true
    return false
  } catch {
    return false
  }
}

/** @param {Headers} headers @param {Request} request */
export function applySecurityHeaders(headers, request) {
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-Frame-Options', 'DENY')
  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  )
  if (new URL(request.url).protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
}

/**
 * 滑动窗口限流（KV）
 * @param {KVNamespace | undefined} kv
 * @param {string} bucket e.g. login / register
 * @param {string} ip
 * @param {{ limit?: number, windowSec?: number }} [opts]
 */
export async function rateLimit(kv, bucket, ip, opts = {}) {
  const limit = opts.limit ?? 10
  const windowSec = opts.windowSec ?? 60
  if (!kv) return { ok: true, remaining: limit }

  const key = `rl:${bucket}:${ip || 'unknown'}`
  const now = Date.now()
  let state = { n: 0, start: now }
  try {
    const raw = await kv.get(key)
    if (raw) state = JSON.parse(raw)
  } catch {
    state = { n: 0, start: now }
  }

  if (now - state.start > windowSec * 1000) {
    state = { n: 0, start: now }
  }
  state.n += 1
  await kv.put(key, JSON.stringify(state), { expirationTtl: windowSec * 2 })

  if (state.n > limit) {
    return { ok: false, remaining: 0 }
  }
  return { ok: true, remaining: Math.max(0, limit - state.n) }
}

/** @param {Request} request */
export function clientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  )
}
