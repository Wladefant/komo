-- The quota error text now says pinthread_quota_exceeded. Migrations 0004 and
-- 0006 are immutable and still raise komo_quota_exceeded on databases that ran
-- them, so recreate the triggers here. The server accepts both messages.
DROP TRIGGER comment_quota_insert;
CREATE TRIGGER comment_quota_insert AFTER INSERT ON comments BEGIN
  UPDATE project_quotas SET comments=comments+1, bytes=bytes+length(CAST(NEW.body AS BLOB))+256
    WHERE project=(SELECT project FROM threads WHERE id=NEW.thread_id);
  SELECT RAISE(ABORT, 'pinthread_quota_exceeded') WHERE EXISTS(SELECT 1 FROM project_quotas WHERE project=(SELECT project FROM threads WHERE id=NEW.thread_id) AND (comments>max_comments OR bytes>max_bytes));
END;
DROP TRIGGER comment_quota_update;
CREATE TRIGGER comment_quota_update AFTER UPDATE OF body ON comments BEGIN
  UPDATE project_quotas SET bytes=bytes+length(CAST(NEW.body AS BLOB))-length(CAST(OLD.body AS BLOB)) WHERE project=(SELECT project FROM threads WHERE id=NEW.thread_id);
  SELECT RAISE(ABORT, 'pinthread_quota_exceeded') WHERE EXISTS(SELECT 1 FROM project_quotas WHERE project=(SELECT project FROM threads WHERE id=NEW.thread_id) AND bytes>max_bytes);
END;
DROP TRIGGER thread_quota_insert;
CREATE TRIGGER thread_quota_insert AFTER INSERT ON threads BEGIN
  UPDATE project_quotas SET bytes=bytes+length(CAST(NEW.anchor AS BLOB))+length(CAST(NEW.page AS BLOB))+length(CAST(NEW.branch AS BLOB))+512 WHERE project=NEW.project;
  SELECT RAISE(ABORT, 'pinthread_quota_exceeded') WHERE EXISTS(SELECT 1 FROM project_quotas WHERE project=NEW.project AND bytes>max_bytes);
END;
DROP TRIGGER thread_quota_update;
CREATE TRIGGER thread_quota_update AFTER UPDATE OF anchor ON threads BEGIN
  UPDATE project_quotas SET bytes=bytes+length(CAST(NEW.anchor AS BLOB))-length(CAST(OLD.anchor AS BLOB)) WHERE project=NEW.project;
  SELECT RAISE(ABORT, 'pinthread_quota_exceeded') WHERE EXISTS(SELECT 1 FROM project_quotas WHERE project=NEW.project AND bytes>max_bytes);
END;
DROP TRIGGER member_quota_insert;
CREATE TRIGGER member_quota_insert AFTER INSERT ON project_members BEGIN
  UPDATE project_quotas SET bytes=bytes+13312 WHERE project=NEW.project;
  SELECT RAISE(ABORT, 'pinthread_quota_exceeded') WHERE EXISTS(SELECT 1 FROM project_quotas WHERE project=NEW.project AND bytes>max_bytes);
END;
DROP TRIGGER reaction_quota_insert;
CREATE TRIGGER reaction_quota_insert AFTER INSERT ON reactions BEGIN
  UPDATE project_quotas SET bytes=bytes+256 WHERE project=(SELECT t.project FROM comments c JOIN threads t ON t.id=c.thread_id WHERE c.id=NEW.comment_id);
  SELECT RAISE(ABORT, 'pinthread_quota_exceeded') WHERE EXISTS(SELECT 1 FROM project_quotas WHERE project=(SELECT t.project FROM comments c JOIN threads t ON t.id=c.thread_id WHERE c.id=NEW.comment_id) AND bytes>max_bytes);
END;
