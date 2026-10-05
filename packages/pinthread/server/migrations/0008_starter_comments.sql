UPDATE project_quotas SET max_comments=250 WHERE max_comments=1000 AND project IN (SELECT id FROM workspaces);
