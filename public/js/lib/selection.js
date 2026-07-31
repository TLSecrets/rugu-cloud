/**
 * 列表多选辅助：全选 / 已选 ids
 * @param {HTMLElement} root
 * @param {{ itemSelector?: string, checkSelector?: string, masterSelector?: string }} [opts]
 */
export function bindSelection(root, opts = {}) {
  const itemSel = opts.itemSelector || '[data-select-id]'
  const checkSel = opts.checkSelector || 'input[data-select]'
  const masterSel = opts.masterSelector || '#selectAll'

  function items() {
    return [...root.querySelectorAll(itemSel)]
  }

  function checks() {
    return [...root.querySelectorAll(checkSel)].filter((el) => !el.disabled)
  }

  function selectedIds() {
    return checks()
      .filter((el) => el.checked)
      .map((el) => el.closest(itemSel)?.getAttribute('data-select-id') || el.value)
      .filter(Boolean)
  }

  function syncMaster() {
    const master = root.querySelector(masterSel)
    if (!master) return
    const list = checks()
    const n = list.filter((c) => c.checked).length
    master.checked = list.length > 0 && n === list.length
    master.indeterminate = n > 0 && n < list.length
  }

  root.querySelector(masterSel)?.addEventListener('change', (e) => {
    const on = !!e.target.checked
    checks().forEach((c) => {
      c.checked = on
    })
    syncMaster()
    opts.onChange?.(selectedIds())
  })

  root.querySelectorAll(checkSel).forEach((c) => {
    c.addEventListener('change', () => {
      syncMaster()
      opts.onChange?.(selectedIds())
    })
  })

  syncMaster()
  return { selectedIds, syncMaster, checks }
}

/** 工具栏：全选 + 批量操作按钮占位 */
export function selectionToolbarHtml({ selectAllId = 'selectAll', actionsHtml = '' } = {}) {
  return `<div class="sel-toolbar btn-row">
    <label class="field field--inline sel-all">
      <input type="checkbox" id="${selectAllId}" />
      <span>全选</span>
    </label>
    ${actionsHtml}
  </div>`
}
