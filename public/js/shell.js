import {
  PRIMARY_NAV,
  MOBILE_TAB_NAV,
  MOBILE_MORE_NAV,
  routeMeta,
} from './nav.js'

const TABLET_MQ = '(min-width: 48rem)'

function hashLink(path) {
  return `#${path}`
}

function setActive(links, navId) {
  for (const el of links) {
    const id = el.dataset.nav
    el.classList.toggle('side__link--active', id === navId)
    el.classList.toggle('tabs__item--active', id === navId)
    el.classList.toggle('more__link--active', id === navId)
  }
}

export function renderShell(store, route) {
  const shell = document.getElementById('app')
  if (!shell) return

  const meta = routeMeta(route.path)
  const navId = meta.nav

  const titleEl = document.getElementById('headerTitle')
  if (titleEl) titleEl.textContent = meta.title

  const userEl = document.getElementById('sideUser')
  if (userEl && store.user) {
    userEl.textContent = `${store.user.username}${store.user.isAdmin ? ' · 管理员' : ''}`
  }

  const sideNav = document.getElementById('sideNav')
  if (sideNav && !sideNav.dataset.rendered) {
    sideNav.innerHTML = PRIMARY_NAV.map(
      (item) =>
        `<a class="side__link" data-nav="${item.id}" href="${hashLink(item.path)}">${item.label}</a>`,
    ).join('')
    sideNav.dataset.rendered = '1'
  }

  const tabNav = document.getElementById('tabNav')
  if (tabNav && !tabNav.dataset.rendered) {
    tabNav.innerHTML = MOBILE_TAB_NAV.map((item) => {
      if (item.id === 'more') {
        return `<button type="button" class="tabs__item" data-nav="more" id="tabMore">${item.label}</button>`
      }
      return `<a class="tabs__item" data-nav="${item.id}" href="${hashLink(item.path)}">${item.label}</a>`
    }).join('')
    tabNav.dataset.rendered = '1'
  }

  const morePanel = document.getElementById('morePanel')
  if (morePanel && !morePanel.dataset.rendered) {
    morePanel.innerHTML = MOBILE_MORE_NAV.map(
      (item) =>
        `<a class="more__link" data-nav="${item.id}" href="${hashLink(item.path)}">${item.label}</a>`,
    ).join('')
    morePanel.dataset.rendered = '1'
  }

  const allLinks = [
    ...document.querySelectorAll('.side__link'),
    ...document.querySelectorAll('.tabs__item[data-nav]:not(#tabMore)'),
    ...document.querySelectorAll('.more__link'),
  ]
  setActive(allLinks, navId)

  const themeBtn = document.getElementById('btnTheme')
  if (themeBtn) {
    const t = store.settings?.theme || 'dark'
    themeBtn.textContent = t === 'light' ? '浅色' : t === 'dark' ? '深色' : '系统'
  }

  updateTabletClass()
}

export function bindShellEvents(store, { navigate, onLogout, onThemeToggle }) {
  document.getElementById('btnLogout')?.addEventListener('click', () => onLogout())
  document.getElementById('btnTheme')?.addEventListener('click', () => onThemeToggle())

  const moreBtn = document.getElementById('btnMore')
  const morePanel = document.getElementById('morePanel')
  moreBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    morePanel?.classList.toggle('is-open')
  })
  document.getElementById('tabMore')?.addEventListener('click', (e) => {
    e.preventDefault()
    morePanel?.classList.toggle('is-open')
  })
  document.addEventListener('click', () => morePanel?.classList.remove('is-open'))

  morePanel?.querySelectorAll('.more__link').forEach((a) => {
    a.addEventListener('click', () => morePanel.classList.remove('is-open'))
  })

  if (!window.__shellMqBound) {
    window.__shellMqBound = true
    matchMedia(TABLET_MQ).addEventListener('change', updateTabletClass)
  }
}

function updateTabletClass() {
  const shell = document.getElementById('app')
  if (!shell) return
  shell.classList.toggle('shell--tablet', matchMedia(TABLET_MQ).matches)
}

export function showApp(show) {
  const boot = document.getElementById('boot')
  const app = document.getElementById('app')
  if (boot) boot.hidden = show
  if (app) app.hidden = !show
}
