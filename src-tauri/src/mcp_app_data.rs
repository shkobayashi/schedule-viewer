use std::path::PathBuf;

pub const APP_IDENTIFIER: &str = "io.github.shkobayashi.schedule-viewer";

pub const LEGACY_APP_IDENTIFIER: &str = "com.collabcentral.schedule-viewer";

/// 旧 identifier のアプリデータを新しい場所へ移す。新ディレクトリが既にあるときは何もしない。
pub fn migrate_legacy_app_data_if_needed() -> Result<(), String> {
    let parent = dirs::data_dir().ok_or_else(|| "データディレクトリを開けません。".to_string())?;
    migrate_legacy_app_data_under(&parent)
}

pub fn migrate_legacy_app_data_under(parent: &std::path::Path) -> Result<(), String> {
    let new_dir = parent.join(APP_IDENTIFIER);
    if new_dir.exists() {
        return Ok(());
    }
    let old_dir = parent.join(LEGACY_APP_IDENTIFIER);
    if !old_dir.is_dir() {
        return Ok(());
    }
    std::fs::rename(&old_dir, &new_dir).map_err(|e| {
        format!(
            "アプリデータを移せません（{} から {}）: {}",
            old_dir.display(),
            new_dir.display(),
            e
        )
    })
}

#[cfg_attr(not(unix), allow(dead_code))]
pub const MCP_SOCKET_FILE: &str = "mcp.sock";

/// Tauri の `app_data_dir` と同じ規則で、GUI を起動せずにディレクトリを決める。
pub fn app_data_dir_without_tauri() -> Option<PathBuf> {
    dirs::data_dir().map(|dir| dir.join(APP_IDENTIFIER))
}

#[cfg_attr(not(unix), allow(dead_code))]
pub fn mcp_socket_path(app_data: &std::path::Path) -> PathBuf {
    app_data.join(MCP_SOCKET_FILE)
}

/// Windows の名前付きパイプ名。`sid` は `S-1-5-…` 形式。
#[cfg_attr(not(windows), allow(dead_code))]
pub fn mcp_pipe_name(sid: &str) -> String {
    format!(r"\\.\pipe\{}-{}", APP_IDENTIFIER, sid)
}

#[cfg(windows)]
pub fn current_user_sid_string() -> Result<String, String> {
    use std::ffi::c_void;
    use std::ptr;
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
    use windows_sys::Win32::Security::Authorization::ConvertSidToStringSidW;
    use windows_sys::Win32::Security::{GetTokenInformation, TokenUser, TOKEN_QUERY, TOKEN_USER};
    use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
        let mut token = HANDLE::default();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return Err("MCP パイプ用のユーザーを取得できません。".to_string());
        }
        let mut length = 0u32;
        let _ = GetTokenInformation(
            token,
            TokenUser,
            ptr::null_mut(),
            0,
            &mut length,
        );
        if length == 0 {
            let _ = CloseHandle(token);
            return Err("MCP パイプ用のユーザーを取得できません。".to_string());
        }
        let mut buffer = vec![0u8; length as usize];
        if GetTokenInformation(
            token,
            TokenUser,
            buffer.as_mut_ptr() as *mut c_void,
            length,
            &mut length,
        ) == 0
        {
            let _ = CloseHandle(token);
            return Err("MCP パイプ用のユーザーを取得できません。".to_string());
        }
        let _ = CloseHandle(token);
        let user = &*(buffer.as_ptr() as *const TOKEN_USER);
        let mut sid_string = ptr::null_mut();
        if ConvertSidToStringSidW(user.User.Sid, &mut sid_string) == 0 {
            return Err("MCP パイプ用のユーザーを取得できません。".to_string());
        }
        let mut len = 0usize;
        while *sid_string.add(len) != 0 {
            len += 1;
        }
        let wide = std::slice::from_raw_parts(sid_string, len);
        let sid = String::from_utf16_lossy(wide);
        let _ = windows_sys::Win32::Foundation::LocalFree(sid_string as *mut c_void);
        Ok(sid)
    }
}

#[cfg(windows)]
pub fn mcp_pipe_name_for_current_user() -> Result<String, String> {
    current_user_sid_string().map(|sid| mcp_pipe_name(&sid))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_data_dir_ends_with_identifier() {
        let dir = app_data_dir_without_tauri().expect("data dir");
        assert_eq!(
            dir.file_name().and_then(|n| n.to_str()),
            Some(APP_IDENTIFIER),
        );
    }

    #[test]
    fn mcp_socket_lives_in_app_data() {
        let dir = app_data_dir_without_tauri().expect("data dir");
        let socket = mcp_socket_path(&dir);
        assert_eq!(socket.parent(), Some(dir.as_path()));
        assert_eq!(socket.file_name().and_then(|n| n.to_str()), Some(MCP_SOCKET_FILE));
    }

    #[test]
    fn mcp_pipe_name_includes_identifier_and_sid() {
        let name = mcp_pipe_name("S-1-5-21-1234-5678");
        assert!(name.starts_with(r"\\.\pipe\"));
        assert!(name.contains(APP_IDENTIFIER));
        assert!(name.ends_with("S-1-5-21-1234-5678"));
    }

    #[test]
    fn migrate_legacy_moves_when_new_missing() {
        let parent = std::env::temp_dir().join(format!(
            "sv-migrate-test-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&parent);
        std::fs::create_dir_all(&parent).expect("temp parent");
        let old_dir = parent.join(LEGACY_APP_IDENTIFIER);
        std::fs::create_dir_all(&old_dir).expect("old dir");
        std::fs::write(old_dir.join("marker.txt"), "ok").expect("marker");

        migrate_legacy_app_data_under(&parent).expect("migrate");

        let new_dir = parent.join(APP_IDENTIFIER);
        assert!(new_dir.is_dir());
        assert!(!old_dir.exists());
        assert_eq!(
            std::fs::read_to_string(new_dir.join("marker.txt")).unwrap(),
            "ok"
        );

        let _ = std::fs::remove_dir_all(&parent);
    }

    #[test]
    fn migrate_legacy_skips_when_new_exists() {
        let parent = std::env::temp_dir().join(format!(
            "sv-migrate-skip-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&parent);
        std::fs::create_dir_all(&parent).expect("temp parent");
        let old_dir = parent.join(LEGACY_APP_IDENTIFIER);
        std::fs::create_dir_all(&old_dir).expect("old dir");
        let new_dir = parent.join(APP_IDENTIFIER);
        std::fs::create_dir_all(&new_dir).expect("new dir");
        std::fs::write(new_dir.join("keep.txt"), "new").expect("keep");

        migrate_legacy_app_data_under(&parent).expect("migrate");

        assert!(old_dir.is_dir());
        assert_eq!(
            std::fs::read_to_string(new_dir.join("keep.txt")).unwrap(),
            "new"
        );

        let _ = std::fs::remove_dir_all(&parent);
    }
}
