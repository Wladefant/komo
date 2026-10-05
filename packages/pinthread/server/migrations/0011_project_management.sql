ALTER TABLE users ADD COLUMN email TEXT;
CREATE TABLE project_settings (
  project TEXT PRIMARY KEY,
  access TEXT NOT NULL DEFAULT 'public' CHECK(access IN ('public','private'))
);
CREATE TABLE project_access (
  project TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY(project,user_id)
);
CREATE TABLE project_invites (
  token_hash TEXT PRIMARY KEY,
  project TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX invite_project ON project_invites(project,expires_at);
CREATE TRIGGER member_quota_delete AFTER DELETE ON project_members BEGIN
  UPDATE project_quotas SET bytes=MAX(0,bytes-13312) WHERE project=OLD.project;
END;

CREATE TABLE export_revisions (project TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 0);
CREATE TRIGGER export_threads_insert AFTER INSERT ON threads BEGIN
 INSERT INTO export_revisions(project,version) SELECT NEW.project,1 WHERE NEW.project IS NOT NULL ON CONFLICT(project) DO UPDATE SET version=version+1;
END;
CREATE TRIGGER export_threads_update AFTER UPDATE ON threads BEGIN
 INSERT INTO export_revisions(project,version) SELECT NEW.project,1 WHERE NEW.project IS NOT NULL ON CONFLICT(project) DO UPDATE SET version=version+1;
END;
CREATE TRIGGER export_threads_delete AFTER DELETE ON threads BEGIN
 INSERT INTO export_revisions(project,version) SELECT OLD.project,1 WHERE OLD.project IS NOT NULL ON CONFLICT(project) DO UPDATE SET version=version+1;
END;
CREATE TRIGGER export_comments_insert AFTER INSERT ON comments BEGIN
 INSERT INTO export_revisions(project,version) SELECT (SELECT project FROM threads WHERE id=NEW.thread_id),1 WHERE (SELECT project FROM threads WHERE id=NEW.thread_id) IS NOT NULL ON CONFLICT(project) DO UPDATE SET version=version+1;
END;
CREATE TRIGGER export_comments_update AFTER UPDATE ON comments BEGIN
 INSERT INTO export_revisions(project,version) SELECT (SELECT project FROM threads WHERE id=NEW.thread_id),1 WHERE (SELECT project FROM threads WHERE id=NEW.thread_id) IS NOT NULL ON CONFLICT(project) DO UPDATE SET version=version+1;
END;
CREATE TRIGGER export_comments_delete AFTER DELETE ON comments BEGIN
 INSERT INTO export_revisions(project,version) SELECT (SELECT project FROM threads WHERE id=OLD.thread_id),1 WHERE (SELECT project FROM threads WHERE id=OLD.thread_id) IS NOT NULL ON CONFLICT(project) DO UPDATE SET version=version+1;
END;
CREATE TRIGGER export_reactions_insert AFTER INSERT ON reactions BEGIN
 INSERT INTO export_revisions(project,version) SELECT (SELECT t.project FROM comments c JOIN threads t ON t.id=c.thread_id WHERE c.id=NEW.comment_id),1 WHERE (SELECT t.project FROM comments c JOIN threads t ON t.id=c.thread_id WHERE c.id=NEW.comment_id) IS NOT NULL ON CONFLICT(project) DO UPDATE SET version=version+1;
END;
CREATE TRIGGER export_reactions_update AFTER UPDATE ON reactions BEGIN
 INSERT INTO export_revisions(project,version) SELECT (SELECT t.project FROM comments c JOIN threads t ON t.id=c.thread_id WHERE c.id=NEW.comment_id),1 WHERE (SELECT t.project FROM comments c JOIN threads t ON t.id=c.thread_id WHERE c.id=NEW.comment_id) IS NOT NULL ON CONFLICT(project) DO UPDATE SET version=version+1;
END;
CREATE TRIGGER export_reactions_delete AFTER DELETE ON reactions BEGIN
 INSERT INTO export_revisions(project,version) SELECT (SELECT t.project FROM comments c JOIN threads t ON t.id=c.thread_id WHERE c.id=OLD.comment_id),1 WHERE (SELECT t.project FROM comments c JOIN threads t ON t.id=c.thread_id WHERE c.id=OLD.comment_id) IS NOT NULL ON CONFLICT(project) DO UPDATE SET version=version+1;
END;
CREATE TRIGGER export_profile_update AFTER UPDATE ON users BEGIN
 UPDATE export_revisions SET version=version+1 WHERE project IN (SELECT project FROM project_members WHERE user_id=NEW.id);
END;
