import { escapeHtml, bankLabel } from '../lib/dom.js'
import { TYPE_LABELS } from '../lib/grade.js'

export function renderSearch(el, ctx) {
  const { store, navigate, api } = ctx
  let lastQ = ''

  el.innerHTML = `
    <header class="page-header">
      <h1 class="page-header__title">搜索</h1>
      <p class="page-header__desc">在可读题库中搜索题干、领域与解析，最多 100 条。</p>
    </header>
    <section class="card">
      <label class="field"><span>关键词</span><input id="q" placeholder="输入关键词" /></label>
      <label class="field"><span>限定题库（可选）</span>
        <select id="bankId"><option value="">全部</option>${store.banks.map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(bankLabel(b))}</option>`).join('')}</select>
      </label>
      <div class="btn-row"><button class="btn btn--primary" id="btnSearch">搜索</button></div>
      <div id="results"></div>
    </section>`

  const results = el.querySelector('#results')

  async function doSearch() {
    const q = el.querySelector('#q').value.trim()
    if (!q) return
    lastQ = q
    const bankId = el.querySelector('#bankId').value || undefined
    results.innerHTML = '<p class="muted">搜索中…</p>'
    try {
      const data = await api.search(q, bankId)
      const items = data.questions || []
      results.innerHTML = items.length
        ? items.map((item) => `
            <article class="list-row">
              <div class="list-row__main">
                <div class="list-row__title"><span class="badge">${TYPE_LABELS[item.type] || item.type}</span>${escapeHtml(item.stem.slice(0, 120))}${item.stem.length > 120 ? '…' : ''}</div>
                <div class="list-row__meta">${escapeHtml(store.getBank(item.bankId)?.name || item.bankId)}</div>
              </div>
              <button class="btn" data-bank="${escapeHtml(item.bankId)}">去练习</button>
            </article>`).join('')
        : '<div class="empty"><p class="empty__title">无结果</p></div>'

      results.querySelectorAll('[data-bank]').forEach((btn) => {
        btn.addEventListener('click', () => navigate('/practice', { bankId: btn.dataset.bank }))
      })
    } catch (err) {
      results.innerHTML = `<div class="flash flash--err">${escapeHtml(err.message)}</div>`
    }
  }

  el.querySelector('#btnSearch').addEventListener('click', doSearch)
  el.querySelector('#q').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch()
  })
}
