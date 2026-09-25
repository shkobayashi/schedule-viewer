use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;
use tauri_plugin_dialog::DialogExt;

const MAX_SCHEDULE_BYTES: u64 = 10 * 1024 * 1024;

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

fn read_utf8(path: &Path) -> Result<String, String> {
    let meta = fs::metadata(path).map_err(|e| format!("ファイルを読めません: {}", e))?;
    if meta.len() > MAX_SCHEDULE_BYTES {
        return Err("ファイルが大きすぎます（上限 10 MB）".to_string());
    }
    let bytes = fs::read(path).map_err(|e| format!("ファイルを読めません: {}", e))?;
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

fn sanitize_export_filename(name: &str, default_ext: &str) -> String {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return format!("schedule.{}", default_ext);
    }
    let mut out = String::new();
    for ch in trimmed.chars() {
        if matches!(ch, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') {
            out.push('_');
        } else {
            out.push(ch);
        }
    }
    let base = out.trim();
    if base.is_empty() {
        return format!("schedule.{}", default_ext);
    }
    let suffix = format!(".{}", default_ext);
    if base.ends_with(&suffix) {
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

fn record_open(state: &Mutex<ScheduleFileState>, path: PathBuf, contents: &str) {
    let mut guard = state.lock().expect("schedule file state");
    guard.path = Some(path);
    guard.content_hash = Some(hash_contents(contents));
}

#[tauri::command]
async fn open_schedule_file(
    window: tauri::Window,
    app: tauri::AppHandle,
    state: State<'_, Mutex<ScheduleFileState>>,
) -> Result<Option<OpenScheduleResult>, String> {
    let path = app
        .dialog()
        .file()
        .set_parent(&window)
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    match path {
        Some(file_path) => {
            let path_buf = file_path.into_path().map_err(|e| e.to_string())?;
            let contents = read_utf8(&path_buf)?;
            record_open(state.inner(), path_buf.clone(), &contents);
            Ok(Some(OpenScheduleResult {
                path: path_buf.to_string_lossy().into_owned(),
                contents,
            }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
fn check_schedule_file_changed(
    state: State<'_, Mutex<ScheduleFileState>>,
) -> Result<bool, String> {
    let guard = state.lock().expect("schedule file state");
    let path = guard
        .path
        .as_ref()
        .ok_or_else(|| "開いているファイルがありません".to_string())?;
    let contents = read_utf8(path)?;
    let hash = hash_contents(&contents);
    Ok(guard.content_hash.as_ref() != Some(&hash))
}

#[tauri::command]
async fn save_schedule_file(
    window: tauri::Window,
    app: tauri::AppHandle,
    state: State<'_, Mutex<ScheduleFileState>>,
    contents: String,
    save_as: bool,
    suggested_name: String,
) -> Result<Option<String>, String> {
    let target = if save_as {
        let default_name = sanitize_export_filename(&suggested_name, "json");
        let picked = app
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
        guard
            .path
            .clone()
            .ok_or_else(|| "保存先が選ばれていません。別名保存を使ってください。".to_string())?
    };

    if !is_json_path(&target) {
        return Err("JSON ファイル以外には保存できません".to_string());
    }

    write_utf8_atomic(&target, &contents)?;
    record_open(state.inner(), target.clone(), &contents);
    Ok(Some(target.to_string_lossy().into_owned()))
}

#[tauri::command]
async fn save_html_file(
    window: tauri::Window,
    app: tauri::AppHandle,
    contents: String,
    suggested_name: String,
) -> Result<Option<String>, String> {
    let default_name = sanitize_export_filename(&suggested_name, "html");
    let picked = app
        .dialog()
        .file()
        .set_parent(&window)
        .set_file_name(&default_name)
        .add_filter("HTML", &["html", "htm"])
        .blocking_save_file();
    let target = match picked {
        Some(file_path) => file_path.into_path().map_err(|e| e.to_string())?,
        None => return Ok(None),
    };
    write_utf8_atomic(&target, &contents)?;
    Ok(Some(target.to_string_lossy().into_owned()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(ScheduleFileState::default()))
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_schedule_file,
            check_schedule_file_changed,
            save_schedule_file,
            save_html_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
