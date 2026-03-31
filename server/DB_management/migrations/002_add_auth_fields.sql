ALTER TABLE users ADD COLUMN year TEXT;
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);
