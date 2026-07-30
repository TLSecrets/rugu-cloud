/** 导航配置（对齐如故 App nav.ts） */

export const PRIMARY_NAV = [
  { id: 'home', path: '/', label: '首页' },
  { id: 'banks', path: '/banks', label: '题库' },
  { id: 'practice', path: '/practice', label: '练习' },
  { id: 'exam', path: '/exam', label: '考试' },
  { id: 'wrong', path: '/wrong', label: '错题' },
  { id: 'search', path: '/search', label: '搜索' },
  { id: 'favorites', path: '/favorites', label: '收藏' },
  { id: 'notes', path: '/notes', label: '笔记' },
  { id: 'import-export', path: '/import-export', label: '导入导出' },
  { id: 'guide', path: '/guide', label: '指南' },
  { id: 'settings', path: '/settings', label: '设置' },
]

export const MOBILE_TAB_NAV = [
  { id: 'home', path: '/', label: '首页' },
  { id: 'practice', path: '/practice', label: '练习' },
  { id: 'exam', path: '/exam', label: '考试' },
  { id: 'wrong', path: '/wrong', label: '错题' },
  { id: 'more', path: '', label: '更多' },
]

export const MOBILE_MORE_NAV = [
  { id: 'banks', path: '/banks', label: '题库' },
  { id: 'search', path: '/search', label: '搜索' },
  { id: 'favorites', path: '/favorites', label: '收藏' },
  { id: 'notes', path: '/notes', label: '笔记' },
  { id: 'import-export', path: '/import-export', label: '导入导出' },
  { id: 'guide', path: '/guide', label: '指南' },
  { id: 'settings', path: '/settings', label: '设置' },
]

/** @type {Record<string, { title: string, nav: string | null }>} */
export const ROUTE_META = {
  '/': { title: '首页', nav: 'home' },
  '/banks': { title: '题库', nav: 'banks' },
  '/practice': { title: '练习', nav: 'practice' },
  '/exam': { title: '考试', nav: 'exam' },
  '/exam-result': { title: '考试结果', nav: 'exam' },
  '/wrong': { title: '错题本', nav: 'wrong' },
  '/search': { title: '搜索', nav: 'search' },
  '/favorites': { title: '收藏', nav: 'favorites' },
  '/notes': { title: '笔记', nav: 'notes' },
  '/import-export': { title: '导入导出', nav: 'import-export' },
  '/guide': { title: '使用指南', nav: 'guide' },
  '/settings': { title: '设置', nav: 'settings' },
  '/login': { title: '登录', nav: null },
}

export function routeMeta(path) {
  return ROUTE_META[path] || { title: '页面不存在', nav: null }
}
