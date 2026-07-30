/**
 * 验收冒烟：双用户隔离 + 如故 JSON 导入
 * 前提：本地 npm run dev 已启动，且已建表
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = process.env.BASE_URL || 'http://127.0.0.1:8788'

function makeClient() {
  let cookie = ''
  return {
    async req(path, options = {}) {
      const headers = { ...(options.headers || {}) }
      if (cookie) headers.Cookie = cookie
      if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }
      const res = await fetch(`${base}${path}`, { ...options, headers })
      const set = res.headers.getSetCookie?.() || []
      const list = set.length
        ? set
        : res.headers.get('set-cookie')
          ? [res.headers.get('set-cookie')]
          : []
      for (const c of list) {
        const part = String(c).split(';')[0]
        if (part) cookie = part
      }
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = { raw: text }
      }
      return { status: res.status, data }
    },
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const stamp = Date.now().toString(36)
const userA = `a_${stamp}`
const userB = `b_${stamp}`

const a = makeClient()
const b = makeClient()

console.log('1) register A/B')
const regA = await a.req('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ username: userA, password: 'test1234' }),
})
const regB = await b.req('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ username: userB, password: 'test1234' }),
})
assert(regA.data.ok, `A register failed: ${JSON.stringify(regA.data)}`)
assert(regB.data.ok, `B register failed: ${JSON.stringify(regB.data)}`)

const bankA = regA.data.defaultBankId
const bankB = regB.data.defaultBankId
assert(bankA && bankB && bankA !== bankB, 'default banks should differ')

console.log('2) A writes a private question')
const create = await a.req('/api/questions', {
  method: 'POST',
  body: JSON.stringify({
    bankId: bankA,
    type: 'judge',
    stem: '私有题仅 A 可见',
    options: [
      { id: 'opt-T', key: 'T', label: '正确', content: '正确' },
      { id: 'opt-F', key: 'F', label: '错误', content: '错误' },
    ],
    answer: { optionKeys: ['T'], texts: [] },
  }),
})
assert(create.status === 201 && create.data.ok, `create failed: ${JSON.stringify(create.data)}`)

console.log('3) B cannot list A private questions')
const leak = await b.req(`/api/questions?bankId=${encodeURIComponent(bankA)}`)
assert(leak.status === 403, `expected 403 for B reading A bank, got ${leak.status}`)

console.log('4) B bank list excludes A private bank')
const banksB = await b.req('/api/banks')
assert(banksB.data.ok, 'B banks failed')
const idsB = (banksB.data.banks || []).map((x) => x.id)
assert(!idsB.includes(bankA), 'B should not see A private bank')
assert(idsB.includes(bankB), 'B should see own bank')

console.log('5) import 如故 sample JSON into B bank')
const samplePath = resolve('import-ready-sample.json')
let sample
try {
  sample = JSON.parse(readFileSync(samplePath, 'utf8'))
} catch {
  // generate on the fly from sibling 如故 if sample missing
  const src = resolve('../如故/public/generated/generated-构建示例.json')
  sample = JSON.parse(readFileSync(src, 'utf8'))
}
const items = sample.questions || []
assert(items.length > 0, 'no questions to import')
let imported = 0
for (const raw of items) {
  const body = {
    bankId: bankB,
    type: raw.type,
    stem: raw.stem,
    options: raw.options || [],
    answer: {
      optionKeys: raw.answer?.optionKeys || [],
      texts: raw.answer?.texts || [],
    },
    explanation: raw.explanation || raw.answer?.explanation || '',
    tags: raw.tags || [],
    domain: raw.domain || '',
  }
  const r = await b.req('/api/questions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (r.data.ok) imported++
  else console.warn('import fail', r.data.error)
}
assert(imported === items.length, `imported ${imported}/${items.length}`)

const listB = await b.req(`/api/questions?bankId=${encodeURIComponent(bankB)}`)
assert(listB.data.questions?.length === imported, 'list count mismatch after import')

console.log('OK isolation + import', {
  userA,
  userB,
  bankA,
  bankB,
  imported,
})
