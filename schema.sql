-- =============================================================================
-- 如故云题库 · 完整 D1 建表（对齐 Vue 如故 Dexie 模型 + 多用户）
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS banks (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'import',
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_banks_owner ON banks(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_banks_public ON banks(is_public);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  bank_id TEXT NOT NULL,
  owner_user_id TEXT,
  type TEXT NOT NULL,
  stem TEXT NOT NULL,
  options_json TEXT,
  answer_json TEXT NOT NULL,
  explanation TEXT,
  tags_json TEXT,
  media_json TEXT,
  domain TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_questions_bank ON questions(bank_id);
CREATE INDEX IF NOT EXISTS idx_questions_owner ON questions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);

CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  bank_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(owner_user_id, question_id),
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_favorites_owner ON favorites(owner_user_id);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  bank_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(owner_user_id, question_id),
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner_user_id);

CREATE TABLE IF NOT EXISTS wrong_records (
  owner_user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  bank_id TEXT NOT NULL,
  wrong_count INTEGER NOT NULL DEFAULT 1,
  last_wrong_at INTEGER NOT NULL,
  removed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (owner_user_id, question_id),
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wrongs_owner ON wrong_records(owner_user_id);

CREATE TABLE IF NOT EXISTS tag_catalog (
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (owner_user_id, name),
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS settings (
  owner_user_id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);
