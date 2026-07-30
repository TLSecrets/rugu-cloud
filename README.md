# 如故云题库

独立于 Vue「如故」的在线题库：Cloudflare Pages（原生 SPA）+ Pages Functions（API）+ D1（数据）+ KV（会话）。无 IndexedDB。

线上：https://rugu-cloud.pages.dev · 测试账号见 [docs/TEST_ACCOUNTS.md](docs/TEST_ACCOUNTS.md)

题型：`single` | `multiple` | `judge` | `blank` | `short`

---

## 功能概览

| 能力 | 说明 |
|------|------|
| 注册 / 登录 | PBKDF2 存 D1；会话 Cookie → KV |
| SPA 壳层 | 侧栏 / 底栏 / 主题 / 字号，hash 路由 `#/…` |
| 题库 | 私有库 + 公共库（管理员可写） |
| 练习 / 考试 | 判分、收藏、错题、笔记 |
| 搜索 / 导入导出 | 题干搜索、JSON 导入导出、AI 辅助（可选） |
| 设置 / 手册 | 主题、字号、判分选项、使用说明 |

---

## 本地开发

```bash
npm install
npx wrangler login
npm run db:local          # 或 node scripts/apply-local-schema.mjs
npm run dev               # http://127.0.0.1:8788
npm run seed              # 注册 demo/alice/bob/admin
npm run smoke
```

---

## 生产部署

线上项目用 **Wrangler 直传**（`rugu-cloud.pages.dev`）。推送 GitHub 不会自动更新 Cloudflare Pages。

```bash
npx wrangler login          # 本机交互登录（token 过期时必做）
npm run deploy:prod         # 远端 schema-extend + pages deploy + 种子账号
```

或分步：

```bash
npm run db:extend
npm run db:migrate-cols     # 列已存在可忽略报错
npx wrangler pages deploy public --project-name=rugu-cloud --commit-dirty=true
BASE_URL=https://rugu-cloud.pages.dev npm run seed
```

D1 Console 设管理员：

```sql
UPDATE users SET is_admin = 1 WHERE username = 'admin';
```

绑定：D1 `DB` → `rugu-cloud-db`，KV `SESSIONS`。

---

## 从如故 Vue 迁移

见 [docs/MIGRATION.md](docs/MIGRATION.md)。也可在「导入导出」页粘贴 JSON。

---

## 目录结构

```
rugu-cloud/
  schema.sql / schema-extend.sql / schema-migrate.sql
  wrangler.toml
  public/                 # SPA（index.html + css/ + js/）
  functions/api/          # auth, banks, questions, settings, favorites…
  docs/TEST_ACCOUNTS.md
```

路由：`#/` `#/banks` `#/practice` `#/exam` `#/wrong` `#/search` `#/favorites` `#/notes` `#/import-export` `#/guide` `#/settings` `#/login`
