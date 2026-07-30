/**
 * POST /api/auth/logout
 */
import {
  getCookie,
  COOKIE_NAME,
  destroySession,
  clearSessionCookie,
} from '../../lib/auth.js'
import { json } from '../../lib/respond.js'

export async function onRequestPost(context) {
  const { request, env } = context
  const token = getCookie(request, COOKIE_NAME)
  await destroySession(env, token)
  const secure = new URL(request.url).protocol === 'https:'
  const res = json({ ok: true })
  res.headers.append('Set-Cookie', clearSessionCookie(secure))
  return res
}
