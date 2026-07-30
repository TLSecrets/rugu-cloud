-- 新表（幂等）
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  bank_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(owner_user_id, question_id)
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
  UNIQUE(owner_user_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner_user_id);

CREATE TABLE IF NOT EXISTS wrong_records (
  owner_user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  bank_id TEXT NOT NULL,
  wrong_count INTEGER NOT NULL DEFAULT 1,
  last_wrong_at INTEGER NOT NULL,
  removed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (owner_user_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_wrongs_owner ON wrong_records(owner_user_id);

CREATE TABLE IF NOT EXISTS tag_catalog (
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (owner_user_id, name)
);

CREATE TABLE IF NOT EXISTS settings (
  owner_user_id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  target TEXT,
  ip TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id);
