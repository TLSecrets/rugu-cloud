/**
 * D1 参数化查询助手 —— 禁止把用户输入拼进 SQL 字符串
 */

/** @param {D1Database} db @param {string} sql @param {unknown[]} [params] */
export async function one(db, sql, params = []) {
  const stmt = db.prepare(sql).bind(...params)
  return stmt.first()
}

/** @param {D1Database} db @param {string} sql @param {unknown[]} [params] */
export async function all(db, sql, params = []) {
  const stmt = db.prepare(sql).bind(...params)
  const res = await stmt.all()
  return res.results || []
}

/** @param {D1Database} db @param {string} sql @param {unknown[]} [params] */
export async function run(db, sql, params = []) {
  const stmt = db.prepare(sql).bind(...params)
  return stmt.run()
}
