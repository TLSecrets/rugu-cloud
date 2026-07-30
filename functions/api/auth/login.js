/**
 * POST /api/auth/login
 * body: { username, password }
 */
import { verifyPassword } from '../../lib/password.js'
import { one } from '../../lib/db.js'
import {
  createSession,
  destroySession,
  getCookie,
  COOKIE_NAME,
  buildSessionCookie,
  sessionTtlSeconds,
} from '../../lib/auth.js'
import { json, error, readJson } from '../../lib/respond.js'
import { clientIp, rateLimit } from '../../lib/security.js'

export async function onRequestPost(context) {
  const { request, env } = context

  const rl = await rateLimit(env.SESSIONS, 'login', clientIp(request), {
    limit: 10,
    windowSec: 60,
  })
  if (!rl.ok) return error('请求过于频繁，请稍后再试', 429)

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  const username = String(body.username || '').trim()
  const password = String(body.password || '')
  if (!username || !password) return error('请填写用户名和密码')

  const user = await one(env.DB, 'SELECT * FROM users WHERE username = ?', [username])
  if (!user) return error('用户名或密码错误', 401)

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return error('用户名或密码错误', 401)

  // 轮换：销毁旧 Cookie 对应会话，再发新 token
  const old = getCookie(request, COOKIE_NAME)
  if (old) await destroySession(env, old)

  const token = await createSession(env, user)
  const secure = new URL(request.url).protocol === 'https:'
  const res = json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      isAdmin: Number(user.is_admin) === 1,
    },
  })
  res.headers.append(
    'Set-Cookie',
    buildSessionCookie(token, sessionTtlSeconds(env), secure),
  )
  return res
}
