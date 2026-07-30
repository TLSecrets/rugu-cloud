/**
 * POST /api/auth/register
 * body: { username, password }
 */
import { hashPassword } from '../../lib/password.js'
import { makeId } from '../../lib/ids.js'
import { one, run } from '../../lib/db.js'
import { createSession, buildSessionCookie, sessionTtlSeconds } from '../../lib/auth.js'
import { DEFAULT_SETTINGS } from '../../lib/settings.js'
import { json, error, readJson } from '../../lib/respond.js'

export async function onRequestPost(context) {
  const { request, env } = context
  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  const username = String(body.username || '').trim()
  const password = String(body.password || '')

  if (username.length < 2 || username.length > 32) {
    return error('用户名长度需在 2～32 之间')
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(username)) {
    return error('用户名仅允许字母、数字、下划线、中文')
  }
  if (password.length < 6) return error('密码至少 6 位')

  const exists = await one(env.DB, 'SELECT id FROM users WHERE username = ?', [username])
  if (exists) return error('用户名已被占用', 409)

  const id = makeId('usr')
  const now = Date.now()
  const password_hash = await hashPassword(password)

  await run(
    env.DB,
    'INSERT INTO users (id, username, password_hash, is_admin, created_at) VALUES (?, ?, ?, 0, ?)',
    [id, username, password_hash, now],
  )

  // 注册后自动建一个默认私有题库，方便立刻录入
  const bankId = makeId('bank')
  await run(
    env.DB,
    `INSERT INTO banks (id, owner_user_id, name, description, is_public, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
    [bankId, id, '我的题库', '注册后自动创建的私有题库', '[]', now, now],
  )

  try {
    await run(
      env.DB,
      'INSERT INTO settings (owner_user_id, data_json, updated_at) VALUES (?, ?, ?)',
      [id, JSON.stringify(DEFAULT_SETTINGS), now],
    )
  } catch {
    // settings 表尚未迁移时仍允许注册；登录后用默认设置
  }

  const token = await createSession(env, { id, username, is_admin: 0 })
  const secure = new URL(request.url).protocol === 'https:'
  const res = json({
    ok: true,
    user: { id, username, isAdmin: false },
    defaultBankId: bankId,
  })
  res.headers.append(
    'Set-Cookie',
    buildSessionCookie(token, sessionTtlSeconds(env), secure),
  )
  return res
}
