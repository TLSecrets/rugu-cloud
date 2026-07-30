import { sideNavItems, tabNavItems, moreNavItems, routeMeta } from './nav.js'

const TABLET_MQ = '(min-width: 48rem)'

function hashLink(path) {
  return `#${path}`
}

function rootEl() {
  return document.getElementById('app-root')
}

/**
 * 单根状态机：仅改 #app-root[data-mode]，三插槽同树显隐
 * @param {'boot'|'login'|'app'} mode
 */
export function setMode(mode) {
  const root = rootEl()
  if (!root) return
  root.dataset.mode = mode

  const boot = document.getElementById('bootSlot')
  const auth = document.getElementById('authSlot')
  const shell = document.getElementById('shellSlot')

  if (boot) boot.hidden = mode !== 'boot'
  if (auth) auth.hidden = mode !== 'login'
  if (shell) shell.hidden = mode !== 'app'

  const lock = mode === 'login'
  document.documentElement.classList.toggle('scroll-lock', lock)
  document.body.classList.toggle('scroll-lock', lock)
}

/** 激活态只使用 .active */
function setActive(navId) {
  for (const el of document.querySelectorAll('[data-nav]')) {
    const on = el.dataset.nav === navId && el.dataset.nav !== 'more'
    el.classList.toggle('active', on)
    if (on && el.tagName === 'A') el.setAttribute('aria-current', 'page')
    else el.removeAttribute('aria-current')
  }
}

function visibleMenuItems() {
  return [...document.querySelectorAll('#morePanel [role="menuitem"]:not([hidden])')]
}

function setMoreExpanded(open) {
  document.getElementById('btnMore')?.setAttribute('aria-expanded', open ? 'true' : 'false')
  document.getElementById('tabMore')?.setAttribute('aria-expanded', open ? 'true' : 'false')
}

function closeMoreMenu() {
  const panel = document.getElementById('morePanel')
  if (panel) {
    panel.classList.remove('is-open')
    panel.hidden = true
  }
  setMoreExpanded(false)
}

function openMoreMenu() {
  const panel = document.getElementById('morePanel')
  if (panel) {
    panel.hidden = false
    panel.classList.add('is-open')
  }
  setMoreExpanded(true)
  visibleMenuItems()[0]?.focus()
}

function toggleMoreMenu() {
  const panel = document.getElementById('morePanel')
  if (panel?.classList.contains('is-open')) closeMoreMenu()
  else openMoreMenu()
}

function focusMenuByDelta(delta) {
  const items = visibleMenuItems()
  if (!items.length) return
  const i = items.indexOf(document.activeElement)
  const next = i < 0 ? 0 : (i + delta + items.length) % items.length
  items[next].focus()
}

function filterNav(items, store) {
  return items.filter((i) => !i.requiresAdmin || store.user?.isAdmin)
}

/** 每次根据 NAV_ITEMS + 权限重绘三处导航（无 data-rendered） */
function paintNav(store) {
  const sideNav = document.getElementById('sideNav')
  if (sideNav) {
    sideNav.innerHTML = filterNav(sideNavItems(), store)
      .map(
        (item) =>
          `<a class="side__link" data-nav="${item.id}" href="${hashLink(item.path)}">${item.label}</a>`,
      )
      .join('')
  }

  const tabNav = document.getElementById('tabNav')
  if (tabNav) {
    tabNav.innerHTML = tabNavItems()
      .map((item) => {
        if (item.id === 'more') {
          return `<button type="button" class="tabs__item" data-nav="more" id="tabMore" aria-haspopup="menu" aria-expanded="false" aria-controls="morePanel">${item.label}</button>`
        }
        return `<a class="tabs__item" data-nav="${item.id}" href="${hashLink(item.path)}">${item.label}</a>`
      })
      .join('')
  }

  const morePanel = document.getElementById('morePanel')
  if (morePanel) {
    morePanel.innerHTML = filterNav(moreNavItems(), store)
      .map(
        (item) =>
          `<a class="more__link" role="menuitem" tabindex="-1" data-nav="${item.id}" href="${hashLink(item.path)}">${item.label}</a>`,
      )
      .join('')
  }
}

export function renderShell(store, route) {
  const shell = document.getElementById('shellSlot')
  if (!shell) return

  const meta = routeMeta(route.path)
  const titleEl = document.getElementById('headerTitle')
  if (titleEl) titleEl.textContent = meta.title

  const userEl = document.getElementById('sideUser')
  if (userEl && store.user) {
    userEl.textContent = `${store.user.username}${store.user.isAdmin ? ' · 管理员' : ''}`
  }

  paintNav(store)
  setActive(meta.nav)

  const themeBtn = document.getElementById('btnTheme')
  if (themeBtn) {
    const t = store.settings?.theme || 'dark'
    themeBtn.textContent = t === 'light' ? '浅色' : t === 'dark' ? '深色' : '系统'
  }

  updateTabletClass()
}

export function bindShellEvents(store, { navigate, onLogout, onThemeToggle }) {
  if (window.__shellEventsBound) return
  window.__shellEventsBound = true

  document.getElementById('btnLogout')?.addEventListener('click', () => onLogout())
  document.getElementById('btnTheme')?.addEventListener('click', () => onThemeToggle())

  document.getElementById('btnMore')?.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleMoreMenu()
  })

  document.getElementById('tabNav')?.addEventListener('click', (e) => {
    const btn = e.target.closest('#tabMore')
    if (!btn) return
    e.preventDefault()
    e.stopPropagation()
    toggleMoreMenu()
  })

  document.addEventListener('click', (e) => {
    const panel = document.getElementById('morePanel')
    if (!panel?.classList.contains('is-open')) return
    if (e.target.closest('.more') || e.target.closest('#tabMore')) return
    closeMoreMenu()
  })

  document.addEventListener('keydown', (e) => {
    const panel = document.getElementById('morePanel')
    const open = panel?.classList.contains('is-open')
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        closeMoreMenu()
        document.getElementById('btnMore')?.focus()
      }
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusMenuByDelta(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusMenuByDelta(-1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      visibleMenuItems()[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      const items = visibleMenuItems()
      items[items.length - 1]?.focus()
    }
  })

  document.getElementById('morePanel')?.addEventListener('click', (e) => {
    if (e.target.closest('.more__link')) closeMoreMenu()
  })

  // 平板适配类由视口宽度动态追加（非写死在 HTML）
  matchMedia(TABLET_MQ).addEventListener('change', updateTabletClass)
  updateTabletClass()
}

function updateTabletClass() {
  const shell = document.getElementById('shellSlot')
  if (!shell) return
  shell.classList.toggle('shell--tablet', matchMedia(TABLET_MQ).matches)
}

/** @deprecated */
export function showApp(show) {
  setMode(show ? 'app' : 'boot')
}
