use crate::storage::Database;
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row, TransactionBehavior};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct LocalRequest {
  method: String,
  path: String,
  token: Option<String>,
  #[serde(default)]
  data: Value,
  skill_id: Option<i64>,
}

#[derive(Serialize)]
pub struct LocalResponse {
  status: u16,
  data: Value,
}

#[derive(Debug, Serialize)]
pub struct LocalError {
  status: u16,
  detail: String,
}

impl LocalError {
  fn new(status: u16, detail: &str) -> Self {
    Self {
      status,
      detail: detail.into(),
    }
  }

  fn unauthorized() -> Self {
    Self::new(401, "Please sign in again.")
  }

  fn storage_failed(error: impl std::fmt::Display) -> Self {
    log::error!("ChronoSkill local storage error: {error}");
    Self::new(500, "Could not access ChronoSkill data on this device.")
  }
}

impl From<rusqlite::Error> for LocalError {
  fn from(error: rusqlite::Error) -> Self {
    Self::storage_failed(error)
  }
}

type Result<T> = std::result::Result<T, LocalError>;

#[tauri::command]
pub async fn local_api(
  database: tauri::State<'_, Database>,
  request: LocalRequest,
) -> Result<LocalResponse> {
  let database = database.inner().clone();
  tauri::async_runtime::spawn_blocking(move || {
    let mut connection = database
      .0
      .lock()
      .map_err(|_| LocalError::new(500, "Local storage is unavailable."))?;
    handle_request(&mut connection, request)
  })
  .await
  .map_err(LocalError::storage_failed)?
}

fn handle_request(connection: &mut Connection, request: LocalRequest) -> Result<LocalResponse> {
  let LocalRequest {
    method,
    path,
    token,
    data,
    skill_id,
  } = request;
  let (status, data) = match (method.as_str(), path.as_str()) {
    ("post", "/auth/signup") => (201, signup(connection, decode(data)?)?),
    ("post", "/auth/login") => (200, login(connection, decode(data)?)?),
    ("post", "/auth/logout") => {
      if let Some(token) = token {
        connection.execute("DELETE FROM local_auth_tokens WHERE token = ?1", [token])?;
      }
      (204, Value::Null)
    }
    (method, path) => {
      let user = authenticated_user(connection, token.as_deref())?;
      match (method, path) {
        ("get", "/users/me") => (200, json!(user)),
        ("patch", "/users/me") => (200, update_profile(connection, user, decode(data)?)?),
        ("get", "/skills") => (200, list_skills(connection, user.id)?),
        ("post", "/skills") => (201, create_skill(connection, user.id, decode(data)?)?),
        ("get", "/sessions") => (200, list_sessions(connection, user.id, skill_id)?),
        ("post", "/sessions") => (201, create_session(connection, &user, decode(data)?)?),
        ("patch", path) if path.starts_with("/skills/") => (
          200,
          update_skill(connection, user.id, parse_skill_id(path)?, decode(data)?)?,
        ),
        ("delete", path) if path.starts_with("/skills/") => {
          let deleted = connection.execute(
            "DELETE FROM skills WHERE user_id = ?1 AND id = ?2",
            params![user.id, parse_skill_id(path)?],
          )?;
          if deleted == 0 {
            return Err(LocalError::new(404, "Skill not found."));
          }
          (204, Value::Null)
        }
        _ => return Err(LocalError::new(404, "Unknown local request.")),
      }
    }
  };
  Ok(LocalResponse { status, data })
}

fn decode<T: DeserializeOwned>(data: Value) -> Result<T> {
  serde_json::from_value(data).map_err(|_| LocalError::new(422, "Invalid request data."))
}

fn parse_skill_id(path: &str) -> Result<i64> {
  path
    .trim_start_matches("/skills/")
    .parse()
    .map_err(|_| LocalError::new(404, "Skill not found."))
}

fn now() -> String {
  Utc::now().to_rfc3339()
}

fn read_timestamp(row: &Row<'_>, index: usize) -> rusqlite::Result<String> {
  // The FastAPI database stores naive UTC timestamps in SQLite with a space separator.
  Ok(row.get::<_, String>(index)?.replace(' ', "T"))
}

#[derive(Deserialize)]
struct Credentials {
  username: String,
  password: String,
}

#[derive(Deserialize)]
struct ProfilePatch {
  username: Option<String>,
  focus_limit: Option<i64>,
  avatar_url: Option<String>,
}

#[derive(Serialize)]
struct User {
  id: i64,
  username: String,
  avatar_url: Option<String>,
  focus_limit: i64,
  created_at: String,
}

fn user_from_row(row: &Row<'_>) -> rusqlite::Result<User> {
  Ok(User {
    id: row.get(0)?,
    username: row.get(1)?,
    avatar_url: row.get(2)?,
    focus_limit: row.get(3)?,
    created_at: read_timestamp(row, 4)?,
  })
}

fn authenticated_user(connection: &Connection, token: Option<&str>) -> Result<User> {
  let token = token.ok_or_else(LocalError::unauthorized)?;
  connection
    .query_row(
      "SELECT users.id, username, avatar_url, focus_limit, created_at
     FROM users JOIN local_auth_tokens ON users.id = local_auth_tokens.user_id
     WHERE local_auth_tokens.token = ?1",
      [token],
      user_from_row,
    )
    .optional()?
    .ok_or_else(LocalError::unauthorized)
}

fn issue_token(connection: &Connection, user_id: i64) -> Result<Value> {
  let token = Uuid::new_v4().to_string();
  connection.execute(
    "INSERT INTO local_auth_tokens (token, user_id) VALUES (?1, ?2)",
    params![token, user_id],
  )?;
  Ok(json!({ "access_token": token, "token_type": "bearer" }))
}

fn username_taken(connection: &Connection, username: &str, except_id: Option<i64>) -> Result<bool> {
  Ok(connection.query_row(
    "SELECT EXISTS(SELECT 1 FROM users WHERE username = ?1 AND (?2 IS NULL OR id != ?2))",
    params![username, except_id],
    |row| row.get(0),
  )?)
}

fn signup(connection: &mut Connection, credentials: Credentials) -> Result<Value> {
  let username = credentials.username.trim();
  if username.is_empty()
    || credentials.password.chars().count() < 6
    || credentials.password.len() > 72
  {
    return Err(LocalError::new(
      422,
      "Enter a username and a password of at least 6 characters and at most 72 bytes.",
    ));
  }

  let password_hash =
    bcrypt::hash(credentials.password, bcrypt::DEFAULT_COST).map_err(LocalError::storage_failed)?;
  let transaction = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
  if username_taken(&transaction, username, None)? {
    return Err(LocalError::new(400, "Username already registered."));
  }
  transaction.execute(
    "INSERT INTO users (username, password_hash, created_at) VALUES (?1, ?2, ?3)",
    params![username, password_hash, now()],
  )?;
  let token = issue_token(&transaction, transaction.last_insert_rowid())?;
  transaction.commit()?;
  Ok(token)
}

fn login(connection: &Connection, credentials: Credentials) -> Result<Value> {
  let invalid_credentials = || LocalError::new(401, "Incorrect username or password.");
  let (user_id, password_hash): (i64, String) = connection
    .query_row(
      "SELECT id, password_hash FROM users WHERE username = ?1",
      [credentials.username.trim()],
      |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .optional()?
    .ok_or_else(invalid_credentials)?;
  if !bcrypt::verify(credentials.password, &password_hash).unwrap_or(false) {
    return Err(invalid_credentials());
  }
  issue_token(connection, user_id)
}

fn update_profile(
  connection: &mut Connection,
  mut user: User,
  patch: ProfilePatch,
) -> Result<Value> {
  let transaction = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
  if let Some(username) = patch.username {
    let username = username.trim();
    if username.is_empty() {
      return Err(LocalError::new(422, "Username cannot be empty."));
    }
    if username_taken(&transaction, username, Some(user.id))? {
      return Err(LocalError::new(400, "Username already in use."));
    }
    user.username = username.into();
  }
  if let Some(focus_limit) = patch.focus_limit {
    if !(2..=10).contains(&focus_limit) {
      return Err(LocalError::new(
        422,
        "Focus limit must be between 2 and 10.",
      ));
    }
    user.focus_limit = focus_limit;
  }
  if patch.avatar_url.is_some() {
    user.avatar_url = patch.avatar_url;
  }
  transaction.execute(
    "UPDATE users SET username = ?1, focus_limit = ?2, avatar_url = ?3 WHERE id = ?4",
    params![user.username, user.focus_limit, user.avatar_url, user.id],
  )?;
  transaction.commit()?;
  Ok(json!(user))
}

#[derive(Deserialize)]
struct SkillPatch {
  name: Option<String>,
  target_hours: Option<i64>,
  priority: Option<i64>,
  focus_minutes: Option<i64>,
  break_minutes: Option<i64>,
}

#[derive(Serialize)]
struct Skill {
  id: i64,
  user_id: i64,
  name: String,
  target_hours: i64,
  priority: i64,
  focus_minutes: i64,
  break_minutes: i64,
  total_seconds_logged: f64,
  created_at: String,
  updated_at: String,
}

impl Skill {
  fn apply(&mut self, patch: SkillPatch) -> Result<()> {
    if let Some(name) = patch.name {
      self.name = name.trim().into();
    }
    self.target_hours = patch.target_hours.unwrap_or(self.target_hours);
    self.priority = patch.priority.unwrap_or(self.priority);
    self.focus_minutes = patch.focus_minutes.unwrap_or(self.focus_minutes);
    self.break_minutes = patch.break_minutes.unwrap_or(self.break_minutes);
    if self.name.is_empty() {
      return Err(LocalError::new(422, "Skill name cannot be empty."));
    }
    if self.target_hours < 20
      || !(1..=5).contains(&self.priority)
      || self.focus_minutes < 1
      || self.break_minutes < 1
    {
      return Err(LocalError::new(422, "Enter a target of at least 20 hours, a priority from 1 to 5, and times of at least 1 minute."));
    }
    self.updated_at = now();
    Ok(())
  }
}

fn skill_from_row(row: &Row<'_>) -> rusqlite::Result<Skill> {
  Ok(Skill {
    id: row.get(0)?,
    user_id: row.get(1)?,
    name: row.get(2)?,
    target_hours: row.get(3)?,
    priority: row.get(4)?,
    focus_minutes: row.get(5)?,
    break_minutes: row.get(6)?,
    total_seconds_logged: row.get(7)?,
    created_at: read_timestamp(row, 8)?,
    updated_at: read_timestamp(row, 9)?,
  })
}

const SKILL_COLUMNS: &str =
  "id, user_id, name, target_hours, priority, focus_minutes, break_minutes,
   total_seconds_logged, created_at, updated_at";

fn list_skills(connection: &Connection, user_id: i64) -> Result<Value> {
  let sql = format!("SELECT {SKILL_COLUMNS} FROM skills WHERE user_id = ?1 ORDER BY id");
  let mut statement = connection.prepare(&sql)?;
  let rows = statement.query_map([user_id], skill_from_row)?;
  Ok(json!(rows.collect::<rusqlite::Result<Vec<_>>>()?))
}

fn owned_skill(connection: &Connection, user_id: i64, id: i64) -> Result<Skill> {
  let sql = format!("SELECT {SKILL_COLUMNS} FROM skills WHERE user_id = ?1 AND id = ?2");
  connection
    .query_row(&sql, params![user_id, id], skill_from_row)
    .optional()?
    .ok_or_else(|| LocalError::new(404, "Skill not found."))
}

fn create_skill(connection: &Connection, user_id: i64, patch: SkillPatch) -> Result<Value> {
  let timestamp = now();
  let mut skill = Skill {
    id: 0,
    user_id,
    name: String::new(),
    target_hours: 20,
    priority: 1,
    focus_minutes: 25,
    break_minutes: 5,
    total_seconds_logged: 0.0,
    created_at: timestamp.clone(),
    updated_at: timestamp,
  };
  skill.apply(patch)?;
  connection.execute(
    "INSERT INTO skills (user_id, name, target_hours, priority, focus_minutes, break_minutes,
                         created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
    params![
      user_id,
      skill.name,
      skill.target_hours,
      skill.priority,
      skill.focus_minutes,
      skill.break_minutes,
      skill.created_at,
      skill.updated_at
    ],
  )?;
  skill.id = connection.last_insert_rowid();
  Ok(json!(skill))
}

fn update_skill(
  connection: &mut Connection,
  user_id: i64,
  id: i64,
  patch: SkillPatch,
) -> Result<Value> {
  let transaction = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
  let mut skill = owned_skill(&transaction, user_id, id)?;
  skill.apply(patch)?;
  transaction.execute(
    "UPDATE skills SET name = ?1, target_hours = ?2, priority = ?3, focus_minutes = ?4,
                       break_minutes = ?5, updated_at = ?6 WHERE id = ?7 AND user_id = ?8",
    params![
      skill.name,
      skill.target_hours,
      skill.priority,
      skill.focus_minutes,
      skill.break_minutes,
      skill.updated_at,
      id,
      user_id
    ],
  )?;
  transaction.commit()?;
  Ok(json!(skill))
}

#[derive(Deserialize, Serialize)]
struct SessionInput {
  skill_id: i64,
  duration_seconds: f64,
  started_at: String,
  completed_at: String,
  was_completed: bool,
}

#[derive(Serialize)]
struct Session {
  id: i64,
  user_id: i64,
  #[serde(flatten)]
  fields: SessionInput,
}

fn list_sessions(connection: &Connection, user_id: i64, skill_id: Option<i64>) -> Result<Value> {
  let mut statement = connection.prepare(
    "SELECT id, skill_id, duration_seconds, started_at, completed_at, was_completed
     FROM sessions WHERE user_id = ?1 AND (?2 IS NULL OR skill_id = ?2) ORDER BY id",
  )?;
  let rows = statement.query_map(params![user_id, skill_id], |row| {
    Ok(Session {
      id: row.get(0)?,
      user_id,
      fields: SessionInput {
        skill_id: row.get(1)?,
        duration_seconds: row.get(2)?,
        started_at: read_timestamp(row, 3)?,
        completed_at: read_timestamp(row, 4)?,
        was_completed: row.get(5)?,
      },
    })
  })?;
  Ok(json!(rows.collect::<rusqlite::Result<Vec<_>>>()?))
}

fn create_session(connection: &mut Connection, user: &User, input: SessionInput) -> Result<Value> {
  if !input.duration_seconds.is_finite()
    || input.duration_seconds <= 0.0
    || DateTime::parse_from_rfc3339(&input.started_at).is_err()
    || DateTime::parse_from_rfc3339(&input.completed_at).is_err()
  {
    return Err(LocalError::new(422, "Invalid practice session."));
  }
  let transaction = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
  owned_skill(&transaction, user.id, input.skill_id)?;
  let eligible: bool = transaction.query_row(
    "SELECT EXISTS(
      SELECT 1 FROM (
        SELECT id FROM skills WHERE user_id = ?1
        ORDER BY priority DESC, name ASC, id ASC LIMIT ?2
      ) WHERE id = ?3
    )",
    params![user.id, user.focus_limit, input.skill_id],
    |row| row.get(0),
  )?;
  if !eligible {
    return Err(LocalError::new(
      403,
      "This skill is outside your focus limit.",
    ));
  }
  transaction.execute(
    "INSERT INTO sessions (skill_id, user_id, duration_seconds, started_at, completed_at, was_completed)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    params![input.skill_id, user.id, input.duration_seconds, input.started_at,
            input.completed_at, input.was_completed],
  )?;
  let id = transaction.last_insert_rowid();
  transaction.execute(
    "UPDATE skills SET total_seconds_logged = total_seconds_logged + ?1, updated_at = ?2
     WHERE id = ?3 AND user_id = ?4",
    params![input.duration_seconds, now(), input.skill_id, user.id],
  )?;
  transaction.commit()?;
  Ok(json!(Session {
    id,
    user_id: user.id,
    fields: input
  }))
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::fs;

  fn request(
    connection: &mut Connection,
    method: &str,
    path: &str,
    token: Option<&str>,
    data: Value,
  ) -> Result<LocalResponse> {
    handle_request(
      connection,
      LocalRequest {
        method: method.into(),
        path: path.into(),
        token: token.map(str::to_owned),
        data,
        skill_id: None,
      },
    )
  }

  #[test]
  fn imports_legacy_history_once_and_saves_new_sessions_offline() {
    let folder = std::env::temp_dir().join(format!("chronoskill-test-{}", Uuid::new_v4()));
    fs::create_dir(&folder).unwrap();
    let legacy_path = folder.join("legacy.db");
    let app_path = folder.join("app.db");
    let legacy = Connection::open(&legacy_path).unwrap();
    legacy.execute_batch(include_str!("schema.sql")).unwrap();
    let password_hash = bcrypt::hash("offline-test", 4).unwrap();
    legacy
      .execute(
        "INSERT INTO users (id, username, password_hash, created_at)
       VALUES (7, 'test-user', ?1, '2026-11-21 10:00:00')",
        [password_hash],
      )
      .unwrap();
    legacy
      .execute_batch(
        "INSERT INTO skills VALUES (42, 7, 'Guitar', 20, 5, 1, 1, 60,
                                   '2026-11-21 10:00:00', '2026-11-21 10:01:00');
       INSERT INTO sessions VALUES (8, 42, 7, 60, '2026-11-21 10:00:00',
                                    '2026-11-21 10:01:00', 1);",
      )
      .unwrap();

    let database = Database::open(&app_path, Some(&legacy_path)).unwrap();
    let mut connection = database.0.lock().unwrap();
    let login = request(
      &mut connection,
      "post",
      "/auth/login",
      None,
      json!({ "username": "test-user", "password": "offline-test" }),
    )
    .unwrap();
    let token = login.data["access_token"].as_str().unwrap();
    let skills = request(&mut connection, "get", "/skills", Some(token), Value::Null).unwrap();
    assert_eq!(skills.data[0]["created_at"], "2026-11-21T10:00:00");
    assert_eq!(skills.data[0]["total_seconds_logged"], 60.0);

    let session = json!({
      "skill_id": 42, "duration_seconds": 60,
      "started_at": "2026-11-22T10:00:00Z", "completed_at": "2026-11-22T10:01:00Z",
      "was_completed": true,
    });
    let saved = request(&mut connection, "post", "/sessions", Some(token), session).unwrap();
    assert_eq!(saved.status, 201);
    drop(connection);
    drop(database);

    let database = Database::open(&app_path, Some(&legacy_path)).unwrap();
    let mut connection = database.0.lock().unwrap();
    let skills = request(&mut connection, "get", "/skills", Some(token), Value::Null).unwrap();
    assert_eq!(skills.data[0]["total_seconds_logged"], 120.0);
    let sessions = request(
      &mut connection,
      "get",
      "/sessions",
      Some(token),
      Value::Null,
    )
    .unwrap();
    assert_eq!(sessions.data.as_array().unwrap().len(), 2);
    let original_count: i64 = legacy
      .query_row("SELECT COUNT(*) FROM sessions", [], |row| row.get(0))
      .unwrap();
    assert_eq!(original_count, 1);

    request(
      &mut connection,
      "post",
      "/auth/logout",
      Some(token),
      Value::Null,
    )
    .unwrap();
    assert!(matches!(
      request(&mut connection, "get", "/skills", Some(token), Value::Null),
      Err(LocalError { status: 401, .. })
    ));

    drop(connection);
    drop(database);
    drop(legacy);
    fs::remove_dir_all(folder).unwrap();
  }
}
