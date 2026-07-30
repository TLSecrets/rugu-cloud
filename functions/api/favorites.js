/**
 * GET    /api/favorites —— 收藏列表（含题目 stem/type）
 * POST   /api/favorites —— body: { questionId, bankId }
 * DELETE /api/favorites —— ?questionId= 或 body: { questionId }
 */
import { requireUser } from '../lib/auth.js'
import { all, one, run } from '../lib/db.js'
import { makeId } from '../lib/ids.js'
import { json, error, readJson } from '../lib/respond.js'
import { assertReadableQuestion } from '../lib/learningAccess.js'

function mapFavorite(row) {
  return {
    id: row.id,
    questionId: row.question_id,
    bankId: row.bank_id,
    createdAt: row.created_at,
    stem: row.stem ?? undefined,
    type: row.type ?? undefined,
  }
}

async function resolveQuestionId(request) {
  const url = new URL(request.url)
  const fromQuery = url.searchParams.get('questionId')
  if (fromQuery) return String(fromQuery).trim()
  const body = await readJson(request)
  if (body?.questionId) return String(body.questionId).trim()
  return ''
}

export async function onRequestGet(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const rows = await all(
    env.DB,
    `SELECT f.*, q.stem, q.type
     FROM favorites f
     LEFT JOIN questions q ON q.id = f.question_id
     WHERE f.owner_user_id = ?
     ORDER BY f.created_at DESC`,
    [session.userId],
  )
  return json({ ok: true, favorites: rows.map(mapFavorite) })
}

export async function onRequestPost(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  const questionId = String(body.questionId || '').trim()
  const bankId = String(body.bankId || '').trim()
  if (!questionId) return error('缺少 questionId')
  if (!bankId) return error('缺少 bankId')

  const access = await assertReadableQuestion(env.DB, session, questionId, bankId)
  if (!access.ok) return access.response
  const resolvedBankId = access.question.bank_id

  const now = Date.now()
  const existing = await one(
    env.DB,
    'SELECT id FROM favorites WHERE owner_user_id = ? AND question_id = ?',
    [session.userId, questionId],
  )

  if (existing) {
    await run(
      env.DB,
      'UPDATE favorites SET bank_id = ? WHERE id = ?',
      [resolvedBankId, existing.id],
    )
    return json({
      ok: true,
      favorite: mapFavorite({
        id: existing.id,
        question_id: questionId,
        bank_id: resolvedBankId,
        created_at: now,
      }),
    })
  }

  const id = makeId('fav')
  await run(
    env.DB,
    `INSERT INTO favorites (id, owner_user_id, question_id, bank_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, session.userId, questionId, resolvedBankId, now],
  )
  return json(
    {
      ok: true,
      favorite: mapFavorite({
        id,
        question_id: questionId,
        bank_id: resolvedBankId,
        created_at: now,
      }),
    },
    201,
  )
}

export async function onRequestDelete(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const questionId = await resolveQuestionId(request)
  if (!questionId) return error('缺少 questionId')

  await run(
    env.DB,
    'DELETE FROM favorites WHERE owner_user_id = ? AND question_id = ?',
    [session.userId, questionId],
  )
  return json({ ok: true })
}
