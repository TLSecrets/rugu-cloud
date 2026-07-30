# 如故云题库

独立于 Vue「如故」的在线题库：Cloudflare Pages（原生 SPA）+ Pages Functions（API）+ D1（数据）+ KV（会话）。无 IndexedDB。

线上：https://rugu-cloud.pages.dev

题型：`single` | `multiple` | `judge` | `blank` | `short`

---

## 功能概览

| 能力 | 说明 |
|------|------|
| 注册 / 登录 | PBKDF2 存 D1；会话 Cookie（HttpOnly / SameSite）→ KV |
| SPA 壳层 | 单根状态机 + 统一导航配置，hash 路由 `#/…` |
| 题库 | 私有库 + 公共库（管理员可写，后端 ACL） |
| 练习 / 考试 | 判分、收藏、错题、笔记（按用户隔离） |
| 导入导出 | JSON bulk（条数/体积上限） |
| 设置 | 主题等服务端持久化 + 本地缓存防闪烁 |

---

## 本地开发

```bash
npm install
npx wrangler login
npm run db:local          # 或 node scripts/apply-local-schema.mjs
npm run dev               # http://127.0.0.1:8788
npm run seed              # 仅 localhost
npm run smoke
npm run smoke:isolation
```

本地测试账号说明见 [docs/TEST_ACCOUNTS.md](docs/TEST_ACCOUNTS.md)（不含生产口令）。

---

## 生产部署

```bash
npx wrangler login
npm run deploy:prod       # schema-extend + pages deploy（不 seed）
```

在 Cloudflare Pages → Settings → Environment variables 设置：

- `ALLOW_REGISTER=false`（关闭开放注册；用 `POST /api/admin/users` 建号）

绑定：D1 `DB` → `rugu-cloud-db`，KV `SESSIONS`。

清理历史演示用户名（可选）：

```bash
node scripts/purge-test-users.mjs --remote
```

---

## 安全要点

- 密码：PBKDF2-SHA256 + 盐；策略 ≥10 位，拒绝「用户名+1234」模板
- 会话：KV 存储；登出删除；每次请求从 D1 刷新 `is_admin`
- API：`requireUser` / `requireAdmin` + 题库 ACL + 学习数据 `owner_user_id`
- 中间件：安全头、CORS 白名单、登录/注册限流
- 审计：`audit_logs`（bulk / 清学习数据 / 建公共库 / 管理员建号）

---

## 目录结构

```
rugu-cloud/
  schema.sql / schema-extend.sql
  wrangler.toml
  public/                 # SPA
  functions/api/          # auth, banks, questions, admin, …
  docs/TEST_ACCOUNTS.md   # 仅本地说明
```

路由：`#/` `#/banks` `#/practice` `#/exam` `#/wrong` `#/search` `#/favorites` `#/notes` `#/import-export` `#/guide` `#/settings` `#/login`
