mod json_skills;
mod pending_release_notes;
mod window_session;

use json_skills::{
    install_json_skills, json_skill_home_dirs, pick_json_skill_folder, uninstall_json_skills,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;
use tauri::State;
use tauri_plugin_dialog::DialogExt;
use window_session::{
    all_windows_startup_settled, any_startup_auto_update_enabled, create_schedule_webview,
    delete_recovery_for_path, forget_startup_settlement, forget_window_focus,
    migrate_legacy_session, next_schedule_window_label, note_window_focus, read_open_windows,
    read_recovery_for_path, recovery_close_persist, recovery_live_persist, recovery_owner_label,
    recovery_owners_by_path, remove_window_label, set_focused_label, sha256_hex,
    spawn_startup_windows, store_pending_open, take_pending_open, upsert_window_path,
    write_open_windows, write_recovery_for_path, OpenWindowEntry, WindowSessionState,
    WindowStartupRead,
};

const MAX_SCHEDULE_BYTES: u64 = 10 * 1024 * 1024;

const MAX_HTML_BYTES: u64 = 10 * 1024 * 1024;

const MAX_MEMBERS_BYTES: u64 = 2 * 1024 * 1024;

const MAX_CALENDAR_BYTES: u64 = 2 * 1024 * 1024;

const DISK_HASH_MISMATCH: &str = "DISK_HASH_MISMATCH";

const SCHEDULE_FILE_NOT_FOUND: &str = "SCHEDULE_FILE_NOT_FOUND";

#[derive(Serialize)]
struct OpenScheduleResult {
    path: String,
    contents: String,
}

#[derive(Default)]
struct ScheduleFileState {
    path: Option<PathBuf>,
    content_hash: Option<String>,
}

#[derive(Default)]
struct ScheduleFileStates {
    by_label: HashMap<String, ScheduleFileState>,
}

fn window_label(window: &tauri::Window) -> String {
    window.label().to_string()
}

fn schedule_path_text(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn windows_for_recovery(states: &ScheduleFileStates) -> Vec<(String, String)> {
    let mut windows = Vec::new();
    for (label, state) in &states.by_label {
        if let Some(path) = &state.path {
            windows.push((label.clone(), schedule_path_text(path)));
        }
    }
    windows.sort_by(|left, right| left.0.cmp(&right.0));
    windows
}

fn caller_is_recovery_owner(
    session: &WindowSessionState,
    states: &ScheduleFileStates,
    label: &str,
    path: &str,
) -> bool {
    recovery_owner_label(&session.focus_order, &windows_for_recovery(states), path).as_deref()
        == Some(label)
}

fn other_windows_with_path(states: &ScheduleFileStates, label: &str, path: &str) -> usize {
    states
        .by_label
        .iter()
        .filter(|(other, state)| {
            *other != label
                && state
                    .path
                    .as_ref()
                    .is_some_and(|open| schedule_path_text(open) == path)
        })
        .count()
}

fn any_window_focused(app: &tauri::AppHandle) -> bool {
    app.webview_windows()
        .values()
        .any(|window| window.is_focused().unwrap_or(false))
}

fn hash_contents(contents: &str) -> String {
    sha256_hex(contents.as_bytes())
}

fn read_open_schedule<T>(
    states: &Mutex<ScheduleFileStates>,
    label: &str,
    use_contents: impl Fn(&ScheduleFileState, &str, &str) -> Result<T, String>,
) -> Result<T, String> {
    for _ in 0..2 {
        let path = {
            let guard = states.lock().expect("schedule file states");
            let state = guard
                .by_label
                .get(label)
                .ok_or_else(|| "開いているファイルがありません".to_string())?;
            state
                .path
                .as_ref()
                .ok_or_else(|| "開いているファイルがありません".to_string())?
                .clone()
        };
        let contents = read_utf8(&path, MAX_SCHEDULE_BYTES)?;
        let hash = hash_contents(&contents);
        let guard = states.lock().expect("schedule file states");
        let Some(state) = guard.by_label.get(label) else {
            return Err("開いているファイルがありません".to_string());
        };
        if state.path.as_ref() == Some(&path) {
            return use_contents(state, &contents, &hash);
        }
    }
    Err("開いているファイルがありません".to_string())
}

fn too_large_message(max_bytes: u64) -> String {
    if max_bytes == MAX_MEMBERS_BYTES {
        "メンバーファイルが大きすぎます（上限 2 MB）".to_string()
    } else if max_bytes == MAX_CALENDAR_BYTES {
        "カレンダーファイルが大きすぎます（上限 2 MB）".to_string()
    } else {
        "ファイルが大きすぎます（上限 10 MB）".to_string()
    }
}

fn read_utf8(path: &Path, max_bytes: u64) -> Result<String, String> {
    read_utf8_limited(path, max_bytes, &too_large_message(max_bytes))
}

fn read_utf8_limited(path: &Path, max_bytes: u64, too_large: &str) -> Result<String, String> {
    let file = fs::File::open(path).map_err(|e| format!("ファイルを読めません: {}", e))?;
    let mut limited = file.take(max_bytes.saturating_add(1));
    let mut bytes = Vec::new();
    limited
        .read_to_end(&mut bytes)
        .map_err(|e| format!("ファイルを読めません: {}", e))?;
    if bytes.len() as u64 > max_bytes {
        return Err(too_large.to_string());
    }
    String::from_utf8(bytes).map_err(|_| "UTF-8 以外の文字コードのファイルです".to_string())
}

fn write_utf8_atomic(path: &Path, contents: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "保存先のパスが不正です".to_string())?;
    fs::create_dir_all(parent).map_err(|e| format!("ファイルに書き込めません: {}", e))?;

    let mut tmp = tempfile::NamedTempFile::new_in(parent)
        .map_err(|e| format!("ファイルに書き込めません: {}", e))?;
    tmp.write_all(contents.as_bytes())
        .map_err(|e| format!("ファイルに書き込めません: {}", e))?;
    tmp.flush()
        .map_err(|e| format!("ファイルに書き込めません: {}", e))?;
    tmp.as_file()
        .sync_all()
        .map_err(|e| format!("ファイルに書き込めません: {}", e))?;
    tmp.persist(path)
        .map_err(|e| format!("ファイルに書き込めません: {}", e.error))?;
    Ok(())
}

pub(crate) fn sanitize_export_filename(name: &str, default_ext: &str) -> String {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return format!("schedule.{}", default_ext);
    }
    let mut out = String::new();
    for ch in trimmed.chars() {
        if matches!(ch, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') {
            continue;
        }
        if ch.is_control() {
            continue;
        }
        out.push(ch);
    }
    let base = out.trim_matches(|c: char| c.is_whitespace() || c == '.');
    if base.is_empty() {
        return format!("schedule.{}", default_ext);
    }
    let stem = base.rsplit_once('.').map(|(left, _)| left).unwrap_or(base);
    let reserved = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
        "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    if reserved.contains(&stem.to_ascii_uppercase().as_str()) {
        return format!("schedule.{}", default_ext);
    }
    let suffix = format!(".{}", default_ext);
    let lower = base.to_ascii_lowercase();
    if lower.ends_with(&suffix) {
        base.to_string()
    } else {
        format!("{}{}", base, suffix)
    }
}

fn is_json_path(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("json"))
        .unwrap_or(false)
}

pub(crate) fn require_active_save_path(
    active: Option<&Path>,
    expected: Option<&str>,
) -> Result<PathBuf, String> {
    let active =
        active.ok_or_else(|| "保存先が選ばれていません。別名保存を使ってください。".to_string())?;
    let expected = expected.ok_or_else(|| "保存先のパスが一致しません。".to_string())?;
    if active != Path::new(expected) {
        return Err("保存先のパスが一致しません。ファイルを開き直してください。".to_string());
    }
    Ok(active.to_path_buf())
}

fn record_open(
    app: &tauri::AppHandle,
    states: &Mutex<ScheduleFileStates>,
    label: &str,
    path: PathBuf,
    contents: &str,
) -> Result<(), String> {
    let app_data = app_data_dir(app)?;
    upsert_window_path(
        &app_data,
        label,
        Some(path.to_string_lossy().as_ref()),
        false,
    )?;
    let mut guard = states.lock().expect("schedule file states");
    let state = guard.by_label.entry(label.to_string()).or_default();
    state.path = Some(path);
    state.content_hash = Some(hash_contents(contents));
    Ok(())
}

#[tauri::command]
async fn open_schedule_file(
    window: tauri::Window,
    app: tauri::AppHandle,
    _state: State<'_, Mutex<ScheduleFileStates>>,
    initial_directory: Option<String>,
) -> Result<Option<OpenScheduleResult>, String> {
    let mut picker = app
        .dialog()
        .file()
        .set_parent(&window)
        .add_filter("JSON", &["json"]);
    if let Some(directory) = dialog_start_directory(&app, initial_directory.as_deref()) {
        picker = picker.set_directory(directory);
    }
    let path = picker.blocking_pick_file();

    match path {
        Some(file_path) => {
            let path_buf = file_path.into_path().map_err(|e| e.to_string())?;
            let contents = read_utf8(&path_buf, MAX_SCHEDULE_BYTES)?;
            Ok(Some(OpenScheduleResult {
                path: path_buf.to_string_lossy().into_owned(),
                contents,
            }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
fn accept_opened_schedule(
    window: tauri::Window,
    app: tauri::AppHandle,
    state: State<'_, Mutex<ScheduleFileStates>>,
    path: String,
    contents: String,
) -> Result<(), String> {
    if contents.len() as u64 > MAX_SCHEDULE_BYTES {
        return Err("ファイルが大きすぎます（上限 10 MB）".to_string());
    }
    record_open(
        &app,
        state.inner(),
        &window_label(&window),
        PathBuf::from(path),
        &contents,
    )
}

#[tauri::command]
fn check_schedule_file_changed(
    window: tauri::Window,
    state: State<'_, Mutex<ScheduleFileStates>>,
) -> Result<bool, String> {
    read_open_schedule(
        state.inner(),
        &window_label(&window),
        |guard, _contents, hash| Ok(guard.content_hash.as_deref() != Some(hash)),
    )
}

#[derive(Serialize)]
struct PollScheduleFileUpdateResult {
    contents: String,
}

#[tauri::command]
fn poll_schedule_file_update(
    window: tauri::Window,
    state: State<'_, Mutex<ScheduleFileStates>>,
) -> Result<Option<PollScheduleFileUpdateResult>, String> {
    read_open_schedule(
        state.inner(),
        &window_label(&window),
        |guard, contents, hash| {
            if guard.content_hash.as_deref() == Some(hash) {
                Ok(None)
            } else {
                Ok(Some(PollScheduleFileUpdateResult {
                    contents: contents.to_string(),
                }))
            }
        },
    )
}

#[tauri::command]
fn read_open_schedule_file(
    window: tauri::Window,
    state: State<'_, Mutex<ScheduleFileStates>>,
) -> Result<String, String> {
    let label = window_label(&window);
    let guard = state.lock().expect("schedule file states");
    let file_state = guard
        .by_label
        .get(&label)
        .ok_or_else(|| "開いているファイルがありません".to_string())?;
    let path = file_state
        .path
        .as_ref()
        .ok_or_else(|| "開いているファイルがありません".to_string())?;
    read_utf8(path, MAX_SCHEDULE_BYTES)
}

#[tauri::command]
fn acknowledge_schedule_file_contents(
    window: tauri::Window,
    state: State<'_, Mutex<ScheduleFileStates>>,
    contents: String,
) -> Result<(), String> {
    let label = window_label(&window);
    let mut guard = state.lock().expect("schedule file states");
    let file_state = guard
        .by_label
        .get_mut(&label)
        .ok_or_else(|| "開いているファイルがありません".to_string())?;
    if file_state.path.is_none() {
        return Err("開いているファイルがありません".to_string());
    }
    file_state.content_hash = Some(hash_contents(&contents));
    Ok(())
}

#[tauri::command]
async fn save_schedule_file(
    window: tauri::Window,
    state: State<'_, Mutex<ScheduleFileStates>>,
    contents: String,
    save_as: bool,
    suggested_name: String,
    expected_path: Option<String>,
    skip_disk_hash_check: bool,
) -> Result<Option<String>, String> {
    if contents.len() as u64 > MAX_SCHEDULE_BYTES {
        return Err("保存する内容が大きすぎます（上限 10 MB）".to_string());
    }
    let target = if save_as {
        let default_name = sanitize_export_filename(&suggested_name, "json");
        let picked = window
            .dialog()
            .file()
            .set_parent(&window)
            .set_file_name(&default_name)
            .add_filter("JSON", &["json"])
            .blocking_save_file();
        match picked {
            Some(file_path) => file_path.into_path().map_err(|e| e.to_string())?,
            None => return Ok(None),
        }
    } else {
        let guard = state.lock().expect("schedule file states");
        let label = window_label(&window);
        let file_state = guard
            .by_label
            .get(&label)
            .ok_or_else(|| "保存先が選ばれていません。別名保存を使ってください。".to_string())?;
        require_active_save_path(file_state.path.as_deref(), expected_path.as_deref())?
    };

    if !is_json_path(&target) {
        return Err("JSON ファイル以外には保存できません".to_string());
    }

    if !save_as && !skip_disk_hash_check {
        let disk = read_utf8(&target, MAX_SCHEDULE_BYTES)?;
        let disk_hash = hash_contents(&disk);
        let guard = state.lock().expect("schedule file states");
        let label = window_label(&window);
        let file_state = guard
            .by_label
            .get(&label)
            .ok_or_else(|| "開いているファイルがありません".to_string())?;
        let expected_hash = file_state
            .content_hash
            .as_ref()
            .ok_or_else(|| "開いているファイルがありません".to_string())?;
        if disk_hash != *expected_hash {
            return Err(DISK_HASH_MISMATCH.to_string());
        }
    }

    write_utf8_atomic(&target, &contents)?;
    record_open(
        window.app_handle(),
        state.inner(),
        &window_label(&window),
        target.clone(),
        &contents,
    )?;
    Ok(Some(target.to_string_lossy().into_owned()))
}

#[tauri::command]
async fn save_html_file(
    window: tauri::Window,
    app: tauri::AppHandle,
    contents: String,
    suggested_name: String,
    extension: String,
) -> Result<Option<String>, String> {
    if contents.len() as u64 > MAX_HTML_BYTES {
        return Err("保存する内容が大きすぎます（上限 10 MB）".to_string());
    }
    let ext = if extension.eq_ignore_ascii_case("svg") {
        "svg"
    } else {
        "html"
    };
    let default_name = sanitize_export_filename(&suggested_name, ext);
    let (filter_label, filter_exts): (&str, &[&str]) = if ext == "svg" {
        ("SVG", &["svg"])
    } else {
        ("HTML", &["html", "htm"])
    };
    let picked = app
        .dialog()
        .file()
        .set_parent(&window)
        .set_file_name(&default_name)
        .add_filter(filter_label, filter_exts)
        .blocking_save_file();
    let target = match picked {
        Some(file_path) => file_path.into_path().map_err(|e| e.to_string())?,
        None => return Ok(None),
    };
    write_utf8_atomic(&target, &contents)?;
    Ok(Some(target.to_string_lossy().into_owned()))
}

#[derive(Serialize, Deserialize, Default)]
struct AppSettingsFile {
    #[serde(rename = "selectedMembersCatalogId", default)]
    selected_members_catalog_id: Option<String>,
    #[serde(rename = "calendarLabel", default)]
    calendar_label: Option<String>,
}

#[derive(Serialize)]
struct MemberCatalogEntry {
    id: String,
    label: String,
}

#[derive(Serialize)]
struct MembersSettingsResult {
    #[serde(rename = "selectedCatalogId")]
    selected_catalog_id: Option<String>,
    catalogs: Vec<MemberCatalogEntry>,
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("アプリデータ領域を開けません: {}", e))
}

fn members_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app_data_dir(app)?.join("members");
    fs::create_dir_all(&dir).map_err(|e| format!("メンバーデータを準備できません: {}", e))?;
    Ok(dir)
}

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("settings.json"))
}

fn read_settings(app: &tauri::AppHandle) -> Result<AppSettingsFile, String> {
    let path = settings_path(app)?;
    if !path.exists() {
        return Ok(AppSettingsFile::default());
    }
    let text = read_utf8(&path, MAX_SCHEDULE_BYTES)?;
    serde_json::from_str(&text).map_err(|_| "設定ファイルの形式が正しくありません".to_string())
}

fn write_settings(app: &tauri::AppHandle, settings: &AppSettingsFile) -> Result<(), String> {
    let path = settings_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("設定を保存できません: {}", e))?;
    }
    let text = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("設定を保存できません: {}", e))?;
    write_utf8_atomic(&path, &text)
}

fn sanitize_catalog_id(id: &str) -> Result<String, String> {
    let trimmed = id.trim();
    if trimmed.is_empty() {
        return Err("カタログ名が空です".to_string());
    }
    if trimmed.contains('/') || trimmed.contains('\\') {
        return Err("カタログ名に / や \\ は使えません".to_string());
    }
    Ok(trimmed.to_string())
}

fn list_catalog_entries(app: &tauri::AppHandle) -> Result<Vec<MemberCatalogEntry>, String> {
    let dir = members_dir(app)?;
    let mut entries = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| format!("メンバー一覧を読めません: {}", e))?
    {
        let entry = entry.map_err(|e| format!("メンバー一覧を読めません: {}", e))?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
            continue;
        }
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();
        if stem.is_empty() {
            continue;
        }
        entries.push(MemberCatalogEntry {
            label: stem.clone(),
            id: stem,
        });
    }
    entries.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(entries)
}

#[tauri::command]
fn get_members_settings(app: tauri::AppHandle) -> Result<MembersSettingsResult, String> {
    let settings = read_settings(&app)?;
    let catalogs = list_catalog_entries(&app)?;
    Ok(MembersSettingsResult {
        selected_catalog_id: settings.selected_members_catalog_id,
        catalogs,
    })
}

#[tauri::command]
fn read_member_catalog(
    app: tauri::AppHandle,
    catalog_id: String,
) -> Result<Option<String>, String> {
    let id = sanitize_catalog_id(&catalog_id)?;
    let path = members_dir(&app)?.join(format!("{}.json", id));
    if !path.exists() {
        return Ok(None);
    }
    Ok(Some(read_utf8(&path, MAX_MEMBERS_BYTES)?))
}

#[tauri::command]
fn import_member_catalog(
    app: tauri::AppHandle,
    catalog_id: String,
    contents: String,
    overwrite: bool,
) -> Result<(), String> {
    let id = sanitize_catalog_id(&catalog_id)?;
    if contents.len() as u64 > MAX_MEMBERS_BYTES {
        return Err("メンバーファイルが大きすぎます（上限 2 MB）".to_string());
    }
    let path = members_dir(&app)?.join(format!("{}.json", id));
    if path.exists() && !overwrite {
        return Err("同じ名前のカタログが既にあります".to_string());
    }
    write_utf8_atomic(&path, &contents)
}

#[tauri::command]
fn delete_member_catalog(app: tauri::AppHandle, catalog_id: String) -> Result<(), String> {
    let id = sanitize_catalog_id(&catalog_id)?;
    let path = members_dir(&app)?.join(format!("{}.json", id));
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("カタログを削除できません: {}", e))?;
    }
    let mut settings = read_settings(&app)?;
    if settings.selected_members_catalog_id.as_deref() == Some(id.as_str()) {
        settings.selected_members_catalog_id = None;
        write_settings(&app, &settings)?;
    }
    Ok(())
}

#[tauri::command]
fn set_selected_member_catalog(
    app: tauri::AppHandle,
    catalog_id: Option<String>,
) -> Result<(), String> {
    let mut settings = read_settings(&app)?;
    settings.selected_members_catalog_id = match catalog_id {
        None => None,
        Some(id) => Some(sanitize_catalog_id(&id)?),
    };
    write_settings(&app, &settings)
}

fn calendar_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("calendar.json"))
}

#[tauri::command]
fn read_schedule_recovery(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: State<'_, Mutex<ScheduleFileStates>>,
    path: Option<String>,
) -> Result<Option<String>, String> {
    let schedule_path = match path {
        Some(value) => value,
        None => {
            let label = window_label(&window);
            let guard = state.lock().expect("schedule file states");
            guard
                .by_label
                .get(&label)
                .and_then(|entry| entry.path.as_ref())
                .map(|p| p.to_string_lossy().into_owned())
                .ok_or_else(|| "開いているファイルがありません".to_string())?
        }
    };
    read_recovery_for_path(&app_data_dir(&app)?, &schedule_path)
}

#[tauri::command]
fn write_schedule_recovery(
    app: tauri::AppHandle,
    window: tauri::Window,
    session: State<'_, Mutex<WindowSessionState>>,
    states: State<'_, Mutex<ScheduleFileStates>>,
    contents: String,
) -> Result<(), String> {
    let value: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|_| "復旧用の控えの形式が正しくありません。".to_string())?;
    let path = value
        .get("path")
        .and_then(|value| value.as_str())
        .ok_or_else(|| "復旧用の控えの形式が正しくありません。".to_string())?;
    let label = window_label(&window);
    let session_guard = session.lock().expect("window session");
    let states_guard = states.lock().expect("schedule file states");
    if !caller_is_recovery_owner(&session_guard, &states_guard, &label, path) {
        return Ok(());
    }
    drop(states_guard);
    drop(session_guard);
    write_recovery_for_path(&app_data_dir(&app)?, path, &contents)
}

#[tauri::command]
fn delete_schedule_recovery(
    app: tauri::AppHandle,
    window: tauri::Window,
    session: State<'_, Mutex<WindowSessionState>>,
    states: State<'_, Mutex<ScheduleFileStates>>,
    path: String,
) -> Result<(), String> {
    let label = window_label(&window);
    let session_guard = session.lock().expect("window session");
    let states_guard = states.lock().expect("schedule file states");
    let may_delete = caller_is_recovery_owner(&session_guard, &states_guard, &label, &path)
        || !windows_for_recovery(&states_guard)
            .iter()
            .any(|(_, open)| open == &path);
    drop(states_guard);
    drop(session_guard);
    if !may_delete {
        return Ok(());
    }
    delete_recovery_for_path(&app_data_dir(&app)?, &path)
}

#[tauri::command]
fn release_schedule_recovery(
    app: tauri::AppHandle,
    window: tauri::Window,
    states: State<'_, Mutex<ScheduleFileStates>>,
    path: String,
) -> Result<(), String> {
    let label = window_label(&window);
    let others = {
        let guard = states.lock().expect("schedule file states");
        other_windows_with_path(&guard, &label, &path)
    };
    if others == 0 {
        return delete_recovery_for_path(&app_data_dir(&app)?, &path);
    }
    let payload = RecoveryReconcilePayload { path };
    for (other, webview) in app.webview_windows() {
        if other != label {
            let _ = webview.emit("schedule-recovery-reconcile", &payload);
        }
    }
    Ok(())
}

#[tauri::command]
fn recovery_live_action(
    window: tauri::Window,
    session: State<'_, Mutex<WindowSessionState>>,
    states: State<'_, Mutex<ScheduleFileStates>>,
    dirty: bool,
) -> Result<String, String> {
    let label = window_label(&window);
    let session_guard = session.lock().expect("window session");
    let states_guard = states.lock().expect("schedule file states");
    let path = states_guard
        .by_label
        .get(&label)
        .and_then(|state| state.path.as_ref())
        .map(|path| schedule_path_text(path));
    let Some(path) = path else {
        return Ok(window_session::RecoveryPersist::Skip.as_str().to_string());
    };
    let owner = caller_is_recovery_owner(&session_guard, &states_guard, &label, &path);
    Ok(recovery_live_persist(owner, dirty).as_str().to_string())
}

#[tauri::command]
fn recovery_close_action(
    window: tauri::Window,
    session: State<'_, Mutex<WindowSessionState>>,
    states: State<'_, Mutex<ScheduleFileStates>>,
    dirty: bool,
) -> Result<String, String> {
    let label = window_label(&window);
    let session_guard = session.lock().expect("window session");
    let states_guard = states.lock().expect("schedule file states");
    let path = states_guard
        .by_label
        .get(&label)
        .and_then(|state| state.path.as_ref())
        .map(|path| schedule_path_text(path));
    let Some(path) = path else {
        return Ok(window_session::RecoveryPersist::Skip.as_str().to_string());
    };
    let owner = if session_guard.quitting {
        session_guard
            .quit_recovery_owners
            .get(&path)
            .is_some_and(|owner| owner == &label)
    } else if session_guard.updating {
        session_guard
            .update_recovery_owners
            .get(&path)
            .is_some_and(|owner| owner == &label)
    } else {
        caller_is_recovery_owner(&session_guard, &states_guard, &label, &path)
    };
    let others = other_windows_with_path(&states_guard, &label, &path);
    Ok(
        recovery_close_persist(owner, others, dirty, session_guard.quitting, session_guard.updating)
            .as_str()
            .to_string(),
    )
}

#[tauri::command]
fn read_schedule_file_at_path(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let app_data = app_data_dir(&app)?;
    if read_recovery_for_path(&app_data, &path)?.is_none() {
        return Err("復旧用の控えがありません。".to_string());
    }
    let path_buf = PathBuf::from(&path);
    if !path_buf.is_file() {
        return Err(SCHEDULE_FILE_NOT_FOUND.to_string());
    }
    read_utf8(&path_buf, MAX_SCHEDULE_BYTES)
}

#[derive(Serialize)]
struct LastScheduleRead {
    path: String,
    contents: Option<String>,
    error: Option<String>,
}

#[tauri::command]
fn read_window_startup(
    app: tauri::AppHandle,
    window: tauri::Window,
) -> Result<WindowStartupRead, String> {
    window_session::read_window_startup(&app_data_dir(&app)?, &window_label(&window))
}

#[tauri::command]
fn read_last_schedule_file(
    app: tauri::AppHandle,
    window: tauri::Window,
) -> Result<Option<LastScheduleRead>, String> {
    let startup =
        window_session::read_window_startup(&app_data_dir(&app)?, &window_label(&window))?;
    if startup.sample && startup.path.is_none() {
        return Ok(None);
    }
    let Some(path) = startup.path else {
        return Ok(None);
    };
    Ok(Some(LastScheduleRead {
        path,
        contents: startup.contents,
        error: startup.error,
    }))
}

#[tauri::command]
fn clear_last_schedule_path(app: tauri::AppHandle, window: tauri::Window) -> Result<(), String> {
    let label = window_label(&window);
    let app_data = app_data_dir(&app)?;
    upsert_window_path(&app_data, &label, None, true)?;
    Ok(())
}

#[derive(Serialize)]
struct PendingScheduleWindowOpen {
    path: String,
    contents: String,
}

#[tauri::command]
fn take_pending_schedule_window_open(
    window: tauri::Window,
    session: State<'_, Mutex<WindowSessionState>>,
) -> Result<Option<PendingScheduleWindowOpen>, String> {
    let label = window_label(&window);
    let mut guard = session.lock().expect("window session");
    Ok(
        take_pending_open(&mut guard, &label).map(|pending| PendingScheduleWindowOpen {
            path: pending.path,
            contents: pending.contents,
        }),
    )
}

#[tauri::command]
fn create_schedule_window(
    app: tauri::AppHandle,
    session: State<'_, Mutex<WindowSessionState>>,
    states: State<'_, Mutex<ScheduleFileStates>>,
    path: String,
    contents: String,
) -> Result<String, String> {
    if contents.len() as u64 > MAX_SCHEDULE_BYTES {
        return Err("ファイルが大きすぎます（上限 10 MB）".to_string());
    }
    let label = next_schedule_window_label(&app)?;
    let app_data = app_data_dir(&app)?;
    let mut file = read_open_windows(&app_data)?;
    file.windows.push(OpenWindowEntry {
        label: label.clone(),
        path: Some(path.clone()),
        sample: false,
    });
    file.focused_label = label.clone();
    write_open_windows(&app_data, &file)?;
    {
        let mut guard = session.lock().expect("window session");
        store_pending_open(&mut guard, label.clone(), path.clone(), contents.clone());
        note_window_focus(&mut guard, &label);
    }
    if let Err(error) = create_schedule_webview(&app, &label, "schedule-viewer") {
        {
            let mut guard = session.lock().expect("window session");
            let _ = take_pending_open(&mut guard, &label);
            forget_window_focus(&mut guard, &label);
        }
        let _ = remove_window_label(&app_data, &label);
        return Err(error);
    }
    let mut guard = states.lock().expect("schedule file states");
    let state = guard.by_label.entry(label.clone()).or_default();
    state.path = Some(PathBuf::from(path));
    state.content_hash = Some(hash_contents(&contents));
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.set_focus();
    }
    let _ = set_focused_label(&app_data, &label);
    Ok(label)
}

#[tauri::command]
fn register_window_focus(
    app: tauri::AppHandle,
    window: tauri::Window,
    session: State<'_, Mutex<WindowSessionState>>,
) -> Result<(), String> {
    let label = window_label(&window);
    {
        let mut guard = session.lock().expect("window session");
        note_window_focus(&mut guard, &label);
    }
    set_focused_label(&app_data_dir(&app)?, &label)
}

#[tauri::command]
fn unregister_window_session(
    app: tauri::AppHandle,
    window: tauri::Window,
    session: State<'_, Mutex<WindowSessionState>>,
    states: State<'_, Mutex<ScheduleFileStates>>,
) -> Result<(), String> {
    let label = window_label(&window);
    let app_data = app_data_dir(&app)?;
    let window_count = app.webview_windows().len();
    let (quitting, path, was_owner) = {
        let session_guard = session.lock().expect("window session");
        let states_guard = states.lock().expect("schedule file states");
        let path = states_guard
            .by_label
            .get(&label)
            .and_then(|state| state.path.as_ref())
            .map(|open| schedule_path_text(open));
        let was_owner = path.as_ref().is_some_and(|open| {
            caller_is_recovery_owner(&session_guard, &states_guard, &label, open)
        });
        (session_guard.quitting, path, was_owner)
    };
    if !quitting && window_count > 1 {
        remove_window_label(&app_data, &label)?;
    }
    {
        let mut session_guard = session.lock().expect("window session");
        forget_startup_settlement(&mut session_guard, &label);
        forget_window_focus(&mut session_guard, &label);
        let mut states_guard = states.lock().expect("schedule file states");
        states_guard.by_label.remove(&label);
    }
    try_finalize_startup_update_check(&app, session.inner());
    if quitting || window_count <= 1 || !was_owner {
        return Ok(());
    }
    let Some(path) = path else {
        return Ok(());
    };
    let still_open = {
        let states_guard = states.lock().expect("schedule file states");
        states_guard.by_label.values().any(|state| {
            state
                .path
                .as_ref()
                .is_some_and(|open| schedule_path_text(open) == path)
        })
    };
    if !still_open {
        return Ok(());
    }
    let payload = RecoveryReconcilePayload { path };
    for (other, webview) in app.webview_windows() {
        if other != label {
            let _ = webview.emit("schedule-recovery-reconcile", &payload);
        }
    }
    Ok(())
}

#[derive(Clone, Serialize)]
struct RecoveryReconcilePayload {
    path: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SchedulePeerNoticePayload {
    target_label: String,
    file_name: String,
    status: String,
}

#[tauri::command]
fn emit_schedule_peer_notice(
    app: tauri::AppHandle,
    window: tauri::Window,
    target_label: String,
    file_name: String,
    status: String,
) -> Result<(), String> {
    let origin = window_label(&window);
    let notice = status_notice_text(&status);
    let payload = SchedulePeerNoticePayload {
        target_label: target_label.clone(),
        file_name: file_name.clone(),
        status: status.clone(),
    };
    for (label, webview) in app.webview_windows() {
        if label == origin {
            continue;
        }
        let _ = webview.emit("schedule-peer-notice", &payload);
    }
    if status != "cleared" && !any_window_focused(&app) {
        show_peer_os_notification(&app, file_name, notice.to_string(), target_label);
    }
    Ok(())
}

fn status_notice_text(status: &str) -> &str {
    if status == "applied" {
        "反映した"
    } else {
        "確認待ち"
    }
}

fn show_peer_os_notification(
    app: &tauri::AppHandle,
    title: String,
    body: String,
    target_label: String,
) {
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        show_linux_peer_notification(app.clone(), title, body, target_label);
    }
    #[cfg(not(all(unix, not(target_os = "macos"))))]
    {
        use tauri_plugin_notification::NotificationExt;
        let _ = app
            .notification()
            .builder()
            .title(title)
            .body(body)
            .extra("targetLabel", target_label)
            .show();
    }
}

#[cfg(all(unix, not(target_os = "macos")))]
fn show_linux_peer_notification(
    app: tauri::AppHandle,
    title: String,
    body: String,
    target_label: String,
) {
    let mut notification = notify_rust::Notification::new();
    notification
        .summary(&title)
        .body(&body)
        .action("default", "表示");
    std::thread::spawn(move || {
        let Ok(handle) = notification.show() else {
            return;
        };
        handle.wait_for_action(move |action| {
            if action != "default" {
                return;
            }
            let Some(window) = app.get_webview_window(&target_label) else {
                return;
            };
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        });
    });
}

#[tauri::command]
async fn show_schedule_peer_notification(
    app: tauri::AppHandle,
    title: String,
    body: String,
    target_label: String,
) -> Result<(), String> {
    if any_window_focused(&app) {
        return Ok(());
    }
    show_peer_os_notification(&app, title, body, target_label);
    Ok(())
}

#[tauri::command]
fn focus_schedule_window(
    app: tauri::AppHandle,
    session: State<'_, Mutex<WindowSessionState>>,
    label: String,
) -> Result<(), String> {
    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| "ウィンドウが見つかりません。".to_string())?;
    window
        .set_focus()
        .map_err(|e| format!("ウィンドウを前面に出せません: {}", e))?;
    {
        let mut guard = session.lock().expect("window session");
        note_window_focus(&mut guard, &label);
    }
    let _ = set_focused_label(&app_data_dir(&app)?, &label);
    Ok(())
}

#[tauri::command]
fn list_open_window_labels(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    Ok(app
        .webview_windows()
        .keys()
        .map(|label| label.to_string())
        .collect())
}

#[tauri::command]
fn close_other_schedule_windows(
    app: tauri::AppHandle,
    window: tauri::Window,
) -> Result<(), String> {
    let origin = window_label(&window);
    for (label, webview) in app.webview_windows() {
        if label != origin {
            let _ = webview.close();
        }
    }
    Ok(())
}

pub(crate) fn choose_open_directory(
    requested: Option<&str>,
    requested_is_dir: bool,
    home: Option<&str>,
) -> Option<String> {
    let requested = requested?;
    if requested_is_dir {
        return Some(requested.to_string());
    }
    home.map(str::to_string)
}

fn dialog_start_directory(app: &tauri::AppHandle, requested: Option<&str>) -> Option<PathBuf> {
    let requested_is_dir = requested
        .map(|value| Path::new(value).is_dir())
        .unwrap_or(false);
    let home = app.path().home_dir().ok();
    let home_text = home
        .as_ref()
        .map(|path| path.to_string_lossy().into_owned());
    choose_open_directory(requested, requested_is_dir, home_text.as_deref()).map(PathBuf::from)
}

#[derive(Serialize)]
struct CalendarStateResult {
    label: Option<String>,
}

#[tauri::command]
fn get_calendar_state(app: tauri::AppHandle) -> Result<CalendarStateResult, String> {
    let settings = read_settings(&app)?;
    Ok(CalendarStateResult {
        label: settings.calendar_label,
    })
}

#[tauri::command]
fn read_app_calendar(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = calendar_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    Ok(Some(read_utf8(&path, MAX_CALENDAR_BYTES)?))
}

#[tauri::command]
fn import_app_calendar(
    app: tauri::AppHandle,
    label: String,
    contents: String,
) -> Result<(), String> {
    let trimmed_label = label.trim();
    if trimmed_label.is_empty() {
        return Err("ファイル名が空です".to_string());
    }
    if contents.len() as u64 > MAX_CALENDAR_BYTES {
        return Err("カレンダーファイルが大きすぎます（上限 2 MB）".to_string());
    }
    write_utf8_atomic(&calendar_path(&app)?, &contents)?;
    let mut settings = read_settings(&app)?;
    settings.calendar_label = Some(trimmed_label.to_string());
    write_settings(&app, &settings)
}

#[tauri::command]
fn delete_app_calendar(app: tauri::AppHandle) -> Result<(), String> {
    let path = calendar_path(&app)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("カレンダーを削除できません: {}", e))?;
    }
    let mut settings = read_settings(&app)?;
    settings.calendar_label = None;
    write_settings(&app, &settings)
}

fn finish_application_quit(
    app: &tauri::AppHandle,
    session: &Mutex<WindowSessionState>,
    states: &Mutex<ScheduleFileStates>,
) -> bool {
    let labels: Vec<String> = {
        let mut guard = session.lock().expect("window session");
        if !guard.quit_active {
            return false;
        }
        if guard.quit_labels.is_empty()
            || !guard
                .quit_labels
                .iter()
                .all(|label| guard.quit_ready.iter().any(|ready| ready == label))
        {
            return false;
        }
        let states_guard = states.lock().expect("schedule file states");
        guard.quit_recovery_owners =
            recovery_owners_by_path(&guard.focus_order, &windows_for_recovery(&states_guard));
        drop(states_guard);
        guard.quit_active = false;
        guard.quitting = true;
        guard.quit_labels.clone()
    };
    for label in labels {
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.close();
        }
    }
    true
}

#[tauri::command]
fn request_application_quit(
    app: tauri::AppHandle,
    session: State<'_, Mutex<WindowSessionState>>,
) -> Result<(), String> {
    let labels: Vec<String> = app.webview_windows().keys().cloned().collect();
    {
        let mut guard = session.lock().expect("window session");
        guard.quit_active = true;
        guard.quitting = false;
        guard.quit_labels = labels;
        guard.quit_ready.clear();
    }
    for (_, window) in app.webview_windows() {
        let _ = window.emit("application-quit-requested", ());
    }
    Ok(())
}

#[tauri::command]
fn accept_application_quit(
    app: tauri::AppHandle,
    window: tauri::Window,
    session: State<'_, Mutex<WindowSessionState>>,
    states: State<'_, Mutex<ScheduleFileStates>>,
) -> Result<(), String> {
    let label = window_label(&window);
    {
        let mut guard = session.lock().expect("window session");
        if !guard.quit_active || !guard.quit_labels.iter().any(|item| item == &label) {
            return Ok(());
        }
        if !guard.quit_ready.iter().any(|item| item == &label) {
            guard.quit_ready.push(label);
        }
    }
    let _ = finish_application_quit(&app, session.inner(), states.inner());
    Ok(())
}

#[tauri::command]
fn cancel_application_quit(
    app: tauri::AppHandle,
    session: State<'_, Mutex<WindowSessionState>>,
) -> Result<(), String> {
    {
        let mut guard = session.lock().expect("window session");
        guard.quit_active = false;
        guard.quitting = false;
        guard.quit_labels.clear();
        guard.quit_ready.clear();
        guard.quit_recovery_owners.clear();
    }
    for (_, window) in app.webview_windows() {
        let _ = window.emit("application-quit-cancelled", ());
    }
    Ok(())
}

fn try_finalize_startup_update_check(
    app: &tauri::AppHandle,
    session: &Mutex<WindowSessionState>,
) {
    let should_run = {
        let mut guard = session.lock().expect("window session");
        if guard.update_check_claimed {
            return;
        }
        if !all_windows_startup_settled(app, &guard.startup_settled_labels) {
            return;
        }
        guard.update_check_claimed = true;
        let labels: Vec<String> = app.webview_windows().keys().cloned().collect();
        any_startup_auto_update_enabled(&labels, &guard.startup_auto_update_at_startup)
    };
    if !should_run {
        return;
    }
    let target = app
        .get_webview_window("main")
        .or_else(|| app.webview_windows().values().next().cloned());
    if let Some(window) = target {
        let _ = window.emit("application-run-update-check", ());
    }
}

fn finish_application_update_accept(
    app: &tauri::AppHandle,
    session: &Mutex<WindowSessionState>,
    states: &Mutex<ScheduleFileStates>,
) -> bool {
    let should_persist = {
        let mut guard = session.lock().expect("window session");
        if !guard.update_active {
            return false;
        }
        if guard.update_labels.is_empty()
            || !guard
                .update_labels
                .iter()
                .all(|label| guard.update_ready.iter().any(|ready| ready == label))
        {
            return false;
        }
        let states_guard = states.lock().expect("schedule file states");
        guard.update_recovery_owners =
            recovery_owners_by_path(&guard.focus_order, &windows_for_recovery(&states_guard));
        guard.updating = true;
        guard.update_recovery_persisted.clear();
        true
    };
    if !should_persist {
        return false;
    }
    for (_, window) in app.webview_windows() {
        let _ = window.emit("application-update-write-recovery", ());
    }
    true
}

fn finish_application_update_install(
    app: &tauri::AppHandle,
    session: &Mutex<WindowSessionState>,
) -> bool {
    let install_label = {
        let mut guard = session.lock().expect("window session");
        if !guard.updating || guard.update_labels.is_empty() {
            return false;
        }
        if !guard
            .update_labels
            .iter()
            .all(|label| guard.update_recovery_persisted.iter().any(|ready| ready == label))
        {
            return false;
        }
        guard.update_active = false;
        guard.update_install_label.clone()
    };
    if let Some(label) = install_label {
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.emit("application-update-proceed", ());
            return true;
        }
    }
    false
}

#[derive(Serialize)]
struct StartupSettledResult {
    all_settled: bool,
}

#[tauri::command]
fn write_pending_release_notes(
    app: tauri::AppHandle,
    version: String,
) -> Result<(), String> {
    pending_release_notes::write_pending_release_notes(&app_data_dir(&app)?, &version)
}

#[tauri::command]
fn peek_pending_release_notes(
    app: tauri::AppHandle,
    window: tauri::Window,
) -> Result<Option<String>, String> {
    let app_version = app.package_info().version.to_string();
    let window_is_focused = window.is_focused().unwrap_or(false);
    Ok(pending_release_notes::pending_release_notes_for_focused_window(
        &app_data_dir(&app)?,
        window_is_focused,
        &app_version,
    ))
}

#[tauri::command]
fn clear_pending_release_notes(app: tauri::AppHandle) -> Result<(), String> {
    pending_release_notes::clear_pending_release_notes(&app_data_dir(&app)?)
}

#[tauri::command]
fn report_startup_settled(
    app: tauri::AppHandle,
    window: tauri::Window,
    session: State<'_, Mutex<WindowSessionState>>,
    auto_update_at_startup: bool,
) -> Result<StartupSettledResult, String> {
    let label = window_label(&window);
    let all_settled = {
        let mut guard = session.lock().expect("window session");
        if !guard.startup_settled_labels.iter().any(|item| item == &label) {
            guard.startup_settled_labels.push(label.clone());
        }
        guard
            .startup_auto_update_at_startup
            .insert(label, auto_update_at_startup);
        all_windows_startup_settled(&app, &guard.startup_settled_labels)
    };
    try_finalize_startup_update_check(&app, session.inner());
    Ok(StartupSettledResult { all_settled })
}

#[tauri::command]
fn request_application_update(
    app: tauri::AppHandle,
    window: tauri::Window,
    session: State<'_, Mutex<WindowSessionState>>,
) -> Result<(), String> {
    let install_label = window_label(&window);
    let labels: Vec<String> = app.webview_windows().keys().cloned().collect();
    {
        let mut guard = session.lock().expect("window session");
        guard.update_active = true;
        guard.update_labels = labels;
        guard.update_ready.clear();
        guard.update_install_label = Some(install_label);
    }
    for (_, window) in app.webview_windows() {
        let _ = window.emit("application-update-requested", ());
    }
    Ok(())
}

#[tauri::command]
fn accept_application_update(
    app: tauri::AppHandle,
    window: tauri::Window,
    session: State<'_, Mutex<WindowSessionState>>,
    states: State<'_, Mutex<ScheduleFileStates>>,
) -> Result<(), String> {
    let label = window_label(&window);
    {
        let mut guard = session.lock().expect("window session");
        if !guard.update_active || !guard.update_labels.iter().any(|item| item == &label) {
            return Ok(());
        }
        if !guard.update_ready.iter().any(|item| item == &label) {
            guard.update_ready.push(label);
        }
    }
    let _ = finish_application_update_accept(&app, session.inner(), states.inner());
    Ok(())
}

#[tauri::command]
fn complete_application_update_recovery(
    app: tauri::AppHandle,
    window: tauri::Window,
    session: State<'_, Mutex<WindowSessionState>>,
) -> Result<(), String> {
    let label = window_label(&window);
    {
        let mut guard = session.lock().expect("window session");
        if !guard.updating || !guard.update_labels.iter().any(|item| item == &label) {
            return Ok(());
        }
        if !guard
            .update_recovery_persisted
            .iter()
            .any(|item| item == &label)
        {
            guard.update_recovery_persisted.push(label);
        }
    }
    let _ = finish_application_update_install(&app, session.inner());
    Ok(())
}

#[tauri::command]
fn cancel_application_update(
    app: tauri::AppHandle,
    session: State<'_, Mutex<WindowSessionState>>,
) -> Result<(), String> {
    {
        let mut guard = session.lock().expect("window session");
        guard.update_active = false;
        guard.updating = false;
        guard.update_labels.clear();
        guard.update_ready.clear();
        guard.update_recovery_persisted.clear();
        guard.update_install_label = None;
        guard.update_recovery_owners.clear();
    }
    for (_, window) in app.webview_windows() {
        let _ = window.emit("application-update-cancelled", ());
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Mutex::new(ScheduleFileStates::default()))
        .manage(Mutex::new(WindowSessionState::default()))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let file = app
                .path()
                .app_data_dir()
                .ok()
                .and_then(|dir| read_open_windows(&dir).ok());
            let focus_label = file
                .as_ref()
                .map(|value| value.focused_label.clone())
                .unwrap_or_else(|| "main".to_string());
            if let Some(window) = app.get_webview_window(&focus_label) {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
                return;
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let handle = app.handle().clone();
            if let Ok(dir) = app_data_dir(&handle) {
                let _ = migrate_legacy_session(&dir);
                let session = handle.state::<Mutex<WindowSessionState>>();
                let mut guard = session.lock().expect("window session");
                if !guard.startup_spawned {
                    guard.startup_spawned = true;
                    drop(guard);
                    let _ = spawn_startup_windows(&handle, &dir);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_schedule_file,
            accept_opened_schedule,
            check_schedule_file_changed,
            poll_schedule_file_update,
            read_open_schedule_file,
            acknowledge_schedule_file_contents,
            save_schedule_file,
            save_html_file,
            get_members_settings,
            read_member_catalog,
            import_member_catalog,
            delete_member_catalog,
            set_selected_member_catalog,
            get_calendar_state,
            read_app_calendar,
            import_app_calendar,
            delete_app_calendar,
            read_schedule_recovery,
            write_schedule_recovery,
            delete_schedule_recovery,
            release_schedule_recovery,
            recovery_live_action,
            recovery_close_action,
            read_schedule_file_at_path,
            read_last_schedule_file,
            read_window_startup,
            clear_last_schedule_path,
            create_schedule_window,
            take_pending_schedule_window_open,
            register_window_focus,
            unregister_window_session,
            emit_schedule_peer_notice,
            show_schedule_peer_notification,
            focus_schedule_window,
            list_open_window_labels,
            close_other_schedule_windows,
            request_application_quit,
            accept_application_quit,
            cancel_application_quit,
            report_startup_settled,
            request_application_update,
            accept_application_update,
            complete_application_update_recovery,
            cancel_application_update,
            write_pending_release_notes,
            peek_pending_release_notes,
            clear_pending_release_notes,
            json_skill_home_dirs,
            pick_json_skill_folder,
            install_json_skills,
            uninstall_json_skills,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::{
        choose_open_directory, read_utf8, require_active_save_path, sanitize_export_filename,
    };

    #[test]
    fn read_utf8_stops_at_the_byte_limit() {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = dir.path().join("sample.txt");
        std::fs::write(&path, "abcd").expect("write");
        let err = read_utf8(&path, 3).expect_err("over the limit");
        assert!(err.contains("大きすぎます"));
        assert_eq!(read_utf8(&path, 4).expect("within the limit"), "abcd");
    }

    #[test]
    fn sanitize_export_filename_removes_path_separators() {
        assert_eq!(
            sanitize_export_filename("foo/bar.json", "json"),
            "foobar.json",
        );
    }

    #[test]
    fn sanitize_export_filename_uses_default_for_empty() {
        assert_eq!(sanitize_export_filename("  ", "html"), "schedule.html");
    }

    #[test]
    fn sanitize_export_filename_adds_extension() {
        assert_eq!(sanitize_export_filename("plan", "json"), "plan.json");
    }

    #[test]
    fn require_active_save_path_accepts_matching_path() {
        let active = PathBuf::from("/tmp/plan.json");
        let resolved = require_active_save_path(Some(&active), Some("/tmp/plan.json")).unwrap();
        assert_eq!(resolved, active);
    }

    #[test]
    fn require_active_save_path_rejects_mismatch_and_missing() {
        let active = PathBuf::from("/tmp/a.json");
        assert!(require_active_save_path(Some(&active), Some("/tmp/b.json")).is_err());
        assert!(require_active_save_path(None, Some("/tmp/a.json")).is_err());
        assert!(require_active_save_path(Some(&active), None).is_err());
    }

    #[test]
    fn choose_open_directory_uses_parent_or_home() {
        assert_eq!(choose_open_directory(None, false, Some("/home/me")), None);
        assert_eq!(
            choose_open_directory(Some("/tmp/plans"), true, Some("/home/me")).as_deref(),
            Some("/tmp/plans")
        );
        assert_eq!(
            choose_open_directory(Some("/tmp/missing"), false, Some("/home/me")).as_deref(),
            Some("/home/me")
        );
        assert_eq!(
            choose_open_directory(Some("/tmp/missing"), false, None),
            None
        );
    }
}
