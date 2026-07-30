/**
 * 密码哈希：优先用 Web Crypto PBKDF2（适合 Cloudflare Workers CPU 限额）
 * 仍兼容旧版 bcryptjs 哈希（本地开发若已有用户）
 */
import bcrypt from 'bcryptjs'

const PBKDF2_ITERS = 100_000
const PREFIX = 'pbkdf2'

function b64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromB64(str) {
  const bin = atob(str)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** @param {string} plain */
export async function hashPassword(plain) {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(String(plain)),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return `${PREFIX}$${PBKDF2_ITERS}$${b64(salt)}$${b64(bits)}`
}

/** @param {string} plain @param {string} hash */
export async function verifyPassword(plain, hash) {
  const h = String(hash || '')
  if (h.startsWith(`${PREFIX}$`)) {
    const [, iterStr, saltB64, hashB64] = h.split('$')
    const iterations = Number(iterStr) || PBKDF2_ITERS
    const salt = fromB64(saltB64)
    const expected = fromB64(hashB64)
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(String(plain)),
      'PBKDF2',
      false,
      ['deriveBits'],
    )
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial,
      256,
    )
    const got = new Uint8Array(bits)
    if (got.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < got.length; i++) diff |= got[i] ^ expected[i]
    return diff === 0
  }
  // 兼容旧 bcrypt 哈希
  try {
    return bcrypt.compareSync(String(plain), h)
  } catch {
    return false
  }
}
