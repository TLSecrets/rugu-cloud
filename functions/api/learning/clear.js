/**
 * POST /api/learning/clear
 * 清空 favorites / notes / wrong_records；body.clearBanks 为 true 时另删用户题库及题目
 */
import { requireUser } from '../../lib/auth.js'
import { all, run } from '../../lib/db.js'
import { json, error, readJson } from '../../lib/respond.js'

export async function onRequestPost(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const body = (await readJson(request)) || {}

  await run(env.DB, 'DELETE FROM favorites WHERE owner_user_id = ?', [session.userId])
  await run(env.DB, 'DELETE FROM notes WHERE owner_user_id = ?', [session.userId])
  await run(env.DB, 'DELETE FROM wrong_records WHERE owner_user_id = ?', [session.userId])

  let banksCleared = 0
  if (body.clearBanks) {
    const owned = await all(
      env.DB,
      'SELECT id FROM banks WHERE owner_user_id = ?',
      [session.userId],
    )
    for (const bank of owned) {
      await run(env.DB, 'DELETE FROM questions WHERE bank_id = ?', [bank.id])
      await run(env.DB, 'DELETE FROM banks WHERE id = ?', [bank.id])
      banksCleared++
    }
  }

  return json({ ok: true, banksCleared })
}
