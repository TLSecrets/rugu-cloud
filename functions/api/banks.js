/**
 * GET  /api/banks —— 我的私有题库 + 全部公共题库
 * POST /api/banks —— 新建私有题库
 */
import { requireUser } from '../lib/auth.js'
import { all, run } from '../lib/db.js'
import { makeId } from '../lib/ids.js'
import { mapBank } from '../lib/banks.js'
import { json, error, readJson } from '../lib/respond.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const rows = await all(
    env.DB,
    `SELECT b.*,
       (SELECT COUNT(*) FROM questions q WHERE q.bank_id = b.id) AS question_count
     FROM banks b
     WHERE b.is_public = 1 OR b.owner_user_id = ?
     ORDER BY b.is_public ASC, b.updated_at DESC`,
    [session.userId],
  )
  return json({
    ok: true,
    banks: rows.map((row) => ({
      ...mapBank(row),
      questionCount: Number(row.question_count) || 0,
    })),
  })
}

export async function onRequestPost(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  const name = String(body.name || '').trim()
  if (!name) return error('题库名称不能为空')

  const isPublic = !!body.isPublic
  if (isPublic && !session.isAdmin) {
    return error('只有管理员可以创建公共题库', 403)
  }

  const id = makeId('bank')
  const now = Date.now()
  const tags = Array.isArray(body.tags) ? body.tags.map(String) : []
  const description = String(body.description || '')

  await run(
    env.DB,
    `INSERT INTO banks (id, owner_user_id, name, description, is_public, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      isPublic ? session.userId : session.userId,
      name,
      description,
      isPublic ? 1 : 0,
      JSON.stringify(tags),
      now,
      now,
    ],
  )

  const row = {
    id,
    owner_user_id: session.userId,
    name,
    description,
    is_public: isPublic ? 1 : 0,
    tags: JSON.stringify(tags),
    created_at: now,
    updated_at: now,
  }
  return json({ ok: true, bank: mapBank(row) }, 201)
}
