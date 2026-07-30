import { showFlash } from '../lib/dom.js'

/** 渲染进 #authPanel（根内模态，非独立顶级容器） */
export function renderLogin(el, ctx) {
  let mode = 'login'

  function paint() {
    el.innerHTML = `
      <h1 class="page-header__title" id="authTitle">${mode === 'login' ? '登录' : '注册'}</h1>
      <p class="page-header__desc">账号存 D1，会话 Cookie（HttpOnly）。注册密码至少 10 位。</p>
      <div id="loginFlash" class="flash" hidden></div>
      <form id="loginForm">
        <label class="field"><span>用户名</span>
          <input id="username" autocomplete="username" required minlength="2" maxlength="32" /></label>
        <label class="field"><span>密码</span>
          <input id="password" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required minlength="${mode === 'register' ? '10' : '1'}" /></label>
        <div class="btn-row">
          <button class="btn btn--primary" type="submit">${mode === 'login' ? '登录' : '注册并登录'}</button>
          <button class="btn btn--ghost" type="button" id="modeToggle">${mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}</button>
        </div>
      </form>`

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

    queueMicrotask(() => el.querySelector('#username')?.focus())
  }

  paint()
}
