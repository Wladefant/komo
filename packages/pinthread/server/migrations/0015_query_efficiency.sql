-- Match the list ordering; retain thread_scope for updated-at consumers.
CREATE INDEX thread_created_scope ON threads(project,repo,branch,created_at,id);
CREATE INDEX rate_limit_expiry ON rate_limits(expires_at);
CREATE INDEX oauth_state_expiry ON oauth_states(expires_at);
CREATE INDEX invite_expiry ON project_invites(expires_at);
CREATE INDEX setup_request_expiry ON setup_requests(expires_at);
