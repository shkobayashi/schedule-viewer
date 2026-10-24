use std::path::Path;

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
}
