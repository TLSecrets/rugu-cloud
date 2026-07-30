-- 已有库增量迁移（可重复执行：失败可忽略）
-- 用 D1 Console 或 scripts/migrate-remote.mjs 逐条执行

ALTER TABLE banks ADD COLUMN source TEXT DEFAULT 'import';
ALTER TABLE questions ADD COLUMN media_json TEXT;
