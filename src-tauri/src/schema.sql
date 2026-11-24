CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  focus_limit INTEGER NOT NULL DEFAULT 3 CHECK (focus_limit BETWEEN 2 AND 10),
  created_at TEXT NOT NULL
);

CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_hours INTEGER NOT NULL CHECK (target_hours >= 20),
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5),
  focus_minutes INTEGER NOT NULL CHECK (focus_minutes >= 1),
  break_minutes INTEGER NOT NULL CHECK (break_minutes >= 1),
  total_seconds_logged REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX skills_by_user ON skills (user_id, priority DESC, name);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id INTEGER NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  duration_seconds REAL NOT NULL CHECK (duration_seconds > 0),
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  was_completed INTEGER NOT NULL
);
CREATE INDEX sessions_by_user_skill ON sessions (user_id, skill_id);

CREATE TABLE local_auth_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX local_auth_tokens_by_user ON local_auth_tokens (user_id);
