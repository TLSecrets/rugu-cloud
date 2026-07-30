const base = 'http://127.0.0.1:8788'
const cookieJar = { value: '' }

function storeCookies(res) {
  const raw = res.headers.getSetCookie?.() || []
  const list = raw.length
    ? raw
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : [])
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
  return { status: res.status, data }
}

const user = `u${Date.now().toString(36)}`
const reg = await req('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ username: user, password: 'test1234' }),
})
console.log('REGISTER', reg.status, reg.data)

const me = await req('/api/auth/me')
console.log('ME', me.status, me.data)

const banks = await req('/api/banks')
console.log('BANKS', banks.status, banks.data)
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

const unauth = await fetch(`${base}/api/banks`)
console.log('UNAUTH', unauth.status)

const logout = await req('/api/auth/logout', { method: 'POST', body: '{}' })
console.log('LOGOUT', logout.status, logout.data)
