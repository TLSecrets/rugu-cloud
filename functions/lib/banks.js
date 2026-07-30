/**
 * 题库读写权限：
 * - 私有库：仅 owner 可读写
 * - 公共库：所有登录用户可读；仅管理员可写
 */

import { one } from './db.js'

/** @param {D1Database} db @param {string} bankId */
export async function getBank(db, bankId) {
  return one(db, 'SELECT * FROM banks WHERE id = ?', [bankId])
}

/**
 * @param {any} bank
 * @param {{ userId: string, isAdmin: boolean }} session
 * @param {'read'|'write'} mode
 */
export function canAccessBank(bank, session, mode) {
  if (!bank) return false
  const isPublic = Number(bank.is_public) === 1
  const isOwner = bank.owner_user_id && bank.owner_user_id === session.userId
  if (mode === 'read') {
    return isPublic || isOwner || session.isAdmin
  }
  // write
  if (isPublic) return session.isAdmin
  return isOwner
}

/** 把 DB 行转成前端友好对象 */
export function mapBank(row) {
  if (!row) return null
  let tags = []
  try {
    tags = row.tags ? JSON.parse(row.tags) : []
  } catch {
    tags = []
  }
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    description: row.description || '',
    isPublic: Number(row.is_public) === 1,
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapQuestion(row) {
  if (!row) return null
  let options = []
  let answer = { optionKeys: [], texts: [] }
  let tags = []
  try {
    options = row.options_json ? JSON.parse(row.options_json) : []
  } catch {
    options = []
  }
  try {
    answer = row.answer_json ? JSON.parse(row.answer_json) : answer
  } catch {
    /* keep default */
  }
  try {
    tags = row.tags_json ? JSON.parse(row.tags_json) : []
  } catch {
    tags = []
  }
  return {
    id: row.id,
    bankId: row.bank_id,
    ownerUserId: row.owner_user_id,
    type: row.type,
    stem: row.stem,
    options,
    answer,
    explanation: row.explanation || '',
    tags,
    domain: row.domain || '',
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const ALLOWED_TYPES = new Set(['single', 'multiple', 'judge', 'blank', 'short'])

export function normalizeQuestionInput(body) {
  const type = String(body.type || '').trim()
  if (!ALLOWED_TYPES.has(type)) {
    return { error: '题型无效，应为 single/multiple/judge/blank/short' }
  }
  const stem = String(body.stem || '').trim()
  if (!stem) return { error: '题干不能为空' }

  const options = Array.isArray(body.options) ? body.options : []
  const answer = body.answer && typeof body.answer === 'object' ? body.answer : {}
  const optionKeys = Array.isArray(answer.optionKeys)
    ? answer.optionKeys.map(String)
    : []
  const texts = Array.isArray(answer.texts) ? answer.texts.map(String) : []

  if ((type === 'single' || type === 'judge' || type === 'multiple') && options.length < 2) {
    return { error: '选择题至少需要 2 个选项' }
  }
  if ((type === 'single' || type === 'judge') && optionKeys.length !== 1) {
    return { error: '单选/判断的答案应恰好 1 个 optionKey' }
  }
  if (type === 'multiple' && optionKeys.length < 1) {
    return { error: '多选至少选择 1 个正确答案' }
  }
  if (type === 'blank' && texts.length < 1) {
    return { error: '填空至少需要 1 个标准答案（texts）' }
  }

  const tags = Array.isArray(body.tags) ? body.tags.map(String) : []
  return {
    type,
    stem,
    options,
    answer: { optionKeys, texts },
    explanation: String(body.explanation || ''),
    tags,
    domain: String(body.domain || ''),
    sortOrder: Number(body.sortOrder) || 0,
  }
}
