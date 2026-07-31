/**
 * GET    /api/admin/users/:id
 * PATCH  /api/admin/users/:id  body: { username?, password?, isAdmin? }
 * DELETE /api/admin/users/:id
 */
import { requireAdmin } from '../../../lib/auth.js'
import { hashPassword } from '../../../lib/password.js'
import { one, run } from '../../../lib/db.js'
import { json, error, readJson } from '../../../lib/respond.js'
import { writeAudit } from '../../../lib/audit.js'
import {
  validateUsername,
  validateNewPassword,
  deleteUserCascade,
  countAdmins,
  getUserById,
  mapUser,
} from '../../../lib/adminUsers.js'

export async function onRequestGet(context) {
  const { request, env, params } = context
  const { response } = await requireAdmin(env, request)
  if (response) return response

  const user = await getUserById(env.DB, params.id)
  if (!user) return error('用户不存在', 404)
  return json({ ok: true, user: mapUser(user) })
}

export async function onRequestPatch(context) {
  const { request, env, params } = context
  const { session, response } = await requireAdmin(env, request)
  if (response) return response

  const user = await getUserById(env.DB, params.id)
  if (!user) return error('用户不存在', 404)

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  let username = user.username
  if (body.username != null) {
    username = String(body.username).trim()
    const err = validateUsername(username)
    if (err) return error(err)
    if (username !== user.username) {
      const taken = await one(env.DB, 'SELECT id FROM users WHERE username = ?', [username])
      if (taken) return error('用户名已被占用', 409)
    }
  }

  let isAdmin = Number(user.is_admin) === 1
  if (body.isAdmin != null) {
    isAdmin = !!body.isAdmin
  }

  // 不能取消自己的管理员；不能取消最后一个管理员
  if (Number(user.is_admin) === 1 && !isAdmin) {
    if (user.id === session.userId) {
      return error('不能取消自己的管理员权限', 400)
    }
    const admins = await countAdmins(env.DB)
    if (admins <= 1) return error('至少保留一名管理员', 400)
  }

  const password = body.password != null ? String(body.password) : ''
  let password_hash = null
  if (password) {
    const pwdErr = validateNewPassword(username, password)
    if (pwdErr) return error(pwdErr)
    password_hash = await hashPassword(password)
  }

  if (password_hash) {
    await run(
      env.DB,
      'UPDATE users SET username = ?, is_admin = ?, password_hash = ? WHERE id = ?',
      [username, isAdmin ? 1 : 0, password_hash, user.id],
    )
  } else {
    await run(env.DB, 'UPDATE users SET username = ?, is_admin = ? WHERE id = ?', [
      username,
      isAdmin ? 1 : 0,
      user.id,
    ])
  }

  await writeAudit(env.DB, request, {
    userId: session.userId,
    action: 'admin.update_user',
    target: user.id,
  })

  const updated = await getUserById(env.DB, user.id)
  return json({ ok: true, user: mapUser(updated) })
}

export async function onRequestDelete(context) {
  const { request, env, params } = context
  const { session, response } = await requireAdmin(env, request)
  if (response) return response

  const user = await getUserById(env.DB, params.id)
  if (!user) return error('用户不存在', 404)

  if (user.id === session.userId) {
    return error('不能删除当前登录账号', 400)
  }
  if (Number(user.is_admin) === 1) {
    const admins = await countAdmins(env.DB)
    if (admins <= 1) return error('不能删除唯一的管理员', 400)
  }

  await deleteUserCascade(env.DB, user.id)

  await writeAudit(env.DB, request, {
    userId: session.userId,
    action: 'admin.delete_user',
    target: user.id,
  })

  return json({ ok: true, deleted: user.id })
}
