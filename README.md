# 如故云题库

独立于 Vue「如故」的在线题库：Cloudflare Pages（静态页）+ Pages Functions（API）+ D1（数据）+ KV（会话）。

题型与如故对齐：`single` | `multiple` | `judge` | `blank` | `short`。

---

## 功能概览

| 能力 | 说明 |
|------|------|
| 注册 / 登录 | 密码 bcrypt 存 D1；会话 Cookie → KV |
| 私有题库 | 注册自动创建「我的题库」；仅本人可读写 |
| 公共题库 | 仅管理员可写；所有登录用户可读 |
| 练习页 | `/index.html`，五题型判分 |
| 管理页 | `/admin.html`，CRUD + JSON 导入 |

---

## 一、准备 Cloudflare

1. 注册并登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 安装 Node.js 18+，在本仓库执行：

```bash
npm install
npx wrangler login
```

---

## 二、创建 D1 与 KV

```bash
# 创建 D1 数据库（记下输出的 database_id）
npx wrangler d1 create rugu-cloud-db

# 创建 KV 命名空间（记下 id）
npx wrangler kv namespace create SESSIONS
```

编辑 `wrangler.toml`，把 `REPLACE_WITH_YOUR_D1_DATABASE_ID` 和 `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` 换成真实 ID。

### 执行建表

远程（生产）：

```bash
npx wrangler d1 execute rugu-cloud-db --remote --file=./schema.sql
```

本地开发库：

```bash
npx wrangler d1 execute rugu-cloud-db --local --file=./schema.sql
```

---

本地开发：

```bash
npm run db:local   # 首次 / 换机后执行建表
npm run dev        # 读取 wrangler.toml 中的 D1/KV 绑定，默认 http://127.0.0.1:8788
```

> `npm run db:local` 与 `npm run dev` 必须共用同一套 `wrangler.toml` 里的 `database_id`，否则会出现「no such table: users」。若仍提示缺表，可再执行 `node scripts/apply-local-schema.mjs` 把 `schema.sql` 写入本机 `.wrangler/state` 下全部 D1 文件。

登录与注册会根据请求 URL 是否为 `https` 决定 Cookie 是否加 `Secure`。
---

## 四、部署到 Cloudflare Pages

### 方式 A：Wrangler 直接部署

```bash
npm run deploy
```

部署后，在 **Workers & Pages → 你的项目 → Settings → Functions** 中确认绑定：

- D1：`DB` → `rugu-cloud-db`
- KV：`SESSIONS` → 你创建的命名空间

若 CLI 部署未自动挂上绑定，请在控制台手动添加，名称必须与 `wrangler.toml` 中 `binding` 一致。

### 方式 B：Git 连接 Pages

1. 把本仓库推到 GitHub。
2. Cloudflare Pages → Create → Connect to Git。
3. Build 配置：
   - **Build command**：留空（或 `echo skip`）
   - **Build output directory**：`public`
   - **Root directory**：仓库根目录
4. 在项目 Settings → Functions 绑定 D1 / KV（同上）。
5. 对生产 D1 执行一次 `schema.sql`（`--remote`）。

---

## 五、设置管理员

注册普通用户后，在 D1 Console 执行（把用户名换成你的）：

```sql
UPDATE users SET is_admin = 1 WHERE username = '你的用户名';
```

然后重新登录。管理员可创建/维护公共题库。

---

## 六、从如故 Vue 题库迁移

详见 [docs/MIGRATION.md](docs/MIGRATION.md)。

如故导出的 `public/generated/generated-*.json` 形如：

```json
{
  "bank": { "name": "...", "description": "..." },
  "questions": [ { "type": "single", "stem": "...", "options": [...], "answer": { "optionKeys": ["a"] } } ]
}
```

**推荐步骤：**

1. 登录云题库 → **题库管理** → 新建题库（或用默认「我的题库」）。
2. 点 **导入 JSON**，选择如故的 `generated-xxx.json`（或 `banks/**/*.json` 中带 `questions` 的文件）。
3. 大题库建议分文件导入；单次请求逐题写入，数百题可能需等待一两分钟。

也可用脚本把如故文件整理成仅含 `questions` 的导入包（见 `scripts/migrate-from-rugu.mjs`）：

```bash
node scripts/migrate-from-rugu.mjs "../如故/public/generated/generated-构建示例.json" -o ./import-ready.json
```

---

## 七、免费额度注意（约略）

Cloudflare 免费档大致够个人/小班使用，但仍需注意：

| 资源 | 注意点 |
|------|--------|
| Pages 请求 | 静态资源 + Functions 调用计入额度 |
| D1 | 有日读写行数上限；大批量导入尽量分批 |
| KV | 会话读写；过期会话靠 TTL 自动清理 |
| CPU | bcrypt 在 Workers 上可接受，避免过高 cost factor |

本项目不做考试、PDF、AI、离线 Dexie 同步等如故高级功能，以控制复杂度与费用。

---

## 目录结构

```
rugu-cloud/
  schema.sql              # D1 建表
  wrangler.toml           # Pages / D1 / KV 绑定
  public/                 # 静态前端（Pages 输出目录）
    login.html
    index.html            # 练习
    admin.html            # 管理
    css/ app.css
    js/  api.js grade.js auth.js quiz.js admin.js
  functions/              # Pages Functions
    api/auth|banks|questions/...
    lib/...
  scripts/migrate-from-rugu.mjs
```

---

## API 摘要

- `POST /api/auth/register|login` · `POST /api/auth/logout` · `GET /api/auth/me`
- `GET|POST /api/banks` · `PATCH|DELETE /api/banks/:id`
- `GET|POST /api/questions?bankId=` · `PATCH|DELETE /api/questions/:id`
- `POST /api/questions/clear` `{ bankId }`

Cookie 名：`rugu_sess`（HttpOnly）。
