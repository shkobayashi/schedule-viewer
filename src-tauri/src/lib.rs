mod json_skills;

use json_skills::{
    install_json_skills, json_skill_home_dirs, pick_json_skill_folder, uninstall_json_skills,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::Manager;
use tauri::State;
use tauri_plugin_dialog::DialogExt;

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

fn hash_contents(contents: &str) -> String {
    let digest = Sha256::digest(contents.as_bytes());
    format!("{:x}", digest)
}

fn read_open_schedule<T>(
    state: &Mutex<ScheduleFileState>,
    use_contents: impl Fn(&ScheduleFileState, &str, &str) -> Result<T, String>,
) -> Result<T, String> {
    for _ in 0..2 {
        let path = {
            let guard = state.lock().expect("schedule file state");
            guard
                .path
                .as_ref()
                .ok_or_else(|| "開いているファイルがありません".to_string())?
                .clone()
        };
        let contents = read_utf8(&path, MAX_SCHEDULE_BYTES)?;
        let hash = hash_contents(&contents);
        let guard = state.lock().expect("schedule file state");
        if guard.path.as_ref() == Some(&path) {
            return use_contents(&guard, &contents, &hash);
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
    state: &Mutex<ScheduleFileState>,
    path: PathBuf,
    contents: &str,
) -> Result<(), String> {
    write_last_schedule_path(app, &path)?;
    let mut guard = state.lock().expect("schedule file state");
    guard.path = Some(path);
    guard.content_hash = Some(hash_contents(contents));
    Ok(())
}

#[tauri::command]
async fn open_schedule_file(
    window: tauri::Window,
    app: tauri::AppHandle,
    _state: State<'_, Mutex<ScheduleFileState>>,
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
    app: tauri::AppHandle,
    state: State<'_, Mutex<ScheduleFileState>>,
    path: String,
    contents: String,
) -> Result<(), String> {
    if contents.len() as u64 > MAX_SCHEDULE_BYTES {
        return Err("ファイルが大きすぎます（上限 10 MB）".to_string());
    }
    record_open(&app, state.inner(), PathBuf::from(path), &contents)
}

#[tauri::command]
fn check_schedule_file_changed(state: State<'_, Mutex<ScheduleFileState>>) -> Result<bool, String> {
    read_open_schedule(state.inner(), |guard, _contents, hash| {
        Ok(guard.content_hash.as_deref() != Some(hash))
    })
}

#[derive(Serialize)]
struct PollScheduleFileUpdateResult {
    contents: String,
}

#[tauri::command]
fn poll_schedule_file_update(
    state: State<'_, Mutex<ScheduleFileState>>,
) -> Result<Option<PollScheduleFileUpdateResult>, String> {
    read_open_schedule(state.inner(), |guard, contents, hash| {
        if guard.content_hash.as_deref() == Some(hash) {
            Ok(None)
        } else {
            Ok(Some(PollScheduleFileUpdateResult {
                contents: contents.to_string(),
            }))
        }
    })
}

#[tauri::command]
fn read_open_schedule_file(state: State<'_, Mutex<ScheduleFileState>>) -> Result<String, String> {
    let guard = state.lock().expect("schedule file state");
    let path = guard
        .path
        .as_ref()
        .ok_or_else(|| "開いているファイルがありません".to_string())?;
    read_utf8(path, MAX_SCHEDULE_BYTES)
}

#[tauri::command]
fn acknowledge_schedule_file_contents(
    state: State<'_, Mutex<ScheduleFileState>>,
    contents: String,
) -> Result<(), String> {
    let mut guard = state.lock().expect("schedule file state");
    if guard.path.is_none() {
        return Err("開いているファイルがありません".to_string());
    }
    guard.content_hash = Some(hash_contents(&contents));
    Ok(())
}

#[tauri::command]
async fn save_schedule_file(
    window: tauri::Window,
    state: State<'_, Mutex<ScheduleFileState>>,
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
        let guard = state.lock().expect("schedule file state");
        require_active_save_path(guard.path.as_deref(), expected_path.as_deref())?
    };

    if !is_json_path(&target) {
        return Err("JSON ファイル以外には保存できません".to_string());
    }

    if !save_as && !skip_disk_hash_check {
        let disk = read_utf8(&target, MAX_SCHEDULE_BYTES)?;
        let disk_hash = hash_contents(&disk);
        let guard = state.lock().expect("schedule file state");
        let expected_hash = guard
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

fn schedule_recovery_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("schedule-recovery.json"))
}

#[tauri::command]
fn read_schedule_recovery(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = schedule_recovery_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    Ok(Some(read_utf8_limited(
        &path,
        MAX_SCHEDULE_BYTES,
        "復旧用の控えが大きすぎます（上限 10 MB）",
    )?))
}

#[tauri::command]
fn write_schedule_recovery(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    if contents.len() as u64 > MAX_SCHEDULE_BYTES {
        return Err("復旧用の控えが大きすぎます（上限 10 MB）".to_string());
    }
    write_utf8_atomic(&schedule_recovery_path(&app)?, &contents)
}

#[tauri::command]
fn delete_schedule_recovery(app: tauri::AppHandle) -> Result<(), String> {
    let path = schedule_recovery_path(&app)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("復旧用の控えを削除できません: {}", e))?;
    }
    Ok(())
}

fn recovery_targets_path(recovery_text: &str, requested: &str) -> Result<(), String> {
    let value: serde_json::Value = serde_json::from_str(recovery_text)
        .map_err(|_| "復旧用の控えの形式が正しくありません。".to_string())?;
    let expected = value
        .get("path")
        .and_then(|value| value.as_str())
        .ok_or_else(|| "復旧用の控えの形式が正しくありません。".to_string())?;
    if Path::new(expected) != Path::new(requested) {
        return Err("復旧用の控えと違うファイルは読めません。".to_string());
    }
    Ok(())
}

#[tauri::command]
fn read_schedule_file_at_path(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let recovery_path = schedule_recovery_path(&app)?;
    if !recovery_path.is_file() {
        return Err("復旧用の控えがありません。".to_string());
    }
    let recovery_text = read_utf8_limited(
        &recovery_path,
        MAX_SCHEDULE_BYTES,
        "復旧用の控えが大きすぎます（上限 10 MB）",
    )?;
    recovery_targets_path(&recovery_text, &path)?;
    let path_buf = PathBuf::from(&path);
    if !path_buf.is_file() {
        return Err(SCHEDULE_FILE_NOT_FOUND.to_string());
    }
    read_utf8(&path_buf, MAX_SCHEDULE_BYTES)
}

fn last_schedule_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("last-schedule.json"))
}

fn parse_last_schedule_path(text: &str) -> Result<String, String> {
    let value: serde_json::Value = serde_json::from_str(text)
        .map_err(|_| "前回のファイルの記録の形式が正しくありません。".to_string())?;
    let path = value
        .get("path")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .trim();
    if path.is_empty() {
        return Err("前回のファイルの記録の形式が正しくありません。".to_string());
    }
    Ok(path.to_string())
}

fn parse_recovery_path(text: &str) -> Result<String, String> {
    let value: serde_json::Value = serde_json::from_str(text)
        .map_err(|_| "復旧用の控えの形式が正しくありません。".to_string())?;
    let path = value
        .get("path")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .trim();
    if path.is_empty() {
        return Err("復旧用の控えの形式が正しくありません。".to_string());
    }
    Ok(path.to_string())
}

pub(crate) fn resolve_remembered_path(
    last_schedule_text: Option<&str>,
    recovery_text: Option<&str>,
) -> Result<Option<String>, String> {
    if let Some(text) = last_schedule_text {
        return Ok(Some(parse_last_schedule_path(text)?));
    }
    let Some(text) = recovery_text else {
        return Ok(None);
    };
    if text.is_empty() {
        return Ok(None);
    }
    match parse_recovery_path(text) {
        Ok(path) => Ok(Some(path)),
        Err(_) => Ok(None),
    }
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

fn write_last_schedule_path(app: &tauri::AppHandle, path: &Path) -> Result<(), String> {
    let text = serde_json::json!({ "path": path.to_string_lossy() }).to_string();
    write_utf8_atomic(&last_schedule_path(app)?, &text)
}

fn read_last_schedule_text(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    let path = last_schedule_path(app)?;
    if !path.is_file() {
        return Ok(None);
    }
    Ok(Some(read_utf8(&path, MAX_SCHEDULE_BYTES)?))
}

fn read_recovery_text(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    let path = schedule_recovery_path(app)?;
    if !path.is_file() {
        return Ok(None);
    }
    Ok(Some(read_utf8_limited(
        &path,
        MAX_SCHEDULE_BYTES,
        "復旧用の控えが大きすぎます（上限 10 MB）",
    )?))
}

#[derive(Serialize)]
struct LastScheduleRead {
    path: String,
    contents: Option<String>,
    error: Option<String>,
}

#[tauri::command]
fn read_last_schedule_file(app: tauri::AppHandle) -> Result<Option<LastScheduleRead>, String> {
    let last_text = read_last_schedule_text(&app)?;
    let recovery_text = if last_text.is_none() {
        read_recovery_text(&app)?
    } else {
        None
    };
    let remembered = resolve_remembered_path(last_text.as_deref(), recovery_text.as_deref())?;
    let Some(path) = remembered else {
        return Ok(None);
    };
    let path_buf = PathBuf::from(&path);
    if !path_buf.is_file() {
        return Ok(Some(LastScheduleRead {
            path,
            contents: None,
            error: Some(SCHEDULE_FILE_NOT_FOUND.to_string()),
        }));
    }
    match read_utf8(&path_buf, MAX_SCHEDULE_BYTES) {
        Ok(contents) => Ok(Some(LastScheduleRead {
            path,
            contents: Some(contents),
            error: None,
        })),
        Err(message) => Ok(Some(LastScheduleRead {
            path,
            contents: None,
            error: Some(message),
        })),
    }
}

#[tauri::command]
fn clear_last_schedule_path(app: tauri::AppHandle) -> Result<(), String> {
    let path = last_schedule_path(&app)?;
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("前回のファイルの記録を削除できません: {}", e))?;
    }
    Ok(())
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(ScheduleFileState::default()))
        .plugin(tauri_plugin_dialog::init())
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
            read_schedule_file_at_path,
            read_last_schedule_file,
            clear_last_schedule_path,
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
        choose_open_directory, read_utf8, recovery_targets_path, require_active_save_path,
        resolve_remembered_path, sanitize_export_filename,
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
    fn resolve_remembered_path_prefers_last_schedule_over_recovery() {
        let last = r#"{"path":"/tmp/current.json"}"#;
        let recovery = r#"{"path":"/tmp/old.json","baselineJson":"{}","documentJson":"{}"}"#;
        let path = resolve_remembered_path(Some(last), Some(recovery)).unwrap();
        assert_eq!(path.as_deref(), Some("/tmp/current.json"));
    }

    #[test]
    fn resolve_remembered_path_uses_recovery_when_last_schedule_is_absent() {
        let recovery = r#"{"path":"/tmp/plan.json","baselineJson":"{}","documentJson":"{}"}"#;
        let path = resolve_remembered_path(None, Some(recovery)).unwrap();
        assert_eq!(path.as_deref(), Some("/tmp/plan.json"));
        assert_eq!(resolve_remembered_path(None, None).unwrap(), None);
    }

    #[test]
    fn resolve_remembered_path_rejects_broken_last_schedule_and_skips_broken_recovery() {
        assert!(resolve_remembered_path(Some("{"), None).is_err());
        assert_eq!(resolve_remembered_path(None, Some("{")).unwrap(), None);
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

    #[test]
    fn recovery_targets_path_accepts_only_the_draft_path() {
        let recovery = r#"{"path":"/tmp/plan.json","baselineJson":"{}","documentJson":"{}"}"#;
        assert!(recovery_targets_path(recovery, "/tmp/plan.json").is_ok());
        assert!(recovery_targets_path(recovery, "/tmp/other.json").is_err());
        assert!(recovery_targets_path("{", "/tmp/plan.json").is_err());
    }
}
