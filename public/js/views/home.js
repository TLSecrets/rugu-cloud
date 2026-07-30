import { escapeHtml } from '../lib/dom.js'

export function renderHome(el, { store, navigate }) {
  const bankCount = store.banks.length
  const favCount = store.favorites.length
  const wrongCount = store.wrongs.length
  const noteCount = store.notes.length

  el.innerHTML = `
    <section class="hero">
      <h1 class="hero__title">如故云题库</h1>
      <p class="hero__desc">在浏览器中练习、考试与管理题库。数据存储于 Cloudflare D1，登录后跨设备同步学习记录。</p>
      <div class="hero__stats">
        <div class="stat"><span class="stat__n">${bankCount}</span><span class="stat__l">可用题库</span></div>
        <div class="stat"><span class="stat__n">${favCount}</span><span class="stat__l">收藏</span></div>
        <div class="stat"><span class="stat__n">${wrongCount}</span><span class="stat__l">错题</span></div>
        <div class="stat"><span class="stat__n">${noteCount}</span><span class="stat__l">笔记</span></div>
      </div>
      <div class="btn-row hero__actions">
        <button class="btn btn--primary" data-go="/practice">开始练习</button>
        <button class="btn" data-go="/exam">模拟考试</button>
        <button class="btn btn--ghost" data-go="/banks">管理题库</button>
      </div>
    </section>
    <section class="card">
      <h2 class="card__title">快速入口</h2>
      <div class="quick-grid">
        ${[
          ['错题本', '/wrong', `${wrongCount} 题待复习`],
          ['搜索', '/search', '按题干/解析检索'],
          ['导入导出', '/import-export', 'JSON 批量导入'],
          ['使用指南', '/guide', '了解云版与本地版差异'],
        ]
          .map(
            ([t, p, d]) =>
              `<button type="button" class="quick-card" data-go="${p}">
                <strong>${escapeHtml(t)}</strong><span>${escapeHtml(d)}</span>
              </button>`,
          )
          .join('')}
      </div>
    </section>`

  el.querySelectorAll('[data-go]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.go))
  })
}
