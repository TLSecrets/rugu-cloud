/**
 * GET /api/search?q=关键词&bankId=可选
 * 在用户可读题库中搜索 stem/domain/explanation，最多 100 条
 */
import { requireUser } from '../lib/auth.js'
import { all } from '../lib/db.js'
import { mapQuestion } from '../lib/banks.js'
import { json, error } from '../lib/respond.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const url = new URL(request.url)
  const q = String(url.searchParams.get('q') || '').trim()
  if (!q) return error('缺少 q')

  const bankId = url.searchParams.get('bankId')
  const like = `%${q}%`

  const sql = `
    SELECT q.*
    FROM questions q
    INNER JOIN banks b ON b.id = q.bank_id
    WHERE (b.is_public = 1 OR b.owner_user_id = ? OR ? = 1)
      AND (q.stem LIKE ? OR q.domain LIKE ? OR q.explanation LIKE ?)`
  const params = [session.userId, session.isAdmin ? 1 : 0]

  params.push(like, like, like)

  let finalSql = sql
  if (bankId) {
    finalSql += ' AND q.bank_id = ?'
    params.push(bankId)
  }

  finalSql += ' ORDER BY q.updated_at DESC LIMIT 100'

  const rows = await all(env.DB, finalSql, params)
  return json({ ok: true, questions: rows.map(mapQuestion) })
}
