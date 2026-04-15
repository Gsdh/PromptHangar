mod commands;
mod db;
mod error;
mod git;
mod models;
mod server;

use directories::ProjectDirs;
use std::path::PathBuf;

fn resolve_db_path() -> PathBuf {
    if let Some(dirs) = ProjectDirs::from("com", "prompthangar", "app") {
        return dirs.data_dir().join("data.db");
    }
    // Fallback: home dir
    let mut p = std::env::var("HOME").map(PathBuf::from).unwrap_or_default();
    p.push(".prompthangar");
    p.push("data.db");
    p
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = resolve_db_path();
    let pool = match db::init(&db_path) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Database initialisation failed: {e}");
            // Try to show a native dialog before exiting
            rfd::MessageDialog::new()
                .set_title("PromptHangar — startup error")
                .set_description(&format!(
                    "Could not open the database at:\n{}\n\nError: {e}\n\nThe file may be corrupted or the folder is not writable.",
                    db_path.display()
                ))
                .set_level(rfd::MessageLevel::Error)
                .show();
            std::process::exit(1);
        }
    };

    let pool_for_server = pool.clone();

    tauri::Builder::default()
        .setup(move |_app| {
            server::start_server(pool_for_server);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(pool)
        .invoke_handler(tauri::generate_handler![
            // folders
            commands::list_folders,
            commands::create_folder,
            commands::update_folder,
            commands::delete_folder,
            // prompts
            commands::list_prompts,
            commands::get_prompt,
            commands::create_prompt,
            commands::update_prompt,
            commands::delete_prompt,
            // tags
            commands::set_prompt_tags,
            commands::list_all_tags,
            // revisions
            commands::save_revision,
            commands::list_revisions,
            commands::toggle_revision_flag,
            commands::update_revision_meta,
            // outputs
            commands::list_outputs,
            commands::create_output,
            commands::update_output,
            commands::delete_output,
            // branching
            commands::create_branch,
            commands::list_branches,
            // environments
            commands::promote_to_env,
            commands::get_environments,
            // a/b testing
            commands::create_ab_test,
            commands::get_ab_tests,
            commands::record_ab_impression,
            // tracing
            commands::save_trace,
            commands::list_traces,
            commands::get_comparison,
            // eval scores
            commands::save_eval_score,
            commands::get_eval_scores,
            // chains
            commands::list_chains,
            commands::create_chain,
            commands::delete_chain,
            commands::get_chain_contents,
            // smart folders / queries
            commands::list_recent_prompts,
            commands::list_flagged_prompts,
            commands::get_stats,
            commands::duplicate_prompt,
            // search
            commands::search_prompts,
            // export
            commands::export_prompt_to_file,
            commands::write_text_file,
            // reorder / dnd
            commands::reorder_folders,
            commands::reorder_prompts,
            commands::move_prompt_to_folder,
            // keychain
            commands::keychain_set,
            commands::keychain_get,
            commands::keychain_delete,
            // settings
            commands::get_settings,
            commands::update_settings,
            // git sync (Epic 2)
            commands::list_git_workspaces,
            commands::create_git_workspace,
            commands::delete_git_workspace,
            commands::git_workspace_status,
            commands::commit_prompt_revision,
            // analytics (Epic 8)
            commands::get_spend_timeseries,
            commands::get_model_breakdown,
            commands::export_traces_csv,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("Tauri application error: {e}");
            std::process::exit(1);
        });
}
