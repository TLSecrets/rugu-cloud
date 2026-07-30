import { api, requireLogin } from './api.js'
import { TYPE_LABELS } from './grade.js'

const state = {
  user: null,
  banks: [],
  bankId: '',
  questions: [],
  editingId: null,
}

function $(id) {
  return document.getElementById(id)
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function flash(msg, ok = false) {
  const el = $('flash')
  el.hidden = !msg
  el.textContent = msg || ''
  el.className = `flash ${ok ? 'flash--ok' : 'flash--err'}`
}

function canWriteBank(b) {
  if (!b || !state.user) return false
  if (b.isPublic) return !!state.user.isAdmin
  return b.ownerUserId === state.user.id || !!state.user.isAdmin
}

async function refreshBanks() {
  const data = await api.listBanks()
  state.banks = (data.banks || []).filter(canWriteBank)

  const sel = $('bankSelect')
  sel.innerHTML = ''
  for (const b of state.banks) {
    const opt = document.createElement('option')
    opt.value = b.id
    const vis = b.isPublic ? '公共' : '私有'
    opt.textContent = `${b.name} · ${vis}（${b.questionCount ?? 0}）`
    sel.appendChild(opt)
  }
  if (!state.banks.length) {
    sel.innerHTML = '<option value="">请先创建题库</option>'
    state.bankId = ''
  } else {
    if (!state.bankId || !state.banks.find((b) => b.id === state.bankId)) {
      state.bankId = state.banks[0].id
    }
    sel.value = state.bankId
  }
  renderBankList()
}

function renderBankList() {
  const ul = $('bankList')
  ul.innerHTML = state.banks
    .map((b) => {
      const vis = b.isPublic
        ? '<span class="badge badge--public">公共</span>'
        : '<span class="badge">私有</span>'
      return `<li>
        <div>
          <div class="list__title">${escapeHtml(b.name)} ${vis}</div>
          <div class="muted">${escapeHtml(b.description || '无说明')} · ${b.questionCount ?? 0} 题</div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn" data-open="${escapeHtml(b.id)}">打开</button>
          <button type="button" class="btn btn--danger" data-del-bank="${escapeHtml(b.id)}">删除</button>
        </div>
      </li>`
    })
    .join('')

  ul.querySelectorAll('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.bankId = btn.dataset.open
      $('bankSelect').value = state.bankId
      loadQuestions().catch((e) => flash(e.message))
    })
  })
  ul.querySelectorAll('[data-del-bank]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('确定删除该题库及其全部题目？')) return
      try {
        await api.deleteBank(btn.dataset.delBank)
        flash('题库已删除', true)
        await refreshBanks()
        await loadQuestions()
      } catch (e) {
        flash(e.message)
      }
    })
  })
}

async function loadQuestions() {
  state.bankId = $('bankSelect').value
  if (!state.bankId) {
    state.questions = []
    renderQuestions()
    return
  }
  const data = await api.listQuestions(state.bankId)
  state.questions = data.questions || []
  renderQuestions()
}

function renderQuestions() {
  const ul = $('questionList')
  if (!state.questions.length) {
    ul.innerHTML = '<li><span class="muted">本题库暂无题目</span></li>'
    return
  }
  ul.innerHTML = state.questions
    .map((q, i) => {
      return `<li>
        <div>
          <div class="list__title">${i + 1}. [${TYPE_LABELS[q.type] || q.type}] ${escapeHtml(truncate(q.stem, 80))}</div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn" data-edit="${escapeHtml(q.id)}">编辑</button>
          <button type="button" class="btn btn--danger" data-del-q="${escapeHtml(q.id)}">删除</button>
        </div>
      </li>`
    })
    .join('')

  ul.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => fillForm(state.questions.find((q) => q.id === btn.dataset.edit)))
  })
  ul.querySelectorAll('[data-del-q]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('删除这道题？')) return
      try {
        await api.deleteQuestion(btn.dataset.delQ)
        flash('已删除', true)
        await refreshBanks()
        await loadQuestions()
      } catch (e) {
        flash(e.message)
      }
    })
  })
}

function truncate(s, n) {
  const t = String(s || '')
  return t.length > n ? t.slice(0, n) + '…' : t
}

function optionLine(o) {
  const key = o.key || o.label || ''
  const text = o.content ?? o.text ?? ''
  return `${key}|${text}`
}

function fillForm(q) {
  state.editingId = q?.id || null
  $('formTitle').textContent = q ? '编辑题目' : '新增题目'
  $('qType').value = q?.type || 'single'
  $('qStem').value = q?.stem || ''
  $('qExplanation').value = q?.explanation || ''
  $('qOptions').value = (q?.options || []).map(optionLine).join('\n')
  $('qAnswerKeys').value = (q?.answer?.optionKeys || []).join(',')
  $('qAnswerTexts').value = (q?.answer?.texts || []).join('\n')
  syncTypeFields()
  window.scrollTo({ top: $('editor').offsetTop - 20, behavior: 'smooth' })
}

function syncTypeFields() {
  const type = $('qType').value
  const needOpts = type === 'single' || type === 'multiple' || type === 'judge'
  $('optBlock').hidden = !needOpts
  $('keysBlock').hidden = !needOpts
  $('textsBlock').hidden = !(type === 'blank' || type === 'short')
}

function parseOptions(raw) {
  return String(raw || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const idx = line.indexOf('|')
      if (idx < 0) throw new Error(`选项格式应为 Key|内容，收到：${line}`)
      const key = line.slice(0, idx).trim()
      const content = line.slice(idx + 1).trim()
      const label = key.length === 1 ? key.toUpperCase() : key
      return {
        id: `opt-${key || i}`,
        key,
        label,
        content,
      }
    })
}

function buildPayload() {
  const type = $('qType').value
  const stem = $('qStem').value.trim()
  if (!stem) throw new Error('题干不能为空')
  const explanation = $('qExplanation').value.trim()
  const payload = {
    bankId: state.bankId,
    type,
    stem,
    explanation: explanation || '',
    options: [],
    answer: { optionKeys: [], texts: [] },
  }

  if (type === 'single' || type === 'multiple' || type === 'judge') {
    payload.options = parseOptions($('qOptions').value)
    if (type === 'judge' && !payload.options.length) {
      payload.options = [
        { id: 'opt-T', key: 'T', label: '正确', content: '正确' },
        { id: 'opt-F', key: 'F', label: '错误', content: '错误' },
      ]
    }
    payload.answer.optionKeys = String($('qAnswerKeys').value)
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!payload.answer.optionKeys.length) throw new Error('请填写正确答案选项 Key')
  } else {
    payload.answer.texts = String($('qAnswerTexts').value)
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return payload
}

/** 兼容如故导出 / generated JSON */
function normalizeImportItem(raw, bankId) {
  const typeRaw = String(raw.type || 'single').toLowerCase()
  const typeMap = {
    single: 'single',
    multiple: 'multiple',
    judge: 'judge',
    blank: 'blank',
    short: 'short',
    单选: 'single',
    多选: 'multiple',
    判断: 'judge',
    填空: 'blank',
    简答: 'short',
  }
  const t = typeMap[typeRaw] || typeMap[raw.type] || 'single'

  let options = Array.isArray(raw.options) ? raw.options : []
  if (!options.length && raw.choices) {
    options = Object.entries(raw.choices).map(([key, text]) => ({
      key,
      label: String(key).toUpperCase(),
      content: String(text),
    }))
  }
  options = options.map((o, i) => {
    const key = String(o.key || o.label || String.fromCharCode(97 + i))
    return {
      id: o.id || `opt-${key}`,
      key,
      label: String(o.label || key).toUpperCase(),
      content: String(o.content ?? o.text ?? ''),
    }
  })

  let optionKeys = raw.answer?.optionKeys || raw.answerKeys || []
  let texts = raw.answer?.texts || raw.answerTexts || []
  if (typeof raw.answer === 'string') {
    if (t === 'blank' || t === 'short') texts = [raw.answer]
    else optionKeys = raw.answer.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
  }
  if (Array.isArray(raw.answer) && (t === 'blank' || t === 'short')) {
    texts = raw.answer.map(String)
  }
  if (!Array.isArray(optionKeys)) optionKeys = []
  if (!Array.isArray(texts)) texts = []

  // 如故里解析有时放在 answer.explanation
  const explanation =
    raw.explanation || raw.analysis || raw.answer?.explanation || ''

  return {
    bankId,
    type: t,
    stem: String(raw.stem || raw.title || raw.question || ''),
    explanation: explanation || '',
    options,
    answer: {
      optionKeys: optionKeys.map(String),
      texts: texts.map(String),
    },
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    domain: raw.domain ? String(raw.domain) : '',
  }
}

async function init() {
  state.user = await requireLogin()
  if (!state.user) return

  $('userLabel').textContent = state.user.isAdmin
    ? `${state.user.username}（管理员）`
    : state.user.username

  $('btnLogout').addEventListener('click', async () => {
    await api.logout()
    location.href = '/login.html'
  })

  $('bankSelect').addEventListener('change', () => {
    state.bankId = $('bankSelect').value
    loadQuestions().catch((e) => flash(e.message))
  })

  $('btnCreateBank').addEventListener('click', async () => {
    const name = prompt('题库名称')
    if (!name?.trim()) return
    const isPublic =
      state.user.isAdmin && confirm('创建为公共题库？（取消=私有）')
    try {
      await api.createBank({ name: name.trim(), isPublic: !!isPublic })
      flash('题库已创建', true)
      await refreshBanks()
    } catch (e) {
      flash(e.message)
    }
  })

  $('btnClear').addEventListener('click', async () => {
    if (!state.bankId || !confirm('清空当前题库全部题目？')) return
    try {
      await api.clearQuestions(state.bankId)
      flash('已清空', true)
      await refreshBanks()
      await loadQuestions()
    } catch (e) {
      flash(e.message)
    }
  })

  $('btnImport').addEventListener('click', () => $('importFile').click())
  $('importFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !state.bankId) return
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const items = Array.isArray(json) ? json : json.questions || json.items || []
      if (!Array.isArray(items) || !items.length) throw new Error('JSON 中没有题目数组')
      let ok = 0
      let fail = 0
      for (const raw of items) {
        try {
          const body = normalizeImportItem(raw, state.bankId)
          await api.createQuestion(body)
          ok++
        } catch {
          fail++
        }
      }
      flash(`导入完成：成功 ${ok}，失败 ${fail}`, fail === 0)
      await refreshBanks()
      await loadQuestions()
    } catch (err) {
      flash(err.message || String(err))
    }
  })

  $('qType').addEventListener('change', syncTypeFields)
  $('btnResetForm').addEventListener('click', () => fillForm(null))
  $('btnSave').addEventListener('click', async () => {
    try {
      if (!state.bankId) throw new Error('请先选择题库')
      const payload = buildPayload()
      if (state.editingId) {
        const { bankId, ...rest } = payload
        await api.updateQuestion(state.editingId, rest)
        flash('已更新', true)
      } else {
        await api.createQuestion(payload)
        flash('已新增', true)
      }
      fillForm(null)
      await refreshBanks()
      await loadQuestions()
    } catch (e) {
      flash(e.message)
    }
  })

  await refreshBanks()
  await loadQuestions()
  syncTypeFields()
}

init().catch((e) => {
  console.error(e)
  flash(e.message || String(e))
})
