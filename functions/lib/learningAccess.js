import { one } from './db.js'
import { getBank, canAccessBank } from './banks.js'
import { error } from './respond.js'

/**
 * 校验题目存在且当前用户可读其题库
 * @returns {Promise<{ ok: true, question: any, bank: any } | { ok: false, response: Response }>}
 */
export async function assertReadableQuestion(db, session, questionId, bankIdHint) {
  const question = await one(db, 'SELECT * FROM questions WHERE id = ?', [questionId])
  if (!question) {
    return { ok: false, response: error('题目不存在', 404) }
  }
  const bankId = String(bankIdHint || question.bank_id || '').trim()
  if (bankId && bankId !== question.bank_id) {
    return { ok: false, response: error('题目与题库不匹配', 400) }
  }
  const bank = await getBank(db, question.bank_id)
  if (!bank) {
    return { ok: false, response: error('题库不存在', 404) }
  }
  if (!canAccessBank(bank, session, 'read')) {
    return { ok: false, response: error('无权访问该题目', 403) }
  }
  return { ok: true, question, bank }
}
