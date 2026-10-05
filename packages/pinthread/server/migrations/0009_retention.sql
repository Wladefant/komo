-- Delete children while their scope and quota owner are still available.
CREATE TRIGGER thread_delete_comments BEFORE DELETE ON threads BEGIN
  DELETE FROM comments WHERE thread_id=OLD.id;
END;
CREATE TRIGGER comment_retention_delete AFTER DELETE ON comments BEGIN
  UPDATE project_quotas SET comments=MAX(0,comments-1),
    bytes=MAX(0,bytes-length(CAST(OLD.body AS BLOB))-256)
    WHERE project=(SELECT project FROM threads WHERE id=OLD.thread_id);
  UPDATE threads SET updated_at=MAX(updated_at+1,CAST(unixepoch('subsec')*1000 AS INTEGER))
    WHERE id=OLD.thread_id;
END;
CREATE TRIGGER thread_retention_delete AFTER DELETE ON threads BEGIN
  UPDATE project_quotas SET bytes=MAX(0,bytes-length(CAST(OLD.anchor AS BLOB))
    -length(CAST(OLD.page AS BLOB))-length(CAST(OLD.branch AS BLOB))-512)
    WHERE project=OLD.project;
  INSERT INTO scope_revisions(project,repo,branch,version)
    VALUES(OLD.project,OLD.repo,OLD.branch,1)
    ON CONFLICT(project,repo,branch) DO UPDATE SET version=version+1;
END;
