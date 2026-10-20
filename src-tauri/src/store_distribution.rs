/// Microsoft Store の MSIX として動いているか（Windows のみ）。
pub fn is_store_distribution() -> bool {
    is_windows_msix_package()
}

#[cfg(windows)]
fn is_windows_msix_package() -> bool {
    use windows_sys::Win32::Foundation::{ERROR_INSUFFICIENT_BUFFER, ERROR_SUCCESS};
    use windows_sys::Win32::Storage::Packaging::Appx::GetCurrentPackageFullName;

    let mut length: u32 = 0;
    let result = GetCurrentPackageFullName(&mut length, std::ptr::null_mut());
    result == ERROR_INSUFFICIENT_BUFFER || result == ERROR_SUCCESS
}

#[cfg(not(windows))]
fn is_windows_msix_package() -> bool {
    false
}

/// Store 版の MCP / read-screen 用。実行エイリアスを書く。
pub const STORE_EXECUTABLE_ALIAS: &str = "schedule-viewer.exe";

pub fn mcp_executable_command_path() -> Result<String, String> {
    if is_store_distribution() {
        return Ok(STORE_EXECUTABLE_ALIAS.to_string());
    }
    std::env::current_exe()
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(|e| format!("実行ファイルの場所を取得できません: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn store_alias_is_stable_name() {
        assert_eq!(STORE_EXECUTABLE_ALIAS, "schedule-viewer.exe");
    }

    #[cfg(not(windows))]
    #[test]
    fn non_windows_is_not_store() {
        assert!(!is_store_distribution());
    }
}
