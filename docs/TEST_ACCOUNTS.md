# 测试账号

线上：https://rugu-cloud.pages.dev

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `demo` | `demo1234` | 普通用户（可导入示例题） |
| `alice` | `alice1234` | 普通用户 |
| `bob` | `bob1234` | 普通用户（隔离验收） |
| `admin` | `admin1234` | 管理员（可建公共题库） |

管理员需在 D1 执行：

```sql
UPDATE users SET is_admin = 1 WHERE username = 'admin';
```

本地种子：`node scripts/seed-test-accounts.mjs`（默认 `http://127.0.0.1:8788`，可用 `BASE_URL=` 覆盖）。
