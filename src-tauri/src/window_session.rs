use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::{read_utf8, read_utf8_limited, write_utf8_atomic, SCHEDULE_FILE_NOT_FOUND, MAX_SCHEDULE_BYTES};

const OPEN_WINDOWS_FILE: &str = "open-windows.json";
const RECOVERY_DIR: &str = "schedule-recovery";
const LEGACY_LAST: &str = "last-schedule.json";
const LEGACY_RECOVERY: &str = "schedule-recovery.json";

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct OpenWindowEntry {
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(default, skip_serializing_if = "is_false")]
    pub sample: bool,
}

fn is_false(value: &bool) -> bool {
    !*value
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct OpenWindowsFile {
    #[serde(rename = "focusedLabel")]
    pub focused_label: String,
    pub windows: Vec<OpenWindowEntry>,
}

#[derive(Clone, Debug, Default)]
pub struct PendingWindowOpen {
    pub path: String,
    pub contents: String,
}

#[derive(Default)]
pub struct WindowSessionState {
    pub pending_opens: HashMap<String, PendingWindowOpen>,
    pub startup_spawned: bool,
    /// 最近フォーカスした順。末尾が新しい。
    pub focus_order: Vec<String>,
    pub quit_active: bool,
    pub quitting: bool,
    pub quit_labels: Vec<String>,
    pub quit_ready: Vec<String>,
    /// 終了を確定した時点の、パスごとの控えの書き手。
    pub quit_recovery_owners: HashMap<String, String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RecoveryPersist {
    Write,
    Delete,
    Skip,
}

impl RecoveryPersist {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Write => "write",
            Self::Delete => "delete",
            Self::Skip => "skip",
        }
    }
}

pub fn note_window_focus(state: &mut WindowSessionState, label: &str) {
    state.focus_order.retain(|existing| existing != label);
    state.focus_order.push(label.to_string());
}

pub fn forget_window_focus(state: &mut WindowSessionState, label: &str) {
    state.focus_order.retain(|existing| existing != label);
}

/// `windows` は `(ラベル, パス)`。同じパスでは、最後に前面だったウィンドウを返す。
pub fn recovery_owner_label(
    focus_order_newest_last: &[String],
    windows: &[(String, String)],
    path: &str,
) -> Option<String> {
    for label in focus_order_newest_last.iter().rev() {
        if windows.iter().any(|(window, open)| window == label && open == path) {
            return Some(label.clone());
        }
    }
    windows
        .iter()
        .find(|(_, open)| open == path)
        .map(|(label, _)| label.clone())
}

pub fn recovery_owners_by_path(
    focus_order_newest_last: &[String],
    windows: &[(String, String)],
) -> HashMap<String, String> {
    let mut owners = HashMap::new();
    for (_, path) in windows {
        if owners.contains_key(path) {
            continue;
        }
        if let Some(label) = recovery_owner_label(focus_order_newest_last, windows, path) {
            owners.insert(path.clone(), label);
        }
    }
    owners
}

pub fn recovery_live_persist(owner: bool, dirty: bool) -> RecoveryPersist {
    if !owner {
        return RecoveryPersist::Skip;
    }
    if dirty {
        RecoveryPersist::Write
    } else {
        RecoveryPersist::Delete
    }
}

pub fn recovery_close_persist(
    owner: bool,
    other_windows: usize,
    dirty: bool,
    quitting: bool,
) -> RecoveryPersist {
    if quitting {
        return recovery_live_persist(owner, dirty);
    }
    if other_windows == 0 {
        return if dirty {
            RecoveryPersist::Write
        } else {
            RecoveryPersist::Delete
        };
    }
    RecoveryPersist::Skip
}

pub(crate) fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .as_slice()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

pub fn path_recovery_key(path: &str) -> String {
    sha256_hex(path.as_bytes())
}

pub fn open_windows_path(app_data: &Path) -> PathBuf {
    app_data.join(OPEN_WINDOWS_FILE)
}

pub fn recovery_dir(app_data: &Path) -> PathBuf {
    app_data.join(RECOVERY_DIR)
}

pub fn recovery_path_for(app_data: &Path, schedule_path: &str) -> PathBuf {
    recovery_dir(app_data).join(format!("{}.json", path_recovery_key(schedule_path)))
}

pub fn read_open_windows(app_data: &Path) -> Result<OpenWindowsFile, String> {
    let path = open_windows_path(app_data);
    if !path.is_file() {
        return Ok(OpenWindowsFile {
            focused_label: "main".to_string(),
            windows: vec![OpenWindowEntry {
                label: "main".to_string(),
                path: None,
                sample: true,
            }],
        });
    }
    let text = read_utf8(&path, MAX_SCHEDULE_BYTES)?;
    serde_json::from_str(&text)
        .map_err(|_| "ウィンドウ一覧の形式が正しくありません。".to_string())
}

pub fn write_open_windows(app_data: &Path, file: &OpenWindowsFile) -> Result<(), String> {
    fs::create_dir_all(app_data).map_err(|e| format!("アプリデータを準備できません: {}", e))?;
    let text = serde_json::to_string_pretty(file)
        .map_err(|e| format!("ウィンドウ一覧を保存できません: {}", e))?;
    write_utf8_atomic(&open_windows_path(app_data), &text)
}

pub fn dedupe_open_windows(file: OpenWindowsFile) -> OpenWindowsFile {
    let focused = file.focused_label.clone();
    let mut kept: Vec<OpenWindowEntry> = Vec::new();
    let mut path_owner: HashMap<String, String> = HashMap::new();

    for entry in file.windows {
        if entry.sample || entry.path.is_none() {
            kept.push(entry);
            continue;
        }
        let path = entry.path.clone().unwrap_or_default();
        if let Some(owner) = path_owner.get(&path) {
            if entry.label == focused {
                kept.retain(|existing| existing.path.as_deref() != Some(path.as_str()));
                kept.push(entry.clone());
                path_owner.insert(path, entry.label.clone());
            } else if owner != &focused {
                continue;
            }
            continue;
        }
        path_owner.insert(path, entry.label.clone());
        kept.push(entry);
    }

    if kept.is_empty() {
        kept.push(OpenWindowEntry {
            label: "main".to_string(),
            path: None,
            sample: true,
        });
    }
    let focused_label = if kept.iter().any(|w| w.label == focused) {
        focused
    } else {
        kept[0].label.clone()
    };
    OpenWindowsFile {
        focused_label,
        windows: kept,
    }
}

fn legacy_path_field(text: &str) -> Option<String> {
    let value = serde_json::from_str::<serde_json::Value>(text).ok()?;
    let path = value.get("path").and_then(|item| item.as_str())?;
    let trimmed = path.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

pub fn migrate_legacy_session(app_data: &Path) -> Result<(), String> {
    if open_windows_path(app_data).is_file() {
        return Ok(());
    }
    fs::create_dir_all(app_data).map_err(|e| format!("アプリデータを準備できません: {}", e))?;
    fs::create_dir_all(recovery_dir(app_data))
        .map_err(|e| format!("アプリデータを準備できません: {}", e))?;

    let last_path = app_data.join(LEGACY_LAST);
    let legacy_recovery = app_data.join(LEGACY_RECOVERY);

    let mut remembered_path = if last_path.is_file() {
        let text = read_utf8(&last_path, MAX_SCHEDULE_BYTES)?;
        legacy_path_field(&text)
    } else {
        None
    };

    if legacy_recovery.is_file() {
        let text = read_utf8_limited(
            &legacy_recovery,
            MAX_SCHEDULE_BYTES,
            "復旧用の控えが大きすぎます（上限 10 MB）",
        )?;
        if let Some(path) = legacy_path_field(&text) {
            if remembered_path.is_none() {
                remembered_path = Some(path.clone());
            }
            let target = recovery_path_for(app_data, &path);
            if !target.exists() {
                write_utf8_atomic(&target, &text)?;
            }
        }
        fs::remove_file(&legacy_recovery)
            .map_err(|e| format!("復旧用の控えを削除できません: {}", e))?;
    }

    let entry = if let Some(path) = remembered_path {
        OpenWindowEntry {
            label: "main".to_string(),
            path: Some(path),
            sample: false,
        }
    } else {
        OpenWindowEntry {
            label: "main".to_string(),
            path: None,
            sample: true,
        }
    };

    let file = OpenWindowsFile {
        focused_label: "main".to_string(),
        windows: vec![entry],
    };
    write_open_windows(app_data, &file)?;

    if last_path.exists() {
        let _ = fs::remove_file(&last_path);
    }
    Ok(())
}

pub fn entry_for_label<'a>(file: &'a OpenWindowsFile, label: &str) -> Option<&'a OpenWindowEntry> {
    file.windows.iter().find(|entry| entry.label == label)
}

pub fn upsert_window_path(
    app_data: &Path,
    label: &str,
    path: Option<&str>,
    sample: bool,
) -> Result<(), String> {
    let mut file = read_open_windows(app_data)?;
    if let Some(entry) = file.windows.iter_mut().find(|e| e.label == label) {
        entry.path = path.map(str::to_string);
        entry.sample = sample && path.is_none();
    } else {
        file.windows.push(OpenWindowEntry {
            label: label.to_string(),
            path: path.map(str::to_string),
            sample: sample && path.is_none(),
        });
    }
    write_open_windows(app_data, &file)
}

pub fn remove_window_label(app_data: &Path, label: &str) -> Result<(), String> {
    let mut file = read_open_windows(app_data)?;
    file.windows.retain(|entry| entry.label != label);
    if file.focused_label == label {
        file.focused_label = file
            .windows
            .first()
            .map(|entry| entry.label.clone())
            .unwrap_or_else(|| "main".to_string());
    }
    if file.windows.is_empty() {
        file.windows.push(OpenWindowEntry {
            label: "main".to_string(),
            path: None,
            sample: true,
        });
        file.focused_label = "main".to_string();
    }
    write_open_windows(app_data, &file)
}

pub fn set_focused_label(app_data: &Path, label: &str) -> Result<(), String> {
    let mut file = read_open_windows(app_data)?;
    if file.windows.iter().any(|entry| entry.label == label) {
        file.focused_label = label.to_string();
        write_open_windows(app_data, &file)
    } else {
        Ok(())
    }
}

pub fn read_recovery_for_path(app_data: &Path, schedule_path: &str) -> Result<Option<String>, String> {
    let path = recovery_path_for(app_data, schedule_path);
    if !path.is_file() {
        return Ok(None);
    }
    Ok(Some(read_utf8_limited(
        &path,
        MAX_SCHEDULE_BYTES,
        "復旧用の控えが大きすぎます（上限 10 MB）",
    )?))
}

pub fn write_recovery_for_path(
    app_data: &Path,
    schedule_path: &str,
    contents: &str,
) -> Result<(), String> {
    if contents.len() as u64 > MAX_SCHEDULE_BYTES {
        return Err("復旧用の控えが大きすぎます（上限 10 MB）".to_string());
    }
    fs::create_dir_all(recovery_dir(app_data))
        .map_err(|e| format!("アプリデータを準備できません: {}", e))?;
    write_utf8_atomic(&recovery_path_for(app_data, schedule_path), contents)
}

pub fn delete_recovery_for_path(app_data: &Path, schedule_path: &str) -> Result<(), String> {
    let path = recovery_path_for(app_data, schedule_path);
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("復旧用の控えを削除できません: {}", e))?;
    }
    Ok(())
}

pub fn next_schedule_window_label(app: &AppHandle) -> Result<String, String> {
    let mut index = 2;
    loop {
        let label = format!("schedule-{index}");
        if app.get_webview_window(&label).is_none() {
            return Ok(label);
        }
        index += 1;
        if index > 10_000 {
            return Err("ウィンドウをこれ以上開けません。".to_string());
        }
    }
}

pub fn create_schedule_webview(
    app: &AppHandle,
    label: &str,
    title: &str,
) -> Result<(), String> {
    if app.get_webview_window(label).is_some() {
        return Err("同じウィンドウが既に開いています。".to_string());
    }
    WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title(title)
        .inner_size(1100.0, 780.0)
        .build()
        .map_err(|e| format!("ウィンドウを開けません: {}", e))?;
    Ok(())
}

pub fn spawn_startup_windows(app: &AppHandle, app_data: &Path) -> Result<(), String> {
    let file = dedupe_open_windows(read_open_windows(app_data)?);
    write_open_windows(app_data, &file)?;
    for entry in &file.windows {
        if entry.label == "main" {
            continue;
        }
        if app.get_webview_window(&entry.label).is_some() {
            continue;
        }
        create_schedule_webview(app, &entry.label, "schedule-viewer")?;
    }
    if let Some(window) = app.get_webview_window(&file.focused_label) {
        let _ = window.set_focus();
    }
    Ok(())
}

#[derive(Serialize)]
pub struct WindowStartupRead {
    pub path: Option<String>,
    pub sample: bool,
    pub contents: Option<String>,
    pub error: Option<String>,
    pub draft_text: Option<String>,
}

pub fn read_window_startup(app_data: &Path, label: &str) -> Result<WindowStartupRead, String> {
    let file = read_open_windows(app_data)?;
    let Some(entry) = entry_for_label(&file, label) else {
        return Ok(WindowStartupRead {
            path: None,
            sample: true,
            contents: None,
            error: None,
            draft_text: None,
        });
    };
    if entry.sample || entry.path.is_none() {
        return Ok(WindowStartupRead {
            path: None,
            sample: true,
            contents: None,
            error: None,
            draft_text: None,
        });
    }
    let path = entry.path.clone().unwrap_or_default();
    let draft_text = read_recovery_for_path(app_data, &path)?;
    let path_buf = PathBuf::from(&path);
    if !path_buf.is_file() {
        return Ok(WindowStartupRead {
            path: Some(path),
            sample: false,
            contents: None,
            error: Some(SCHEDULE_FILE_NOT_FOUND.to_string()),
            draft_text,
        });
    }
    match read_utf8(&path_buf, MAX_SCHEDULE_BYTES) {
        Ok(contents) => Ok(WindowStartupRead {
            path: Some(path),
            sample: false,
            contents: Some(contents),
            error: None,
            draft_text,
        }),
        Err(message) => Ok(WindowStartupRead {
            path: Some(path),
            sample: false,
            contents: None,
            error: Some(message),
            draft_text,
        }),
    }
}

pub fn take_pending_open(
    state: &mut WindowSessionState,
    label: &str,
) -> Option<PendingWindowOpen> {
    state.pending_opens.remove(label)
}

pub fn store_pending_open(
    state: &mut WindowSessionState,
    label: String,
    path: String,
    contents: String,
) {
    state.pending_opens.insert(
        label,
        PendingWindowOpen { path, contents },
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn path_recovery_key_is_stable() {
        assert_eq!(
            path_recovery_key("/tmp/a.json"),
            "f946e9b42fa5a53b72835c49cf5dd290b7530f72057a876b2509de5870d62493",
        );
        assert_ne!(
            path_recovery_key("/tmp/a.json"),
            path_recovery_key("/tmp/b.json"),
        );
    }

    #[test]
    fn dedupe_keeps_focused_path() {
        let file = OpenWindowsFile {
            focused_label: "schedule-2".to_string(),
            windows: vec![
                OpenWindowEntry {
                    label: "main".to_string(),
                    path: Some("/tmp/plan.json".to_string()),
                    sample: false,
                },
                OpenWindowEntry {
                    label: "schedule-2".to_string(),
                    path: Some("/tmp/plan.json".to_string()),
                    sample: false,
                },
            ],
        };
        let deduped = dedupe_open_windows(file);
        assert_eq!(deduped.windows.len(), 1);
        assert_eq!(deduped.windows[0].label, "schedule-2");
    }

    #[test]
    fn recovery_owner_is_latest_focused_window_for_path() {
        let windows = vec![
            ("main".to_string(), "/tmp/plan.json".to_string()),
            ("schedule-2".to_string(), "/tmp/plan.json".to_string()),
            ("schedule-3".to_string(), "/tmp/other.json".to_string()),
        ];
        let focus = vec![
            "main".to_string(),
            "schedule-2".to_string(),
            "schedule-3".to_string(),
        ];
        assert_eq!(
            recovery_owner_label(&focus, &windows, "/tmp/plan.json").as_deref(),
            Some("schedule-2"),
        );
    }

    #[test]
    fn recovery_owners_are_fixed_per_path() {
        let windows = vec![
            ("main".to_string(), "/tmp/plan.json".to_string()),
            ("schedule-2".to_string(), "/tmp/plan.json".to_string()),
            ("schedule-3".to_string(), "/tmp/other.json".to_string()),
        ];
        let focus = vec![
            "main".to_string(),
            "schedule-2".to_string(),
            "schedule-3".to_string(),
        ];
        let owners = recovery_owners_by_path(&focus, &windows);
        assert_eq!(owners.get("/tmp/plan.json").map(String::as_str), Some("schedule-2"));
        assert_eq!(
            owners.get("/tmp/other.json").map(String::as_str),
            Some("schedule-3"),
        );
    }

    #[test]
    fn recovery_owner_falls_back_to_first_window() {
        let windows = vec![
            ("schedule-2".to_string(), "/tmp/plan.json".to_string()),
            ("main".to_string(), "/tmp/plan.json".to_string()),
        ];
        assert_eq!(
            recovery_owner_label(&[], &windows, "/tmp/plan.json").as_deref(),
            Some("schedule-2"),
        );
    }

    #[test]
    fn recovery_close_keeps_front_window_only() {
        assert_eq!(
            recovery_close_persist(false, 1, true, false),
            RecoveryPersist::Skip,
        );
        assert_eq!(
            recovery_close_persist(true, 1, true, false),
            RecoveryPersist::Skip,
        );
        assert_eq!(
            recovery_close_persist(true, 0, true, false),
            RecoveryPersist::Write,
        );
        assert_eq!(
            recovery_close_persist(true, 2, false, true),
            RecoveryPersist::Delete,
        );
        assert_eq!(
            recovery_live_persist(false, true),
            RecoveryPersist::Skip,
        );
    }

    #[test]
    fn migrate_moves_legacy_files_and_removes_them() {
        let dir = std::env::temp_dir().join(format!(
            "schedule-viewer-migrate-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        fs::write(
            dir.join(LEGACY_LAST),
            r#"{"path":"/tmp/plan.json"}"#,
        )
        .unwrap();
        let recovery = r#"{"path":"/tmp/plan.json","baselineJson":"b","documentJson":"d"}"#;
        fs::write(dir.join(LEGACY_RECOVERY), recovery).unwrap();

        migrate_legacy_session(&dir).unwrap();

        assert!(!dir.join(LEGACY_LAST).exists());
        assert!(!dir.join(LEGACY_RECOVERY).exists());
        let open = fs::read_to_string(open_windows_path(&dir)).unwrap();
        assert!(open.contains("/tmp/plan.json"));
        let copied = fs::read_to_string(recovery_path_for(&dir, "/tmp/plan.json")).unwrap();
        assert_eq!(copied, recovery);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn migrate_keeps_unreadable_legacy_recovery() {
        let dir = std::env::temp_dir().join(format!(
            "schedule-viewer-migrate-bad-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join(LEGACY_LAST), r#"{"path":"/tmp/plan.json"}"#).unwrap();
        fs::write(dir.join(LEGACY_RECOVERY), [0xff, 0xfe]).unwrap();

        assert!(migrate_legacy_session(&dir).is_err());
        assert!(dir.join(LEGACY_RECOVERY).is_file());
        assert!(dir.join(LEGACY_LAST).is_file());
        assert!(!open_windows_path(&dir).exists());
        let _ = fs::remove_dir_all(&dir);
    }
}
