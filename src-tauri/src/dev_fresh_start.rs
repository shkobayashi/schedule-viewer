use std::fs;
use std::path::Path;

const OPEN_WINDOWS_FILE: &str = "open-windows.json";
const RECENT_FILES_FILE: &str = "recent-files.json";
const SETTINGS_FILE: &str = "settings.json";
const CALENDAR_FILE: &str = "calendar.json";
const LEGACY_LAST: &str = "last-schedule.json";
const LEGACY_RECOVERY: &str = "schedule-recovery.json";
const RECOVERY_DIR: &str = "schedule-recovery";
const FILTER_DIR: &str = "schedule-filters";
const MEMBERS_DIR: &str = "members";
const STATUSES_DIR: &str = "statuses";
const COLORS_DIR: &str = "colors";
const FIELD_EXTENSIONS_DIR: &str = "field-extensions";
const MCP_SOCKET_FILE: &str = "mcp.sock";

/// フロントが WebView の localStorage を消すタイミングを決める（`setup` の app data リセットと同じ条件）。
#[tauri::command]
pub fn dev_fresh_start_active() -> bool {
    fresh_start_requested()
}

/// 開発専用。`SCHEDULE_VIEWER_FRESH_START=1`（または `true`）のときだけ true。
pub fn fresh_start_requested() -> bool {
    if !cfg!(debug_assertions) {
        return false;
    }
    match std::env::var("SCHEDULE_VIEWER_FRESH_START") {
        Ok(value) => {
            let trimmed = value.trim();
            trimmed == "1" || trimmed.eq_ignore_ascii_case("true")
        }
        Err(_) => false,
    }
}

fn remove_file_if_exists(path: &Path) -> Result<(), String> {
    if !path.is_file() {
        return Ok(());
    }
    fs::remove_file(path).map_err(|e| format!("{} を消せません: {}", path.display(), e))
}

fn remove_dir_all_if_exists(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    fs::remove_dir_all(path).map_err(|e| format!("{} を消せません: {}", path.display(), e))
}

/// アプリデータ内の永続状態だけを消す。ユーザーのスケジュール JSON など app data 外のファイルには触れない。
pub fn reset_app_data_for_fresh_start(app_data: &Path) -> Result<(), String> {
    if !cfg!(debug_assertions) {
        return Err("初回起動のリセットは開発ビルドでのみ使えます。".to_string());
    }
    fs::create_dir_all(app_data)
        .map_err(|e| format!("アプリデータを準備できません: {}", e))?;

    for name in [
        OPEN_WINDOWS_FILE,
        RECENT_FILES_FILE,
        SETTINGS_FILE,
        CALENDAR_FILE,
        LEGACY_LAST,
        LEGACY_RECOVERY,
        MCP_SOCKET_FILE,
    ] {
        remove_file_if_exists(&app_data.join(name))?;
    }

    for name in [
        RECOVERY_DIR,
        FILTER_DIR,
        MEMBERS_DIR,
        STATUSES_DIR,
        COLORS_DIR,
        FIELD_EXTENSIONS_DIR,
    ] {
        remove_dir_all_if_exists(&app_data.join(name))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn reset_clears_app_data_but_not_outside_files() {
        let root = std::env::temp_dir().join(format!(
            "sv-fresh-start-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).expect("temp dir");
        let app_data = root.join("app-data");
        fs::create_dir_all(app_data.join(RECOVERY_DIR)).expect("recovery dir");
        fs::write(app_data.join(RECOVERY_DIR).join("abc.json"), "{}").expect("recovery");
        fs::write(app_data.join(OPEN_WINDOWS_FILE), r#"{"focusedLabel":"main","windows":[]}"#)
            .expect("open windows");
        fs::write(app_data.join(RECENT_FILES_FILE), r#"{"schedules":["/tmp/a.json"],"workspaces":[]}"#)
            .expect("recent");
        fs::write(app_data.join(SETTINGS_FILE), "{}").expect("settings");
        let outside = root.join("user-schedule.json");
        fs::write(&outside, r#"{"schemaVersion":8}"#).expect("outside");

        reset_app_data_for_fresh_start(&app_data).expect("reset");

        assert!(!app_data.join(OPEN_WINDOWS_FILE).exists());
        assert!(!app_data.join(RECENT_FILES_FILE).exists());
        assert!(!app_data.join(RECOVERY_DIR).exists());
        assert!(outside.is_file());

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn fresh_start_requested_is_false_in_tests_without_env() {
        assert!(!fresh_start_requested());
    }
}
