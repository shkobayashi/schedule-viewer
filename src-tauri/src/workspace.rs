use std::path::{Path, PathBuf};

pub const MAX_WORKSPACE_BYTES: u64 = 64 * 1024;

pub const EXPORT_FOLDER_NOT_EMPTY: &str =
    "空のフォルダを選んでください。ファイルは書いていません。";
pub const EXPORT_FOLDER_SYMLINK: &str = "シンボリックリンクのフォルダには書けません。";
pub const EXPORT_PARTIAL_NOTE: &str =
    "それまでに書いたファイルはフォルダに残しています。このウィンドウはアプリの設定のままです。";

fn is_ignorable_export_folder_entry(name: &str) -> bool {
    name == ".DS_Store" || name == "Thumbs.db" || name == "desktop.ini"
}

pub fn is_export_destination_empty(folder: &Path) -> Result<bool, String> {
    let entries = std::fs::read_dir(folder)
        .map_err(|e| format!("フォルダを確認できません: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("フォルダを確認できません: {}", e))?;
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if is_ignorable_export_folder_entry(name.as_ref()) {
            continue;
        }
        return Ok(false);
    }
    Ok(true)
}

pub fn ensure_export_folder_ready(folder: &Path) -> Result<(), String> {
    let meta = std::fs::symlink_metadata(folder)
        .map_err(|e| format!("フォルダを確認できません: {}", e))?;
    if meta.file_type().is_symlink() {
        return Err(EXPORT_FOLDER_SYMLINK.to_string());
    }
    if !is_export_destination_empty(folder)? {
        return Err(EXPORT_FOLDER_NOT_EMPTY.to_string());
    }
    Ok(())
}

pub fn export_error_with_partial(error: String, wrote_any: bool) -> String {
    if wrote_any {
        format!("{}\n{}", error, EXPORT_PARTIAL_NOTE)
    } else {
        error
    }
}

fn schedule_parent_directory(workspace_file: &Path) -> Option<PathBuf> {
    workspace_file.parent().map(Path::to_path_buf)
}

/// 設定ファイルの親と相対パスを結合する。`..` を許可する。
pub fn resolve_workspace_relative_path(
    workspace_file: &Path,
    relative: &str,
) -> Option<PathBuf> {
    let parent = schedule_parent_directory(workspace_file)?;
    let sep = if workspace_file.to_string_lossy().contains('\\') {
        '\\'
    } else {
        '/'
    };
    let parent_str = parent.to_string_lossy();
    let parent_parts: Vec<&str> = parent_str
        .split(['/', '\\'])
        .filter(|part| !part.is_empty())
        .collect();
    let relative_parts: Vec<&str> = relative
        .split(['/', '\\'])
        .filter(|part| !part.is_empty())
        .collect();
    let mut stack = parent_parts;
    for part in relative_parts {
        if part == "." {
            continue;
        }
        if part == ".." {
            if stack.is_empty() {
                return None;
            }
            stack.pop();
            continue;
        }
        stack.push(part);
    }
    if stack.is_empty() {
        return None;
    }
    let drive_match = regex_drive_prefix(parent_str.as_ref());
    if let Some((drive, _)) = drive_match {
        let rest = if stack.len() > 1 {
            stack[1..].join(&sep.to_string())
        } else {
            String::new()
        };
        if rest.is_empty() {
            return Some(PathBuf::from(format!("{}{}", drive, sep)));
        }
        return Some(PathBuf::from(format!("{}{}{}", drive, sep, rest)));
    }
    if parent_str.starts_with('/') {
        return Some(PathBuf::from(format!("/{}", stack.join("/"))));
    }
    Some(PathBuf::from(stack.join(&sep.to_string())))
}

fn regex_drive_prefix(path: &str) -> Option<(String, String)> {
    if path.len() < 2 {
        return None;
    }
    let bytes = path.as_bytes();
    if !bytes[0].is_ascii_alphabetic() || bytes[1] != b':' {
        return None;
    }
    Some((path[..2].to_string(), path[2..].to_string()))
}

pub fn paths_denote_same_file(left: &Path, right: &Path) -> bool {
    if left == right {
        return true;
    }
    match (left.canonicalize(), right.canonicalize()) {
        (Ok(a), Ok(b)) => a == b,
        _ => false,
    }
}

pub fn read_workspace_statuses_path(workspace_file: &Path) -> Result<Option<PathBuf>, String> {
    if !workspace_file.is_absolute() {
        return Err("設定ファイルのパスが不正です。".to_string());
    }
    if !workspace_file.is_file() {
        return Err("設定ファイルを開けません。".to_string());
    }
    let text = std::fs::read_to_string(workspace_file)
        .map_err(|e| format!("設定ファイルを開けません: {}", e))?;
    if text.len() as u64 > MAX_WORKSPACE_BYTES {
        return Err("設定ファイルが大きすぎます（上限 64 KB）".to_string());
    }
    let value: serde_json::Value = serde_json::from_str(&text)
        .map_err(|_| "設定ファイルの形式が正しくありません".to_string())?;
    let relative = value
        .get("statuses")
        .and_then(|entry| entry.as_str())
        .map(str::trim)
        .filter(|entry| !entry.is_empty());
    match relative {
        None => Ok(None),
        Some(relative) => resolve_workspace_relative_path(workspace_file, relative)
            .map(Some)
            .ok_or_else(|| "設定ファイルのパスを解決できません。".to_string()),
    }
}

#[cfg(test)]
mod export_tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn rejects_nonempty_export_folder() {
        let dir = tempdir().expect("tempdir");
        fs::write(dir.path().join("plan.json"), "{}").expect("write");
        let err = ensure_export_folder_ready(dir.path()).expect_err("reject");
        assert_eq!(err, EXPORT_FOLDER_NOT_EMPTY);
    }

    #[test]
    fn allows_ds_store_only_folder() {
        let dir = tempdir().expect("tempdir");
        fs::write(dir.path().join(".DS_Store"), "x").expect("write");
        ensure_export_folder_ready(dir.path()).expect("empty enough");
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlink_export_folder() {
        let dir = tempdir().expect("tempdir");
        let target = dir.path().join("real");
        fs::create_dir(&target).expect("mkdir");
        let link = dir.path().join("link");
        std::os::unix::fs::symlink(&target, &link).expect("symlink");
        let err = ensure_export_folder_ready(&link).expect_err("reject");
        assert_eq!(err, EXPORT_FOLDER_SYMLINK);
    }

    #[test]
    fn partial_note_appended_when_requested() {
        let message = export_error_with_partial("失敗".to_string(), true);
        assert!(message.contains(EXPORT_PARTIAL_NOTE));
        let message = export_error_with_partial("失敗".to_string(), false);
        assert!(!message.contains(EXPORT_PARTIAL_NOTE));
    }

    #[test]
    fn resolves_statuses_path_next_to_workspace() {
        let dir = tempdir().expect("tempdir");
        let workspace = dir.path().join("ws").join("workspace.json");
        fs::create_dir_all(workspace.parent().expect("parent")).expect("mkdir");
        fs::write(&workspace, r#"{"schemaVersion":1,"schedule":"p.json","statuses":"team.statuses.json"}"#)
            .expect("write");
        let statuses = dir.path().join("ws").join("team.statuses.json");
        fs::write(&statuses, "{}").expect("write statuses");
        let resolved =
            read_workspace_statuses_path(&workspace).expect("read").expect("path");
        assert!(paths_denote_same_file(&resolved, &statuses));
    }

    #[test]
    fn rejects_mismatched_statuses_target() {
        let dir = tempdir().expect("tempdir");
        let workspace = dir.path().join("workspace.json");
        fs::write(
            &workspace,
            r#"{"schemaVersion":1,"schedule":"p.json","statuses":"a.statuses.json"}"#,
        )
        .expect("write");
        let expected = read_workspace_statuses_path(&workspace)
            .expect("read")
            .expect("path");
        let other = dir.path().join("other.statuses.json");
        assert!(!paths_denote_same_file(&other, &expected));
    }
}
