ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE oauth_states ADD COLUMN provider TEXT NOT NULL DEFAULT 'github';
