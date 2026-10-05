CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  project TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX session_expiry ON sessions(expires_at);
CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  project TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT NOT NULL,
  page TEXT NOT NULL,
  anchor TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  resolved_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX thread_scope ON threads(project, repo, branch, updated_at);
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  edited_at INTEGER
);
CREATE INDEX comment_thread ON comments(thread_id, created_at);
CREATE TABLE reactions (
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  emoji TEXT NOT NULL,
  PRIMARY KEY(comment_id, user_id, emoji)
);
CREATE TABLE oauth_states (
  state_hash TEXT PRIMARY KEY,
  verifier TEXT NOT NULL,
  project TEXT NOT NULL,
  origin TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  exchange_hash TEXT NOT NULL,
  session_token TEXT
);
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
