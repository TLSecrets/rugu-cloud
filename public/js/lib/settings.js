/** 客户端设置（对齐后端 DEFAULT_SETTINGS） */

export const SETTINGS_CACHE_KEY = 'rugu-settings-cache'

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  shuffleOptions: true,
  enabledTypes: [],
  blankLooseMatch: true,
  autoNextDelay: 0,
  autoNextEnabled: false,
  showAnswerMode: 'instant',
  fontSize: 17,
  bankTagMatchMode: 'or',
  deepseek: {
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
}

export const FONT_SIZE_MIN = 14
export const FONT_SIZE_MAX = 24

export function mergeSettings(raw) {
  const base = structuredClone(DEFAULT_SETTINGS)
  if (!raw || typeof raw !== 'object') return base
  return {
    ...base,
    ...raw,
    deepseek: { ...base.deepseek, ...(raw.deepseek || {}) },
    enabledTypes: Array.isArray(raw.enabledTypes) ? raw.enabledTypes : base.enabledTypes,
  }
}

export function applyTheme(settings) {
  const root = document.documentElement
  const theme = settings?.theme || 'dark'
  if (theme === 'light' || theme === 'dark') {
    root.setAttribute('data-theme', theme)
  } else {
    root.removeAttribute('data-theme')
  }
}

export function applyFontSize(settings) {
  const size = Number(settings?.fontSize) || DEFAULT_SETTINGS.fontSize
  const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, size))
  document.documentElement.style.fontSize = `${clamped}px`
}

export function cacheSettings(settings) {
  try {
    const s = mergeSettings(settings)
    localStorage.setItem(
      SETTINGS_CACHE_KEY,
      JSON.stringify({ theme: s.theme, fontSize: s.fontSize }),
    )
  } catch {
    /* ignore quota */
  }
}

export function applyCachedSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY)
    if (!raw) return
    applySettings(mergeSettings(JSON.parse(raw)))
  } catch {
    /* ignore */
  }
}

export function applySettings(settings) {
  applyTheme(settings)
  applyFontSize(settings)
  cacheSettings(settings)
}
