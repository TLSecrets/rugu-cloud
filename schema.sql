-- =============================================================================
-- 如故云题库 · Cloudflare D1 建表脚本
-- 在 Cloudflare 控制台 → D1 → 你的数据库 → Console 中整段执行
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 用户表：账号密码（密码存 bcrypt 哈希，不存明文）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                 -- 用户 ID，如 usr_xxxx
  username TEXT NOT NULL UNIQUE,      -- 登录名，唯一
  password_hash TEXT NOT NULL,         -- bcrypt 哈希后的密码
  is_admin INTEGER NOT NULL DEFAULT 0, -- 1=管理员（可维护公共题库）
  created_at INTEGER NOT NULL           -- 创建时间戳（毫秒）
);

-- ---------------------------------------------------------------------------
-- 题库表：每人可有多个私有题库；is_public=1 为全员可读公共库
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banks (
  id TEXT PRIMARY KEY,                 -- 题库 ID，如 bank_xxxx
  owner_user_id TEXT,                  -- 所有者用户 ID；公共库可为 NULL
  name TEXT NOT NULL,                  -- 题库名称
  description TEXT,                    -- 简介
  is_public INTEGER NOT NULL DEFAULT 0, -- 0=私有，1=公共
  tags TEXT,                           -- 标签 JSON 数组字符串，如 ["2025-2026-2"]
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_banks_owner ON banks(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_banks_public ON banks(is_public);

-- ---------------------------------------------------------------------------
-- 题目表：题型对齐如故 Vue 版
--   type: single | multiple | judge | blank | short
--   options_json: [{ "key":"a","label":"A","content":"..." }, ...]
--   answer_json:  { "optionKeys":["a"], "texts":["填空1|别名"] }
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,                 -- 题目 ID，如 q_xxxx
  bank_id TEXT NOT NULL,               -- 所属题库
  owner_user_id TEXT,                  -- 冗余所有者，便于鉴权（公共题可为管理员 id）
  type TEXT NOT NULL,                  -- 题型
  stem TEXT NOT NULL,                  -- 题干（可含简单 HTML/纯文本）
  options_json TEXT,                   -- 选项 JSON；填空/简答可为空
  answer_json TEXT NOT NULL,           -- 答案 JSON
  explanation TEXT,                    -- 解析
  tags_json TEXT,                      -- 题目标签 JSON
  domain TEXT,                         -- 领域/章节
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_questions_bank ON questions(bank_id);
CREATE INDEX IF NOT EXISTS idx_questions_owner ON questions(owner_user_id);

-- 可选：插入一个空的「公共示例题库」壳子（管理员登录后往里加题）
-- INSERT INTO banks (id, owner_user_id, name, description, is_public, tags, created_at, updated_at)
-- VALUES ('bank_public_demo', NULL, '公共示例题库', '全员可读，仅管理员可写', 1, '["公共"]', 0, 0);
