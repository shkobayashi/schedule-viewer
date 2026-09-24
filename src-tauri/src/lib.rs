use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
struct OpenScheduleResult {
    path: String,
    contents: String,
}

fn read_utf8(path: &PathBuf) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("ファイルを読めません: {}", e))?;
    String::from_utf8(bytes).map_err(|_| "UTF-8 以外の文字コードのファイルです".to_string())
}

fn write_utf8(path: &PathBuf, contents: &str) -> Result<(), String> {
    fs::write(path, contents).map_err(|e| format!("ファイルに書き込めません: {}", e))
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

#[tauri::command]
async fn open_schedule_file(app: tauri::AppHandle) -> Result<Option<OpenScheduleResult>, String> {
    let path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    match path {
        Some(file_path) => {
            let path_buf = file_path.into_path().map_err(|e| e.to_string())?;
            let contents = read_utf8(&path_buf)?;
            Ok(Some(OpenScheduleResult {
                path: path_buf.to_string_lossy().into_owned(),
                contents,
            }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn save_schedule_file(
    app: tauri::AppHandle,
    path: Option<String>,
    contents: String,
    suggested_name: String,
) -> Result<Option<String>, String> {
    let target = if let Some(p) = path {
        PathBuf::from(p)
    } else {
        let default_name = sanitize_export_filename(&suggested_name, "json");
        let picked = app
            .dialog()
            .file()
            .set_file_name(&default_name)
            .add_filter("JSON", &["json"])
            .blocking_save_file();
        match picked {
            Some(file_path) => file_path.into_path().map_err(|e| e.to_string())?,
            None => return Ok(None),
        }
    };

    write_utf8(&target, &contents)?;
    Ok(Some(target.to_string_lossy().into_owned()))
}

#[tauri::command]
async fn save_html_file(
    app: tauri::AppHandle,
    contents: String,
    suggested_name: String,
) -> Result<Option<String>, String> {
    let default_name = sanitize_export_filename(&suggested_name, "html");
    let picked = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("HTML", &["html", "htm"])
        .blocking_save_file();
    let target = match picked {
        Some(file_path) => file_path.into_path().map_err(|e| e.to_string())?,
        None => return Ok(None),
    };
    write_utf8(&target, &contents)?;
    Ok(Some(target.to_string_lossy().into_owned()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_schedule_file,
            save_schedule_file,
            save_html_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
