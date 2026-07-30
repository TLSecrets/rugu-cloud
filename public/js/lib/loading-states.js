/**
 * 页面加载 / 错误 / 空状态（样式在 app.css）
 */

/** @param {HTMLElement} el @param {string} [text] */
export function renderPageLoading(el, text = '加载中…') {
  if (!el) return
  el.classList.remove('view--enter')
  el.innerHTML = `
    <div class="page-loading" role="status" aria-live="polite">
      <div class="page-loading__dots" aria-hidden="true"><span></span><span></span><span></span></div>
      <p class="muted">${text}</p>
    </div>`
}

/**
 * @param {HTMLElement} el
 * @param {{ title?: string, message?: string, onRetry?: Function }} [opts]
 */
export function renderPageError(el, { title = '加载失败', message = '请稍后重试', onRetry } = {}) {
  if (!el) return
  el.classList.remove('view--enter')
  el.innerHTML = `
    <div class="page-error" role="alert">
      <p class="page-error__title"></p>
      <p class="page-error__desc"></p>
      <div class="btn-row"></div>
    </div>`
  el.querySelector('.page-error__title').textContent = title
  el.querySelector('.page-error__desc').textContent = message
  if (typeof onRetry === 'function') {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn btn--primary'
    btn.textContent = '重试'
    btn.addEventListener('click', () => onRetry())
    el.querySelector('.btn-row').appendChild(btn)
  }
}

/**
 * @param {HTMLElement} el
 * @param {{ title?: string, desc?: string }} [opts]
 */
export function renderEmpty(el, { title = '暂无内容', desc = '' } = {}) {
  if (!el) return
  el.classList.remove('view--enter')
  el.innerHTML = `
    <div class="empty">
      <p class="empty__title"></p>
      <p class="empty__desc muted"></p>
    </div>`
  el.querySelector('.empty__title').textContent = title
  const d = el.querySelector('.empty__desc')
  if (desc) d.textContent = desc
  else d.hidden = true
}

/** 给内容容器加淡入 */
export function markViewEnter(el) {
  if (!el) return
  el.classList.remove('view--enter')
  void el.offsetWidth
  el.classList.add('view--enter')
}
