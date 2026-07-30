/**
 * GET    /api/tags —— 用户标签目录
 * POST   /api/tags —— body: { name }
 * DELETE /api/tags —— ?name=
 */
import { requireUser } from '../lib/auth.js'
import { all, run } from '../lib/db.js'
import { json, error, readJson } from '../lib/respond.js'

function mapTag(row) {
  return {
    name: row.name,
    createdAt: row.created_at,
  }
}

export async function onRequestGet(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const rows = await all(
    env.DB,
    'SELECT * FROM tag_catalog WHERE owner_user_id = ? ORDER BY name ASC',
    [session.userId],
  )
  return json({ ok: true, tags: rows.map(mapTag) })
}

export async function onRequestPost(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  const name = String(body.name || '').trim()
  if (!name) return error('标签名不能为空')

  const now = Date.now()
  await run(
    env.DB,
    `INSERT OR IGNORE INTO tag_catalog (owner_user_id, name, created_at)
     VALUES (?, ?, ?)`,
    [session.userId, name, now],
  )
  return json({ ok: true, tag: mapTag({ name, created_at: now }) }, 201)
}

export async function onRequestDelete(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const url = new URL(request.url)
  const name = String(url.searchParams.get('name') || '').trim()
  if (!name) return error('缺少 name')

  await run(
    env.DB,
    'DELETE FROM tag_catalog WHERE owner_user_id = ? AND name = ?',
    [session.userId, name],
  )
  return json({ ok: true })
}
