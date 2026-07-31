import { escapeHtml, showFlash, bankLabel } from '../lib/dom.js'
import { bankMatchesTags, normalizeBankTags, bankTagMatchModeLabel } from '../lib/bankTags.js'
import { bindSelection, selectionToolbarHtml } from '../lib/selection.js'

export function renderBanks(el, ctx) {
  const { store, navigate, api } = ctx
  let tagFilter = []
  let editingId = null

  async function paint(flashMsg, flashType) {
    await store.refreshBanks()
    const mode = store.settings.bankTagMatchMode || 'or'
    const allTags = [
      ...new Set(store.banks.flatMap((b) => normalizeBankTags(b.tags))),
      ...store.tags.map((t) => t.name),
    ].sort()

    const filtered = store.banks.filter((b) => bankMatchesTags(b.tags, tagFilter, mode))

    el.innerHTML = `
      <header class="page-header">
        <h1 class="page-header__title">题库</h1>
        <p class="page-header__desc">创建私有题库；管理员可创建公共题库。支持标签筛选（${bankTagMatchModeLabel(mode)}，可在设置中切换）。</p>
      </header>
      <div id="banksFlash" class="flash" hidden></div>
      <section class="card">
        <div class="btn-row" style="margin-top:0">
          <button class="btn btn--primary" id="btnCreate">新建题库</button>
          ${filtered.length ? '<button type="button" class="btn btn--danger" id="btnBulkDel" disabled>删除所选</button>' : ''}
        </div>
        ${allTags.length ? `<div class="tag-row">${allTags.map((t) => `<button type="button" class="chip chip--click ${tagFilter.includes(t) ? 'chip--on' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}${tagFilter.length ? `<button class="btn btn--ghost" id="clearTags">清除筛选</button>` : ''}</div>` : ''}
        <div id="bankList">${
          filtered.length
            ? `${selectionToolbarHtml()}<div class="list">${filtered.map((b) => bankRow(b)).join('')}</div>`
            : '<div class="empty"><p class="empty__title">暂无题库</p><p class="empty__desc">点击「新建题库」或前往导入导出页批量导入。</p></div>'
        }</div>
      </section>
      <section class="card" id="editor" hidden></section>`

    if (flashMsg) showFlash(el.querySelector('#banksFlash'), flashMsg, flashType || 'ok')

    const listRoot = el.querySelector('#bankList')
    const bulkBtn = el.querySelector('#btnBulkDel')
    let selection = null
    if (filtered.length && listRoot) {
      selection = bindSelection(listRoot, {
        onChange: (ids) => {
          if (bulkBtn) {
            bulkBtn.disabled = !ids.length
            bulkBtn.textContent = ids.length ? `删除所选（${ids.length}）` : '删除所选'
          }
        },
      })
    }

    el.querySelector('#btnCreate')?.addEventListener('click', () => openEditor(null))
    el.querySelector('#clearTags')?.addEventListener('click', () => {
      tagFilter = []
      paint()
    })
    el.querySelectorAll('[data-tag]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const t = chip.dataset.tag
        tagFilter = tagFilter.includes(t) ? tagFilter.filter((x) => x !== t) : [...tagFilter, t]
        paint()
      })
    })

    el.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openEditor(btn.dataset.edit))
    })
    el.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => deleteBank(btn.dataset.del))
    })
    el.querySelectorAll('[data-practice]').forEach((btn) => {
      btn.addEventListener('click', () => navigate('/practice', { bankId: btn.dataset.practice }))
    })
    el.querySelectorAll('[data-preview]').forEach((btn) => {
      btn.addEventListener('click', () => previewBank(btn.dataset.preview))
    })
    el.querySelectorAll('[data-questions]').forEach((btn) => {
      btn.addEventListener('click', () => navigate('/questions', { bankId: btn.dataset.questions }))
    })
    bulkBtn?.addEventListener('click', async () => {
      const ids = selection?.selectedIds() || []
      if (!ids.length) return
      if (!confirm(`确定删除选中的 ${ids.length} 个题库？题目将一并删除。`)) return
      let ok = 0
      for (const id of ids) {
        try {
          await api.deleteBank(id)
          store.invalidateQuestions(id)
          ok++
        } catch {
          /* continue */
        }
      }
      await paint(ok ? `已删除 ${ok} 个题库` : '删除失败', ok ? 'ok' : 'err')
    })
  }

  function bankRow(b) {
    const tags = normalizeBankTags(b.tags)
    return `<article class="list-row" data-select-id="${escapeHtml(b.id)}" data-id="${escapeHtml(b.id)}">
      <label class="sel-check"><input type="checkbox" data-select value="${escapeHtml(b.id)}" /></label>
      <div class="list-row__main">
        <div class="list-row__title">${escapeHtml(b.name)}${b.isPublic ? ' <span class="badge badge--public">公共</span>' : ''}</div>
        <div class="list-row__meta">${escapeHtml(b.description || '无描述')} · ${b.questionCount ?? 0} 题</div>
        ${tags.length ? `<div class="tag-row">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        <div id="preview-${escapeHtml(b.id)}" class="preview-box" hidden></div>
      </div>
      <div class="list-row__actions">
        <button class="btn btn--primary" data-practice="${escapeHtml(b.id)}">练习</button>
        <button class="btn" data-questions="${escapeHtml(b.id)}">题目</button>
        <button class="btn" data-preview="${escapeHtml(b.id)}">预览</button>
        <button class="btn" data-edit="${escapeHtml(b.id)}">编辑</button>
        <button class="btn btn--danger" data-del="${escapeHtml(b.id)}">删除</button>
      </div>
    </article>`
  }

  async function previewBank(bankId) {
    const box = el.querySelector(`#preview-${CSS.escape(bankId)}`)
    if (!box) return
    if (!box.hidden) {
      box.hidden = true
      return
    }
    const qs = await store.loadQuestions(bankId)
    const preview = qs.slice(0, 3)
    box.innerHTML = preview.length
      ? preview.map((q, i) => `<p class="preview-line"><span class="badge">${i + 1}</span>${escapeHtml(q.stem.slice(0, 120))}${q.stem.length > 120 ? '…' : ''}</p>`).join('')
      : '<p class="muted">暂无题目</p>'
    box.hidden = false
  }

  function openEditor(id) {
    editingId = id
    const b = id ? store.getBank(id) : null
    const editor = el.querySelector('#editor')
    editor.hidden = false
    editor.innerHTML = `
      <h2 class="card__title">${b ? '编辑题库' : '新建题库'}</h2>
      <label class="field"><span>名称</span><input id="bankName" value="${escapeHtml(b?.name || '')}" required /></label>
      <label class="field"><span>描述</span><textarea id="bankDesc" rows="2">${escapeHtml(b?.description || '')}</textarea></label>
      <label class="field"><span>标签（逗号分隔）</span><input id="bankTags" value="${escapeHtml(normalizeBankTags(b?.tags).join(', '))}" /></label>
      ${store.user?.isAdmin ? `<label class="field field--inline"><input type="checkbox" id="bankPublic" ${b?.isPublic ? 'checked' : ''} /><span>公共题库（管理员）</span></label>` : ''}
      <div class="btn-row">
        <button class="btn btn--primary" id="saveBank">保存</button>
        <button class="btn btn--ghost" id="cancelEdit">取消</button>
      </div>`

    editor.querySelector('#cancelEdit').addEventListener('click', () => {
      editor.hidden = true
      editingId = null
    })
    editor.querySelector('#saveBank').addEventListener('click', async () => {
      const name = editor.querySelector('#bankName').value.trim()
      const description = editor.querySelector('#bankDesc').value.trim()
      const tags = editor.querySelector('#bankTags').value.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
      const isPublic = store.user?.isAdmin && editor.querySelector('#bankPublic')?.checked
      try {
        if (editingId) {
          await api.updateBank(editingId, { name, description, tags, ...(store.user?.isAdmin ? { isPublic: !!isPublic } : {}) })
        } else {
          await api.createBank({ name, description, tags, isPublic: !!isPublic })
        }
        store.invalidateQuestions(editingId)
        editingId = null
        await paint('已保存')
      } catch (err) {
        showFlash(el.querySelector('#banksFlash'), err.message, 'err')
      }
    })
  }

  async function deleteBank(id) {
    const b = store.getBank(id)
    if (!b || !confirm(`确定删除「${b.name}」？题目将一并删除。`)) return
    try {
      await api.deleteBank(id)
      store.invalidateQuestions(id)
      await paint('已删除')
    } catch (err) {
      showFlash(el.querySelector('#banksFlash'), err.message, 'err')
    }
  }

  paint()
}
