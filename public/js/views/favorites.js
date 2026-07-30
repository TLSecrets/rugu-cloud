import { escapeHtml } from '../lib/dom.js'
import { TYPE_LABELS } from '../lib/grade.js'

export function renderFavorites(el, ctx) {
  const { store, navigate, api } = ctx

  async function paint() {
    await store.refreshLearning()
    const favs = store.favorites

    el.innerHTML = `
      <header class="page-header">
        <h1 class="page-header__title">收藏</h1>
        <p class="page-header__desc">练习时可收藏题目，在此统一查看。</p>
      </header>
      <section class="card">
        ${favs.length ? favs.map((f) => favRow(f)).join('') : '<div class="empty"><p class="empty__title">暂无收藏</p></div>'}
      </section>`

    el.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api.removeFavorite(btn.dataset.remove)
        await paint()
      })
    })
    el.querySelectorAll('[data-practice]').forEach((btn) => {
      btn.addEventListener('click', () => navigate('/practice', { bankId: btn.dataset.practice }))
    })
  }

  function favRow(f) {
    const stem = f.stem || `题目 ${f.questionId}`
    return `<article class="list-row">
      <div class="list-row__main">
        <div class="list-row__title">${escapeHtml(stem.slice(0, 100))}${stem.length > 100 ? '…' : ''}</div>
        <div class="list-row__meta">${escapeHtml(store.getBank(f.bankId)?.name || f.bankId)} · ${f.type ? TYPE_LABELS[f.type] : ''}</div>
      </div>
      <div class="list-row__actions">
        <button class="btn btn--primary" data-practice="${escapeHtml(f.bankId)}">练习</button>
        <button class="btn btn--danger" data-remove="${escapeHtml(f.questionId)}">取消收藏</button>
      </div>
    </article>`
  }

  paint()
}
