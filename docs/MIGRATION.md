# 从如故（Vue）迁移到如故云

本仓库是独立的 Cloudflare 项目，**不替代**本地 Vue「如故」。迁移只对齐题库数据格式，不搬考试 / PDF / AI / Dexie 等功能。

## 数据对应关系

| 如故 | 如故云 |
|------|--------|
| `type`: single/multiple/judge/blank/short | 相同 |
| `options[].key / label / content` | 原样入库 |
| `answer.optionKeys` / `answer.texts` | 相同 |
| `answer.explanation`（部分旧数据） | 写入 `explanation` |
| 本地 Dexie / IndexedDB | Cloudflare D1 |
| 无账号 | 注册用户；私有库按 owner 隔离 |

## 推荐流程

1. 在如故侧确认已有 `public/generated/generated-*.json`（或 `banks/` 下构建结果）。
2. （可选）整理导入包：

```bash
node scripts/migrate-from-rugu.mjs path/to/generated-某课.json -o ./import-ready.json
```

3. 部署并打开如故云 → 注册/登录 → **题库管理**。
4. 新建题库（或用默认「我的题库」）→ **导入 JSON** → 选择上述文件。
5. 到 **练习** 页验证五题型判分。

## 公共课共享

若要把某课做成全员可读：

1. D1 中把账号设为管理员：`UPDATE users SET is_admin = 1 WHERE username = '...'`
2. 重新登录后新建 **公共** 题库并导入。

## 注意

- 导入是逐题 `POST`，大库（数百题）可能要一两分钟，勿刷新页面。
- 媒体图（如故 `media`）当前云版未托管，仅迁移文本题干/选项/答案。
- 判分规则对齐如故：多选需完全一致；填空可去空白并忽略大小写；简答自评。
