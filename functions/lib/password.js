/**
 * 密码哈希：使用 bcryptjs（纯 JS，可在 Cloudflare Workers/Pages Functions 运行）
 * 切勿在前端做哈希；只在服务端保存 password_hash
 */
import bcrypt from 'bcryptjs'

/** 成本因子：越大越安全也越慢；个人站 10 足够 */
const ROUNDS = 10

/** @param {string} plain */
export async function hashPassword(plain) {
  // bcryptjs 的 hash 是同步 API，包一层 Promise 方便 await
  return bcrypt.hashSync(String(plain), ROUNDS)
}

/** @param {string} plain @param {string} hash */
export async function verifyPassword(plain, hash) {
  return bcrypt.compareSync(String(plain), String(hash))
}
