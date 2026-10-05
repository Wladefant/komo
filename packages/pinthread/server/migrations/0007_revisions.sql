CREATE TABLE scope_revisions (
  project TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(project,repo,branch)
);
INSERT INTO scope_revisions(project,repo,branch,version) SELECT DISTINCT project,repo,branch,1 FROM threads;
CREATE TRIGGER thread_revision_insert AFTER INSERT ON threads BEGIN
  INSERT INTO scope_revisions(project,repo,branch,version) VALUES(NEW.project,NEW.repo,NEW.branch,1) ON CONFLICT(project,repo,branch) DO UPDATE SET version=version+1;
END;
CREATE TRIGGER thread_revision_update AFTER UPDATE ON threads BEGIN
  INSERT INTO scope_revisions(project,repo,branch,version) VALUES(NEW.project,NEW.repo,NEW.branch,1) ON CONFLICT(project,repo,branch) DO UPDATE SET version=version+1;
END;
CREATE TRIGGER profile_revision_update AFTER UPDATE ON users BEGIN
  UPDATE scope_revisions SET version=version+1 WHERE (project,repo,branch) IN (SELECT t.project,t.repo,t.branch FROM threads t JOIN comments c ON c.thread_id=t.id WHERE c.user_id=NEW.id);
END;
