-- The quota error text now says pinthread_quota_exceeded. Migration 001 is
-- immutable, so its function keeps its original internal name (komo_quota) and
-- is redefined here with the new message. The server accepts both messages.
CREATE OR REPLACE FUNCTION komo_quota(p_project text, p_comments integer, p_bytes bigint) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE project_quotas SET comments=GREATEST(0,comments+p_comments), bytes=GREATEST(0,bytes+p_bytes) WHERE project=p_project;
  IF EXISTS(SELECT 1 FROM project_quotas WHERE project=p_project AND (comments>max_comments OR bytes>max_bytes)) THEN
    RAISE EXCEPTION 'pinthread_quota_exceeded';
  END IF;
END $$;
