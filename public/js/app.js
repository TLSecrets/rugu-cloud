/**
 * 应用入口：动态 boot / shell / login，无预置 DOM 依赖
 */
import { api } from './api.js'
import { store } from './store.js'
import { parseHash, navigate, onChange, start as startRouter } from './router.js'
import {
  createShell,
  createAuthHost,
  removeAuthHost,
  removeShell,
  renderShell,
  bindShellEvents,
} from './shell.js'
import { renderBoot, updateBootStatus, removeBoot } from './boot.js'
import {
  renderPageLoading,
  renderPageError,
  markViewEnter,
} from './lib/loading-states.js'
import { cycleTheme } from './lib/themeCycle.js'
import { applyCachedSettings } from './lib/settings.js'
import { routeMeta } from './nav.js'
import { renderLogin } from './views/login.js'
import { VIEWS } from './views/index.js'

const appRoot = () => document.getElementById('app')
const viewEl = () => document.getElementById('view')

let shellEl = null
let shellBound = false
let rendering = false
let routerStarted = false

applyCachedSettings()

async function enterApp() {
  const app = appRoot()
  if (!app) throw new Error('缺少 #app 挂载点')

  updateBootStatus('正在加载数据…')
  removeAuthHost(app)

  shellEl = createShell(app)
  await store.boot()
  await removeBoot()

  if (!shellBound) {
    shellBound = true
    bindShellEvents(shellEl, {
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

function showLoginOnly() {
  const app = appRoot()
  if (!app) return
  removeShell(app)
  shellEl = null
  shellBound = false
  void removeBoot()
  const panel = createAuthHost(app)
  renderLogin(panel, {
    api,
    navigate,
    onAuthed: () => {
      void enterApp()
    },
  })
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

    const meta = routeMeta(route.path)
    if (meta.requiresAdmin && !store.user.isAdmin) {
      navigate('/')
      renderShell(store, parseHash())
      const el = viewEl()
      if (el) {
        renderPageError(el, {
          title: '需要管理员权限',
          message: '该页面仅管理员可访问。',
        })
      }
      return
    }

    if (!document.querySelector('.shell')) {
      shellEl = createShell(appRoot())
      if (!shellBound) {
        shellBound = true
        bindShellEvents(shellEl, {
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
    }

    renderShell(store, route)
    const el = viewEl()
    if (!el) return

    renderPageLoading(el, '加载中…')
    const render = VIEWS[route.path] || VIEWS['/404']
    await render(el, { store, route, navigate, api })
    markViewEnter(el)
  } catch (err) {
    console.error(err)
    const el = viewEl()
    if (el) {
      renderPageError(el, {
        title: '页面加载失败',
        message: err.message || '请稍后重试',
        onRetry: () => {
          void renderRoute(parseHash())
        },
      })
    }
  } finally {
    rendering = false
  }
}

async function main() {
  const app = appRoot()
  if (!app) {
    document.body.textContent = '缺少 #app 挂载点'
    return
  }

  renderBoot(app, { statusText: '正在连接云端题库…' })

  try {
    await api.me()
    await enterApp()
  } catch (err) {
    const status = err?.status
    const msg = String(err?.message || '')
    if (status === 401 || /未登录|会话已过期/i.test(msg)) {
      showLoginOnly()
      return
    }
    updateBootStatus(msg || '启动失败，请检查网络后刷新', { error: true })
  }
}

main().catch((e) => {
  console.error(e)
  updateBootStatus(e.message || '启动失败', { error: true })
})
