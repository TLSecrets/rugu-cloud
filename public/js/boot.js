/**
 * 全局启动加载画面（纯 DOM，无外部依赖）
 */

let bootEl = null
let parentRef = null

function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * @param {HTMLElement} parentEl
 * @param {{ statusText?: string }} [opts]
 */
export function renderBoot(parentEl, { statusText = '正在连接云端题库…' } = {}) {
  if (!parentEl) return null
  parentRef = parentEl

  if (bootEl && parentEl.contains(bootEl)) {
    const status = bootEl.querySelector('.boot__status')
    if (status) {
      status.textContent = statusText
      status.classList.remove('boot__status--err')
    }
    return bootEl
  }

  const el = document.createElement('div')
  el.className = 'boot'
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')
  el.innerHTML = `
    <div>
      <p class="boot__title">如故题库</p>
      <p class="boot__status">${statusText}</p>
    </div>`
  parentEl.appendChild(el)
  bootEl = el
  return el
}

/** @param {string} text */
export function updateBootStatus(text, { error = false } = {}) {
  const app = parentRef || document.getElementById('app')
  if (!bootEl || !app?.contains(bootEl)) {
    renderBoot(app, { statusText: text })
  }
  const status = bootEl?.querySelector('.boot__status')
  if (status) {
    status.textContent = text
    status.classList.toggle('boot__status--err', !!error)
  }
}

/** 淡出后移除；减少动效时直接删除 */
export function removeBoot() {
  const el = bootEl
  bootEl = null
  if (!el) return Promise.resolve()

  if (prefersReducedMotion() || !el.isConnected) {
    el.remove()
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      el.removeEventListener('transitionend', onEnd)
      el.remove()
      resolve()
    }
    const onEnd = (e) => {
      if (e.target === el && e.propertyName === 'opacity') finish()
    }
    el.addEventListener('transitionend', onEnd)
    // 强制 reflow 再加淡出类
    void el.offsetWidth
    el.classList.add('boot--out')
    setTimeout(finish, 400)
  })
}
