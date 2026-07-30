/**
 * 判分逻辑（对齐如故 Vue 版简化规则）
 * - 单选/判断/多选：optionKeys 集合完全一致
 * - 填空：按空比对，可宽松去空白/忽略大小写
 * - 简答：不自动判对错，返回 ungraded
 */

function normalizeBlank(text, loose) {
  const t = String(text ?? '').trim()
  if (!loose) return t
  return t.replace(/\s+/g, '').toLowerCase()
}

function sameKeySet(a, b) {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((k) => set.has(k))
}

/**
 * @param {object} question  后端返回的题目
 * @param {{ optionKeys: string[], texts: string[] }} answer
 * @param {{ blankLooseMatch?: boolean }} [opts]
 */
export function gradeQuestion(question, answer, opts = {}) {
  const loose = opts.blankLooseMatch !== false
  const expectedKeys = question.answer?.optionKeys || []
  const expectedTexts = question.answer?.texts || []
  const selected = answer.optionKeys || []
  const texts = answer.texts || []

  switch (question.type) {
    case 'single':
    case 'judge': {
      if (!selected.length) return { verdict: 'wrong', message: '未作答' }
      const ok = sameKeySet(expectedKeys, selected)
      return { verdict: ok ? 'correct' : 'wrong', message: ok ? '回答正确' : '回答错误' }
    }
    case 'multiple': {
      if (!selected.length) return { verdict: 'wrong', message: '未作答' }
      const ok = sameKeySet(expectedKeys, selected)
      return {
        verdict: ok ? 'correct' : 'wrong',
        message: ok ? '全部选对' : '多选需与标准答案完全一致',
      }
    }
    case 'blank': {
      if (!expectedTexts.length) {
        return { verdict: 'ungraded', message: '本题无标准填空答案' }
      }
      const filled = expectedTexts.map((_, i) => texts[i] ?? '')
      if (filled.every((t) => !String(t).trim())) {
        return { verdict: 'wrong', message: '未作答' }
      }
      let hit = 0
      for (let i = 0; i < expectedTexts.length; i++) {
        // 标准答可用 | 分隔多个可接受答案
        const alts = String(expectedTexts[i])
          .split('|')
          .map((s) => normalizeBlank(s, loose))
          .filter(Boolean)
        const got = normalizeBlank(filled[i], loose)
        if (got && alts.includes(got)) hit++
      }
      if (hit === expectedTexts.length) {
        return { verdict: 'correct', message: '填空全部正确' }
      }
      if (hit > 0) {
        return { verdict: 'partial', message: `部分正确（${hit}/${expectedTexts.length}）` }
      }
      return { verdict: 'wrong', message: '填空不正确' }
    }
    case 'short':
      return { verdict: 'ungraded', message: '请对照参考答案自评' }
    default:
      return { verdict: 'ungraded', message: '未知题型' }
  }
}

export const TYPE_LABELS = {
  single: '单选',
  multiple: '多选',
  judge: '判断',
  blank: '填空',
  short: '简答',
}
