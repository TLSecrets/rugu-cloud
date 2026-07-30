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
import { json, error } from '../../lib/respond.js'
import { writeAudit } from '../../lib/audit.js'

const MAX_BULK = 500
const MAX_BODY_CHARS = 1_500_000

export async function onRequestPost(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const rawText = await request.text().catch(() => '')
  if (rawText.length > MAX_BODY_CHARS) {
    return error(`请求体过大（上限约 ${Math.floor(MAX_BODY_CHARS / 1000)}KB）`, 413)
  }
  let body
  try {
    body = rawText ? JSON.parse(rawText) : null
  } catch {
    body = null
  }
  if (!body || typeof body !== 'object') return error('请求体必须是 JSON')

  const bankId = String(body.bankId || '').trim()
  if (!bankId) return error('缺少 bankId')

  const questions = Array.isArray(body.questions) ? body.questions : []
  if (questions.length === 0) return error('questions 不能为空')
  if (questions.length > MAX_BULK) {
    return error(`单次最多导入 ${MAX_BULK} 题`, 400)
  }

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
  await writeAudit(env.DB, request, {
    userId: session.userId,
    action: 'questions.bulk',
    target: `${bankId}:${count}`,
  })
  return json({ ok: true, count }, 201)
}
