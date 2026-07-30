/**
 * PATCH  /api/banks/:id —— 改名/简介/标签
 * DELETE /api/banks/:id —— 删除题库（级联删题，若 DB 开了 ON DELETE CASCADE）
 */
import { requireUser } from '../../lib/auth.js'
import { run } from '../../lib/db.js'
import { getBank, canAccessBank, mapBank } from '../../lib/banks.js'
import { json, error, readJson } from '../../lib/respond.js'

export async function onRequestPatch(context) {
  const { request, env, params } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const bankId = params.id
  const bank = await getBank(env.DB, bankId)
  if (!bank) return error('题库不存在', 404)
  if (!canAccessBank(bank, session, 'write')) return error('无权修改此题库', 403)

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')

  const name = body.name != null ? String(body.name).trim() : bank.name
  if (!name) return error('题库名称不能为空')
  const description =
    body.description != null ? String(body.description) : bank.description || ''
  const tags = Array.isArray(body.tags)
    ? body.tags.map(String)
    : (() => {
        try {
          return bank.tags ? JSON.parse(bank.tags) : []
        } catch {
          return []
        }
      })()

  const now = Date.now()
  await run(
    env.DB,
    'UPDATE banks SET name = ?, description = ?, tags = ?, updated_at = ? WHERE id = ?',
    [name, description, JSON.stringify(tags), now, bankId],
  )

  return json({
    ok: true,
    bank: mapBank({
      ...bank,
      name,
      description,
      tags: JSON.stringify(tags),
      updated_at: now,
    }),
  })
}

export async function onRequestDelete(context) {
  const { request, env, params } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const bankId = params.id
  const bank = await getBank(env.DB, bankId)
  if (!bank) return error('题库不存在', 404)
  if (!canAccessBank(bank, session, 'write')) return error('无权删除此题库', 403)

  // 先删题目再删库（兼容未启用外键的情况）
  await run(env.DB, 'DELETE FROM questions WHERE bank_id = ?', [bankId])
  await run(env.DB, 'DELETE FROM banks WHERE id = ?', [bankId])
  return json({ ok: true })
}
