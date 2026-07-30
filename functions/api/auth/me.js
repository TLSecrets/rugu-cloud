/**
 * GET /api/auth/me —— 校验当前登录状态
 */
import { readSession } from '../../lib/auth.js'
import { json, error } from '../../lib/respond.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const session = await readSession(env, request)
  if (!session) return error('未登录', 401)
  return json({
    ok: true,
    user: {
      id: session.userId,
      username: session.username,
      isAdmin: session.isAdmin,
    },
  })
}
