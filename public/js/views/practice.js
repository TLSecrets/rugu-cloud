import { escapeHtml, bankLabel } from '../lib/dom.js'
import { fisherYates } from '../lib/shuffle.js'
import {
  renderQuestionHtml,
  bindQuestionInputs,
  gradeAndReveal,
  emptyAnswer,
  TYPE_LABELS,
} from '../lib/questionUi.js'

export function renderPractice(el, ctx) {
  const { store, navigate, route, api } = ctx
  const state = {
    bankId: route.query.bankId || '',
    questions: [],
    index: 0,
    answers: {},
    revealed: {},
    started: false,
  }

  function current() {
    return state.questions[state.index]
  }

  function getAnswer(q) {
    if (!state.answers[q.id]) state.answers[q.id] = emptyAnswer()
    return state.answers[q.id]
  }

  function paintSetup() {
    const banks = store.banks
    el.innerHTML = `
      <header class="page-header">
        <h1 class="page-header__title">练习</h1>
        <p class="page-header__desc">即时反馈，支持单选、多选、判断、填空与简答。</p>
      </header>
      <section class="card practice-setup">
        <label class="field"><span>选择题库</span>
          <select id="bankSelect">${banks.map((b) => `<option value="${escapeHtml(b.id)}" ${b.id === state.bankId ? 'selected' : ''}>${escapeHtml(bankLabel(b))}</option>`).join('') || '<option value="">暂无题库</option>'}</select>
        </label>
        <label class="field field--inline"><input type="checkbox" id="shuffle" checked /><span>打乱题目顺序</span></label>
        <div class="btn-row"><button class="btn btn--primary" id="btnStart" ${banks.length ? '' : 'disabled'}>开始练习</button></div>
      </section>`

    el.querySelector('#btnStart')?.addEventListener('click', start)
  }

  async function start() {
    state.bankId = el.querySelector('#bankSelect').value
    if (!state.bankId) return
    let list = await store.loadQuestions(state.bankId)
    if (el.querySelector('#shuffle')?.checked) list = fisherYates(list)
    const enabled = store.settings.enabledTypes
    if (enabled?.length) list = list.filter((q) => enabled.includes(q.type))
    state.questions = list
    state.index = 0
    state.answers = {}
    state.revealed = {}
    state.started = true
    paintSession()
  }

  function paintSession() {
    const q = current()
    el.innerHTML = `
      <header class="page-header practice-head">
        <h1 class="page-header__title">练习</h1>
        <p class="page-header__desc" id="meta">${q ? `第 ${state.index + 1} / ${state.questions.length} 题 · ${TYPE_LABELS[q.type]}` : '暂无题目'}</p>
      </header>
      <div class="practice-layout">
        <section class="card practice-main">
          <div id="question">${q ? renderQuestionHtml(q, getAnswer(q), state.revealed[q.id], store.settings) : '<div class="empty"><p class="empty__title">暂无题目</p><p class="empty__desc">请先在题库页导入或新增。</p></div>'}</div>
          <div class="btn-row">
            <button class="btn" id="btnPrev" ${state.index <= 0 ? 'disabled' : ''}>上一题</button>
            <button class="btn btn--primary" id="btnGrade" ${!q || state.revealed[q?.id] ? 'disabled' : ''}>${q?.type === 'short' ? '查看参考答案' : '提交本题'}</button>
            <button class="btn" id="btnNext" ${state.index >= state.questions.length - 1 ? 'disabled' : ''}>下一题</button>
          </div>
        </section>
        <aside class="card practice-side">
          <p class="muted">题库：${escapeHtml(store.getBank(state.bankId)?.name || '')}</p>
          <button class="btn btn--ghost" id="btnEnd">结束练习</button>
          <button class="btn btn--ghost" id="btnFav">${q && store.isFavorite(q.id) ? '取消收藏' : '收藏本题'}</button>
        </aside>
      </div>`

    const root = el.querySelector('#question')
    if (q && root) {
      bindQuestionInputs(root, q, getAnswer(q), () => {})
    }

    el.querySelector('#btnPrev')?.addEventListener('click', () => {
      if (state.index > 0) {
        state.index--
        paintSession()
      }
    })
    el.querySelector('#btnNext')?.addEventListener('click', () => {
      if (state.index < state.questions.length - 1) {
        state.index++
        paintSession()
      }
    })
    el.querySelector('#btnGrade')?.addEventListener('click', async () => {
      if (!q) return
      const ans = getAnswer(q)
      const result = gradeAndReveal(q, ans, store.settings)
      state.revealed[q.id] = result
      if (result.verdict === 'wrong' || result.verdict === 'partial') {
        try {
          await api.recordWrong({ questionId: q.id, bankId: state.bankId })
          await store.refreshLearning()
        } catch { /* ignore */ }
      }
      paintSession()
    })
    el.querySelector('#btnEnd')?.addEventListener('click', () => {
      state.started = false
      paintSetup()
    })
    el.querySelector('#btnFav')?.addEventListener('click', async () => {
      if (!q) return
      try {
        if (store.isFavorite(q.id)) {
          await api.removeFavorite(q.id)
        } else {
          await api.addFavorite({ questionId: q.id, bankId: state.bankId })
        }
        await store.refreshLearning()
        paintSession()
      } catch (err) {
        alert(err.message)
      }
    })
  }

  if (state.started) paintSession()
  else paintSetup()
}
