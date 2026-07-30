import { api } from './api.js'
import { store } from './store.js'
import { parseHash, navigate, onChange, start as startRouter } from './router.js'
import { renderShell, bindShellEvents, showApp } from './shell.js'
import { cycleTheme } from './lib/themeCycle.js'
import { renderLogin } from './views/login.js'
import { VIEWS } from './views/index.js'

const viewEl = () => document.getElementById('view')
const authRoot = () => document.getElementById('authRoot')
const bootEl = () => document.getElementById('boot')

let shellBound = false
let rendering = false

async function enterApp() {
  bootEl().innerHTML = '<p class="muted">正在加载数据…</p>'
  bootEl().hidden = false
  authRoot().hidden = true
  document.getElementById('app').hidden = true

  await store.boot()
  showApp(true)
  bootEl().hidden = true

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

  startRouter()
  onChange((route) => void renderRoute(route))
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
  document.getElementById('app').hidden = true
  bootEl().hidden = true
  const root = authRoot()
  root.hidden = false
  renderLogin(root, {
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
  bootEl().innerHTML = `<div class="flash flash--err">${e.message || '启动失败'}</div>`
})
