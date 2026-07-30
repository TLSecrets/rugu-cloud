/**
 * POST /api/auth/login
 * body: { username, password }
 */
import { verifyPassword } from '../../lib/password.js'
import { one } from '../../lib/db.js'
import { createSession, buildSessionCookie, sessionTtlSeconds } from '../../lib/auth.js'
import { json, error, readJson } from '../../lib/respond.js'

export async function onRequestPost(context) {
  const { request, env } = context
  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  const username = String(body.username || '').trim()
  const password = String(body.password || '')
  if (!username || !password) return error('请填写用户名和密码')

  const user = await one(env.DB, 'SELECT * FROM users WHERE username = ?', [username])
  if (!user) return error('用户名或密码错误', 401)

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return error('用户名或密码错误', 401)

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
