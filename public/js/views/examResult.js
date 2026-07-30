import { escapeHtml } from '../lib/dom.js'
import { TYPE_LABELS } from '../lib/questionUi.js'

export function renderExamResult(el, { navigate }) {
  let data = null
  try {
    data = JSON.parse(localStorage.getItem('rugu-exam-result') || 'null')
  } catch {
    data = null
  }
  if (!data?.results?.length) {
    el.innerHTML = `
      <div class="empty">
        <p class="empty__title">暂无考试结果</p>
        <p class="empty__desc">请先完成一次模拟考试。</p>
        <div class="btn-row" style="justify-content:center;margin-top:1rem">
          <button class="btn btn--primary" id="goExam">去考试</button>
        </div>
      </div>`
    el.querySelector('#goExam')?.addEventListener('click', () => navigate('/exam'))
    return
  }

  const total = data.results.length
  const correct = data.results.filter((r) => r.verdict === 'correct').length
  const wrong = data.results.filter((r) => r.verdict === 'wrong' || r.verdict === 'partial').length
  const ungraded = data.results.filter((r) => r.verdict === 'ungraded').length
  const pct = total ? Math.round((correct / total) * 100) : 0

  el.innerHTML = `
    <header class="page-header">
      <h1 class="page-header__title">考试结果</h1>
      <p class="page-header__desc">客观题自动评分；简答需自评。</p>
    </header>
    <section class="card">
      <div class="hero__stats">
        <div class="stat"><span class="stat__n">${pct}%</span><span class="stat__l">正确率</span></div>
        <div class="stat"><span class="stat__n">${correct}</span><span class="stat__l">正确</span></div>
        <div class="stat"><span class="stat__n">${wrong}</span><span class="stat__l">错误/部分</span></div>
        <div class="stat"><span class="stat__n">${ungraded}</span><span class="stat__l">待自评</span></div>
      </div>
      <div class="btn-row">
        <button class="btn btn--primary" id="retry">再考一次</button>
        <button class="btn" id="goWrong">查看错题本</button>
      </div>
    </section>
    <section class="card">
      <h2 class="card__title">逐题</h2>
      <ul class="bank-list">
        ${data.results
          .map((r, i) => {
            const q = data.questions.find((x) => x.id === r.questionId)
            return `<li class="bank-card">
              <div class="bank-card__title">${i + 1}. [${TYPE_LABELS[r.type] || r.type}] ${escapeHtml((q?.stem || '').slice(0, 80))}</div>
              <p class="muted">${escapeHtml(r.verdict)} · ${escapeHtml(r.message || '')}</p>
            </li>`
          })
          .join('')}
      </ul>
    </section>`

  el.querySelector('#retry')?.addEventListener('click', () => navigate('/exam'))
  el.querySelector('#goWrong')?.addEventListener('click', () => navigate('/wrong'))
}
