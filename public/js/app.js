import { api } from './api.js'
import { store } from './store.js'
import { parseHash, navigate, onChange, start as startRouter } from './router.js'
import { renderShell, bindShellEvents, setMode } from './shell.js'
import { cycleTheme } from './lib/themeCycle.js'
import { applyCachedSettings } from './lib/settings.js'
import { routeMeta } from './nav.js'
import { renderLogin } from './views/login.js'
import { VIEWS } from './views/index.js'

const viewEl = () => document.getElementById('view')
const bootSlot = () => document.getElementById('bootSlot')
const authPanel = () => document.getElementById('authPanel')

let shellBound = false
let rendering = false
let routerStarted = false

applyCachedSettings()

async function enterApp() {
  setMode('boot')
  if (bootSlot()) bootSlot().innerHTML = '<p class="muted">正在加载数据…</p>'

  await store.boot()
  setMode('app')

  if (!shellBound) {
    shellBound = true
    bindShellEvents(store, {
      navigate,
      onLogout: async () => {
        await store.logout()
        location.hash = '#/login'
        location.reload()
      },
      onThemeToggle: async () => {
        const next = cycleTheme(store.settings.theme)
        await store.patchSettings({ theme: next })
        renderShell(store, parseHash())
      },
    })
  }

  if (!routerStarted) {
    routerStarted = true
    startRouter()
    onChange((route) => void renderRoute(route))
  }
  await renderRoute(parseHash())
}

async function renderRoute(route) {
  if (rendering) return
  rendering = true
  try {
    if (!store.user) {
      showLoginOnly()
      return
    }
    if (route.path === '/login') {
      navigate('/')
      return
    }

    // UX 门禁：requiresAdmin 仅隐藏入口/跳转；真实权限由 Worker requireAdmin 兜底
    const meta = routeMeta(route.path)
    if (meta.requiresAdmin && !store.user.isAdmin) {
      navigate('/')
      setMode('app')
      renderShell(store, parseHash())
      const el = viewEl()
      if (el) el.innerHTML = '<div class="flash flash--err">需要管理员权限</div>'
      return
    }

    setMode('app')
    renderShell(store, route)
    const el = viewEl()
    const render = VIEWS[route.path] || VIEWS['/404']
    el.innerHTML = '<div class="empty"><p class="empty__title">加载中…</p></div>'
    await render(el, { store, route, navigate, api })
  } catch (err) {
    console.error(err)
    const el = viewEl()
    if (el) {
      el.innerHTML = `<div class="flash flash--err">${err.message || '页面加载失败'}</div>`
    }
  } finally {
    rendering = false
  }
}

function showLoginOnly() {
  setMode('login')
  const panel = authPanel()
  if (!panel) return
  renderLogin(panel, {
    api,
    navigate,
    onAuthed: () => {
      void enterApp()
    },
  })
}

async function main() {
  try {
    await api.me()
    await enterApp()
  } catch {
    showLoginOnly()
  }
}

main().catch((e) => {
  console.error(e)
  setMode('boot')
  if (bootSlot()) {
    bootSlot().innerHTML = `<div class="flash flash--err">${e.message || '启动失败'}</div>`
  }
})
