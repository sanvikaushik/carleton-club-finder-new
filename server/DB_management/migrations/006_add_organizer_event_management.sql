CREATE TABLE IF NOT EXISTS club_memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_club_memberships_user_club
ON club_memberships(user_id, club_id);

CREATE INDEX IF NOT EXISTS idx_club_memberships_user_role
ON club_memberships(user_id, role);

CREATE INDEX IF NOT EXISTS idx_club_memberships_club_role
ON club_memberships(club_id, role);

ALTER TABLE events ADD COLUMN created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN image_url TEXT;
ALTER TABLE events ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_events_status
ON events(status);
