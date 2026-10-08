use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use crate::write_utf8_atomic;

const PENDING_FILE: &str = "pending-release-notes.json";

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
struct PendingReleaseNotesFile {
    version: String,
}

pub fn pending_release_notes_path(app_data: &Path) -> PathBuf {
    app_data.join(PENDING_FILE)
}

pub fn normalize_version_label(version: &str) -> String {
    let trimmed = version.trim();
    if trimmed.starts_with('v') || trimmed.starts_with('V') {
        trimmed[1..].to_string()
    } else {
        trimmed.to_string()
    }
}

pub fn write_pending_release_notes(app_data: &Path, version: &str) -> Result<(), String> {
    let payload = PendingReleaseNotesFile {
        version: normalize_version_label(version),
    };
    let text = serde_json::to_string(&payload)
        .map_err(|e| format!("更新の印を書けません: {}", e))?;
    write_utf8_atomic(&pending_release_notes_path(app_data), &text)
}

fn read_pending_version(app_data: &Path) -> Option<String> {
    let path = pending_release_notes_path(app_data);
    let text = fs::read_to_string(&path).ok()?;
    let parsed: PendingReleaseNotesFile = serde_json::from_str(&text).ok()?;
    Some(parsed.version)
}

pub fn clear_pending_release_notes(app_data: &Path) -> Result<(), String> {
    let path = pending_release_notes_path(app_data);
    if path.is_file() {
        fs::remove_file(&path).map_err(|e| format!("更新の印を消せません: {}", e))?;
    }
    Ok(())
}

pub fn pending_release_notes_for_focused_window(
    app_data: &Path,
    window_is_focused: bool,
    app_version: &str,
) -> Option<String> {
    if !window_is_focused {
        return None;
    }
    let pending = read_pending_version(app_data)?;
    if normalize_version_label(&pending) != normalize_version_label(app_version) {
        return None;
    }
    Some(pending)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn write_read_and_clear_pending_version() {
        let dir = tempfile::tempdir().expect("temp dir");
        write_pending_release_notes(dir.path(), "v1.2.3").expect("write");
        assert_eq!(
            pending_release_notes_for_focused_window(dir.path(), false, "1.2.3"),
            None,
        );
        clear_pending_release_notes(dir.path()).expect("clear");
        assert!(!pending_release_notes_path(dir.path()).is_file());
    }

    #[test]
    fn returns_version_only_when_window_is_focused_and_versions_match() {
        let dir = tempfile::tempdir().expect("temp dir");
        write_pending_release_notes(dir.path(), "2.0.0").expect("write");
        assert_eq!(
            pending_release_notes_for_focused_window(dir.path(), true, "2.0.0"),
            Some("2.0.0".to_string()),
        );
        assert_eq!(
            pending_release_notes_for_focused_window(dir.path(), false, "2.0.0"),
            None,
        );
        assert_eq!(
            pending_release_notes_for_focused_window(dir.path(), true, "1.0.0"),
            None,
        );
    }
}
