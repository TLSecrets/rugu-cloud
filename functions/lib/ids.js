/** 生成可读的随机 ID（不依赖额外库） */
export function makeId(prefix) {
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  return `${prefix}_${rand}`
}

/** 会话 token（足够长，放 Cookie / KV） */
export function makeSessionToken() {
  const a = crypto.randomUUID().replace(/-/g, '')
  const b = crypto.randomUUID().replace(/-/g, '')
  return `${a}${b}`
}
