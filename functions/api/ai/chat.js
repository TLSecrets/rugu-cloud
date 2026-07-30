/**
 * POST /api/ai/chat
 * 用用户 settings 中的 DeepSeek 配置代理对话（避免浏览器直连 CORS）
 * body: { messages: [{role,content}], temperature? }
 */
import { requireUser } from '../../lib/auth.js'
import { one } from '../../lib/db.js'
import { mergeSettings } from '../../lib/settings.js'
import { json, error, readJson } from '../../lib/respond.js'

export async function onRequestPost(context) {
  const { request, env } = context
  const { session, response } = await requireUser(env, request)
  if (response) return response

  const body = await readJson(request)
  if (!body) return error('请求体必须是 JSON')
  const messages = Array.isArray(body.messages) ? body.messages : null
  if (!messages?.length) return error('缺少 messages')

  const row = await one(
    env.DB,
    'SELECT data_json FROM settings WHERE owner_user_id = ?',
    [session.userId],
  )
  let data = {}
  try {
    data = row?.data_json ? JSON.parse(row.data_json) : {}
  } catch {
    data = {}
  }
  const settings = mergeSettings(data)
  const apiKey = settings.deepseek?.apiKey
  if (!apiKey) return error('请先在设置中填写 DeepSeek API Key', 400)

  const baseUrl = String(settings.deepseek.baseUrl || 'https://api.deepseek.com').replace(/\/$/, '')
  const model = settings.deepseek.model || 'deepseek-chat'

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: body.temperature ?? 0.3,
    }),
  })

  const text = await upstream.text()
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return error(`DeepSeek 返回非 JSON：${text.slice(0, 200)}`, 502)
  }
  if (!upstream.ok) {
    return error(parsed?.error?.message || `DeepSeek HTTP ${upstream.status}`, 502)
  }
  const content = parsed?.choices?.[0]?.message?.content || ''
  return json({ ok: true, content, raw: parsed })
}
