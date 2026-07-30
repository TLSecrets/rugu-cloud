/**
 * PATCH  /api/questions/:id
 * DELETE /api/questions/:id
 */
import { requireUser } from '../../lib/auth.js'
import { one, run } from '../../lib/db.js'
import {
  getBank,
  canAccessBank,
  mapQuestion,
  normalizeQuestionInput,
} from '../../lib/banks.js'
import { json, error, readJson } from '../../lib/respond.js'

async function loadQuestion(db, id) {
  return one(db, 'SELECT * FROM questions WHERE id = ?', [id])
}

export async function onRequestPatch(context) {
  const { request, env, params } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const q = await loadQuestion(env.DB, params.id)
  if (!q) return error('题目不存在', 404)

  const bank = await getBank(env.DB, q.bank_id)
  if (!canAccessBank(bank, session, 'write')) return error('无权修改此题', 403)

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  // 允许只改部分字段：用旧值补齐
  const merged = {
    type: body.type ?? q.type,
    stem: body.stem ?? q.stem,
    options: body.options ?? JSON.parse(q.options_json || '[]'),
    answer: body.answer ?? JSON.parse(q.answer_json || '{}'),
    explanation: body.explanation ?? q.explanation,
    tags: body.tags ?? JSON.parse(q.tags_json || '[]'),
    domain: body.domain ?? q.domain,
    sortOrder: body.sortOrder ?? q.sort_order,
  }
  const norm = normalizeQuestionInput(merged)
  if (norm.error) return error(norm.error)

  const now = Date.now()
  await run(
    env.DB,
    `UPDATE questions SET
      type = ?, stem = ?, options_json = ?, answer_json = ?, explanation = ?,
      tags_json = ?, domain = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`,
    [
      norm.type,
      norm.stem,
      JSON.stringify(norm.options),
      JSON.stringify(norm.answer),
      norm.explanation,
      JSON.stringify(norm.tags),
      norm.domain,
      norm.sortOrder,
      now,
      params.id,
    ],
  )
  await run(env.DB, 'UPDATE banks SET updated_at = ? WHERE id = ?', [now, q.bank_id])

  const updated = await loadQuestion(env.DB, params.id)
  return json({ ok: true, question: mapQuestion(updated) })
}

export async function onRequestDelete(context) {
  const { request, env, params } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const q = await loadQuestion(env.DB, params.id)
  if (!q) return error('题目不存在', 404)

  const bank = await getBank(env.DB, q.bank_id)
  if (!canAccessBank(bank, session, 'write')) return error('无权删除此题', 403)

  await run(env.DB, 'DELETE FROM questions WHERE id = ?', [params.id])
  await run(env.DB, 'UPDATE banks SET updated_at = ? WHERE id = ?', [Date.now(), q.bank_id])
  return json({ ok: true })
}
