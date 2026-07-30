/**
 * POST /api/questions/clear
 * body: { bankId }
 * 清空某题库下全部题目（不删题库本身）
 */
import { requireUser } from '../../lib/auth.js'
import { run } from '../../lib/db.js'
import { getBank, canAccessBank } from '../../lib/banks.js'
import { json, error, readJson } from '../../lib/respond.js'

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
  if (!canAccessBank(bank, session, 'write')) return error('无权清空此题库', 403)

  await run(env.DB, 'DELETE FROM questions WHERE bank_id = ?', [bankId])
  await run(env.DB, 'UPDATE banks SET updated_at = ? WHERE id = ?', [Date.now(), bankId])
  return json({ ok: true })
}
