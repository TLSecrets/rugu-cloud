#!/usr/bin/env node
/**
 * 将如故 Vue 题库 JSON 整理为云题库「导入 JSON」可用的文件。
 * 支持 generated-*.json，以及 banks 目录下带 questions 数组的 JSON。
 *
 * 用法：
 *   node scripts/migrate-from-rugu.mjs <源文件> [-o 输出.json]
 *
 * 不调用 API；导入请在管理页完成。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
if (!args[0] || args[0] === '-h' || args[0] === '--help') {
  console.log('Usage: node scripts/migrate-from-rugu.mjs <source.json> [-o out.json]')
  process.exit(args[0] ? 0 : 1)
}

const srcPath = resolve(args[0])
let outPath = resolve('import-ready.json')
const oi = args.indexOf('-o')
if (oi >= 0 && args[oi + 1]) outPath = resolve(args[oi + 1])

const raw = JSON.parse(readFileSync(srcPath, 'utf8'))
const bankMeta = raw.bank || {}
const list = Array.isArray(raw) ? raw : raw.questions || raw.items || []

if (!Array.isArray(list) || !list.length) {
  console.error('源文件中未找到 questions 数组')
  process.exit(1)
}

const questions = list.map((q, i) => {
  const type = String(q.type || 'single')
  const options = (q.options || []).map((o, j) => {
    const key = String(o.key || o.label || String.fromCharCode(97 + j))
    return {
      id: o.id || `opt-${key}`,
      key,
      label: String(o.label || key).toUpperCase(),
      content: String(o.content ?? o.text ?? ''),
    }
  })
  const answer = {
    optionKeys: Array.isArray(q.answer?.optionKeys)
      ? q.answer.optionKeys.map(String)
      : [],
    texts: Array.isArray(q.answer?.texts) ? q.answer.texts.map(String) : [],
  }
  const explanation =
    q.explanation || q.answer?.explanation || q.analysis || ''

  return {
    type,
    stem: String(q.stem || ''),
    options,
    answer,
    explanation,
    tags: Array.isArray(q.tags) ? q.tags : [],
    domain: q.domain || '',
    sortOrder: i,
  }
})

const out = {
  bank: {
    name: bankMeta.name || '导入题库',
    description: bankMeta.description || `从 ${srcPath} 迁移`,
    tags: bankMeta.tags || [],
  },
  questions,
  meta: {
    source: srcPath,
    count: questions.length,
    migratedAt: new Date().toISOString(),
  },
}

writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8')
console.log(`Wrote ${questions.length} questions → ${outPath}`)
