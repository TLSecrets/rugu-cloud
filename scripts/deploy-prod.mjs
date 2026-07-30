#!/usr/bin/env node
/**
 * 远端增量建表 + 部署 Pages（不再自动 seed 测试账号）
 * 需要：npx wrangler login  或  CLOUDFLARE_API_TOKEN
 *
 * node scripts/deploy-prod.mjs
 */
import { spawnSync } from 'node:child_process'

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'c97c691d67221dda984198195ab68975'
process.env.CLOUDFLARE_ACCOUNT_ID = accountId

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

{
  const r = spawnSync('npx', ['wrangler', 'whoami'], { encoding: 'utf8', shell: true })
  if (r.status !== 0 || /Not logged in|Invalid access token/i.test(r.stdout + r.stderr)) {
    console.error('\n未登录 Cloudflare。请先在本机终端执行：\n  npx wrangler login\n或设置 CLOUDFLARE_API_TOKEN 后重试。\n')
    process.exit(1)
  }
}

run('npx', ['wrangler', 'd1', 'execute', 'rugu-cloud-db', '--remote', '--file=./schema-extend.sql'])
{
  const r = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'rugu-cloud-db', '--remote', '--file=./schema-migrate.sql'],
    { stdio: 'inherit', shell: true },
  )
  if (r.status !== 0) console.warn('(schema-migrate 有失败可忽略：列可能已存在)')
}

run('npx', [
  'wrangler',
  'pages',
  'deploy',
  'public',
  '--project-name=rugu-cloud',
  '--commit-dirty=true',
])

console.log(`
部署完成：https://rugu-cloud.pages.dev

建议生产环境变量：
  ALLOW_REGISTER=false

清理历史演示账号（可选）：
  node scripts/purge-test-users.mjs --remote

管理员建号：POST /api/admin/users（需已有管理员会话）
`)
