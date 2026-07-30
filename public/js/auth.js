import { api } from './api.js'

function qs(name) {
  return new URLSearchParams(location.search).get(name)
}

function showFlash(el, msg, ok) {
  if (!el) return
  el.hidden = !msg
  el.textContent = msg || ''
  el.className = `flash ${ok ? 'flash--ok' : 'flash--err'}`
}

async function init() {
  const flash = document.getElementById('flash')
  const form = document.getElementById('form')
  const modeToggle = document.getElementById('modeToggle')
  const title = document.getElementById('title')
  let mode = 'login' // login | register

  // 已登录则跳走
  try {
    await api.me()
    location.href = qs('next') || '/index.html'
    return
  } catch {
    /* 需要登录 */
  }

  function setMode(m) {
    mode = m
    title.textContent = m === 'login' ? '登录' : '注册'
    modeToggle.textContent = m === 'login' ? '没有账号？去注册' : '已有账号？去登录'
    document.getElementById('submit').textContent = m === 'login' ? '登录' : '注册'
  }

  modeToggle?.addEventListener('click', () => {
    setMode(mode === 'login' ? 'register' : 'login')
    showFlash(flash, '', true)
  })

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const username = document.getElementById('username').value.trim()
    const password = document.getElementById('password').value
    const submit = document.getElementById('submit')
    submit.disabled = true
    try {
      if (mode === 'register') {
        await api.register({ username, password })
        showFlash(flash, '注册成功，正在进入…', true)
      } else {
        await api.login({ username, password })
        showFlash(flash, '登录成功，正在进入…', true)
      }
      location.href = qs('next') || '/index.html'
    } catch (err) {
      showFlash(flash, err.message || '失败', false)
    } finally {
      submit.disabled = false
    }
  })

  setMode('login')
}

init()
