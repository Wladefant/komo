CREATE TABLE project_members (
  project TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY(project,user_id)
);
CREATE TRIGGER member_quota_insert AFTER INSERT ON project_members BEGIN
  UPDATE project_quotas SET bytes=bytes+13312 WHERE project=NEW.project;
  SELECT RAISE(ABORT, 'komo_quota_exceeded') WHERE EXISTS(SELECT 1 FROM project_quotas WHERE project=NEW.project AND bytes>max_bytes);
END;
CREATE TRIGGER reaction_quota_insert AFTER INSERT ON reactions BEGIN
  UPDATE project_quotas SET bytes=bytes+256 WHERE project=(SELECT t.project FROM comments c JOIN threads t ON t.id=c.thread_id WHERE c.id=NEW.comment_id);
  SELECT RAISE(ABORT, 'komo_quota_exceeded') WHERE EXISTS(SELECT 1 FROM project_quotas WHERE project=(SELECT t.project FROM comments c JOIN threads t ON t.id=c.thread_id WHERE c.id=NEW.comment_id) AND bytes>max_bytes);
END;
CREATE TRIGGER reaction_quota_delete AFTER DELETE ON reactions BEGIN
  UPDATE project_quotas SET bytes=MAX(0,bytes-256) WHERE project=(SELECT t.project FROM comments c JOIN threads t ON t.id=c.thread_id WHERE c.id=OLD.comment_id);
END;
