/**
 * POST /api/admin/users —— 管理员创建用户
 * body: { username, password, isAdmin? }
 */
import { requireAdmin } from '../../lib/auth.js'
import { hashPassword } from '../../lib/password.js'
import { validatePassword } from '../../lib/passwordPolicy.js'
import { makeId } from '../../lib/ids.js'
import { one, run } from '../../lib/db.js'
import { DEFAULT_SETTINGS } from '../../lib/settings.js'
import { json, error, readJson } from '../../lib/respond.js'
import { writeAudit } from '../../lib/audit.js'

export async function onRequestPost(context) {
  const { request, env } = context
  const { session, response } = await requireAdmin(env, request)
  if (response) return response

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  const username = String(body.username || '').trim()
  const password = String(body.password || '')
  const isAdmin = !!body.isAdmin

  if (username.length < 2 || username.length > 32) {
    return error('用户名长度需在 2～32 之间')
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(username)) {
    return error('用户名仅允许字母、数字、下划线、中文')
  }
  const pwdErr = validatePassword(username, password)
  if (pwdErr) return error(pwdErr)

  const exists = await one(env.DB, 'SELECT id FROM users WHERE username = ?', [username])
  if (exists) return error('用户名已被占用', 409)

  const id = makeId('usr')
  const now = Date.now()
  const password_hash = await hashPassword(password)

  await run(
    env.DB,
    'INSERT INTO users (id, username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, username, password_hash, isAdmin ? 1 : 0, now],
  )

  const bankId = makeId('bank')
  await run(
    env.DB,
    `INSERT INTO banks (id, owner_user_id, name, description, is_public, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
    [bankId, id, '我的题库', '管理员创建账号的默认私有题库', '[]', now, now],
  )

  try {
    await run(
      env.DB,
      'INSERT INTO settings (owner_user_id, data_json, updated_at) VALUES (?, ?, ?)',
      [id, JSON.stringify(DEFAULT_SETTINGS), now],
    )
  } catch {
    /* ignore */
  }

  await writeAudit(env.DB, request, {
    userId: session.userId,
    action: 'admin.create_user',
    target: id,
  })

  return json(
    {
      ok: true,
      user: { id, username, isAdmin },
      defaultBankId: bankId,
    },
    201,
  )
}
