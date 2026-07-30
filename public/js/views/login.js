import { escapeHtml, showFlash, hideFlash } from '../lib/dom.js'

/** @param {HTMLElement} el @param {{ api: import('../api.js').api, navigate: Function, onAuthed?: Function }} ctx */
export function renderLogin(el, ctx) {
  let mode = 'login'
  hideFlash(el.querySelector('#loginFlash'))

  function paint() {
    el.innerHTML = `
      <div class="boot">
        <div class="card login-card">
          <h1 class="page-header__title">${mode === 'login' ? '登录' : '注册'}</h1>
          <p class="page-header__desc">账号数据保存在 Cloudflare D1，会话写入 Cookie。登录后同步收藏、笔记与错题。</p>
          <div id="loginFlash" class="flash" hidden></div>
          <form id="loginForm">
            <label class="field"><span>用户名</span>
              <input id="username" autocomplete="username" required minlength="2" maxlength="32" /></label>
            <label class="field"><span>密码</span>
              <input id="password" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required minlength="6" /></label>
            <div class="btn-row">
              <button class="btn btn--primary" type="submit">${mode === 'login' ? '登录' : '注册并登录'}</button>
              <button class="btn btn--ghost" type="button" id="modeToggle">${mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}</button>
            </div>
          </form>
        </div>
      </div>`

    el.querySelector('#modeToggle').addEventListener('click', () => {
      mode = mode === 'login' ? 'register' : 'login'
      paint()
    })

    el.querySelector('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault()
      const flash = el.querySelector('#loginFlash')
      const username = el.querySelector('#username').value.trim()
      const password = el.querySelector('#password').value
      try {
        if (mode === 'register') {
          await ctx.api.register({ username, password })
        } else {
          await ctx.api.login({ username, password })
        }
        ctx.onAuthed?.()
      } catch (err) {
        showFlash(flash, err.message || '操作失败', 'err')
      }
    })
  }

  paint()
}
