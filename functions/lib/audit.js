import { makeId } from './ids.js'
import { run } from './db.js'
import { clientIp } from './security.js'

/**
 * 轻量审计日志（表不存在时静默失败）
 * @param {D1Database} db
 * @param {Request} request
 * @param {{ userId?: string, action: string, target?: string }} entry
 */
export async function writeAudit(db, request, entry) {
  try {
    await run(
      db,
      `INSERT INTO audit_logs (id, actor_user_id, action, target, ip, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        makeId('aud'),
        entry.userId || null,
        entry.action,
        entry.target || null,
        clientIp(request),
        Date.now(),
      ],
    )
  } catch {
    /* table may be missing before migrate */
  }
}
