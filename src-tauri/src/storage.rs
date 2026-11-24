use rusqlite::{Connection, Transaction, TransactionBehavior};
use std::{
  fs,
  path::Path,
  sync::{Arc, Mutex},
  time::Duration,
};
use tauri::Url;

#[derive(Clone)]
pub struct Database(pub Arc<Mutex<Connection>>);

impl Database {
  pub fn open(path: &Path, legacy_path: Option<&Path>) -> Result<Self, Box<dyn std::error::Error>> {
    if let Some(parent) = path.parent() {
      fs::create_dir_all(parent)?;
    }
    let mut connection = Connection::open(path)?;
    connection.busy_timeout(Duration::from_secs(5))?;
    connection.pragma_update(None, "foreign_keys", true)?;
    initialize(&mut connection, legacy_path)?;
    Ok(Self(Arc::new(Mutex::new(connection))))
  }
}

pub fn initialize(
  connection: &mut Connection,
  legacy_path: Option<&Path>,
) -> Result<(), Box<dyn std::error::Error>> {
  let transaction = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
  let version: i64 = transaction.pragma_query_value(None, "user_version", |row| row.get(0))?;
  if version != 0 {
    return Ok(());
  }

  transaction.execute_batch(include_str!("schema.sql"))?;
  let legacy_path = legacy_path.filter(|path| path.is_file());
  if let Some(path) = legacy_path {
    import_legacy(&transaction, path)?;
  }
  transaction.pragma_update(None, "user_version", 1)?;
  transaction.commit()?;
  if legacy_path.is_some() {
    connection.execute_batch("DETACH DATABASE legacy")?;
  }
  Ok(())
}

fn import_legacy(
  transaction: &Transaction<'_>,
  path: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
  let mut uri = Url::from_file_path(path).map_err(|_| {
    std::io::Error::new(
      std::io::ErrorKind::InvalidInput,
      "Invalid legacy database path",
    )
  })?;
  uri.set_query(Some("mode=ro"));
  transaction.execute("ATTACH DATABASE ?1 AS legacy", [uri.as_str()])?;
  transaction.execute_batch(
    "INSERT INTO users (id, username, password_hash, avatar_url, focus_limit, created_at)
      SELECT id, username, password_hash, avatar_url, focus_limit, created_at FROM legacy.users;
     INSERT INTO skills (id, user_id, name, target_hours, priority, focus_minutes, break_minutes,
                         total_seconds_logged, created_at, updated_at)
      SELECT id, user_id, name, target_hours, priority, focus_minutes, break_minutes,
             total_seconds_logged, created_at, updated_at FROM legacy.skills;
     INSERT INTO sessions (id, skill_id, user_id, duration_seconds, started_at, completed_at, was_completed)
      SELECT id, skill_id, user_id, duration_seconds, started_at, completed_at, was_completed
      FROM legacy.sessions;",
  )?;
  Ok(())
}
