/**
 * POST /api/questions/bulk
 * body: { bankId, questions: [...] }
 */
import { requireUser } from '../../lib/auth.js'
import { run } from '../../lib/db.js'
import { makeId } from '../../lib/ids.js'
import {
  getBank,
  canAccessBank,
  normalizeQuestionInput,
} from '../../lib/banks.js'
import { json, error, readJson } from '../../lib/respond.js'

export async function onRequestPost(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  const bankId = String(body.bankId || '').trim()
  if (!bankId) return error('缺少 bankId')

  const questions = Array.isArray(body.questions) ? body.questions : []
  if (questions.length === 0) return error('questions 不能为空')

  const bank = await getBank(env.DB, bankId)
  if (!bank) return error('题库不存在', 404)
  if (!canAccessBank(bank, session, 'write')) return error('无权向此题库批量导入', 403)

  const now = Date.now()
  let count = 0

  for (let i = 0; i < questions.length; i++) {
    const norm = normalizeQuestionInput(questions[i])
    if (norm.error) return error(`第 ${i + 1} 题：${norm.error}`)

    const id = makeId('q')
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
    count++
  }

  await run(env.DB, 'UPDATE banks SET updated_at = ? WHERE id = ?', [now, bankId])
  return json({ ok: true, count }, 201)
}
