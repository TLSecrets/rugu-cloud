import { escapeHtml } from '../lib/dom.js'
import { TYPE_LABELS } from '../lib/grade.js'

export function renderNotes(el, ctx) {
  const { store, navigate, api } = ctx

  async function paint() {
    await store.refreshLearning()
    const notes = store.notes

    el.innerHTML = `
      <header class="page-header">
        <h1 class="page-header__title">笔记</h1>
        <p class="page-header__desc">在练习侧栏为本题写笔记；此处可编辑或删除。云端同步。</p>
      </header>
      <section class="card">
        ${notes.length ? notes.map((n) => noteRow(n)).join('') : '<div class="empty"><p class="empty__title">暂无笔记</p><p class="empty__desc">进入练习后，在右侧「本题笔记」保存即可。</p></div>'}
      </section>
      <section class="card" id="editor" hidden></section>`

    el.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openEditor(btn.dataset.edit))
    })
    el.querySelectorAll('[data-practice]').forEach((btn) => {
      btn.addEventListener('click', () =>
        navigate('/practice', {
          bankId: btn.dataset.practice,
          questionId: btn.dataset.qid || undefined,
        }),
      )
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
    const stem = n.stem || ''
    const title = stem
      ? `${stem.slice(0, 80)}${stem.length > 80 ? '…' : ''}`
      : `${n.content.slice(0, 80)}${n.content.length > 80 ? '…' : ''}`
    const typeLabel = n.type ? TYPE_LABELS[n.type] || n.type : ''
    return `<article class="list-row">
      <div class="list-row__main">
        <div class="list-row__title">${escapeHtml(title)}</div>
        <div class="list-row__meta">${escapeHtml(store.getBank(n.bankId)?.name || n.bankId)}${typeLabel ? ` · ${typeLabel}` : ''} · ${escapeHtml(n.content.slice(0, 40))}${n.content.length > 40 ? '…' : ''}</div>
      </div>
      <div class="list-row__actions">
        <button class="btn btn--primary" data-practice="${escapeHtml(n.bankId)}" data-qid="${escapeHtml(n.questionId)}">练习</button>
        <button class="btn" data-edit="${escapeHtml(n.questionId)}">编辑</button>
        <button class="btn btn--danger" data-del="${escapeHtml(n.questionId)}">删除</button>
      </div>
    </article>`
  }

  function openEditor(questionId) {
    const note = store.notes.find((n) => n.questionId === questionId)
    if (!note) return
    const editor = el.querySelector('#editor')
    editor.hidden = false
    editor.innerHTML = `
      <h2 class="card__title">编辑笔记</h2>
      ${note.stem ? `<p class="card__desc">${escapeHtml(note.stem.slice(0, 160))}${note.stem.length > 160 ? '…' : ''}</p>` : ''}
      <label class="field"><span>内容</span><textarea id="content" rows="6">${escapeHtml(note.content || '')}</textarea></label>
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
