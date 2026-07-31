import { escapeHtml } from '../lib/dom.js'
import { TYPE_LABELS } from '../lib/grade.js'

export function renderWrong(el, ctx) {
  const { store, navigate, api } = ctx

  async function paint() {
    await store.refreshLearning()
    const wrongs = store.wrongs.filter((w) => !w.removed)

    el.innerHTML = `
      <header class="page-header">
        <h1 class="page-header__title">错题本</h1>
        <p class="page-header__desc">答错或部分正确的题目会自动记录，可标记移除或再次练习。</p>
      </header>
      <section class="card">
        ${wrongs.length ? wrongs.map((w) => wrongRow(w)).join('') : '<div class="empty"><p class="empty__title">暂无错题</p><p class="empty__desc">练习或考试答错后会出现在这里。</p></div>'}
      </section>`

    el.querySelectorAll('[data-practice]').forEach((btn) => {
      btn.addEventListener('click', () =>
        navigate('/practice', {
          bankId: btn.dataset.practice,
          questionId: btn.dataset.qid || undefined,
        }),
      )
    })
    el.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api.patchWrong({ questionId: btn.dataset.remove, removed: true })
        await paint()
      })
    })
    el.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('永久删除此错题记录？')) return
        await api.removeWrong(btn.dataset.delete)
        await paint()
      })
    })
  }

  function wrongRow(w) {
    const bank = store.getBank(w.bankId)
    const stem = w.stem || `题目 ${w.questionId}`
    const typeLabel = w.type ? TYPE_LABELS[w.type] || w.type : ''
    return `<article class="list-row">
      <div class="list-row__main">
        <div class="list-row__title">${escapeHtml(stem.slice(0, 100))}${stem.length > 100 ? '…' : ''}</div>
        <div class="list-row__meta">${escapeHtml(bank?.name || w.bankId)} · 错 ${w.wrongCount} 次${typeLabel ? ` · ${typeLabel}` : ''}</div>
      </div>
      <div class="list-row__actions">
        <button class="btn btn--primary" data-practice="${escapeHtml(w.bankId)}" data-qid="${escapeHtml(w.questionId)}">练习</button>
        <button class="btn" data-remove="${escapeHtml(w.questionId)}">移除</button>
        <button class="btn btn--danger" data-delete="${escapeHtml(w.questionId)}">删除</button>
      </div>
    </article>`
  }

  paint()
}
