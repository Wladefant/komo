-- Owner-approved sites for projects configured in PROJECTS. Hosted
-- workspaces keep theirs in workspace_domains, which references workspaces.
CREATE TABLE project_sites (
  project TEXT NOT NULL,
  origin TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY(project,origin)
);
