use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::write_utf8_atomic;

static RECENT_FILES_LOCK: Mutex<()> = Mutex::new(());

pub const MAX_RECENT_FILES_BYTES: u64 = 64 * 1024;
pub const RECENT_FILES_MAX: usize = 5;

const RECENT_FILES_NAME: &str = "recent-files.json";

pub fn recent_files_path(app_data: &Path) -> PathBuf {
    app_data.join(RECENT_FILES_NAME)
}

fn read_utf8_limited(path: &Path, max_bytes: u64) -> Result<String, String> {
    let meta = fs::metadata(path).map_err(|e| format!("ファイルを読めません: {}", e))?;
    if meta.len() > max_bytes {
        return Err("too large".to_string());
    }
    fs::read_to_string(path).map_err(|e| format!("ファイルを読めません: {}", e))
}

fn is_absolute_schedule_path(path: &str) -> bool {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return false;
    }
    if trimmed.starts_with('/') {
        return true;
    }
    if trimmed.starts_with("\\\\") {
        return true;
    }
    let bytes = trimmed.as_bytes();
    if bytes.len() >= 3 && bytes[1] == b':' && (bytes[2] == b'\\' || bytes[2] == b'/') {
        return bytes[0].is_ascii_alphabetic();
    }
    false
}

pub fn parse_recent_files_json(text: &str) -> Vec<String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Vec::new();
    }
    let data: serde_json::Value = match serde_json::from_str(trimmed) {
        Ok(v) => v,
        Err(_) => return Vec::new(),
    };
    let arr = match data.as_array() {
        Some(a) => a,
        None => return Vec::new(),
    };
    if arr.len() > RECENT_FILES_MAX {
        return Vec::new();
    }
    let mut out = Vec::with_capacity(arr.len());
    for item in arr {
        let s = match item.as_str() {
            Some(s) => s,
            None => return Vec::new(),
        };
        if !is_absolute_schedule_path(s) {
            return Vec::new();
        }
        out.push(s.to_string());
    }
    out
}

pub fn read_recent_files(app_data: &Path) -> Vec<String> {
    let path = recent_files_path(app_data);
    if !path.is_file() {
        return Vec::new();
    }
    match read_utf8_limited(&path, MAX_RECENT_FILES_BYTES) {
        Ok(text) => parse_recent_files_json(&text),
        Err(_) => Vec::new(),
    }
}

fn write_recent_files(app_data: &Path, paths: &[String]) -> Result<(), String> {
    if paths.len() > RECENT_FILES_MAX {
        return Err("最近開いたファイルは5件までです。".to_string());
    }
    for path in paths {
        if !is_absolute_schedule_path(path) {
            return Err("パスが不正です。".to_string());
        }
    }
    let body = serde_json::to_string(paths).map_err(|e| format!("JSON を書けません: {}", e))?;
    if body.len() as u64 > MAX_RECENT_FILES_BYTES {
        return Err("最近開いたファイルの記録が大きすぎます（上限 64 KB）".to_string());
    }
    fs::create_dir_all(app_data).map_err(|e| format!("アプリデータを準備できません: {}", e))?;
    write_utf8_atomic(&recent_files_path(app_data), &body)
}

pub fn record_recent_files(
    app_data: &Path,
    expected_paths: Vec<String>,
    next_paths: Vec<String>,
) -> Result<Vec<String>, String> {
    let _guard = RECENT_FILES_LOCK
        .lock()
        .map_err(|_| "最近開いたファイルを更新できません。".to_string())?;
    let current = read_recent_files(app_data);
    if current != expected_paths {
        return Ok(current);
    }
    write_recent_files(app_data, &next_paths)?;
    Ok(next_paths)
}

pub fn clear_recent_files(app_data: &Path) -> Result<Vec<String>, String> {
    let _guard = RECENT_FILES_LOCK
        .lock()
        .map_err(|_| "最近開いたファイルを更新できません。".to_string())?;
    write_recent_files(app_data, &[])?;
    Ok(Vec::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_only_when_expected_matches() {
        let dir = tempfile::tempdir().expect("temp dir");
        let app_data = dir.path();
        let first = vec!["/a.json".to_string()];
        let recorded = record_recent_files(app_data, vec![], first.clone()).expect("write");
        assert_eq!(recorded, first);
        let stale = record_recent_files(
            app_data,
            vec![],
            vec!["/b.json".to_string()],
        )
        .expect("stale");
        assert_eq!(stale, first);
        assert_eq!(read_recent_files(app_data), first);
    }

    #[test]
    fn clears_to_empty_array() {
        let dir = tempfile::tempdir().expect("temp dir");
        let app_data = dir.path();
        record_recent_files(
            app_data,
            vec![],
            vec!["/a.json".to_string()],
        )
        .expect("write");
        let cleared = clear_recent_files(app_data).expect("clear");
        assert!(cleared.is_empty());
        assert!(read_recent_files(app_data).is_empty());
    }

    #[test]
    fn rejects_invalid_payload_on_write() {
        let dir = tempfile::tempdir().expect("temp dir");
        let app_data = dir.path();
        let err = write_recent_files(app_data, &["relative.json".to_string()])
            .expect_err("relative");
        assert!(err.contains("不正"));
    }

    #[test]
    fn parse_rejects_more_than_five_and_non_strings() {
        assert!(parse_recent_files_json(r#"["/a.json", 1]"#).is_empty());
        assert!(
            parse_recent_files_json(
                r#"["/1.json","/2.json","/3.json","/4.json","/5.json","/6.json"]"#
            )
            .is_empty()
        );
    }

    #[test]
    fn read_missing_or_corrupt_is_empty() {
        let dir = tempfile::tempdir().expect("temp dir");
        let app_data = dir.path();
        assert!(read_recent_files(app_data).is_empty());
        fs::write(recent_files_path(app_data), "{").expect("write");
        assert!(read_recent_files(app_data).is_empty());
    }
}
