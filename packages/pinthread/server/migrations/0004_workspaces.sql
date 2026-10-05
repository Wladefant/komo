CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  repo TEXT NOT NULL,
  origins TEXT NOT NULL,
  suspended INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  CHECK(owner_id LIKE 'google:%')
);
CREATE INDEX workspace_owner ON workspaces(owner_id);
CREATE TABLE project_owners (
  project TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  CHECK(user_id LIKE 'google:%')
);
CREATE TABLE project_quotas (
  project TEXT PRIMARY KEY,
  max_comments INTEGER NOT NULL,
  max_bytes INTEGER NOT NULL,
  comments INTEGER NOT NULL DEFAULT 0,
  bytes INTEGER NOT NULL DEFAULT 0
);
CREATE TRIGGER comment_quota_insert AFTER INSERT ON comments BEGIN
  UPDATE project_quotas SET comments=comments+1, bytes=bytes+length(CAST(NEW.body AS BLOB))+256
    WHERE project=(SELECT project FROM threads WHERE id=NEW.thread_id);
  SELECT RAISE(ABORT, 'komo_quota_exceeded') WHERE EXISTS(SELECT 1 FROM project_quotas WHERE project=(SELECT project FROM threads WHERE id=NEW.thread_id) AND (comments>max_comments OR bytes>max_bytes));
END;
CREATE TRIGGER comment_quota_update AFTER UPDATE OF body ON comments BEGIN
  UPDATE project_quotas SET bytes=bytes+length(CAST(NEW.body AS BLOB))-length(CAST(OLD.body AS BLOB)) WHERE project=(SELECT project FROM threads WHERE id=NEW.thread_id);
  SELECT RAISE(ABORT, 'komo_quota_exceeded') WHERE EXISTS(SELECT 1 FROM project_quotas WHERE project=(SELECT project FROM threads WHERE id=NEW.thread_id) AND bytes>max_bytes);
END;
CREATE TRIGGER thread_quota_insert AFTER INSERT ON threads BEGIN
  UPDATE project_quotas SET bytes=bytes+length(CAST(NEW.anchor AS BLOB))+length(CAST(NEW.page AS BLOB))+length(CAST(NEW.branch AS BLOB))+512 WHERE project=NEW.project;
  SELECT RAISE(ABORT, 'komo_quota_exceeded') WHERE EXISTS(SELECT 1 FROM project_quotas WHERE project=NEW.project AND bytes>max_bytes);
END;
CREATE TRIGGER thread_quota_update AFTER UPDATE OF anchor ON threads BEGIN
  UPDATE project_quotas SET bytes=bytes+length(CAST(NEW.anchor AS BLOB))-length(CAST(OLD.anchor AS BLOB)) WHERE project=NEW.project;
  SELECT RAISE(ABORT, 'komo_quota_exceeded') WHERE EXISTS(SELECT 1 FROM project_quotas WHERE project=NEW.project AND bytes>max_bytes);
END;
CREATE TABLE setup_requests (
  id TEXT PRIMARY KEY,
  poll_hash TEXT NOT NULL,
  config TEXT NOT NULL,
  project TEXT,
  expires_at INTEGER NOT NULL
);
