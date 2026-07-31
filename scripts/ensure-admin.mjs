#!/usr/bin/env node
/**
 * 远端确保存在测试管理员（upsert 密码 + is_admin=1）
 * 需要：CLOUDFLARE_API_TOKEN 或 wrangler login
 *
 * node scripts/ensure-admin.mjs
 * node scripts/ensure-admin.mjs --username=rugu_ops
 */
import { spawnSync } from 'node:child_process'
import { randomBytes, webcrypto } from 'node:crypto'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'c97c691d67221dda984198195ab68975'
process.env.CLOUDFLARE_ACCOUNT_ID = accountId

const argUser = process.argv.find((a) => a.startsWith('--username='))
const username = (argUser ? argUser.slice('--username='.length) : 'rugu_ops').trim()
const password =
  process.env.ADMIN_PASSWORD ||
  `Rg!${randomBytes(12).toString('base64url')}_${randomBytes(4).toString('hex')}`

const PBKDF2_ITERS = 100_000

function b64(buf) {
  return Buffer.from(buf).toString('base64')
}

async function hashPassword(plain) {
  const enc = new TextEncoder()
  const salt = webcrypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await webcrypto.subtle.importKey(
    'raw',
    enc.encode(String(plain)),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return `pbkdf2$${PBKDF2_ITERS}$${b64(salt)}$${b64(bits)}`
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''")
}

function runWrangler(args) {
  const r = spawnSync('npx', ['wrangler', ...args], {
    encoding: 'utf8',
    shell: true,
    env: process.env,
  })
  if (r.status !== 0) {
    console.error(r.stdout || '')
    console.error(r.stderr || '')
    process.exit(r.status ?? 1)
  }
  return r.stdout || ''
}

const hash = await hashPassword(password)
const id = `usr_${randomBytes(8).toString('hex')}`
const now = Date.now()
const bankId = `bank_${randomBytes(8).toString('hex')}`

const sql = `
INSERT INTO users (id, username, password_hash, is_admin, created_at)
VALUES ('${sqlEscape(id)}', '${sqlEscape(username)}', '${sqlEscape(hash)}', 1, ${now})
ON CONFLICT(username) DO UPDATE SET
  password_hash = excluded.password_hash,
  is_admin = 1;

INSERT INTO banks (id, owner_user_id, name, description, is_public, tags, created_at, updated_at)
SELECT '${sqlEscape(bankId)}', u.id, '我的题库', '默认私有题库', 0, '[]', ${now}, ${now}
FROM users u WHERE u.username = '${sqlEscape(username)}'
AND NOT EXISTS (SELECT 1 FROM banks b WHERE b.owner_user_id = u.id LIMIT 1);
`

const tmp = join(tmpdir(), `rugu-ensure-admin-${Date.now()}.sql`)
writeFileSync(tmp, sql, 'utf8')
try {
  runWrangler(['d1', 'execute', 'rugu-cloud-db', '--remote', `--file=${tmp}`])
} finally {
  try {
    unlinkSync(tmp)
  } catch {
    /* ignore */
  }
}

console.log('\n=== 测试管理员已就绪（请自行保存，不会再次显示）===')
console.log(`username: ${username}`)
console.log(`password: ${password}`)
console.log('登录后侧栏/更多中应看到「管理」入口；题库页可勾选公共题库。')
