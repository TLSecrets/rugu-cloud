import { api, requireLogin } from './api.js'
import { gradeQuestion, TYPE_LABELS } from './grade.js'

const state = {
  user: null,
  banks: [],
  bankId: '',
  questions: [],
  index: 0,
  answers: {}, // id -> { optionKeys, texts }
  revealed: {}, // id -> grade result
}

function $(id) {
  return document.getElementById(id)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function current() {
  return state.questions[state.index] || null
}

function getAnswer(q) {
  if (!state.answers[q.id]) {
    state.answers[q.id] = { optionKeys: [], texts: [] }
  }
  return state.answers[q.id]
}

function renderBankSelect() {
  const sel = $('bankSelect')
  sel.innerHTML = ''
  if (!state.banks.length) {
    sel.innerHTML = '<option value="">暂无可用题库</option>'
    return
  }
  for (const b of state.banks) {
    const opt = document.createElement('option')
    opt.value = b.id
    const tag = b.isPublic ? ' [公共]' : ''
    opt.textContent = `${b.name}${tag}（${b.questionCount ?? 0}）`
    sel.appendChild(opt)
  }
  if (state.bankId) sel.value = state.bankId
  else state.bankId = sel.value
}

function renderMeta() {
  const q = current()
  const meta = $('meta')
  if (!q) {
    meta.textContent = '请选择题库并开始练习'
    return
  }
  meta.innerHTML = `第 <strong>${state.index + 1}</strong> / ${state.questions.length} 题 · ${TYPE_LABELS[q.type] || q.type}`
}

function renderQuestion() {
  const root = $('question')
  const q = current()
  renderMeta()
  if (!q) {
    root.innerHTML = '<p class="muted">暂无题目。可在「题库管理」导入或新增。</p>'
    $('btnPrev').disabled = true
    $('btnNext').disabled = true
    $('btnGrade').disabled = true
    return
  }

  const ans = getAnswer(q)
  const graded = state.revealed[q.id]
  let body = `<div class="stem"><span class="badge">${TYPE_LABELS[q.type] || q.type}</span>${escapeHtml(q.stem)}</div>`

  if (q.type === 'single' || q.type === 'multiple' || q.type === 'judge') {
    const multi = q.type === 'multiple'
    const options = q.options || []
    body += options
      .map((o) => {
        const on = ans.optionKeys.includes(o.key)
        let cls = 'opt' + (on ? ' opt--on' : '')
        if (graded) {
          const correct = (q.answer?.optionKeys || []).includes(o.key)
          if (correct) cls += ' opt--correct'
          else if (on) cls += ' opt--wrong'
        }
        const label = o.label || String(o.key || '').toUpperCase()
        const text = o.content ?? o.text ?? ''
        return `<label class="${cls}">
          <input type="${multi ? 'checkbox' : 'radio'}" name="opt" value="${escapeAttr(o.key)}" ${on ? 'checked' : ''} ${graded ? 'disabled' : ''} />
          <span><strong>${escapeHtml(label)}.</strong> ${escapeHtml(text)}</span>
        </label>`
      })
      .join('')
  } else if (q.type === 'blank') {
    const n = Math.max(1, (q.answer?.texts || []).length || 1)
    body += Array.from({ length: n }, (_, i) => {
      const v = ans.texts[i] || ''
      return `<label class="field"><span>第 ${i + 1} 空</span>
        <input data-blank="${i}" value="${escapeAttr(v)}" ${graded ? 'readonly' : ''} /></label>`
    }).join('')
  } else if (q.type === 'short') {
    body += `<label class="field"><span>你的作答</span>
      <textarea data-short rows="5" ${graded ? 'readonly' : ''}>${escapeHtml(ans.texts[0] || '')}</textarea></label>`
  }

  if (graded) {
    body += `<div class="result" data-v="${graded.verdict}">
      <strong>${verdictLabel(graded.verdict)}</strong> — ${escapeHtml(graded.message)}
      ${renderExplain(q)}
    </div>`
  }

  root.innerHTML = body
  $('btnPrev').disabled = state.index <= 0
  $('btnNext').disabled = state.index >= state.questions.length - 1
  $('btnGrade').disabled = !!graded
  $('btnGrade').textContent = q.type === 'short' ? '查看参考答案' : '提交本题'

  // 绑定作答
  root.querySelectorAll('input[name="opt"]').forEach((el) => {
    el.addEventListener('change', () => {
      if (q.type === 'multiple') {
        ans.optionKeys = [...root.querySelectorAll('input[name="opt"]:checked')].map((x) => x.value)
      } else {
        ans.optionKeys = [el.value]
      }
      renderQuestion()
    })
  })
  root.querySelectorAll('[data-blank]').forEach((el) => {
    el.addEventListener('input', () => {
      const i = Number(el.dataset.blank)
      ans.texts[i] = el.value
    })
  })
  const short = root.querySelector('[data-short]')
  if (short) {
    short.addEventListener('input', () => {
      ans.texts = [short.value]
    })
  }
}

function renderExplain(q) {
  const parts = []
  if (q.answer?.optionKeys?.length) {
    parts.push(`<p class="muted">标准选项：${escapeHtml(q.answer.optionKeys.join(', '))}</p>`)
  }
  if (q.answer?.texts?.length) {
    parts.push(`<p class="muted">参考答案：${escapeHtml(q.answer.texts.join(' / '))}</p>`)
  }
  if (q.explanation) {
    parts.push(`<p>${escapeHtml(q.explanation)}</p>`)
  }
  return parts.join('')
}

function verdictLabel(v) {
  return { correct: '正确', wrong: '错误', partial: '部分正确', ungraded: '待自评' }[v] || v
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;')
}

async function loadBanks() {
  const data = await api.listBanks()
  state.banks = data.banks || []
  renderBankSelect()
}

async function startPractice() {
  state.bankId = $('bankSelect').value
  if (!state.bankId) return
  const data = await api.listQuestions(state.bankId)
  let list = data.questions || []
  if ($('shuffle').checked) list = shuffle(list)
  state.questions = list
  state.index = 0
  state.answers = {}
  state.revealed = {}
  renderQuestion()
}

async function init() {
  state.user = await requireLogin()
  if (!state.user) return

  $('userLabel').textContent = `${state.user.username}（${state.user.isAdmin ? '管理员' : '用户'}）`

  $('btnLogout').addEventListener('click', async () => {
    await api.logout()
    location.href = '/login.html'
  })
  $('btnStart').addEventListener('click', () => startPractice().catch(alert))
  $('btnPrev').addEventListener('click', () => {
    if (state.index > 0) {
      state.index--
      renderQuestion()
    }
  })
  $('btnNext').addEventListener('click', () => {
    if (state.index < state.questions.length - 1) {
      state.index++
      renderQuestion()
    }
  })
  $('btnGrade').addEventListener('click', () => {
    const q = current()
    if (!q) return
    const result = gradeQuestion(q, getAnswer(q))
    state.revealed[q.id] = result
    renderQuestion()
  })

  await loadBanks()
  renderQuestion()
}

init().catch((e) => {
  console.error(e)
  alert(e.message || String(e))
})
