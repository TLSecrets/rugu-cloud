export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;')
}

export function showFlash(el, message, type = 'err') {
  if (!el) return
  el.hidden = false
  el.className = `flash flash--${type}`
  el.textContent = message
}

export function hideFlash(el) {
  if (el) el.hidden = true
}

export function bankLabel(b) {
  const pub = b.isPublic ? ' [公共]' : ''
  return `${b.name}${pub}（${b.questionCount ?? 0}）`
}
