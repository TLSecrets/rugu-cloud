/**
 * 动态壳层：createShell 生成完整 DOM，不依赖 HTML 预置节点
 */
import { sideNavItems, tabNavItems, moreNavItems, routeMeta } from './nav.js'

const TABLET_MQ = '(min-width: 48rem)'
const boundShells = new WeakSet()

function hashLink(path) {
  return `#${path}`
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue
    if (k === 'className') node.className = v
    else if (k === 'text') node.textContent = v
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v)
    else node.setAttribute(k, v === true ? '' : String(v))
  }
  for (const c of [].concat(children)) {
    if (c == null) continue
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  return node
}

function createSidebar() {
  const aside = el('aside', { className: 'side', 'aria-label': '侧栏' })
  const brand = el('div', { className: 'side__brand' }, [
    el('p', { className: 'side__name', text: '如故题库' }),
    el('p', { className: 'side__tag', text: '云端同步 · Cloudflare' }),
  ])
  const nav = el('nav', { className: 'side__nav', id: 'sideNav', 'aria-label': '主导航' })
  const user = el('p', { className: 'side__user', id: 'sideUser' })
  const foot = el('p', { className: 'side__foot', text: '如故云题库' })
  aside.append(brand, nav, user, foot)
  return aside
}

function createHeader() {
  const header = el('header', { className: 'header' })
  const brand = el('div', { className: 'header__brand' }, [
    el('span', { className: 'header__mark', 'aria-hidden': 'true', text: '如故' }),
    el('div', { className: 'header__titles' }, [
      el('p', { className: 'header__product', text: '如故题库' }),
      el('h1', { className: 'header__page', id: 'headerTitle', text: '首页' }),
    ]),
  ])
  const morePanel = el('div', {
    className: 'more__panel',
    id: 'morePanel',
    role: 'menu',
    hidden: true,
  })
  const moreWrap = el('div', { className: 'more' }, [
    el('button', {
      type: 'button',
      className: 'header__more',
      id: 'btnMore',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-controls': 'morePanel',
      text: '更多',
    }),
    morePanel,
  ])
  const actions = el('div', { className: 'header__actions' }, [
    moreWrap,
    el('button', { type: 'button', className: 'header__theme', id: 'btnTheme', text: '主题' }),
    el('button', { type: 'button', className: 'header__logout', id: 'btnLogout', text: '退出' }),
  ])
  header.append(brand, actions)
  return header
}

function createTabs() {
  return el('nav', { className: 'tabs', id: 'tabNav', 'aria-label': '底部导航' })
}

/**
 * 在 parentEl（#app）内生成完整应用外壳
 * @param {HTMLElement} parentEl
 * @returns {HTMLElement} shell 根节点
 */
export function createShell(parentEl) {
  const existing = parentEl.querySelector('.shell')
  if (existing) return existing

  const shell = el('div', { className: 'shell', id: 'shellRoot' })
  const main = el('div', { className: 'shell__main' }, [
    createHeader(),
    el('main', { className: 'shell__content', id: 'view' }),
  ])
  shell.append(createSidebar(), main, createTabs())
  parentEl.appendChild(shell)
  updateTabletClass(shell)
  return shell
}

/** 在 #app 挂载登录模态宿主，返回面板节点 */
export function createAuthHost(parentEl) {
  let host = parentEl.querySelector('.auth-host')
  if (host) return host.querySelector('.auth-host__panel')

  host = el('div', { className: 'auth-host', id: 'authHost' })
  const backdrop = el('div', { className: 'auth-host__backdrop', 'aria-hidden': 'true' })
  const panel = el('div', {
    className: 'auth-host__panel',
    id: 'authPanel',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'authTitle',
  })
  host.append(backdrop, panel)
  parentEl.appendChild(host)
  document.documentElement.classList.add('scroll-lock')
  document.body.classList.add('scroll-lock')
  return panel
}

export function removeAuthHost(parentEl) {
  parentEl?.querySelector('.auth-host')?.remove()
  document.documentElement.classList.remove('scroll-lock')
  document.body.classList.remove('scroll-lock')
}

export function removeShell(parentEl) {
  parentEl?.querySelector('.shell')?.remove()
}

function filterNav(items, store) {
  return items.filter((i) => !i.requiresAdmin || store.user?.isAdmin)
}

function setActive(navId) {
  for (const node of document.querySelectorAll('.shell [data-nav]')) {
    const on = node.dataset.nav === navId && node.dataset.nav !== 'more'
    node.classList.toggle('active', on)
    if (on && node.tagName === 'A') node.setAttribute('aria-current', 'page')
    else node.removeAttribute('aria-current')
  }
}

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
  if (!document.getElementById('shellRoot') && !document.querySelector('.shell')) return
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

  updateTabletClass(document.querySelector('.shell'))
}

function visibleMenuItems() {
  return [...document.querySelectorAll('#morePanel [role="menuitem"]')]
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

/**
 * @param {HTMLElement} shellEl
 * @param {{ onLogout: Function, onThemeToggle: Function }} handlers
 */
export function bindShellEvents(shellEl, { onLogout, onThemeToggle }) {
  if (!shellEl || boundShells.has(shellEl)) return
  boundShells.add(shellEl)

  shellEl.querySelector('#btnLogout')?.addEventListener('click', () => onLogout())
  shellEl.querySelector('#btnTheme')?.addEventListener('click', () => onThemeToggle())
  shellEl.querySelector('#btnMore')?.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleMoreMenu()
  })

  shellEl.querySelector('#tabNav')?.addEventListener('click', (e) => {
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
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      closeMoreMenu()
      document.getElementById('btnMore')?.focus()
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

  shellEl.querySelector('#morePanel')?.addEventListener('click', (e) => {
    if (e.target.closest('.more__link')) closeMoreMenu()
  })

  matchMedia(TABLET_MQ).addEventListener('change', () => updateTabletClass(shellEl))
}

function updateTabletClass(shell) {
  const node = shell || document.querySelector('.shell')
  if (!node) return
  node.classList.toggle('shell--tablet', matchMedia(TABLET_MQ).matches)
}
