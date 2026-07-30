/**
 * 会话鉴权：登录态存在 Cloudflare KV（binding 名 SESSIONS）
 * Cookie 名：rugu_sess
 */

import { makeSessionToken } from './ids.js'
import { error } from './respond.js'

export const COOKIE_NAME = 'rugu_sess'

/** 默认 7 天（秒），可用环境变量 SESSION_TTL_SECONDS 覆盖 */
export function sessionTtlSeconds(env) {
  const n = Number(env.SESSION_TTL_SECONDS || 604800)
  return Number.isFinite(n) && n > 60 ? n : 604800
}

/** 从 Cookie 头解析指定名字 */
export function getCookie(request, name) {
  const raw = request.headers.get('Cookie') || ''
  const parts = raw.split(';')
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('=') || '')
  }
  return ''
}

/** @param {string} token @param {boolean} [secure] */
export function buildSessionCookie(token, maxAgeSec, secure = true) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearSessionCookie(secure = true) {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

/**
 * 创建会话并写入 KV
 * @returns {Promise<string>} token
 */
export async function createSession(env, user) {
  const token = makeSessionToken()
  const ttl = sessionTtlSeconds(env)
  const payload = {
    userId: user.id,
    username: user.username,
    isAdmin: !!user.is_admin,
    exp: Date.now() + ttl * 1000,
  }
  await env.SESSIONS.put(`sess:${token}`, JSON.stringify(payload), {
    expirationTtl: ttl,
  })
  return token
}

/** 删除会话 */
export async function destroySession(env, token) {
  if (!token) return
  await env.SESSIONS.delete(`sess:${token}`)
}

/**
 * 读取当前登录用户；无效则返回 null
 * @returns {Promise<null | { userId: string, username: string, isAdmin: boolean }>}
 */
export async function readSession(env, request) {
  const token = getCookie(request, COOKIE_NAME)
  if (!token) return null
  const raw = await env.SESSIONS.get(`sess:${token}`)
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    if (!data?.userId || (data.exp && data.exp < Date.now())) {
      await destroySession(env, token)
      return null
    }
    return {
      userId: data.userId,
      username: data.username,
      isAdmin: !!data.isAdmin,
      token,
    }
  } catch {
    return null
  }
}

/** 必须登录，否则返回 401 Response */
export async function requireUser(env, request) {
  const session = await readSession(env, request)
  if (!session) {
    return { session: null, response: error('未登录或会话已过期', 401) }
  }
  return { session, response: null }
}
