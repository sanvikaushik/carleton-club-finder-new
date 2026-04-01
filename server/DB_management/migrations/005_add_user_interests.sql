ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS user_interests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    interest_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user_id
ON user_interests(user_id);
