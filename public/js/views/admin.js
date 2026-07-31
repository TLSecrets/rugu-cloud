import { escapeHtml, showFlash } from '../lib/dom.js'

/**
 * 管理员：用户增删改查
 * @param {HTMLElement} el
 * @param {{ api: any, store: any }} ctx
 */
export async function renderAdmin(el, { api, store }) {
  let editingId = null

  el.innerHTML = `
    <header class="page-header">
      <h1 class="page-header__title">管理</h1>
      <p class="page-header__desc">用户增删改查。公共题库仍在「题库」页勾选创建。</p>
    </header>
    <div id="flash" class="flash" hidden></div>
    <section class="card" id="editorCard" hidden></section>
    <section class="card">
      <h2 class="card__title">创建用户</h2>
      <p class="card__desc">密码至少 10 位；可勾选「设为管理员」。</p>
      <label class="field"><span>用户名</span>
        <input id="newUser" autocomplete="off" maxlength="32" placeholder="2～32 位" /></label>
      <label class="field"><span>密码</span>
        <input id="newPass" type="password" autocomplete="new-password" /></label>
      <label class="field field--inline">
        <input type="checkbox" id="newIsAdmin" />
        <span>设为管理员</span>
      </label>
      <div class="btn-row">
        <button type="button" class="btn btn--primary" id="btnCreate">创建</button>
        <button type="button" class="btn btn--ghost" id="btnGenPass">生成随机密码</button>
      </div>
      <p class="card__desc" id="genHint" hidden></p>
    </section>
    <section class="card">
      <h2 class="card__title">用户列表</h2>
      <div class="btn-row" style="margin-bottom:var(--space-3)">
        <button type="button" class="btn btn--ghost" id="btnRefresh">刷新</button>
      </div>
      <div id="userList"><p class="empty__desc">加载中…</p></div>
    </section>
    <section class="card">
      <h2 class="card__title">说明</h2>
      <p class="card__desc">删除用户会一并清除其私有题库、题目与学习数据。不能删除自己或唯一管理员。</p>
    </section>`

  const flash = el.querySelector('#flash')
  const listEl = el.querySelector('#userList')
  const editorCard = el.querySelector('#editorCard')
  const genHint = el.querySelector('#genHint')
  const meId = store.user?.id

  function genPassword(len = 20) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_'
    const buf = new Uint8Array(len)
    crypto.getRandomValues(buf)
    return Array.from(buf, (b) => chars[b % chars.length]).join('')
  }

  function formatTime(ts) {
    if (!ts) return ''
    try {
      return new Date(Number(ts)).toLocaleString()
    } catch {
      return String(ts)
    }
  }

  function closeEditor() {
    editingId = null
    editorCard.hidden = true
    editorCard.innerHTML = ''
  }

  function openEditor(user) {
    editingId = user.id
    editorCard.hidden = false
    editorCard.innerHTML = `
      <h2 class="card__title">编辑用户 · ${escapeHtml(user.username)}</h2>
      <label class="field"><span>用户名</span>
        <input id="editUser" value="${escapeHtml(user.username)}" maxlength="32" /></label>
      <label class="field"><span>新密码（留空则不改）</span>
        <input id="editPass" type="password" autocomplete="new-password" /></label>
      <label class="field field--inline">
        <input type="checkbox" id="editIsAdmin" ${user.isAdmin ? 'checked' : ''} ${
          user.id === meId ? 'disabled' : ''
        } />
        <span>管理员${user.id === meId ? '（不能取消自己）' : ''}</span>
      </label>
      <div class="btn-row">
        <button type="button" class="btn btn--primary" id="btnSaveEdit">保存</button>
        <button type="button" class="btn btn--ghost" id="btnGenEditPass">生成随机密码</button>
        <button type="button" class="btn btn--ghost" id="btnCancelEdit">取消</button>
      </div>
      <p class="card__desc" id="editGenHint" hidden></p>`

    editorCard.querySelector('#btnCancelEdit')?.addEventListener('click', closeEditor)
    editorCard.querySelector('#btnGenEditPass')?.addEventListener('click', () => {
      const pwd = genPassword()
      const input = editorCard.querySelector('#editPass')
      if (input) {
        input.type = 'text'
        input.value = pwd
      }
      const hint = editorCard.querySelector('#editGenHint')
      if (hint) {
        hint.hidden = false
        hint.textContent = `已填入随机密码（请复制保存）：${pwd}`
      }
    })
    editorCard.querySelector('#btnSaveEdit')?.addEventListener('click', async () => {
      const username = editorCard.querySelector('#editUser')?.value.trim() || ''
      const password = editorCard.querySelector('#editPass')?.value || ''
      const isAdmin = !!editorCard.querySelector('#editIsAdmin')?.checked
      const body = { username, isAdmin }
      if (password) body.password = password
      try {
        const data = await api.adminUpdateUser(editingId, body)
        showFlash(flash, `已更新 ${data.user?.username}`, 'ok')
        closeEditor()
        await loadUsers()
      } catch (e) {
        showFlash(flash, e.message, 'err')
      }
    })
    editorCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  async function loadUsers() {
    listEl.innerHTML = `<p class="empty__desc">加载中…</p>`
    try {
      const data = await api.adminListUsers()
      const users = data.users || []
      if (!users.length) {
        listEl.innerHTML = `<p class="empty__desc">暂无用户</p>`
        return
      }
      listEl.innerHTML = `
        <div class="list">
          ${users
            .map(
              (u) => `
            <div class="list-row" data-id="${escapeHtml(u.id)}">
              <div class="list-row__main">
                <div class="list-row__title">${escapeHtml(u.username)}${
                  u.isAdmin ? ' <span class="badge badge--public">管理员</span>' : ''
                }${u.id === meId ? ' <span class="badge">我</span>' : ''}</div>
                <div class="list-row__meta">${escapeHtml(u.id)} · ${escapeHtml(formatTime(u.createdAt))}</div>
              </div>
              <div class="list-row__actions">
                <button type="button" class="btn btn--ghost" data-act="edit">编辑</button>
                <button type="button" class="btn btn--danger" data-act="del" ${
                  u.id === meId ? 'disabled title="不能删除自己"' : ''
                }>删除</button>
              </div>
            </div>`,
            )
            .join('')}
        </div>`

      listEl.querySelectorAll('[data-act="edit"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.closest('.list-row')?.dataset.id
          const u = users.find((x) => x.id === id)
          if (u) openEditor(u)
        })
      })
      listEl.querySelectorAll('[data-act="del"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.closest('.list-row')?.dataset.id
          const u = users.find((x) => x.id === id)
          if (!u || u.id === meId) return
          if (
            !confirm(
              `确定删除用户「${u.username}」？其私有题库、题目与学习数据将一并删除，且不可恢复。`,
            )
          ) {
            return
          }
          try {
            await api.adminDeleteUser(u.id)
            if (editingId === u.id) closeEditor()
            showFlash(flash, `已删除 ${u.username}`, 'ok')
            await loadUsers()
          } catch (e) {
            showFlash(flash, e.message, 'err')
          }
        })
      })
    } catch (e) {
      listEl.innerHTML = `<p class="empty__desc">${escapeHtml(e.message || '加载失败')}</p>`
    }
  }

  el.querySelector('#btnGenPass')?.addEventListener('click', () => {
    const pwd = genPassword()
    const input = el.querySelector('#newPass')
    if (input) {
      input.type = 'text'
      input.value = pwd
    }
    if (genHint) {
      genHint.hidden = false
      genHint.textContent = `已填入随机密码（请复制保存）：${pwd}`
    }
  })

  el.querySelector('#btnCreate')?.addEventListener('click', async () => {
    const username = el.querySelector('#newUser')?.value.trim() || ''
    const password = el.querySelector('#newPass')?.value || ''
    const isAdmin = !!el.querySelector('#newIsAdmin')?.checked
    try {
      const data = await api.adminCreateUser({ username, password, isAdmin })
      showFlash(
        flash,
        `已创建 ${data.user?.username}${data.user?.isAdmin ? '（管理员）' : ''}`,
        'ok',
      )
      el.querySelector('#newUser').value = ''
      el.querySelector('#newPass').value = ''
      el.querySelector('#newIsAdmin').checked = false
      if (genHint) genHint.hidden = true
      await loadUsers()
    } catch (e) {
      showFlash(flash, e.message, 'err')
    }
  })

  el.querySelector('#btnRefresh')?.addEventListener('click', () => void loadUsers())
  await loadUsers()
}
