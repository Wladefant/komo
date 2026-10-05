CREATE TABLE workspace_domains (
  project TEXT NOT NULL REFERENCES workspaces(id),
  origin TEXT NOT NULL,
  verified_at INTEGER NOT NULL,
  PRIMARY KEY(project,origin)
);
