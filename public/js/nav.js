/** 单一导航数据源：侧栏 / 底栏 / 更多 均由此派生 */

/**
 * @typedef {{
 *   id: string,
 *   path: string,
 *   label: string,
 *   title?: string,
 *   slots: Array<'side'|'tab'|'more'>,
 *   requiresAdmin?: boolean,
 * }} NavItem
 */

/** @type {NavItem[]} */
export const NAV_ITEMS = [
  { id: 'home', path: '/', label: '首页', slots: ['side', 'tab'] },
  { id: 'banks', path: '/banks', label: '题库', slots: ['side', 'more'] },
  { id: 'practice', path: '/practice', label: '练习', slots: ['side', 'tab'] },
  { id: 'exam', path: '/exam', label: '考试', slots: ['side', 'tab'] },
  { id: 'wrong', path: '/wrong', label: '错题', title: '错题本', slots: ['side', 'tab'] },
  { id: 'search', path: '/search', label: '搜索', slots: ['side', 'more'] },
  { id: 'favorites', path: '/favorites', label: '收藏', slots: ['side', 'more'] },
  { id: 'notes', path: '/notes', label: '笔记', slots: ['side', 'more'] },
  { id: 'import-export', path: '/import-export', label: '导入导出', slots: ['side', 'more'] },
  { id: 'guide', path: '/guide', label: '指南', title: '使用指南', slots: ['side', 'more'] },
  { id: 'settings', path: '/settings', label: '设置', slots: ['side', 'more'] },
  { id: 'admin', path: '/admin', label: '管理', title: '管理', slots: ['side', 'more'], requiresAdmin: true },
]

const EXTRA_META = {
  '/exam-result': { title: '考试结果', nav: 'exam', requiresAdmin: false },
  '/questions': { title: '题目管理', nav: 'banks', requiresAdmin: false },
  '/login': { title: '登录', nav: null, requiresAdmin: false },
}

export function sideNavItems() {
  return NAV_ITEMS.filter((i) => i.slots.includes('side'))
}

export function tabNavItems() {
  const tabs = NAV_ITEMS.filter((i) => i.slots.includes('tab'))
  return [...tabs, { id: 'more', path: '', label: '更多', slots: ['tab'] }]
}

export function moreNavItems() {
  return NAV_ITEMS.filter((i) => i.slots.includes('more'))
}

/** @param {string} path */
export function routeMeta(path) {
  if (EXTRA_META[path]) return EXTRA_META[path]
  const item = NAV_ITEMS.find((i) => i.path === path)
  if (!item) return { title: '页面不存在', nav: null, requiresAdmin: false }
  return {
    title: item.title || item.label,
    nav: item.id,
    requiresAdmin: !!item.requiresAdmin,
  }
}
