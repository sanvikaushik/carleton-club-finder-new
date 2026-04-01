CREATE TABLE IF NOT EXISTS event_invites (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    sender_user_id TEXT NOT NULL,
    recipient_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TEXT,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (sender_user_id <> recipient_user_id),
    CHECK (status IN ('pending', 'accepted', 'declined'))
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_participants (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_invites_event_status
ON event_invites(event_id, status);

CREATE INDEX IF NOT EXISTS idx_event_invites_recipient_status
ON event_invites(recipient_user_id, status);

CREATE INDEX IF NOT EXISTS idx_event_invites_sender_status
ON event_invites(sender_user_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_participants_unique
ON conversation_participants(conversation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
ON conversation_participants(user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_read
ON messages(conversation_id, is_read);
