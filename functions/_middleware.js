/**
 * Pages Functions 中间件：
 * - OPTIONS 预检
 * - 未捕获异常统一返回 JSON 500（避免本地 Dev 因脏状态码崩溃）
 */
export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': context.request.headers.get('Origin') || '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  try {
    return await context.next()
  } catch (err) {
    console.error('[api]', err)
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : '服务器内部错误'
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }
}
