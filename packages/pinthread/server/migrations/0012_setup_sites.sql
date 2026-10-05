-- Bind the owner's explicit site approvals to this one-use OAuth handoff.
-- Existing reviewer and hosted-management sign-ins leave this column null.
ALTER TABLE oauth_states ADD COLUMN approved_origins TEXT;
