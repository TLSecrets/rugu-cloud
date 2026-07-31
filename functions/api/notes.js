/**
 * GET    /api/notes —— 笔记列表
 * POST   /api/notes —— body: { questionId, bankId, content } upsert
 * DELETE /api/notes —— ?questionId=
 */
import { requireUser } from '../lib/auth.js'
import { all, one, run } from '../lib/db.js'
import { makeId } from '../lib/ids.js'
import { json, error, readJson } from '../lib/respond.js'
import { assertReadableQuestion } from '../lib/learningAccess.js'

function mapNote(row) {
  return {
    id: row.id,
    questionId: row.question_id,
    bankId: row.bank_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stem: row.stem ?? undefined,
    type: row.type ?? undefined,
  }
}

export async function onRequestGet(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const rows = await all(
    env.DB,
    `SELECT n.*, q.stem, q.type
     FROM notes n
     LEFT JOIN questions q ON q.id = n.question_id
     WHERE n.owner_user_id = ?
     ORDER BY n.updated_at DESC`,
    [session.userId],
  )
  return json({ ok: true, notes: rows.map(mapNote) })
}

export async function onRequestPost(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  const questionId = String(body.questionId || '').trim()
  const bankId = String(body.bankId || '').trim()
  const content = String(body.content ?? '')
  if (!questionId) return error('缺少 questionId')
  if (!bankId) return error('缺少 bankId')

  const access = await assertReadableQuestion(env.DB, session, questionId, bankId)
  if (!access.ok) return access.response
  const resolvedBankId = access.question.bank_id

  const now = Date.now()
  const existing = await one(
    env.DB,
    'SELECT id, created_at FROM notes WHERE owner_user_id = ? AND question_id = ?',
    [session.userId, questionId],
  )

  if (existing) {
    await run(
      env.DB,
      'UPDATE notes SET bank_id = ?, content = ?, updated_at = ? WHERE id = ?',
      [resolvedBankId, content, now, existing.id],
    )
    return json({
      ok: true,
      note: mapNote({
        id: existing.id,
        question_id: questionId,
        bank_id: resolvedBankId,
        content,
        created_at: existing.created_at,
        updated_at: now,
      }),
    })
  }

  const id = makeId('note')
  await run(
    env.DB,
    `INSERT INTO notes (id, owner_user_id, question_id, bank_id, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, session.userId, questionId, resolvedBankId, content, now, now],
  )
  return json(
    {
      ok: true,
      note: mapNote({
        id,
        question_id: questionId,
        bank_id: resolvedBankId,
        content,
        created_at: now,
        updated_at: now,
      }),
    },
    201,
  )
}

export async function onRequestDelete(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const url = new URL(request.url)
  const questionId = String(url.searchParams.get('questionId') || '').trim()
  if (!questionId) return error('缺少 questionId')

  await run(
    env.DB,
    'DELETE FROM notes WHERE owner_user_id = ? AND question_id = ?',
    [session.userId, questionId],
  )
  return json({ ok: true })
}
