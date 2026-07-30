/**
 * 统一 JSON 响应工具（Pages Functions）
 */

/** @param {unknown} data @param {number} [status] */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // 同源 cookie；若以后跨域再收紧 CORS
      'Cache-Control': 'no-store',
    },
  })
}

/** @param {string} message @param {number} [status] */
export function error(message, status = 400) {
  return json({ ok: false, error: message }, status)
}

/** @param {Request} request */
export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}
