/**
 * 验收冒烟：双用户隔离 + 学习数据越权 + bulk 上限
 * 前提：本地 npm run dev 已启动，且已建表
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = process.env.BASE_URL || 'http://127.0.0.1:8788'
const STRONG = 'IsoPass_12345'

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
  body: JSON.stringify({ username: userA, password: STRONG }),
})
const regB = await b.req('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ username: userB, password: STRONG }),
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
const qA = create.data.question.id

console.log('3) B cannot list A private questions')
const leak = await b.req(`/api/questions?bankId=${encodeURIComponent(bankA)}`)
assert(leak.status === 403, `expected 403 for B reading A bank, got ${leak.status}`)

console.log('4) B bank list excludes A private bank')
const banksB = await b.req('/api/banks')
assert(banksB.data.ok, 'B banks failed')
const idsB = (banksB.data.banks || []).map((x) => x.id)
assert(!idsB.includes(bankA), 'B should not see A private bank')
assert(idsB.includes(bankB), 'B should see own bank')

console.log('5) B cannot favorite / note A private question')
const favLeak = await b.req('/api/favorites', {
  method: 'POST',
  body: JSON.stringify({ questionId: qA, bankId: bankA }),
})
assert(favLeak.status === 403, `fav expected 403, got ${favLeak.status}`)
const noteLeak = await b.req('/api/notes', {
  method: 'POST',
  body: JSON.stringify({ questionId: qA, bankId: bankA, content: 'x' }),
})
assert(noteLeak.status === 403, `note expected 403, got ${noteLeak.status}`)
const wrongLeak = await b.req('/api/wrongs', {
  method: 'POST',
  body: JSON.stringify({ questionId: qA, bankId: bankA }),
})
assert(wrongLeak.status === 403, `wrong expected 403, got ${wrongLeak.status}`)

console.log('6) non-admin cannot create public bank')
const pub = await b.req('/api/banks', {
  method: 'POST',
  body: JSON.stringify({ name: 'hack-public', isPublic: true }),
})
assert(pub.status === 403, `public bank expected 403, got ${pub.status}`)

console.log('7) bulk over limit rejected')
const bulk = await b.req('/api/questions/bulk', {
  method: 'POST',
  body: JSON.stringify({
    bankId: bankB,
    questions: Array.from({ length: 501 }, (_, i) => ({
      type: 'judge',
      stem: `t${i}`,
      options: [
        { key: 'T', text: '对' },
        { key: 'F', text: '错' },
      ],
      answer: { optionKeys: ['T'] },
    })),
  }),
})
assert(bulk.status === 400, `bulk limit expected 400, got ${bulk.status}`)

console.log('8) optional sample import into B bank')
const samplePath = resolve('import-ready-sample.json')
try {
  let sample
  try {
    sample = JSON.parse(readFileSync(samplePath, 'utf8'))
  } catch {
    const src = resolve('../如故/public/generated/generated-构建示例.json')
    sample = JSON.parse(readFileSync(src, 'utf8'))
  }
  const items = (sample.questions || []).slice(0, 20)
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
  }
  console.log('imported', imported)
} catch (e) {
  console.log('sample import skipped:', e.message)
}

console.log('OK isolation + hardening', { userA, userB, bankA, bankB })
