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
  const { store, route, api } = ctx
  let autoNextTimer = null

  const state = {
    bankId: route.query.bankId || '',
    focusQuestionId: route.query.questionId || '',
    questions: [],
    index: 0,
    answers: {},
    revealed: {},
    /** @type {Record<string, any[]>} 固定选项顺序，避免重绘再乱序 */
    optionOrders: {},
    started: false,
    noteDraft: '',
  }

  function clearAutoNext() {
    if (autoNextTimer) {
      clearTimeout(autoNextTimer)
      autoNextTimer = null
    }
  }

  function current() {
    return state.questions[state.index]
  }

  function getAnswer(q) {
    if (!state.answers[q.id]) state.answers[q.id] = emptyAnswer()
    return state.answers[q.id]
  }

  function settingsForRender() {
    const s = { ...store.settings }
    // 渲染层用已缓存的顺序，关闭内部再洗牌
    s.shuffleOptions = false
    return s
  }

  function optionsFor(q) {
    if (!q) return []
    if (state.optionOrders[q.id]) return state.optionOrders[q.id]
    let opts = [...(q.options || [])]
    if (store.settings.shuffleOptions && (q.type === 'single' || q.type === 'multiple' || q.type === 'judge')) {
      opts = fisherYates(opts)
    }
    state.optionOrders[q.id] = opts
    return opts
  }

  function paintSetup() {
    clearAutoNext()
    const banks = store.banks
    el.innerHTML = `
      <header class="page-header">
        <h1 class="page-header__title">练习</h1>
        <p class="page-header__desc">即时反馈；答后行为见设置（自动下一题 / 答案展示）。</p>
      </header>
      <section class="card practice-setup">
        <label class="field"><span>选择题库</span>
          <select id="bankSelect">${banks.map((b) => `<option value="${escapeHtml(b.id)}" ${b.id === state.bankId ? 'selected' : ''}>${escapeHtml(bankLabel(b))}</option>`).join('') || '<option value="">暂无题库</option>'}</select>
        </label>
        <label class="field field--inline"><input type="checkbox" id="shuffle" checked /><span>打乱题目顺序</span></label>
        <div class="btn-row"><button class="btn btn--primary" id="btnStart" ${banks.length ? '' : 'disabled'}>开始练习</button></div>
      </section>`

    el.querySelector('#btnStart')?.addEventListener('click', () => void beginSession({ shuffle: !!el.querySelector('#shuffle')?.checked }))
  }

  async function beginSession({ shuffle = true } = {}) {
    clearAutoNext()
    if (!state.bankId) {
      state.bankId = el.querySelector('#bankSelect')?.value || route.query.bankId || ''
    }
    if (!state.bankId) return

    let list = await store.loadQuestions(state.bankId)
    const enabled = store.settings.enabledTypes
    if (enabled?.length) list = list.filter((q) => enabled.includes(q.type))

    const focusId = state.focusQuestionId
    if (focusId) {
      const hit = list.find((q) => q.id === focusId)
      const rest = list.filter((q) => q.id !== focusId)
      list = hit ? [hit, ...(shuffle ? fisherYates(rest) : rest)] : shuffle ? fisherYates(list) : list
    } else if (shuffle) {
      list = fisherYates(list)
    }

    state.questions = list
    state.index = 0
    state.answers = {}
    state.revealed = {}
    state.optionOrders = {}
    state.started = true
    await store.refreshLearning()
    paintSession()
  }

  function syncNoteDraft(q) {
    if (!q) {
      state.noteDraft = ''
      return
    }
    state.noteDraft = store.getNote(q.id)?.content || ''
  }

  function scheduleAutoNext() {
    clearAutoNext()
    const s = store.settings
    if (!s.autoNextEnabled) return
    if (state.index >= state.questions.length - 1) return
    const delayMs = Math.max(0, Number(s.autoNextDelay) || 0) * 1000
    autoNextTimer = setTimeout(() => {
      autoNextTimer = null
      if (state.index < state.questions.length - 1) {
        state.index++
        paintSession()
      }
    }, delayMs)
  }

  async function submitCurrent() {
    const q = current()
    if (!q || state.revealed[q.id]) return
    const ans = getAnswer(q)
    const result = gradeAndReveal(q, ans, store.settings)
    state.revealed[q.id] = result
    if (result.verdict === 'wrong' || result.verdict === 'partial') {
      try {
        await api.recordWrong({ questionId: q.id, bankId: state.bankId })
        await store.refreshLearning()
      } catch {
        /* ignore */
      }
    }
    paintSession()
    scheduleAutoNext()
  }

  function paintSession() {
    const q = current()
    syncNoteDraft(q)
    const graded = q ? state.revealed[q.id] : null
    const qForRender = q ? { ...q, options: optionsFor(q) } : null
    const mode = store.settings.showAnswerMode === 'manual' ? 'manual' : 'instant'
    const gradeLabel =
      q?.type === 'short' ? '查看参考答案' : mode === 'manual' ? '确认并查看答案' : '提交本题'

    el.innerHTML = `
      <header class="page-header practice-head">
        <h1 class="page-header__title">练习</h1>
        <p class="page-header__desc" id="meta">${q ? `第 ${state.index + 1} / ${state.questions.length} 题 · ${TYPE_LABELS[q.type]}` : '暂无题目'}</p>
      </header>
      <div class="practice-layout">
        <section class="card practice-main">
          <div id="question">${qForRender ? renderQuestionHtml(qForRender, getAnswer(q), graded, settingsForRender()) : '<div class="empty"><p class="empty__title">暂无题目</p><p class="empty__desc">请先在题库页导入或新增，或检查设置中的题型筛选。</p></div>'}</div>
          <div class="btn-row">
            <button class="btn" id="btnPrev" ${state.index <= 0 ? 'disabled' : ''}>上一题</button>
            <button class="btn btn--primary" id="btnGrade" ${!q || graded ? 'disabled' : ''}>${gradeLabel}</button>
            <button class="btn" id="btnNext" ${state.index >= state.questions.length - 1 ? 'disabled' : ''}>下一题</button>
          </div>
        </section>
        <aside class="card practice-side">
          <p class="muted">题库：${escapeHtml(store.getBank(state.bankId)?.name || '')}</p>
          <button class="btn btn--ghost" id="btnEnd">结束练习</button>
          <button class="btn btn--ghost" id="btnFav">${q && store.isFavorite(q.id) ? '取消收藏' : '收藏本题'}</button>
          ${
            q
              ? `<div class="note-box">
            <label class="field"><span>本题笔记</span>
              <textarea id="noteContent" rows="4" placeholder="写下要点…">${escapeHtml(state.noteDraft)}</textarea>
            </label>
            <button type="button" class="btn btn--primary" id="btnSaveNote">保存笔记</button>
            <p class="muted" id="noteStatus" hidden></p>
          </div>`
              : ''
          }
        </aside>
      </div>`

    const root = el.querySelector('#question')
    if (q && root && !graded) {
      bindQuestionInputs(root, q, getAnswer(q), () => {
        // 即时模式：单选/判断选完即提交
        if (mode === 'instant' && (q.type === 'single' || q.type === 'judge')) {
          const ans = getAnswer(q)
          if (ans.optionKeys.length === 1) void submitCurrent()
        }
      })
    }

    el.querySelector('#noteContent')?.addEventListener('input', (e) => {
      state.noteDraft = e.target.value
    })

    el.querySelector('#btnPrev')?.addEventListener('click', () => {
      clearAutoNext()
      if (state.index > 0) {
        state.index--
        paintSession()
      }
    })
    el.querySelector('#btnNext')?.addEventListener('click', () => {
      clearAutoNext()
      if (state.index < state.questions.length - 1) {
        state.index++
        paintSession()
      }
    })
    el.querySelector('#btnGrade')?.addEventListener('click', () => void submitCurrent())
    el.querySelector('#btnEnd')?.addEventListener('click', () => {
      clearAutoNext()
      state.started = false
      state.focusQuestionId = ''
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
    el.querySelector('#btnSaveNote')?.addEventListener('click', async () => {
      if (!q) return
      const content = el.querySelector('#noteContent')?.value ?? ''
      const status = el.querySelector('#noteStatus')
      try {
        if (!content.trim()) {
          if (store.getNote(q.id)) {
            await api.removeNote(q.id)
            await store.refreshLearning()
            state.noteDraft = ''
            if (status) {
              status.hidden = false
              status.textContent = '已删除空笔记'
            }
          } else if (status) {
            status.hidden = false
            status.textContent = '内容为空，未保存'
          }
          return
        }
        await api.upsertNote({ questionId: q.id, bankId: state.bankId, content })
        await store.refreshLearning()
        state.noteDraft = content
        if (status) {
          status.hidden = false
          status.textContent = '笔记已保存'
        }
      } catch (err) {
        if (status) {
          status.hidden = false
          status.textContent = err.message || '保存失败'
        } else {
          alert(err.message)
        }
      }
    })
  }

  // 从错题/收藏/笔记带 bankId(+questionId) 进来时直接开练
  if (state.bankId && (route.query.questionId || route.query.auto === '1')) {
    void beginSession({ shuffle: !route.query.questionId })
  } else if (state.started) {
    paintSession()
  } else {
    paintSetup()
  }
}
