DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversation_participants;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS event_invites;
DROP TABLE IF EXISTS user_privacy_settings;
DROP TABLE IF EXISTS event_attendees;
DROP TABLE IF EXISTS event_tags;
DROP TABLE IF EXISTS club_memberships;
DROP TABLE IF EXISTS user_interests;
DROP TABLE IF EXISTS schedule_classes;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS friend_requests;
DROP TABLE IF EXISTS friends;
DROP TABLE IF EXISTS building_floors;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS clubs;
DROP TABLE IF EXISTS buildings;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    program TEXT,
    year TEXT,
    email TEXT,
    password_hash TEXT,
    onboarding_completed INTEGER NOT NULL DEFAULT 1,
    profile_image_url TEXT,
    avatar_color TEXT,
    is_friend_profile INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE buildings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE building_floors (
    building_id TEXT NOT NULL,
    floor INTEGER NOT NULL,
    PRIMARY KEY (building_id, floor),
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
);

CREATE TABLE clubs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    meeting_location TEXT,
    contact_email TEXT,
    social_link TEXT,
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE club_memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE TABLE events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    club_id TEXT NOT NULL,
    created_by_user_id TEXT,
    building_id TEXT NOT NULL,
    floor INTEGER NOT NULL,
    room TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    attendance_count INTEGER NOT NULL DEFAULT 0,
    capacity INTEGER NOT NULL,
    food_available INTEGER NOT NULL DEFAULT 0,
    food_type TEXT,
    description TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
    CHECK (status IN ('active', 'cancelled'))
);

CREATE TABLE event_tags (
    event_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (event_id, position),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE favorites (
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    followed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, club_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE TABLE friends (
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (user_id <> friend_id)
);

CREATE TABLE friend_requests (
    id TEXT PRIMARY KEY,
    sender_user_id TEXT NOT NULL,
    receiver_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (sender_user_id <> receiver_user_id),
    CHECK (status IN ('pending', 'accepted', 'declined'))
);

CREATE TABLE event_invites (
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

CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    is_dismissed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_user_id TEXT,
    event_id TEXT,
    club_id TEXT,
    link TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL
);

CREATE TABLE user_privacy_settings (
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

CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversation_participants (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_interests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    interest_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE event_attendees (
    user_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, event_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE schedule_classes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    start_datetime TEXT NOT NULL,
    end_datetime TEXT NOT NULL,
    location TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_building_id ON events(building_id);
CREATE INDEX idx_events_club_id ON events(club_id);
CREATE INDEX idx_events_status ON events(status);
CREATE UNIQUE INDEX idx_club_memberships_user_club ON club_memberships(user_id, club_id);
CREATE INDEX idx_club_memberships_user_role ON club_memberships(user_id, role);
CREATE INDEX idx_club_memberships_club_role ON club_memberships(club_id, role);
CREATE INDEX idx_schedule_classes_user_id ON schedule_classes(user_id);
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);
CREATE INDEX idx_friend_requests_sender ON friend_requests(sender_user_id, status);
CREATE INDEX idx_friend_requests_receiver ON friend_requests(receiver_user_id, status);
CREATE INDEX idx_event_invites_event_status ON event_invites(event_id, status);
CREATE INDEX idx_event_invites_recipient_status ON event_invites(recipient_user_id, status);
CREATE INDEX idx_event_invites_sender_status ON event_invites(sender_user_id, status);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_user_dismissed ON notifications(user_id, is_dismissed);
CREATE INDEX idx_privacy_user_search ON user_privacy_settings(show_in_search, user_id);
CREATE UNIQUE INDEX idx_conversation_participants_unique ON conversation_participants(conversation_id, user_id);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id, conversation_id);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_conversation_read ON messages(conversation_id, is_read);
CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
