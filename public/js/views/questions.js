import { escapeHtml, showFlash } from '../lib/dom.js'
import { TYPE_LABELS } from '../lib/grade.js'
import { bindSelection, selectionToolbarHtml } from '../lib/selection.js'

const KEYS = 'abcdefghijklmnopqrstuvwxyz'.split('')

function defaultJudgeOptions() {
  return [
    { key: 't', label: '对', content: '正确' },
    { key: 'f', label: '错', content: '错误' },
  ]
}

function defaultChoiceOptions(n = 4) {
  return Array.from({ length: n }, (_, i) => ({
    key: KEYS[i],
    label: KEYS[i].toUpperCase(),
    content: '',
  }))
}

function canWriteBank(bank, user) {
  if (!bank || !user) return false
  if (user.isAdmin) return true
  if (bank.isPublic) return false
  return bank.ownerUserId === user.id
}

/**
 * 题库内题目管理：#/questions?bankId=
 */
export async function renderQuestions(el, { store, route, navigate, api }) {
  const bankId = route.query.bankId || ''
  await store.refreshBanks()
  const bank = store.getBank(bankId)
  let editingId = null
  let draft = null

  if (!bankId || !bank) {
    el.innerHTML = `
      <header class="page-header">
        <h1 class="page-header__title">题目管理</h1>
        <p class="page-header__desc">请从题库页进入。</p>
      </header>
      <div class="empty">
        <p class="empty__title">未选择题库</p>
        <div class="btn-row" style="justify-content:center;margin-top:1rem">
          <button type="button" class="btn btn--primary" id="goBanks">回题库</button>
        </div>
      </div>`
    el.querySelector('#goBanks')?.addEventListener('click', () => navigate('/banks'))
    return
  }

  const writable = canWriteBank(bank, store.user)

  async function paint(flashMsg, flashType) {
    store.invalidateQuestions(bankId)
    const qs = await store.loadQuestions(bankId)

    el.innerHTML = `
      <header class="page-header">
        <h1 class="page-header__title">题目 · ${escapeHtml(bank.name)}</h1>
        <p class="page-header__desc">${writable ? '新增、编辑、删除本题库中的题目。' : '当前为只读（公共库仅管理员可改）。'}</p>
      </header>
      <div id="qFlash" class="flash" hidden></div>
      <section class="card">
        <div class="btn-row" style="margin-top:0">
          <button type="button" class="btn btn--ghost" id="btnBack">返回题库</button>
          ${writable ? '<button type="button" class="btn btn--primary" id="btnNew">新建题目</button>' : ''}
          ${writable && qs.length ? '<button type="button" class="btn btn--danger" id="btnBulkDel" disabled>删除所选</button>' : ''}
        </div>
        <div id="qList">${
          qs.length
            ? `${writable ? selectionToolbarHtml() : ''}<div class="list">${qs.map((q, i) => qRow(q, i)).join('')}</div>`
            : '<div class="empty"><p class="empty__title">暂无题目</p><p class="empty__desc">可新建或前往导入导出批量导入。</p></div>'
        }</div>
      </section>
      <section class="card" id="qEditor" hidden></section>`

    if (flashMsg) showFlash(el.querySelector('#qFlash'), flashMsg, flashType || 'ok')

    const bulkBtn = el.querySelector('#btnBulkDel')
    const listRoot = el.querySelector('#qList')
    let selection = null
    if (writable && qs.length && listRoot) {
      selection = bindSelection(listRoot, {
        onChange: (ids) => {
          if (bulkBtn) {
            bulkBtn.disabled = !ids.length
            bulkBtn.textContent = ids.length ? `删除所选（${ids.length}）` : '删除所选'
          }
        },
      })
    }

    el.querySelector('#btnBack')?.addEventListener('click', () => navigate('/banks'))
    el.querySelector('#btnNew')?.addEventListener('click', () => openEditor(null))
    el.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openEditor(btn.dataset.edit))
    })
    el.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => void deleteQ(btn.dataset.del))
    })
    bulkBtn?.addEventListener('click', async () => {
      const ids = selection?.selectedIds() || []
      if (!ids.length) return
      if (!confirm(`确定删除选中的 ${ids.length} 道题？`)) return
      let ok = 0
      for (const id of ids) {
        try {
          await api.deleteQuestion(id)
          ok++
          if (editingId === id) {
            editingId = null
            draft = null
          }
        } catch {
          /* continue */
        }
      }
      await paint(ok ? `已删除 ${ok} 道题` : '删除失败', ok ? 'ok' : 'err')
      await store.refreshBanks()
    })
  }

  function qRow(q, i) {
    return `<article class="list-row" data-select-id="${escapeHtml(q.id)}">
      ${
        writable
          ? `<label class="sel-check"><input type="checkbox" data-select value="${escapeHtml(q.id)}" /></label>`
          : ''
      }
      <div class="list-row__main">
        <div class="list-row__title"><span class="badge">${i + 1}</span> ${escapeHtml((q.stem || '').slice(0, 100))}${(q.stem || '').length > 100 ? '…' : ''}</div>
        <div class="list-row__meta">${TYPE_LABELS[q.type] || q.type}${q.tags?.length ? ` · ${escapeHtml(q.tags.join(', '))}` : ''}</div>
      </div>
      <div class="list-row__actions">
        ${writable ? `<button type="button" class="btn" data-edit="${escapeHtml(q.id)}">编辑</button>
        <button type="button" class="btn btn--danger" data-del="${escapeHtml(q.id)}">删除</button>` : ''}
      </div>
    </article>`
  }

  function blankDraft(type = 'single') {
    const isJudge = type === 'judge'
    const isChoice = type === 'single' || type === 'multiple' || type === 'judge'
    return {
      type,
      stem: '',
      options: isJudge ? defaultJudgeOptions() : isChoice ? defaultChoiceOptions(4) : [],
      answer: { optionKeys: isJudge ? ['t'] : [], texts: type === 'blank' || type === 'short' ? [''] : [] },
      explanation: '',
      tags: [],
    }
  }

  function openEditor(id) {
    editingId = id
    const existing = id ? (store.questionsByBank[bankId] || []).find((x) => x.id === id) : null
    draft = existing
      ? {
          type: existing.type,
          stem: existing.stem || '',
          options: (existing.options || []).map((o) => ({ ...o })),
          answer: {
            optionKeys: [...(existing.answer?.optionKeys || [])],
            texts: [...(existing.answer?.texts || [])],
          },
          explanation: existing.explanation || '',
          tags: [...(existing.tags || [])],
        }
      : blankDraft('single')

    renderEditor()
  }

  function renderEditor() {
    const editor = el.querySelector('#qEditor')
    if (!editor || !draft) return
    editor.hidden = false
    const t = draft.type
    const isChoice = t === 'single' || t === 'multiple' || t === 'judge'
    const multi = t === 'multiple'

    editor.innerHTML = `
      <h2 class="card__title">${editingId ? '编辑题目' : '新建题目'}</h2>
      <label class="field"><span>题型</span>
        <select id="qType">
          ${Object.entries(TYPE_LABELS)
            .map(([k, v]) => `<option value="${k}" ${t === k ? 'selected' : ''}>${v}</option>`)
            .join('')}
        </select>
      </label>
      <label class="field"><span>题干</span>
        <textarea id="qStem" rows="3">${escapeHtml(draft.stem)}</textarea>
      </label>
      ${
        isChoice
          ? `<div class="field"><span class="field__label">选项（勾选为正确答案）</span>
              <div id="optList">${draft.options
                .map(
                  (o, i) => `
                <div class="opt-edit" data-i="${i}">
                  <label class="field field--inline">
                    <input type="${multi ? 'checkbox' : 'radio'}" name="correct" value="${escapeHtml(o.key)}" ${
                      draft.answer.optionKeys.includes(o.key) ? 'checked' : ''
                    } />
                    <span>${escapeHtml(o.label || o.key)}</span>
                  </label>
                  <input class="opt-content" data-i="${i}" value="${escapeHtml(o.content || '')}" placeholder="选项内容" />
                  ${t !== 'judge' ? `<button type="button" class="btn btn--ghost" data-rm-opt="${i}">删</button>` : ''}
                </div>`,
                )
                .join('')}</div>
              ${t !== 'judge' ? `<div class="btn-row"><button type="button" class="btn btn--ghost" id="btnAddOpt">加选项</button></div>` : ''}
            </div>`
          : ''
      }
      ${
        t === 'blank' || t === 'short'
          ? `<label class="field"><span>${t === 'blank' ? '标准答案（每行一空）' : '参考答案'}</span>
              <textarea id="qTexts" rows="${t === 'blank' ? 3 : 4}">${escapeHtml(
                (draft.answer.texts || []).join('\n'),
              )}</textarea>
            </label>`
          : ''
      }
      <label class="field"><span>解析（可选）</span>
        <textarea id="qExplain" rows="2">${escapeHtml(draft.explanation)}</textarea>
      </label>
      <label class="field"><span>标签（逗号分隔）</span>
        <input id="qTags" value="${escapeHtml((draft.tags || []).join(', '))}" />
      </label>
      <div class="btn-row">
        <button type="button" class="btn btn--primary" id="btnSaveQ">保存</button>
        <button type="button" class="btn btn--ghost" id="btnCancelQ">取消</button>
      </div>`

    editor.querySelector('#qType')?.addEventListener('change', (e) => {
      const next = e.target.value
      const prev = draft.type
      draft.type = next
      if (next === 'judge') {
        draft.options = defaultJudgeOptions()
        draft.answer = { optionKeys: ['t'], texts: [] }
      } else if (next === 'single' || next === 'multiple') {
        if (prev === 'judge' || !draft.options?.length) draft.options = defaultChoiceOptions(4)
        draft.answer = { optionKeys: draft.answer.optionKeys.slice(0, next === 'single' ? 1 : 99), texts: [] }
      } else {
        draft.options = []
        draft.answer = { optionKeys: [], texts: draft.answer.texts?.length ? draft.answer.texts : [''] }
      }
      renderEditor()
    })

    editor.querySelector('#btnAddOpt')?.addEventListener('click', () => {
      const i = draft.options.length
      if (i >= 12) return
      draft.options.push({ key: KEYS[i], label: KEYS[i].toUpperCase(), content: '' })
      renderEditor()
    })
    editor.querySelectorAll('[data-rm-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.rmOpt)
        if (draft.options.length <= 2) return
        draft.options = draft.options
          .filter((_, idx) => idx !== i)
          .map((o, idx) => ({ key: KEYS[idx], label: KEYS[idx].toUpperCase(), content: o.content || '' }))
        draft.answer.optionKeys = []
        renderEditor()
      })
    })

    editor.querySelector('#btnCancelQ')?.addEventListener('click', () => {
      editingId = null
      draft = null
      editor.hidden = true
      editor.innerHTML = ''
    })

    editor.querySelector('#btnSaveQ')?.addEventListener('click', () => void saveQ())
  }

  function collectDraft() {
    const editor = el.querySelector('#qEditor')
    draft.stem = editor.querySelector('#qStem')?.value || ''
    draft.explanation = editor.querySelector('#qExplain')?.value || ''
    draft.tags = (editor.querySelector('#qTags')?.value || '')
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)

    const t = draft.type
    if (t === 'single' || t === 'multiple' || t === 'judge') {
      editor.querySelectorAll('.opt-content').forEach((input) => {
        const i = Number(input.dataset.i)
        if (draft.options[i]) draft.options[i].content = input.value
      })
      const checked = [...editor.querySelectorAll('input[name="correct"]:checked')].map((x) => x.value)
      draft.answer = { optionKeys: checked, texts: [] }
    } else {
      const texts = (editor.querySelector('#qTexts')?.value || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      draft.answer = { optionKeys: [], texts: texts.length ? texts : [''] }
      draft.options = []
    }
  }

  async function saveQ() {
    collectDraft()
    const body = {
      bankId,
      type: draft.type,
      stem: draft.stem,
      options: draft.options,
      answer: draft.answer,
      explanation: draft.explanation,
      tags: draft.tags,
    }
    try {
      if (editingId) await api.updateQuestion(editingId, body)
      else await api.createQuestion(body)
      editingId = null
      draft = null
      await paint('已保存')
      await store.refreshBanks()
    } catch (e) {
      showFlash(el.querySelector('#qFlash'), e.message, 'err')
    }
  }

  async function deleteQ(id) {
    if (!confirm('确定删除该题目？')) return
    try {
      await api.deleteQuestion(id)
      if (editingId === id) {
        editingId = null
        draft = null
      }
      await paint('已删除')
      await store.refreshBanks()
    } catch (e) {
      showFlash(el.querySelector('#qFlash'), e.message, 'err')
    }
  }

  await paint()
}
