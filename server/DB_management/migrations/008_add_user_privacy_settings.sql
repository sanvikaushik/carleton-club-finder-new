CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    profile_visibility TEXT NOT NULL DEFAULT 'public',
    clubs_visibility TEXT NOT NULL DEFAULT 'public',
    attendance_visibility TEXT NOT NULL DEFAULT 'public',
    activity_visibility TEXT NOT NULL DEFAULT 'public',
    allow_friend_requests_from TEXT NOT NULL DEFAULT 'everyone',
    allow_messages_from TEXT NOT NULL DEFAULT 'friends',
    allow_event_invites_from TEXT NOT NULL DEFAULT 'friends',
    show_in_search INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (profile_visibility IN ('public', 'friends', 'private')),
    CHECK (clubs_visibility IN ('public', 'friends', 'private')),
    CHECK (attendance_visibility IN ('public', 'friends', 'private')),
    CHECK (activity_visibility IN ('public', 'friends', 'private')),
    CHECK (allow_friend_requests_from IN ('everyone', 'mutuals_only', 'nobody')),
    CHECK (allow_messages_from IN ('friends', 'nobody')),
    CHECK (allow_event_invites_from IN ('friends', 'nobody'))
);

CREATE INDEX IF NOT EXISTS idx_privacy_user_search
ON user_privacy_settings(show_in_search, user_id);
