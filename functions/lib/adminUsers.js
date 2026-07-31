/**
 * 管理员用户维护：校验与级联删除
 */
import { one, run, all } from './db.js'
import { validatePassword } from './passwordPolicy.js'

export function validateUsername(username) {
  const u = String(username || '').trim()
  if (u.length < 2 || u.length > 32) return '用户名长度需在 2～32 之间'
  if (!/^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(u)) {
    return '用户名仅允许字母、数字、下划线、中文'
  }
  return null
}

/** @param {string} username @param {string} password */
export function validateNewPassword(username, password) {
  return validatePassword(username, password)
}

/**
 * 删除用户及其私有数据（公共库若归其所有也会删）
 * @param {D1Database} db
 * @param {string} userId
 */
export async function deleteUserCascade(db, userId) {
  await run(db, 'DELETE FROM favorites WHERE owner_user_id = ?', [userId])
  await run(db, 'DELETE FROM notes WHERE owner_user_id = ?', [userId])
  await run(db, 'DELETE FROM wrong_records WHERE owner_user_id = ?', [userId])
  await run(db, 'DELETE FROM tag_catalog WHERE owner_user_id = ?', [userId])
  await run(db, 'DELETE FROM settings WHERE owner_user_id = ?', [userId])
  // 先删题目再删库，避免孤儿；banks→questions 有 CASCADE，但 owner 侧题目也可能残留
  await run(db, 'DELETE FROM questions WHERE owner_user_id = ?', [userId])
  await run(db, 'DELETE FROM banks WHERE owner_user_id = ?', [userId])
  await run(db, 'DELETE FROM users WHERE id = ?', [userId])
}

/** @param {D1Database} db */
export async function countAdmins(db) {
  const row = await one(db, 'SELECT COUNT(*) AS c FROM users WHERE is_admin = 1')
  return Number(row?.c || 0)
}

/** @param {D1Database} db @param {string} id */
export async function getUserById(db, id) {
  return one(db, 'SELECT id, username, is_admin, created_at FROM users WHERE id = ?', [id])
}

/** @param {unknown} row */
export function mapUser(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    isAdmin: Number(row.is_admin) === 1,
    createdAt: row.created_at,
  }
}

/** @param {D1Database} db */
export async function listUsers(db, limit = 500) {
  const rows = await all(
    db,
    'SELECT id, username, is_admin, created_at FROM users ORDER BY created_at ASC LIMIT ?',
    [limit],
  )
  return (rows || []).map(mapUser)
}
