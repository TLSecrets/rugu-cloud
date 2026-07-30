import { escapeHtml, showFlash } from '../lib/dom.js'

function normalizeImportItem(raw, bankId) {
  const typeMap = {
    single: 'single',
    multiple: 'multiple',
    judge: 'judge',
    blank: 'blank',
    short: 'short',
  }
  const t = typeMap[String(raw.type || 'single').toLowerCase()] || 'single'
  let options = Array.isArray(raw.options) ? raw.options : []
  options = options.map((o, i) => {
    const key = String(o.key || o.label || String.fromCharCode(97 + i))
    return {
      id: o.id || `opt-${key}`,
      key,
      label: String(o.label || key).toUpperCase(),
      content: String(o.content ?? o.text ?? ''),
    }
  })
  const optionKeys = raw.answer?.optionKeys || []
  const texts = raw.answer?.texts || []
  const explanation = raw.explanation || raw.answer?.explanation || ''
  return {
    type: t,
    stem: String(raw.stem || raw.title || ''),
    options,
    answer: {
      optionKeys: Array.isArray(optionKeys) ? optionKeys.map(String) : [],
      texts: Array.isArray(texts) ? texts.map(String) : [],
    },
    explanation,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    domain: raw.domain ? String(raw.domain) : '',
  }
}

export function renderImportExport(el, ctx) {
  const { store, api, navigate } = ctx

  el.innerHTML = `
    <header class="page-header">
      <h1 class="page-header__title">导入导出</h1>
      <p class="page-header__desc">批量导入 JSON（如故 generated 格式），或用 AI 辅助整理后入库。</p>
    </header>
    <div id="flash" class="flash" hidden></div>
    <section class="card">
      <h2 class="card__title">导入到题库</h2>
      <label class="field"><span>目标题库</span>
        <select id="bankSelect">
          ${store.banks
            .filter((b) => !b.isPublic || store.user?.isAdmin)
            .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`)
            .join('') || '<option value="">请先创建题库</option>'}
        </select>
      </label>
      <label class="field"><span>选择 JSON 文件</span>
        <input type="file" id="file" accept="application/json,.json" /></label>
      <label class="field"><span>或粘贴 JSON</span>
        <textarea id="paste" rows="8" placeholder='{ "questions": [ ... ] }'></textarea>
      </label>
      <div class="btn-row">
        <button class="btn btn--primary" id="btnImport">开始导入</button>
        <button class="btn" id="btnExport">导出当前库 JSON</button>
      </div>
    </section>
    <section class="card">
      <h2 class="card__title">AI 辅助整理</h2>
      <p class="muted">使用设置中的 DeepSeek Key，将杂乱文本整理为题目 JSON。</p>
      <label class="field"><span>原始文本</span>
        <textarea id="aiInput" rows="6" placeholder="粘贴题目原文…"></textarea>
      </label>
      <div class="btn-row">
        <button class="btn btn--primary" id="btnAi">调用 AI</button>
        <button class="btn" id="btnAiImport">将下方结果导入所选库</button>
      </div>
      <label class="field"><span>AI 输出</span>
        <textarea id="aiOut" rows="8"></textarea>
      </label>
    </section>
    <section class="card">
      <h2 class="card__title">PDF / 打印</h2>
      <p class="muted">云版可用浏览器打印当前页。也可导出 JSON 后在本地如故中生成 PDF。</p>
      <button class="btn" id="btnPrint">打印本页</button>
    </section>`

  const flash = el.querySelector('#flash')

  async function doImport(json) {
    const bankId = el.querySelector('#bankSelect').value
    if (!bankId) throw new Error('请选择题库')
    const items = Array.isArray(json) ? json : json.questions || json.items || []
    if (!items.length) throw new Error('没有找到 questions 数组')
    const questions = items.map((raw) => normalizeImportItem(raw, bankId))
    // chunk bulk
    const chunk = 40
    let total = 0
    for (let i = 0; i < questions.length; i += chunk) {
      const part = questions.slice(i, i + chunk)
      const res = await api.bulkQuestions({ bankId, questions: part })
      total += res.count || part.length
    }
    store.invalidateQuestions(bankId)
    await store.refreshBanks()
    return total
  }

  el.querySelector('#btnImport')?.addEventListener('click', async () => {
    try {
      let text = el.querySelector('#paste').value.trim()
      const file = el.querySelector('#file').files?.[0]
      if (file) text = await file.text()
      if (!text) throw new Error('请选择文件或粘贴 JSON')
      const json = JSON.parse(text)
      const n = await doImport(json)
      showFlash(flash, `成功导入 ${n} 题`, 'ok')
    } catch (e) {
      showFlash(flash, e.message, 'err')
    }
  })

  el.querySelector('#btnExport')?.addEventListener('click', async () => {
    try {
      const bankId = el.querySelector('#bankSelect').value
      if (!bankId) throw new Error('请选择题库')
      const qs = await store.loadQuestions(bankId)
      const bank = store.getBank(bankId)
      const blob = new Blob(
        [JSON.stringify({ bank: { name: bank?.name, description: bank?.description }, questions: qs }, null, 2)],
        { type: 'application/json' },
      )
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${bank?.name || 'bank'}.json`
      a.click()
      showFlash(flash, '已开始下载', 'ok')
    } catch (e) {
      showFlash(flash, e.message, 'err')
    }
  })

  el.querySelector('#btnAi')?.addEventListener('click', async () => {
    try {
      const text = el.querySelector('#aiInput').value.trim()
      if (!text) throw new Error('请输入原始文本')
      const res = await api.aiChat({
        messages: [
          {
            role: 'system',
            content:
              '你是题库整理助手。把用户文本整理为 JSON：{"questions":[{"type":"single|multiple|judge|blank|short","stem":"...","options":[{"key":"a","label":"A","content":"..."}],"answer":{"optionKeys":["a"],"texts":[]},"explanation":""}]}。只输出 JSON。',
          },
          { role: 'user', content: text },
        ],
      })
      el.querySelector('#aiOut').value = res.content || ''
      showFlash(flash, 'AI 已返回，请检查后导入', 'ok')
    } catch (e) {
      showFlash(flash, e.message, 'err')
    }
  })

  el.querySelector('#btnAiImport')?.addEventListener('click', async () => {
    try {
      let raw = el.querySelector('#aiOut').value.trim()
      const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fence) raw = fence[1]
      const json = JSON.parse(raw)
      const n = await doImport(json)
      showFlash(flash, `从 AI 结果导入 ${n} 题`, 'ok')
    } catch (e) {
      showFlash(flash, e.message, 'err')
    }
  })

  el.querySelector('#btnPrint')?.addEventListener('click', () => window.print())
}
