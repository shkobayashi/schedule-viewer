use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{mpsc, OnceLock};
use std::thread;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::{
    read_utf8, read_utf8_limited, schedule_drop::ExternalDropQueue, write_utf8_atomic,
    MAX_SCHEDULE_BYTES, SCHEDULE_FILE_NOT_FOUND,
};

const OPEN_WINDOWS_FILE: &str = "open-windows.json";
const RECOVERY_DIR: &str = "schedule-recovery";
const FILTER_DIR: &str = "schedule-filters";
const LEGACY_LAST: &str = "last-schedule.json";
const LEGACY_RECOVERY: &str = "schedule-recovery.json";

pub const MAX_FILTER_BYTES: u64 = 64 * 1024;

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
    pub startup_settled_labels: Vec<String>,
    pub startup_auto_update_at_startup: HashMap<String, bool>,
    pub update_check_claimed: bool,
    pub update_active: bool,
    pub update_labels: Vec<String>,
    pub update_ready: Vec<String>,
    pub update_recovery_persisted: Vec<String>,
    pub update_install_label: Option<String>,
    pub updating: bool,
    pub update_recovery_owners: HashMap<String, String>,
    pub application_update_ui_json: Option<String>,
    pub external_drop_queue: ExternalDropQueue,
    /// 起動復旧の確認ダイアログを閉じ、外部ドロップを受け付けられるウィンドウ。
    pub external_drop_ready_labels: Vec<String>,
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
        if windows
            .iter()
            .any(|(window, open)| window == label && open == path)
        {
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

pub fn all_webview_windows_listed(app: &AppHandle, labels: &[String]) -> bool {
    let open: Vec<String> = app.webview_windows().keys().cloned().collect();
    if open.is_empty() {
        return false;
    }
    open.iter().all(|label| labels.iter().any(|item| item == label))
}

pub fn all_windows_startup_settled(app: &AppHandle, settled: &[String]) -> bool {
    all_webview_windows_listed(app, settled)
}

pub fn all_windows_external_drop_ready(app: &AppHandle, ready: &[String]) -> bool {
    all_webview_windows_listed(app, ready)
}

pub fn any_startup_auto_update_enabled(
    open_labels: &[String],
    flags: &HashMap<String, bool>,
) -> bool {
    open_labels
        .iter()
        .any(|label| flags.get(label) == Some(&true))
}

pub fn forget_startup_settlement(state: &mut WindowSessionState, label: &str) {
    state
        .startup_settled_labels
        .retain(|existing| existing != label);
    state
        .external_drop_ready_labels
        .retain(|existing| existing != label);
    state.startup_auto_update_at_startup.remove(label);
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
    updating: bool,
) -> RecoveryPersist {
    if quitting || updating {
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
    serde_json::from_str(&text).map_err(|_| "ウィンドウ一覧の形式が正しくありません。".to_string())
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

pub fn read_recovery_for_path(
    app_data: &Path,
    schedule_path: &str,
) -> Result<Option<String>, String> {
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
        fs::remove_file(&path).map_err(|e| format!("復旧用の控えを削除できません: {}", e))?;
    }
    Ok(())
}

pub fn filter_dir(app_data: &Path) -> PathBuf {
    app_data.join(FILTER_DIR)
}

pub fn filter_path_for(app_data: &Path, schedule_path: &str) -> PathBuf {
    filter_dir(app_data).join(format!("{}.json", path_recovery_key(schedule_path)))
}

pub fn read_filter_for_path(
    app_data: &Path,
    schedule_path: &str,
) -> Result<Option<String>, String> {
    let path = filter_path_for(app_data, schedule_path);
    if !path.is_file() {
        return Ok(None);
    }
    Ok(Some(read_utf8_limited(
        &path,
        MAX_FILTER_BYTES,
        "絞り込みの記録が大きすぎます（上限 64 KB）",
    )?))
}

pub fn write_filter_for_path(
    app_data: &Path,
    schedule_path: &str,
    contents: &str,
) -> Result<(), String> {
    if contents.len() as u64 > MAX_FILTER_BYTES {
        return Err("絞り込みの記録が大きすぎます（上限 64 KB）".to_string());
    }
    fs::create_dir_all(filter_dir(app_data))
        .map_err(|e| format!("アプリデータを準備できません: {}", e))?;
    write_utf8_atomic(&filter_path_for(app_data, schedule_path), contents)
}

pub fn delete_filter_for_path(app_data: &Path, schedule_path: &str) -> Result<(), String> {
    let path = filter_path_for(app_data, schedule_path);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("絞り込みの記録を削除できません: {}", e))?;
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

static MAIN_THREAD_ID: OnceLock<thread::ThreadId> = OnceLock::new();

pub fn note_main_thread() {
    let _ = MAIN_THREAD_ID.set(thread::current().id());
}

fn on_main_thread() -> bool {
    MAIN_THREAD_ID
        .get()
        .is_none_or(|id| *id == thread::current().id())
}

pub fn create_schedule_webview_on_main_thread(
    app: &AppHandle,
    label: &str,
    title: &str,
) -> Result<(), String> {
    let label_owned = label.to_string();
    let title_owned = title.to_string();
    let app = app.clone();
    let build_on_main_thread = move || -> Result<(), String> {
        let (tx, rx) = mpsc::channel();
        let label = label_owned.clone();
        let title = title_owned.clone();
        let app = app.clone();
        app.clone()
            .run_on_main_thread(move || {
                let result = create_schedule_webview(&app, &label, &title);
                let _ = tx.send(result);
            })
            .map_err(|e| format!("ウィンドウを開けません: {}", e))?;
        rx.recv()
            .map_err(|_| "ウィンドウを開けません: メインスレッドが応答しませんでした。".to_string())?
    };
    if on_main_thread() {
        thread::spawn(build_on_main_thread)
            .join()
            .map_err(|_| "ウィンドウを開けません: メインスレッドが応答しませんでした。".to_string())?
    } else {
        build_on_main_thread()
    }
}

pub fn append_open_window_entry(
    app_data: &Path,
    label: &str,
    path: &str,
) -> Result<(), String> {
    let mut file = read_open_windows(app_data)?;
    file.windows.push(OpenWindowEntry {
        label: label.to_string(),
        path: Some(path.to_string()),
        sample: false,
    });
    file.focused_label = label.to_string();
    write_open_windows(app_data, &file)?;
    Ok(())
}

pub fn should_close_default_main_window(file: &OpenWindowsFile) -> bool {
    let has_main = file.windows.iter().any(|entry| entry.label == "main");
    !has_main && !file.windows.is_empty()
}

pub fn should_remove_open_window_label_after_destroy(
    quitting: bool,
    remaining_webviews: usize,
) -> bool {
    !quitting && remaining_webviews >= 1
}

pub const MCP_WINDOW_SAMPLE_DISPLAY: &str = "サンプルデータ";

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct McpOpenWindowEntry {
    pub label: String,
    pub file: String,
    pub folder: Option<String>,
    pub front: bool,
}

pub fn schedule_path_basename(path: &str) -> String {
    let parts: Vec<&str> = path.split(['/', '\\']).collect();
    if let Some(last) = parts.last().filter(|segment| !segment.is_empty()) {
        last.to_string()
    } else {
        "schedule.json".to_string()
    }
}

pub fn schedule_path_parent_folder(path: &str) -> Option<String> {
    Path::new(path)
        .parent()
        .and_then(|parent| parent.file_name())
        .map(|name| name.to_string_lossy().into_owned())
}

pub fn build_mcp_open_windows_list(
    file: &OpenWindowsFile,
    live_labels: &[String],
    front_label: &str,
) -> Vec<McpOpenWindowEntry> {
    let live: std::collections::HashSet<&str> =
        live_labels.iter().map(|label| label.as_str()).collect();
    let mut ordered: Vec<String> = Vec::new();
    for entry in &file.windows {
        if live.contains(entry.label.as_str()) && !ordered.contains(&entry.label) {
            ordered.push(entry.label.clone());
        }
    }
    for label in live_labels {
        if !ordered.contains(label) {
            ordered.push(label.clone());
        }
    }
    let by_label: HashMap<&str, &OpenWindowEntry> = file
        .windows
        .iter()
        .map(|entry| (entry.label.as_str(), entry))
        .collect();
    ordered
        .into_iter()
        .map(|label| {
            let (file_name, folder) = match by_label.get(label.as_str()) {
                Some(entry) if entry.sample || entry.path.is_none() => {
                    (MCP_WINDOW_SAMPLE_DISPLAY.to_string(), None)
                }
                Some(entry) if let Some(path) = entry.path.as_deref() => (
                    schedule_path_basename(path),
                    schedule_path_parent_folder(path),
                ),
                _ => (MCP_WINDOW_SAMPLE_DISPLAY.to_string(), None),
            };
            let is_front = label == front_label;
            McpOpenWindowEntry {
                label,
                file: file_name,
                folder,
                front: is_front,
            }
        })
        .collect()
}

pub fn resolve_mcp_screen_window_label(
    recorded_focused: &str,
    live_labels: &[String],
    focus_order_newest_last: &[String],
    os_focused_label: Option<&str>,
) -> Option<String> {
    if live_labels.is_empty() {
        return None;
    }
    let live = |label: &str| live_labels.iter().any(|item| item == label);
    if live(recorded_focused) {
        return Some(recorded_focused.to_string());
    }
    if let Some(label) = os_focused_label {
        if live(label) {
            return Some(label.to_string());
        }
    }
    for label in focus_order_newest_last.iter().rev() {
        if live(label) {
            return Some(label.clone());
        }
    }
    live_labels.first().cloned()
}

/// `override_label` があるときは生きているラベルと一致する場合だけ返す。
pub fn resolve_mcp_screen_window_label_with_override(
    override_label: Option<&str>,
    recorded_focused: &str,
    live_labels: &[String],
    focus_order_newest_last: &[String],
    os_focused_label: Option<&str>,
) -> Result<Option<String>, McpWindowOverrideError> {
    if let Some(label) = override_label {
        if label.is_empty() {
            return Err(McpWindowOverrideError::NotOpen);
        }
        if live_labels.iter().any(|live| live == label) {
            return Ok(Some(label.to_string()));
        }
        return Err(McpWindowOverrideError::NotOpen);
    }
    Ok(resolve_mcp_screen_window_label(
        recorded_focused,
        live_labels,
        focus_order_newest_last,
        os_focused_label,
    ))
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum McpWindowOverrideError {
    NotOpen,
}

pub fn create_schedule_webview(app: &AppHandle, label: &str, title: &str) -> Result<(), String> {
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
    let close_default_main = should_close_default_main_window(&file);
    for entry in &file.windows {
        if entry.label == "main" {
            continue;
        }
        if app.get_webview_window(&entry.label).is_some() {
            continue;
        }
        create_schedule_webview(app, &entry.label, "schedule-viewer")?;
    }
    if close_default_main {
        if let Some(main) = app.get_webview_window("main") {
            let _ = main.close();
        }
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

pub fn take_pending_open(state: &mut WindowSessionState, label: &str) -> Option<PendingWindowOpen> {
    state.pending_opens.remove(label)
}

pub fn store_pending_open(
    state: &mut WindowSessionState,
    label: String,
    path: String,
    contents: String,
) {
    state
        .pending_opens
        .insert(label, PendingWindowOpen { path, contents });
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
    fn filter_path_uses_same_hash_as_recovery() {
        let app_data = std::env::temp_dir().join("schedule-viewer-filter-test");
        let _ = fs::remove_dir_all(&app_data);
        let schedule = "/tmp/plan.json";
        assert_eq!(
            filter_path_for(&app_data, schedule).file_name(),
            recovery_path_for(&app_data, schedule).file_name(),
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
        assert_eq!(
            owners.get("/tmp/plan.json").map(String::as_str),
            Some("schedule-2")
        );
        assert_eq!(
            owners.get("/tmp/other.json").map(String::as_str),
            Some("schedule-3"),
        );
    }

    #[test]
    fn should_close_default_main_when_main_not_recorded() {
        let file = OpenWindowsFile {
            focused_label: "schedule-2".to_string(),
            windows: vec![OpenWindowEntry {
                label: "schedule-2".to_string(),
                path: Some("/tmp/plan.json".to_string()),
                sample: false,
            }],
        };
        assert!(should_close_default_main_window(&file));
        let with_main = OpenWindowsFile {
            focused_label: "main".to_string(),
            windows: vec![
                OpenWindowEntry {
                    label: "main".to_string(),
                    path: Some("/tmp/plan.json".to_string()),
                    sample: false,
                },
                OpenWindowEntry {
                    label: "schedule-2".to_string(),
                    path: Some("/tmp/other.json".to_string()),
                    sample: false,
                },
            ],
        };
        assert!(!should_close_default_main_window(&with_main));
    }

    #[test]
    fn should_remove_label_after_destroy_when_another_window_remains() {
        assert!(should_remove_open_window_label_after_destroy(false, 1));
        assert!(!should_remove_open_window_label_after_destroy(false, 0));
        assert!(!should_remove_open_window_label_after_destroy(true, 1));
    }

    #[test]
    fn build_mcp_open_windows_orders_live_and_sets_front() {
        let file = OpenWindowsFile {
            focused_label: "schedule-2".to_string(),
            windows: vec![
                OpenWindowEntry {
                    label: "main".to_string(),
                    path: Some("/tmp/projects/plan.json".to_string()),
                    sample: false,
                },
                OpenWindowEntry {
                    label: "schedule-2".to_string(),
                    path: Some("/tmp/other/roadmap.json".to_string()),
                    sample: false,
                },
            ],
        };
        let live = vec!["schedule-2".to_string(), "schedule-3".to_string()];
        let list = build_mcp_open_windows_list(&file, &live, "schedule-2");
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].label, "schedule-2");
        assert_eq!(list[0].file, "roadmap.json");
        assert_eq!(list[0].folder.as_deref(), Some("other"));
        assert!(list[0].front);
        assert_eq!(list[1].label, "schedule-3");
        assert_eq!(list[1].file, MCP_WINDOW_SAMPLE_DISPLAY);
        assert!(!list[1].front);
        let serialized = serde_json::to_string(&list).unwrap();
        assert!(!serialized.contains("/tmp"));
    }

    #[test]
    fn resolve_mcp_label_with_override_absent_matches_front_resolution() {
        let live = vec!["main".to_string(), "schedule-2".to_string()];
        let order = vec!["main".to_string(), "schedule-2".to_string()];
        let recorded = "schedule-2";
        let os = Some("main");
        assert_eq!(
            resolve_mcp_screen_window_label_with_override(None, recorded, &live, &order, os)
                .unwrap()
                .as_deref(),
            resolve_mcp_screen_window_label(recorded, &live, &order, os).as_deref()
        );
    }

    #[test]
    fn build_mcp_open_windows_omits_home_path_segments() {
        let file = OpenWindowsFile {
            focused_label: "main".to_string(),
            windows: vec![OpenWindowEntry {
                label: "main".to_string(),
                path: Some("/Users/alice/docs/plan.json".to_string()),
                sample: false,
            }],
        };
        let live = vec!["main".to_string()];
        let list = build_mcp_open_windows_list(&file, &live, "main");
        assert_eq!(list[0].file, "plan.json");
        assert_eq!(list[0].folder.as_deref(), Some("docs"));
        let serialized = serde_json::to_string(&list).unwrap();
        assert!(!serialized.contains("/Users"));
        assert!(!serialized.contains("alice"));
    }

    #[test]
    fn resolve_mcp_label_with_override_ignores_front() {
        let live = vec!["main".to_string(), "schedule-2".to_string()];
        let order = vec!["main".to_string(), "schedule-2".to_string()];
        assert_eq!(
            resolve_mcp_screen_window_label_with_override(
                Some("schedule-2"),
                "main",
                &live,
                &order,
                Some("main"),
            )
            .unwrap()
            .as_deref(),
            Some("schedule-2")
        );
        assert_eq!(
            resolve_mcp_screen_window_label_with_override(
                Some("missing"),
                "main",
                &live,
                &order,
                Some("main"),
            )
            .unwrap_err(),
            McpWindowOverrideError::NotOpen
        );
    }

    #[test]
    fn resolve_mcp_label_prefers_recorded_then_os_then_focus_order() {
        let live = vec!["main".to_string(), "schedule-2".to_string()];
        let order = vec!["main".to_string(), "schedule-2".to_string()];
        assert_eq!(
            resolve_mcp_screen_window_label("schedule-2", &live, &order, None).as_deref(),
            Some("schedule-2")
        );
        assert_eq!(
            resolve_mcp_screen_window_label("schedule-9", &live, &order, Some("main")).as_deref(),
            Some("main")
        );
        assert_eq!(
            resolve_mcp_screen_window_label("schedule-9", &live, &order, None).as_deref(),
            Some("schedule-2")
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
            recovery_close_persist(false, 1, true, false, false),
            RecoveryPersist::Skip,
        );
        assert_eq!(
            recovery_close_persist(true, 1, true, false, false),
            RecoveryPersist::Skip,
        );
        assert_eq!(
            recovery_close_persist(true, 0, true, false, false),
            RecoveryPersist::Write,
        );
        assert_eq!(
            recovery_close_persist(true, 2, false, true, false),
            RecoveryPersist::Delete,
        );
        assert_eq!(
            recovery_close_persist(true, 2, true, false, true),
            RecoveryPersist::Write,
        );
        assert_eq!(recovery_live_persist(false, true), RecoveryPersist::Skip,);
    }

    #[test]
    fn migrate_moves_legacy_files_and_removes_them() {
        let dir =
            std::env::temp_dir().join(format!("schedule-viewer-migrate-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join(LEGACY_LAST), r#"{"path":"/tmp/plan.json"}"#).unwrap();
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
