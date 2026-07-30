import { escapeHtml, showFlash } from '../lib/dom.js'
import { FONT_SIZE_MIN, FONT_SIZE_MAX } from '../lib/settings.js'

export function renderSettings(el, { store, api }) {
  const s = store.settings

  el.innerHTML = `
    <header class="page-header">
      <h1 class="page-header__title">设置</h1>
      <p class="page-header__desc">主题、字号与练习默认项会同步到云端。</p>
    </header>
    <div id="flash" class="flash" hidden></div>
    <section class="card">
      <h2 class="card__title">外观</h2>
      <label class="field"><span>主题</span>
        <select id="theme">
          <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>深色</option>
          <option value="light" ${s.theme === 'light' ? 'selected' : ''}>浅色</option>
          <option value="system" ${s.theme === 'system' ? 'selected' : ''}>跟随系统</option>
        </select>
      </label>
      <label class="field"><span>阅读字号（${FONT_SIZE_MIN}–${FONT_SIZE_MAX}）</span>
        <input type="number" id="fontSize" min="${FONT_SIZE_MIN}" max="${FONT_SIZE_MAX}" value="${s.fontSize}" />
      </label>
    </section>
    <section class="card">
      <h2 class="card__title">练习默认</h2>
      <label class="field field--inline"><input type="checkbox" id="shuffleOptions" ${s.shuffleOptions ? 'checked' : ''}/><span>默认打乱选项</span></label>
      <label class="field field--inline"><input type="checkbox" id="blankLoose" ${s.blankLooseMatch ? 'checked' : ''}/><span>填空宽松匹配</span></label>
      <label class="field field--inline"><input type="checkbox" id="autoNext" ${s.autoNextEnabled ? 'checked' : ''}/><span>答后自动下一题</span></label>
      <label class="field"><span>自动下一题延迟（秒）</span>
        <input type="number" id="autoNextDelay" min="0" max="30" value="${s.autoNextDelay}" /></label>
      <label class="field"><span>答案展示</span>
        <select id="showAnswerMode">
          <option value="instant" ${s.showAnswerMode === 'instant' ? 'selected' : ''}>即时</option>
          <option value="manual" ${s.showAnswerMode === 'manual' ? 'selected' : ''}>手动确认</option>
        </select>
      </label>
      <label class="field"><span>题库标签筛选</span>
        <select id="tagMode">
          <option value="or" ${s.bankTagMatchMode === 'or' ? 'selected' : ''}>或（任意标签）</option>
          <option value="and" ${s.bankTagMatchMode === 'and' ? 'selected' : ''}>与（同时包含）</option>
        </select>
      </label>
    </section>
    <section class="card">
      <h2 class="card__title">DeepSeek（AI 导入）</h2>
      <label class="field"><span>API Key</span>
        <input id="dsKey" type="password" value="${escapeHtml(s.deepseek.apiKey)}" autocomplete="off" /></label>
      <label class="field"><span>Base URL</span>
        <input id="dsBase" value="${escapeHtml(s.deepseek.baseUrl)}" /></label>
      <label class="field"><span>Model</span>
        <input id="dsModel" value="${escapeHtml(s.deepseek.model)}" /></label>
    </section>
    <section class="card">
      <div class="btn-row">
        <button class="btn btn--primary" id="btnSave">保存设置</button>
        <button class="btn btn--danger" id="btnClear">清空学习数据</button>
      </div>
    </section>`

  const flash = el.querySelector('#flash')

  el.querySelector('#btnSave')?.addEventListener('click', async () => {
    try {
      await store.patchSettings({
        theme: el.querySelector('#theme').value,
        fontSize: Number(el.querySelector('#fontSize').value),
        shuffleOptions: el.querySelector('#shuffleOptions').checked,
        blankLooseMatch: el.querySelector('#blankLoose').checked,
        autoNextEnabled: el.querySelector('#autoNext').checked,
        autoNextDelay: Number(el.querySelector('#autoNextDelay').value) || 0,
        showAnswerMode: el.querySelector('#showAnswerMode').value,
        bankTagMatchMode: el.querySelector('#tagMode').value,
        deepseek: {
          apiKey: el.querySelector('#dsKey').value.trim(),
          baseUrl: el.querySelector('#dsBase').value.trim(),
          model: el.querySelector('#dsModel').value.trim(),
        },
      })
      showFlash(flash, '已保存', 'ok')
    } catch (e) {
      showFlash(flash, e.message, 'err')
    }
  })

  el.querySelector('#btnClear')?.addEventListener('click', async () => {
    if (!confirm('清空收藏、笔记与错题本？不会删除题库。')) return
    try {
      await api.learningClear({})
      await store.refreshLearning()
      showFlash(flash, '学习数据已清空', 'ok')
    } catch (e) {
      showFlash(flash, e.message, 'err')
    }
  })
}
