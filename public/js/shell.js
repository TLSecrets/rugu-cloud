import { sideNavItems, tabNavItems, moreNavItems, routeMeta } from './nav.js'

const TABLET_MQ = '(min-width: 48rem)'

function hashLink(path) {
  return `#${path}`
}

/** @param {'boot'|'login'|'app'} mode */
export function setMode(mode) {
  const root = document.getElementById('app')
  if (!root) return
  root.dataset.mode = mode

  const boot = document.getElementById('bootSlot')
  const auth = document.getElementById('authSlot')
  const shell = document.getElementById('shell')

  if (boot) boot.hidden = mode !== 'boot'
  if (auth) auth.hidden = mode !== 'login'
  if (shell) shell.hidden = mode !== 'app'

  document.body.classList.toggle('body--auth-lock', mode === 'login')
  document.body.style.overflow = mode === 'login' ? 'hidden' : ''
}

function setActive(navId) {
  for (const el of document.querySelectorAll('[data-nav]')) {
    const on = el.dataset.nav === navId
    el.classList.toggle('is-active', on)
    if (el.classList.contains('side__link')) el.classList.toggle('side__link--active', on)
    if (el.classList.contains('tabs__item')) el.classList.toggle('tabs__item--active', on)
    if (el.classList.contains('more__link')) el.classList.toggle('more__link--active', on)
    if (on && el.tagName === 'A') el.setAttribute('aria-current', 'page')
    else el.removeAttribute('aria-current')
  }
}

function closeMoreMenu() {
  const panel = document.getElementById('morePanel')
  const btn = document.getElementById('btnMore')
  if (panel) {
    panel.classList.remove('is-open')
    panel.hidden = true
  }
  if (btn) btn.setAttribute('aria-expanded', 'false')
}

function openMoreMenu() {
  const panel = document.getElementById('morePanel')
  const btn = document.getElementById('btnMore')
  if (panel) {
    panel.hidden = false
    panel.classList.add('is-open')
  }
  if (btn) btn.setAttribute('aria-expanded', 'true')
  panel?.querySelector('.more__link')?.focus()
}

function toggleMoreMenu() {
  const panel = document.getElementById('morePanel')
  if (panel?.classList.contains('is-open')) closeMoreMenu()
  else openMoreMenu()
}

export function renderShell(store, route) {
  const shell = document.getElementById('shell')
  if (!shell) return

  const meta = routeMeta(route.path)
  const titleEl = document.getElementById('headerTitle')
  if (titleEl) titleEl.textContent = meta.title

  const userEl = document.getElementById('sideUser')
  if (userEl && store.user) {
    userEl.textContent = `${store.user.username}${store.user.isAdmin ? ' · 管理员' : ''}`
  }

  const sideNav = document.getElementById('sideNav')
  if (sideNav && !sideNav.dataset.rendered) {
    const items = sideNavItems().filter((i) => !i.requiresAdmin || store.user?.isAdmin)
    sideNav.innerHTML = items
      .map(
        (item) =>
          `<a class="side__link" data-nav="${item.id}" href="${hashLink(item.path)}">${item.label}</a>`,
      )
      .join('')
    sideNav.dataset.rendered = '1'
  }

  const tabNav = document.getElementById('tabNav')
  if (tabNav && !tabNav.dataset.rendered) {
    tabNav.innerHTML = tabNavItems()
      .map((item) => {
        if (item.id === 'more') {
          return `<button type="button" class="tabs__item" data-nav="more" id="tabMore" aria-haspopup="menu" aria-controls="morePanel">${item.label}</button>`
        }
        return `<a class="tabs__item" data-nav="${item.id}" href="${hashLink(item.path)}">${item.label}</a>`
      })
      .join('')
    tabNav.dataset.rendered = '1'
  }

  const morePanel = document.getElementById('morePanel')
  if (morePanel && !morePanel.dataset.rendered) {
    const items = moreNavItems().filter((i) => !i.requiresAdmin || store.user?.isAdmin)
    morePanel.innerHTML = items
      .map(
        (item) =>
          `<a class="more__link" role="menuitem" data-nav="${item.id}" href="${hashLink(item.path)}">${item.label}</a>`,
      )
      .join('')
    morePanel.dataset.rendered = '1'
  }

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

  const moreBtn = document.getElementById('btnMore')
  moreBtn?.addEventListener('click', (e) => {
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
    if (e.key === 'Escape') closeMoreMenu()
  })

  document.getElementById('morePanel')?.addEventListener('click', (e) => {
    if (e.target.closest('.more__link')) closeMoreMenu()
  })

  matchMedia(TABLET_MQ).addEventListener('change', updateTabletClass)
}

function updateTabletClass() {
  const shell = document.getElementById('shell')
  if (!shell) return
  shell.classList.toggle('shell--tablet', matchMedia(TABLET_MQ).matches)
}

/** @deprecated use setMode */
export function showApp(show) {
  setMode(show ? 'app' : 'boot')
}
