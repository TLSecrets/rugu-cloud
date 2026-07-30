/** 题库标签过滤（对齐如故 bankTags） */

export function normalizeBankTags(tags) {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map((t) => String(t || '').trim()).filter(Boolean))]
}

/**
 * @param {string[]} bankTags
 * @param {string[]} filter
 * @param {'or'|'and'} mode
 */
export function bankMatchesTags(bankTags, filter, mode = 'or') {
  const bt = normalizeBankTags(bankTags)
  const f = normalizeBankTags(filter)
  if (!f.length) return true
  if (mode === 'and') return f.every((t) => bt.includes(t))
  return f.some((t) => bt.includes(t))
}

export function bankTagMatchModeLabel(mode) {
  return mode === 'and' ? '全部匹配' : '任一匹配'
}
