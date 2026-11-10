use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::write_utf8_atomic;
use serde::{Deserialize, Serialize};

static RECENT_FILES_LOCK: Mutex<()> = Mutex::new(());

pub const MAX_RECENT_FILES_BYTES: u64 = 64 * 1024;
pub const RECENT_FILES_MAX: usize = 5;

const RECENT_FILES_NAME: &str = "recent-files.json";

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct RecentFilesStore {
    pub schedules: Vec<String>,
    pub workspaces: Vec<String>,
}

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

fn parse_path_list(data: &serde_json::Value) -> Option<Vec<String>> {
    let arr = data.as_array()?;
    if arr.len() > RECENT_FILES_MAX {
        return None;
    }
    let mut out = Vec::with_capacity(arr.len());
    for item in arr {
        let s = item.as_str()?;
        if !is_absolute_schedule_path(s) {
            return None;
        }
        out.push(s.to_string());
    }
    Some(out)
}

pub fn parse_recent_files_json(text: &str) -> RecentFilesStore {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return RecentFilesStore::default();
    }
    let data: serde_json::Value = match serde_json::from_str(trimmed) {
        Ok(v) => v,
        Err(_) => return RecentFilesStore::default(),
    };
    if data.is_array() {
        if let Some(schedules) = parse_path_list(&data) {
            return RecentFilesStore {
                schedules,
                workspaces: Vec::new(),
            };
        }
        return RecentFilesStore::default();
    }
    let obj = match data.as_object() {
        Some(value) => value,
        None => return RecentFilesStore::default(),
    };
    let schedules = match obj.get("schedules") {
        None => Vec::new(),
        Some(value) => match parse_path_list(value) {
            Some(list) => list,
            None => return RecentFilesStore::default(),
        },
    };
    let workspaces = match obj.get("workspaces") {
        None => Vec::new(),
        Some(value) => match parse_path_list(value) {
            Some(list) => list,
            None => return RecentFilesStore::default(),
        },
    };
    RecentFilesStore { schedules, workspaces }
}

pub fn read_recent_files(app_data: &Path) -> RecentFilesStore {
    let path = recent_files_path(app_data);
    if !path.is_file() {
        return RecentFilesStore::default();
    }
    match read_utf8_limited(&path, MAX_RECENT_FILES_BYTES) {
        Ok(text) => parse_recent_files_json(&text),
        Err(_) => RecentFilesStore::default(),
    }
}

fn write_recent_files(app_data: &Path, store: &RecentFilesStore) -> Result<(), String> {
    if store.schedules.len() > RECENT_FILES_MAX || store.workspaces.len() > RECENT_FILES_MAX {
        return Err("最近開いたファイルは5件までです。".to_string());
    }
    for path in store
        .schedules
        .iter()
        .chain(store.workspaces.iter())
    {
        if !is_absolute_schedule_path(path) {
            return Err("パスが不正です。".to_string());
        }
    }
    let body =
        serde_json::to_string(store).map_err(|e| format!("JSON を書けません: {}", e))?;
    if body.len() as u64 > MAX_RECENT_FILES_BYTES {
        return Err("最近開いたファイルの記録が大きすぎます（上限 64 KB）".to_string());
    }
    fs::create_dir_all(app_data).map_err(|e| format!("アプリデータを準備できません: {}", e))?;
    write_utf8_atomic(&recent_files_path(app_data), &body)
}

pub fn record_recent_files(
    app_data: &Path,
    expected: RecentFilesStore,
    next: RecentFilesStore,
) -> Result<RecentFilesStore, String> {
    let _guard = RECENT_FILES_LOCK
        .lock()
        .map_err(|_| "最近開いたファイルを更新できません。".to_string())?;
    let current = read_recent_files(app_data);
    if current != expected {
        return Ok(current);
    }
    write_recent_files(app_data, &next)?;
    Ok(next)
}

pub fn clear_recent_files(app_data: &Path) -> Result<RecentFilesStore, String> {
    let _guard = RECENT_FILES_LOCK
        .lock()
        .map_err(|_| "最近開いたファイルを更新できません。".to_string())?;
    let empty = RecentFilesStore::default();
    write_recent_files(app_data, &empty)?;
    Ok(empty)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_only_when_expected_matches() {
        let dir = tempfile::tempdir().expect("temp dir");
        let app_data = dir.path();
        let first = RecentFilesStore {
            schedules: vec!["/a.json".to_string()],
            workspaces: vec![],
        };
        let recorded =
            record_recent_files(app_data, RecentFilesStore::default(), first.clone()).expect("write");
        assert_eq!(recorded, first);
        let stale = record_recent_files(
            app_data,
            RecentFilesStore::default(),
            RecentFilesStore {
                schedules: vec!["/b.json".to_string()],
                workspaces: vec![],
            },
        )
        .expect("stale");
        assert_eq!(stale, first);
        assert_eq!(read_recent_files(app_data), first);
    }

    #[test]
    fn clears_to_empty_store() {
        let dir = tempfile::tempdir().expect("temp dir");
        let app_data = dir.path();
        record_recent_files(
            app_data,
            RecentFilesStore::default(),
            RecentFilesStore {
                schedules: vec!["/a.json".to_string()],
                workspaces: vec![],
            },
        )
        .expect("write");
        let cleared = clear_recent_files(app_data).expect("clear");
        assert!(cleared.schedules.is_empty());
        assert!(cleared.workspaces.is_empty());
    }

    #[test]
    fn rejects_invalid_payload_on_write() {
        let dir = tempfile::tempdir().expect("temp dir");
        let app_data = dir.path();
        let err = write_recent_files(
            app_data,
            &RecentFilesStore {
                schedules: vec!["relative.json".to_string()],
                workspaces: vec![],
            },
        )
        .expect_err("relative");
        assert!(err.contains("不正"));
    }

    #[test]
    fn parse_rejects_more_than_five_and_non_strings() {
        assert_eq!(
            parse_recent_files_json(r#"["/a.json", 1]"#),
            RecentFilesStore::default()
        );
        assert_eq!(
            parse_recent_files_json(
                r#"["/1.json","/2.json","/3.json","/4.json","/5.json","/6.json"]"#
            ),
            RecentFilesStore::default()
        );
    }

    #[test]
    fn parse_legacy_array() {
        let store = parse_recent_files_json(r#"["/a.json"]"#);
        assert_eq!(store.schedules, vec!["/a.json".to_string()]);
        assert!(store.workspaces.is_empty());
    }

    #[test]
    fn read_missing_or_corrupt_is_empty() {
        let dir = tempfile::tempdir().expect("temp dir");
        let app_data = dir.path();
        assert_eq!(read_recent_files(app_data), RecentFilesStore::default());
        fs::write(recent_files_path(app_data), "{").expect("write");
        assert_eq!(read_recent_files(app_data), RecentFilesStore::default());
    }
}
