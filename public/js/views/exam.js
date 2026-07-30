import { escapeHtml } from '../lib/dom.js'
import {
  renderQuestionHtml,
  bindQuestionInputs,
  gradeAndReveal,
  emptyAnswer,
  TYPE_LABELS,
} from '../lib/questionUi.js'
import { fisherYates } from '../lib/shuffle.js'

const SESSION_KEY = 'rugu-exam-session'

export function renderExam(el, ctx) {
  const { store, navigate, api } = ctx
  const draft = {
    bankIds: store.banks.slice(0, 1).map((b) => b.id),
    counts: { single: 5, multiple: 2, judge: 2, blank: 0, short: 0 },
  }

  el.innerHTML = `
    <header class="page-header">
      <h1 class="page-header__title">模拟考试</h1>
      <p class="page-header__desc">不限时组卷。交卷后按客观题自动评分，简答请自评。</p>
    </header>
    <section class="card">
      <h2 class="card__title">选择题库</h2>
      <div class="tag-row" id="bankChecks">
        ${store.banks
          .map(
            (b) => `<label class="chip"><input type="checkbox" value="${escapeHtml(b.id)}" ${draft.bankIds.includes(b.id) ? 'checked' : ''}/> ${escapeHtml(b.name)}</label>`,
          )
          .join('') || '<p class="muted">暂无题库</p>'}
      </div>
      <h2 class="card__title">题型数量</h2>
      ${['single', 'multiple', 'judge', 'blank', 'short']
        .map(
          (t) => `<label class="field"><span>${TYPE_LABELS[t]}</span>
            <input type="number" min="0" max="100" data-type="${t}" value="${draft.counts[t]}" /></label>`,
        )
        .join('')}
      <div class="btn-row">
        <button class="btn btn--primary" id="btnStartExam" ${store.banks.length ? '' : 'disabled'}>开始考试</button>
      </div>
      <div id="flash" class="flash" hidden></div>
    </section>`

  el.querySelector('#btnStartExam')?.addEventListener('click', async () => {
    const bankIds = [...el.querySelectorAll('#bankChecks input:checked')].map((x) => x.value)
    const counts = {}
    el.querySelectorAll('[data-type]').forEach((inp) => {
      counts[inp.dataset.type] = Math.max(0, Number(inp.value) || 0)
    })
    if (!bankIds.length) {
      const f = el.querySelector('#flash')
      f.hidden = false
      f.className = 'flash flash--err'
      f.textContent = '请至少选择一个题库'
      return
    }
    const pool = []
    for (const id of bankIds) {
      const qs = await store.loadQuestions(id)
      pool.push(...qs)
    }
    const picked = []
    for (const [type, n] of Object.entries(counts)) {
      if (!n) continue
      const candidates = fisherYates(pool.filter((q) => q.type === type))
      picked.push(...candidates.slice(0, n))
    }
    if (!picked.length) {
      const f = el.querySelector('#flash')
      f.hidden = false
      f.className = 'flash flash--err'
      f.textContent = '按当前配置抽不到题目，请调整数量或题库'
      return
    }
    const session = {
      questions: fisherYates(picked),
      answers: {},
      startedAt: Date.now(),
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    paintTake(el, ctx, session)
  })
}

function paintTake(el, ctx, session) {
  const { store, navigate, api } = ctx
  let index = 0
  const answers = session.answers || {}

  function getAnswer(q) {
    if (!answers[q.id]) answers[q.id] = emptyAnswer()
    return answers[q.id]
  }

  function saveDraft() {
    session.answers = answers
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }

  function paint() {
    const q = session.questions[index]
    el.innerHTML = `
      <header class="page-header">
        <h1 class="page-header__title">考试中</h1>
        <p class="page-header__desc">第 ${index + 1} / ${session.questions.length} 题 · ${TYPE_LABELS[q.type] || q.type}</p>
      </header>
      <section class="card">
        <div id="question">${renderQuestionHtml(q, getAnswer(q), null, store.settings)}</div>
        <div class="btn-row">
          <button class="btn" id="btnPrev" ${index <= 0 ? 'disabled' : ''}>上一题</button>
          <button class="btn" id="btnNext" ${index >= session.questions.length - 1 ? 'disabled' : ''}>下一题</button>
          <button class="btn btn--primary" id="btnSubmit">交卷</button>
        </div>
      </section>`
    bindQuestionInputs(el.querySelector('#question'), q, getAnswer(q), () => saveDraft())
    el.querySelector('#btnPrev')?.addEventListener('click', () => {
      saveDraft()
      index--
      paint()
    })
    el.querySelector('#btnNext')?.addEventListener('click', () => {
      saveDraft()
      index++
      paint()
    })
    el.querySelector('#btnSubmit')?.addEventListener('click', () => {
      if (!confirm('确定交卷？')) return
      saveDraft()
      const results = session.questions.map((qq) => {
        const r = gradeAndReveal(qq, getAnswer(qq), store.settings)
        if (r.verdict === 'wrong' || r.verdict === 'partial') {
          void api.recordWrong({ questionId: qq.id, bankId: qq.bankId }).catch(() => {})
        }
        return { questionId: qq.id, type: qq.type, verdict: r.verdict, message: r.message }
      })
      const payload = { questions: session.questions, answers, results, finishedAt: Date.now() }
      localStorage.setItem('rugu-exam-result', JSON.stringify(payload))
      localStorage.removeItem(SESSION_KEY)
      navigate('/exam-result')
    })
  }
  paint()
}

export { SESSION_KEY }
