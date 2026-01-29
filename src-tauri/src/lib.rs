mod commands;
mod link_commands;
mod linking;
mod models;
mod session_links;

use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let migrations = vec![
    Migration {
      version: 1,
      description: "create_initial_tables",
      sql: include_str!("../migrations/001_init.sql"),
      kind: MigrationKind::Up,
    },
    Migration {
      version: 2,
      description: "add_session_links_table",
      sql: include_str!("../migrations/002_add_session_links.sql"),
      kind: MigrationKind::Up,
    },
  ];

  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      commands::ensure_narrative_dirs,
      commands::write_narrative_file,
      commands::read_narrative_file,
      commands::list_narrative_files,
      commands::read_text_file,
      // Session link commands
      session_links::create_or_update_session_link,
      session_links::get_session_links_for_repo,
      session_links::get_session_links_for_commit,
      session_links::delete_session_link,
      // Linking algorithm commands
      link_commands::link_session_to_commit,
      link_commands::import_session_file,
    ])
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:narrative.db", migrations)
        .build(),
    )
    .setup(|app| {
      // Create a separate sqlx pool for backend Rust operations
      // The tauri_plugin_sql manages its own pool for frontend JS access

      // Use blocking connect since setup is not async
      let pool = tauri::async_runtime::block_on(async {
        // Create database if it doesn't exist, then connect
        let options = SqliteConnectOptions::new()
          .filename("narrative.db")
          .create_if_missing(true);

        SqlitePool::connect_with(options).await
          .expect("Failed to connect to database")
      });

      app.manage(Arc::new(pool));
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
