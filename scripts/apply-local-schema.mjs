import fs from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
const sql = fs.readFileSync('schema.sql', 'utf8')

for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith('.sqlite') || name === 'metadata.sqlite') continue
  const path = `${dir}/${name}`
  const db = new DatabaseSync(path)
  db.exec(sql)
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
  console.log(name.slice(0, 16) + '...', tables.map((t) => t.name).join(','))
  db.close()
}
