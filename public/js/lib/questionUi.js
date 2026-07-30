import { gradeQuestion, TYPE_LABELS, VERDICT_LABELS, emptyAnswer } from './grade.js'
import { escapeHtml, escapeAttr } from './dom.js'
import { fisherYates } from './shuffle.js'

export function renderQuestionHtml(q, answer, graded, settings = {}) {
  let body = `<div class="stem"><span class="badge">${TYPE_LABELS[q.type] || q.type}</span>${escapeHtml(q.stem)}</div>`

  if (q.type === 'single' || q.type === 'multiple' || q.type === 'judge') {
    let options = q.options || []
    if (settings.shuffleOptions && !graded) options = fisherYates(options)
    const multi = q.type === 'multiple'
    body += options
      .map((o) => {
        const on = answer.optionKeys.includes(o.key)
        let cls = 'opt' + (on ? ' opt--on' : '')
        if (graded) {
          const correct = (q.answer?.optionKeys || []).includes(o.key)
          if (correct) cls += ' opt--correct'
          else if (on) cls += ' opt--wrong'
        }
        const label = o.label || String(o.key || '').toUpperCase()
        const text = o.content ?? o.text ?? ''
        return `<label class="${cls}">
          <input type="${multi ? 'checkbox' : 'radio'}" name="opt" value="${escapeAttr(o.key)}" ${on ? 'checked' : ''} ${graded ? 'disabled' : ''} />
          <span><strong>${escapeHtml(label)}.</strong> ${escapeHtml(text)}</span>
        </label>`
      })
      .join('')
  } else if (q.type === 'blank') {
    const n = Math.max(1, (q.answer?.texts || []).length || 1)
    body += Array.from({ length: n }, (_, i) => {
      const v = answer.texts[i] || ''
      return `<label class="field"><span>第 ${i + 1} 空</span>
        <input data-blank="${i}" value="${escapeAttr(v)}" ${graded ? 'readonly' : ''} /></label>`
    }).join('')
  } else if (q.type === 'short') {
    body += `<label class="field"><span>你的作答</span>
      <textarea data-short rows="5" ${graded ? 'readonly' : ''}>${escapeHtml(answer.texts[0] || '')}</textarea></label>`
  }

  if (graded) {
    body += `<div class="result" data-v="${graded.verdict}">
      <strong>${VERDICT_LABELS[graded.verdict] || graded.verdict}</strong> — ${escapeHtml(graded.message)}
      ${renderExplain(q)}
    </div>`
  }
  return body
}

function renderExplain(q) {
  const parts = []
  if (q.answer?.optionKeys?.length) {
    parts.push(`<p class="muted">标准选项：${escapeHtml(q.answer.optionKeys.join(', '))}</p>`)
  }
  if (q.answer?.texts?.length) {
    parts.push(`<p class="muted">参考答案：${escapeHtml(q.answer.texts.join(' / '))}</p>`)
  }
  if (q.explanation) {
    parts.push(`<p>${escapeHtml(q.explanation)}</p>`)
  }
  return parts.join('')
}

export function bindQuestionInputs(root, q, answer, onChange) {
  root.querySelectorAll('input[name="opt"]').forEach((el) => {
    el.addEventListener('change', () => {
      if (q.type === 'multiple') {
        answer.optionKeys = [...root.querySelectorAll('input[name="opt"]:checked')].map((x) => x.value)
      } else {
        answer.optionKeys = [el.value]
      }
      onChange?.()
    })
  })
  root.querySelectorAll('[data-blank]').forEach((el) => {
    el.addEventListener('input', () => {
      const i = Number(el.dataset.blank)
      answer.texts[i] = el.value
      onChange?.()
    })
  })
  const short = root.querySelector('[data-short]')
  if (short) {
    short.addEventListener('input', () => {
      answer.texts = [short.value]
      onChange?.()
    })
  }
}

export function gradeAndReveal(q, answer, settings) {
  return gradeQuestion(q, answer, { blankLooseMatch: settings.blankLooseMatch })
}

export { emptyAnswer, TYPE_LABELS, VERDICT_LABELS }
