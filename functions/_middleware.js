/**
 * Pages Functions 中间件：
 * - OPTIONS CORS（仅白名单 Origin）
 * - 安全响应头
 * - 未捕获异常 → JSON 500
 */
import { applySecurityHeaders, isAllowedOrigin } from './lib/security.js'

function withSecurity(response, request) {
  const headers = new Headers(response.headers)
  applySecurityHeaders(headers, request)
  const origin = request.headers.get('Origin')
  if (origin && isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')
    headers.set('Vary', 'Origin')
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export async function onRequest(context) {
  const { request } = context

  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('Origin')
    const headers = {
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
    if (origin && isAllowedOrigin(origin)) {
      headers['Access-Control-Allow-Origin'] = origin
      headers['Access-Control-Allow-Credentials'] = 'true'
      headers.Vary = 'Origin'
    }
    const res = new Response(null, { status: 204, headers })
    return withSecurity(res, request)
  }

  try {
    const res = await context.next()
    return withSecurity(res, request)
  } catch (err) {
    console.error('[api]', err)
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : '服务器内部错误'
    const res = new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
    return withSecurity(res, request)
  }
}
