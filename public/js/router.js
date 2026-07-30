/** Hash 路由：路径不含 #，query 为对象 */

/** @returns {{ path: string, query: Record<string, string> }} */
export function parseHash() {
  let raw = location.hash.replace(/^#/, '')
  if (!raw) raw = '/'
  const qIdx = raw.indexOf('?')
  const pathPart = qIdx >= 0 ? raw.slice(0, qIdx) : raw
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`
  /** @type {Record<string, string>} */
  const query = {}
  if (qIdx >= 0) {
    const params = new URLSearchParams(raw.slice(qIdx + 1))
    for (const [k, v] of params) query[k] = v
  }
  return { path, query }
}

/** @param {Record<string, string | number | boolean | undefined | null>} [query] */
export function navigate(path, query = {}) {
  const p = path.startsWith('/') ? path : `/${path}`
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v != null && v !== '') params.set(k, String(v))
  }
  const qs = params.toString()
  location.hash = qs ? `${p}?${qs}` : p
}

const listeners = new Set()

export function onChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function emit() {
  const route = parseHash()
  for (const cb of listeners) cb(route)
}

export function start() {
  window.addEventListener('hashchange', emit)
  emit()
}

export function stop() {
  window.removeEventListener('hashchange', emit)
}
