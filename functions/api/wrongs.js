/**
 * GET    /api/wrongs —— 错题列表（默认 removed=0；?includeRemoved=1 含已移除）
 * POST   /api/wrongs —— body: { questionId, bankId } 记录错题
 * PATCH  /api/wrongs —— body: { questionId, removed: true|false }
 * DELETE /api/wrongs —— ?questionId= 硬删除
 */
import { requireUser } from '../lib/auth.js'
import { all, one, run } from '../lib/db.js'
import { json, error, readJson } from '../lib/respond.js'

function mapWrong(row) {
  return {
    questionId: row.question_id,
    bankId: row.bank_id,
    wrongCount: Number(row.wrong_count) || 0,
    lastWrongAt: row.last_wrong_at,
    removed: Number(row.removed) === 1,
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

  const url = new URL(request.url)
  const includeRemoved = url.searchParams.get('includeRemoved') === '1'

  const rows = await all(
    env.DB,
    includeRemoved
      ? 'SELECT * FROM wrong_records WHERE owner_user_id = ? ORDER BY last_wrong_at DESC'
      : 'SELECT * FROM wrong_records WHERE owner_user_id = ? AND removed = 0 ORDER BY last_wrong_at DESC',
    [session.userId],
  )
  return json({ ok: true, wrongs: rows.map(mapWrong) })
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

  const now = Date.now()
  const existing = await one(
    env.DB,
    'SELECT * FROM wrong_records WHERE owner_user_id = ? AND question_id = ?',
    [session.userId, questionId],
  )

  if (existing) {
    const wrongCount = Number(existing.wrong_count) + 1
    await run(
      env.DB,
      `UPDATE wrong_records SET
         bank_id = ?, wrong_count = ?, last_wrong_at = ?, removed = 0
       WHERE owner_user_id = ? AND question_id = ?`,
      [bankId, wrongCount, now, session.userId, questionId],
    )
    return json({
      ok: true,
      wrong: mapWrong({
        question_id: questionId,
        bank_id: bankId,
        wrong_count: wrongCount,
        last_wrong_at: now,
        removed: 0,
      }),
    })
  }

  await run(
    env.DB,
    `INSERT INTO wrong_records (owner_user_id, question_id, bank_id, wrong_count, last_wrong_at, removed)
     VALUES (?, ?, ?, 1, ?, 0)`,
    [session.userId, questionId, bankId, now],
  )
  return json(
    {
      ok: true,
      wrong: mapWrong({
        question_id: questionId,
        bank_id: bankId,
        wrong_count: 1,
        last_wrong_at: now,
        removed: 0,
      }),
    },
    201,
  )
}

export async function onRequestPatch(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  const questionId = String(body.questionId || '').trim()
  if (!questionId) return error('缺少 questionId')
  if (body.removed == null) return error('缺少 removed')

  const removed = body.removed === true || body.removed === 1 ? 1 : 0
  const existing = await one(
    env.DB,
    'SELECT * FROM wrong_records WHERE owner_user_id = ? AND question_id = ?',
    [session.userId, questionId],
  )
  if (!existing) return error('错题记录不存在', 404)

  await run(
    env.DB,
    'UPDATE wrong_records SET removed = ? WHERE owner_user_id = ? AND question_id = ?',
    [removed, session.userId, questionId],
  )
  return json({
    ok: true,
    wrong: mapWrong({ ...existing, removed }),
  })
}

export async function onRequestDelete(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const questionId = await resolveQuestionId(request)
  if (!questionId) return error('缺少 questionId')

  await run(
    env.DB,
    'DELETE FROM wrong_records WHERE owner_user_id = ? AND question_id = ?',
    [session.userId, questionId],
  )
  return json({ ok: true })
}
