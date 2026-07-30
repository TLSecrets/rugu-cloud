#!/usr/bin/env node
/**
 * 清理已知演示/弱口令用户名（及其私有题库、题目、学习数据）
 * node scripts/purge-test-users.mjs           # local
 * node scripts/purge-test-users.mjs --remote
 */
import { spawnSync } from 'node:child_process'

const remote = process.argv.includes('--remote')
const names = ['demo', 'alice', 'bob', 'admin']

const sql = `
DELETE FROM favorites WHERE owner_user_id IN (SELECT id FROM users WHERE username IN ('demo','alice','bob','admin'));
DELETE FROM notes WHERE owner_user_id IN (SELECT id FROM users WHERE username IN ('demo','alice','bob','admin'));
DELETE FROM wrong_records WHERE owner_user_id IN (SELECT id FROM users WHERE username IN ('demo','alice','bob','admin'));
DELETE FROM tag_catalog WHERE owner_user_id IN (SELECT id FROM users WHERE username IN ('demo','alice','bob','admin'));
DELETE FROM settings WHERE owner_user_id IN (SELECT id FROM users WHERE username IN ('demo','alice','bob','admin'));
DELETE FROM questions WHERE owner_user_id IN (SELECT id FROM users WHERE username IN ('demo','alice','bob','admin'));
DELETE FROM banks WHERE owner_user_id IN (SELECT id FROM users WHERE username IN ('demo','alice','bob','admin'));
DELETE FROM users WHERE username IN ('demo','alice','bob','admin');
`

const args = [
  'wrangler',
  'd1',
  'execute',
  'rugu-cloud-db',
  remote ? '--remote' : '--local',
  '--command',
  sql.replace(/\s+/g, ' ').trim(),
]

console.log('Purging users:', names.join(', '), remote ? '(remote)' : '(local)')
const r = spawnSync('npx', args, { stdio: 'inherit', shell: true })
process.exit(r.status ?? 1)
