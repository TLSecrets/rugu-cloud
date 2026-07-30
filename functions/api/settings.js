/**
 * GET   /api/settings —— 读取用户设置（无则返回默认）
 * PATCH /api/settings —— 合并更新并 upsert
 */
import { requireUser } from '../lib/auth.js'
import { one, run } from '../lib/db.js'
import { mergeSettings } from '../lib/settings.js'
import { json, error, readJson } from '../lib/respond.js'

async function loadSettings(db, userId) {
  try {
    const row = await one(db, 'SELECT * FROM settings WHERE owner_user_id = ?', [userId])
    if (!row?.data_json) return mergeSettings(null)
    try {
      return mergeSettings(JSON.parse(row.data_json))
    } catch {
      return mergeSettings(null)
    }
  } catch {
    return mergeSettings(null)
  }
}

export async function onRequestGet(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const settings = await loadSettings(env.DB, session.userId)
  return json({ ok: true, settings })
}

export async function onRequestPatch(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  const current = await loadSettings(env.DB, session.userId)
  const merged = mergeSettings({ ...current, ...body })
  const now = Date.now()

  try {
    await run(
      env.DB,
      `INSERT INTO settings (owner_user_id, data_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(owner_user_id) DO UPDATE SET
         data_json = excluded.data_json,
         updated_at = excluded.updated_at`,
      [session.userId, JSON.stringify(merged), now],
    )
  } catch {
    return error('设置表尚未建好，请先执行 schema-extend.sql', 503)
  }

  return json({ ok: true, settings: merged })
}
