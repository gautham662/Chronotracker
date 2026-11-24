mod commands;
mod storage;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      #[cfg(target_os = "windows")]
      let legacy_database = app.path().desktop_dir().ok().map(|desktop| {
        desktop
          .join("chronotracker")
          .join("backend")
          .join("chronoskill.db")
      });
      #[cfg(not(target_os = "windows"))]
      let legacy_database: Option<std::path::PathBuf> = None;

      let database_path = app.path().app_local_data_dir()?.join("chronoskill.db");
      app.manage(storage::Database::open(
        &database_path,
        legacy_database.as_deref(),
      )?);
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![commands::local_api])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
