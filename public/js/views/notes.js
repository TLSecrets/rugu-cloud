import { escapeHtml } from '../lib/dom.js'

export function renderNotes(el, ctx) {
  const { store, navigate, api } = ctx
  let editing = null

  async function paint() {
    await store.refreshLearning()
    const notes = store.notes

    el.innerHTML = `
      <header class="page-header">
        <h1 class="page-header__title">笔记</h1>
        <p class="page-header__desc">为题目添加个人笔记，云端同步保存。</p>
      </header>
      <section class="card">
        ${notes.length ? notes.map((n) => noteRow(n)).join('') : '<div class="empty"><p class="empty__title">暂无笔记</p></div>'}
      </section>
      <section class="card" id="editor" hidden></section>`

    el.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openEditor(btn.dataset.edit))
    })
    el.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('删除笔记？')) return
        await api.removeNote(btn.dataset.del)
        await paint()
      })
    })
  }

  function noteRow(n) {
    return `<article class="list-row">
      <div class="list-row__main">
        <div class="list-row__title">${escapeHtml(n.content.slice(0, 80))}${n.content.length > 80 ? '…' : ''}</div>
        <div class="list-row__meta">${escapeHtml(store.getBank(n.bankId)?.name || n.bankId)}</div>
      </div>
      <div class="list-row__actions">
        <button class="btn" data-edit="${escapeHtml(n.questionId)}">编辑</button>
        <button class="btn btn--danger" data-del="${escapeHtml(n.questionId)}">删除</button>
      </div>
    </article>`
  }

  function openEditor(questionId) {
    const note = store.notes.find((n) => n.questionId === questionId)
    editing = questionId
    const editor = el.querySelector('#editor')
    editor.hidden = false
    editor.innerHTML = `
      <h2 class="card__title">编辑笔记</h2>
      <label class="field"><span>内容</span><textarea id="content" rows="6">${escapeHtml(note?.content || '')}</textarea></label>
      <div class="btn-row">
        <button class="btn btn--primary" id="save">保存</button>
        <button class="btn btn--ghost" id="cancel">取消</button>
      </div>`
    editor.querySelector('#cancel').addEventListener('click', () => {
      editor.hidden = true
    })
    editor.querySelector('#save').addEventListener('click', async () => {
      const content = editor.querySelector('#content').value
      await api.upsertNote({ questionId, bankId: note.bankId, content })
      editor.hidden = true
      await paint()
    })
  }

  paint()
}
