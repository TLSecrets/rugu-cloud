import { renderHome } from './home.js'
import { renderBanks } from './banks.js'
import { renderPractice } from './practice.js'
import { renderExam } from './exam.js'
import { renderExamResult } from './examResult.js'
import { renderWrong } from './wrong.js'
import { renderSearch } from './search.js'
import { renderFavorites } from './favorites.js'
import { renderNotes } from './notes.js'
import { renderImportExport } from './importExport.js'
import { renderGuide } from './guide.js'
import { renderSettings } from './settings.js'

export function renderNotFound(el, { navigate }) {
  el.innerHTML = `
    <div class="empty">
      <p class="empty__title">页面不存在</p>
      <p class="empty__desc">请从导航重新进入。</p>
      <div class="btn-row" style="justify-content:center;margin-top:1rem">
        <button type="button" class="btn btn--primary" id="goHome">回首页</button>
      </div>
    </div>`
  el.querySelector('#goHome')?.addEventListener('click', () => navigate('/'))
}

export const VIEWS = {
  '/': renderHome,
  '/banks': renderBanks,
  '/practice': renderPractice,
  '/exam': renderExam,
  '/exam-result': renderExamResult,
  '/wrong': renderWrong,
  '/search': renderSearch,
  '/favorites': renderFavorites,
  '/notes': renderNotes,
  '/import-export': renderImportExport,
  '/guide': renderGuide,
  '/settings': renderSettings,
  '/404': renderNotFound,
}
