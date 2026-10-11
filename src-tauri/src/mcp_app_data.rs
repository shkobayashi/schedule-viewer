use std::path::PathBuf;

pub const APP_IDENTIFIER: &str = "com.collabcentral.schedule-viewer";

pub const MCP_SOCKET_FILE: &str = "mcp.sock";

/// Tauri の `app_data_dir` と同じ規則で、GUI を起動せずにディレクトリを決める。
pub fn app_data_dir_without_tauri() -> Option<PathBuf> {
    dirs::data_dir().map(|dir| dir.join(APP_IDENTIFIER))
}

pub fn mcp_socket_path(app_data: &std::path::Path) -> PathBuf {
    app_data.join(MCP_SOCKET_FILE)
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
}
