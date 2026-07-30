/**
 * GET  /api/questions?bankId=xxx —— 列出某库全部题目
 * POST /api/questions —— 新增题目
 */
import { requireUser } from '../../lib/auth.js'
import { all, run } from '../../lib/db.js'
import { makeId } from '../../lib/ids.js'
import {
  getBank,
  canAccessBank,
  mapQuestion,
  normalizeQuestionInput,
} from '../../lib/banks.js'
import { json, error, readJson } from '../../lib/respond.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const url = new URL(request.url)
  const bankId = url.searchParams.get('bankId')
  if (!bankId) return error('缺少 bankId')

  const bank = await getBank(env.DB, bankId)
  if (!bank) return error('题库不存在', 404)
  if (!canAccessBank(bank, session, 'read')) return error('无权查看此题库', 403)

  const rows = await all(
    env.DB,
    'SELECT * FROM questions WHERE bank_id = ? ORDER BY sort_order ASC, created_at ASC',
    [bankId],
  )
  return json({ ok: true, questions: rows.map(mapQuestion) })
}

export async function onRequestPost(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  const bankId = String(body.bankId || '').trim()
  if (!bankId) return error('缺少 bankId')

  const bank = await getBank(env.DB, bankId)
  if (!bank) return error('题库不存在', 404)
  if (!canAccessBank(bank, session, 'write')) return error('无权向此题库添加题目', 403)

  const norm = normalizeQuestionInput(body)
  if (norm.error) return error(norm.error)

  const id = makeId('q')
  const now = Date.now()
  await run(
    env.DB,
    `INSERT INTO questions
      (id, bank_id, owner_user_id, type, stem, options_json, answer_json, explanation, tags_json, domain, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      bankId,
      session.userId,
      norm.type,
      norm.stem,
      JSON.stringify(norm.options),
      JSON.stringify(norm.answer),
      norm.explanation,
      JSON.stringify(norm.tags),
      norm.domain,
      norm.sortOrder,
      now,
      now,
    ],
  )
  await run(env.DB, 'UPDATE banks SET updated_at = ? WHERE id = ?', [now, bankId])

  return json(
    {
      ok: true,
      question: mapQuestion({
        id,
        bank_id: bankId,
        owner_user_id: session.userId,
        type: norm.type,
        stem: norm.stem,
        options_json: JSON.stringify(norm.options),
        answer_json: JSON.stringify(norm.answer),
        explanation: norm.explanation,
        tags_json: JSON.stringify(norm.tags),
        domain: norm.domain,
        sort_order: norm.sortOrder,
        created_at: now,
        updated_at: now,
      }),
    },
    201,
  )
}
