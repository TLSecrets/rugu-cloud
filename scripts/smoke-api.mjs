const base = process.env.BASE_URL || 'http://127.0.0.1:8788'
const cookieJar = { value: '' }

function storeCookies(res) {
  const raw = res.headers.getSetCookie?.() || []
  const list = raw.length
    ? raw
    : res.headers.get('set-cookie')
      ? [res.headers.get('set-cookie')]
      : []
  for (const c of list) {
    const part = String(c).split(';')[0]
    if (part) cookieJar.value = part
  }
}

async function req(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (cookieJar.value) headers.Cookie = cookieJar.value
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${base}${path}`, { ...options, headers })
  storeCookies(res)
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }
  return { status: res.status, data, headers: res.headers }
}

const user = `u${Date.now().toString(36)}`
const password = 'SmokePass_12345'

const reg = await req('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ username: user, password }),
})
console.log('REGISTER', reg.status, reg.data.ok)

const setCookie = reg.headers.get('set-cookie') || ''
console.log('COOKIE_HttpOnly', /HttpOnly/i.test(setCookie))
console.log('COOKIE_SameSite', /SameSite=Lax/i.test(setCookie))

const me = await req('/api/auth/me')
console.log('ME', me.status, me.data?.user?.username)

const banks = await req('/api/banks')
console.log('BANKS', banks.status, banks.data?.banks?.length)
const bankId = banks.data.banks?.[0]?.id
if (!bankId) process.exit(1)

const q = await req('/api/questions', {
  method: 'POST',
  body: JSON.stringify({
    bankId,
    type: 'single',
    stem: '1+1=?',
    options: [
      { id: 'opt-a', key: 'a', label: 'A', content: '1' },
      { id: 'opt-b', key: 'b', label: 'B', content: '2' },
    ],
    answer: { optionKeys: ['b'], texts: [] },
    explanation: 'basic',
  }),
})
console.log('QUESTION', q.status, q.data?.ok, q.data?.question?.id || q.data?.error)

const list = await req(`/api/questions?bankId=${encodeURIComponent(bankId)}`)
console.log('LIST', list.status, list.data.questions?.length)

const weak = await req('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ username: `w${Date.now().toString(36)}`, password: 'demo1234' }),
})
console.log('WEAK_PWD', weak.status, weak.data?.error)

const publicBank = await req('/api/banks', {
  method: 'POST',
  body: JSON.stringify({ name: '应被拒绝的公共库', isPublic: true }),
})
console.log('PUBLIC_AS_USER', publicBank.status)

const bulkTooBig = await req('/api/questions/bulk', {
  method: 'POST',
  body: JSON.stringify({
    bankId,
    questions: Array.from({ length: 501 }, (_, i) => ({
      type: 'judge',
      stem: `bulk${i}`,
      options: [
        { key: 'T', text: '对' },
        { key: 'F', text: '错' },
      ],
      answer: { optionKeys: ['T'] },
    })),
  }),
})
console.log('BULK_LIMIT', bulkTooBig.status)

const oldCookie = cookieJar.value
const logout = await req('/api/auth/logout', { method: 'POST', body: '{}' })
console.log('LOGOUT', logout.status, logout.data?.ok)

cookieJar.value = oldCookie
const after = await req('/api/banks')
console.log('AFTER_LOGOUT', after.status)

const unauth = await fetch(`${base}/api/banks`)
console.log('UNAUTH', unauth.status)
