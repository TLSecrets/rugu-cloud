# 本地测试账号（勿用于生产）

本仓库**不会**在公开文档中列出生产环境口令。

## 规则

- 仅允许对 `http://127.0.0.1` / `http://localhost` 执行 `npm run seed`
- 生产部署脚本**不再**自动 seed
- 生产环境请在 Cloudflare Pages 设置 `ALLOW_REGISTER=false`，由管理员调用 `POST /api/admin/users` 建号
- 密码策略：至少 10 位，禁止「用户名+1234」类模板

## 本地种子

```bash
npm run db:local
npm run dev
npm run seed
```

种子脚本会创建若干本地用户（口令见 `scripts/seed-test-accounts.mjs`，仅本地）。

清理已知弱口令用户名（需 wrangler 已登录）：

```bash
node scripts/purge-test-users.mjs --remote
```
