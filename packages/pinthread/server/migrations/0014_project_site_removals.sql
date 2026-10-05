-- Let owners remove sites that come from PROJECTS config. A removed row hides
-- that config origin; other rows add sites on top of the config.
ALTER TABLE project_sites ADD COLUMN removed INTEGER NOT NULL DEFAULT 0;
