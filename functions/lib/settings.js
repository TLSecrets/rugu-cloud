/** 默认设置（对齐如故 AppSettings） */
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
