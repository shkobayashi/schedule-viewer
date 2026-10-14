use serde::Deserialize;
use std::fs;
use std::io::Read;
use std::path::PathBuf;

const GITHUB_RELEASES_URL: &str =
    "https://api.github.com/repos/shkobayashi/schedule-viewer/releases?per_page=100";
const USER_AGENT: &str = "schedule-viewer";
const MAX_INSTALLER_BYTES: usize = 64 * 1024 * 1024;

#[derive(Deserialize)]
struct GhRelease {
    tag_name: String,
    assets: Vec<GhAsset>,
}

#[derive(Deserialize)]
struct GhAsset {
    name: String,
    browser_download_url: String,
}

fn is_beta_tag(tag: &str) -> bool {
    let trimmed = tag.trim();
    let rest = trimmed.strip_prefix('v').unwrap_or(trimmed);
    let parts: Vec<&str> = rest.split("-beta.").collect();
    if parts.len() != 2 {
        return false;
    }
    let nums: Vec<&str> = parts[0].split('.').collect();
    nums.len() == 3 && parts[1].chars().all(|c| c.is_ascii_digit())
}

fn is_updater_tag(tag: &str) -> bool {
    tag.starts_with("updater-")
}

pub fn fetch_beta_release_tags() -> Result<Vec<String>, String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .map_err(|e| format!("ベータの取得に失敗しました: {}", e))?;
    let response = client
        .get(GITHUB_RELEASES_URL)
        .send()
        .map_err(|e| format!("ベータの取得に失敗しました: {}", e))?;
    if !response.status().is_success() {
        return Err("ベータの取得に失敗しました".to_string());
    }
    let releases: Vec<GhRelease> = response
        .json()
        .map_err(|e| format!("ベータの取得に失敗しました: {}", e))?;
    let tags = releases
        .into_iter()
        .map(|release| release.tag_name)
        .filter(|tag| is_beta_tag(tag) && !is_updater_tag(tag))
        .collect();
    Ok(tags)
}

fn installer_suffix() -> Result<&'static str, String> {
    if cfg!(target_os = "windows") {
        Ok("_x64-setup.exe")
    } else if cfg!(target_os = "linux") {
        Ok("_amd64.deb")
    } else {
        Err("この OS のベータはありません".to_string())
    }
}

fn asset_name_matches_installer(name: &str, suffix: &str) -> bool {
    name.ends_with(suffix)
        && !name.contains("latest")
        && !name.ends_with(".sig")
        && name != "SHA256SUMS"
}

fn is_allowed_download_url(url: &str) -> bool {
    const ALLOWED_PREFIXES: &[&str] = &[
        "https://github.com/",
        "https://objects.githubusercontent.com/",
        "https://release-assets.githubusercontent.com/",
    ];
    ALLOWED_PREFIXES.iter().any(|prefix| url.starts_with(prefix))
}

fn find_installer_asset(releases: &[GhRelease], version: &str) -> Result<GhAsset, String> {
    let tag = format!("v{}", version);
    let suffix = installer_suffix()?;
    let release = releases
        .iter()
        .find(|item| item.tag_name == tag)
        .ok_or_else(|| "公開中のベータはありません".to_string())?;
    let asset = release
        .assets
        .iter()
        .find(|asset| asset_name_matches_installer(&asset.name, suffix))
        .ok_or_else(|| "この OS のベータはありません".to_string())?;
    if !is_allowed_download_url(&asset.browser_download_url) {
        return Err("ベータの取得に失敗しました".to_string());
    }
    Ok(GhAsset {
        name: asset.name.clone(),
        browser_download_url: asset.browser_download_url.clone(),
    })
}

fn fetch_releases() -> Result<Vec<GhRelease>, String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .map_err(|e| format!("ベータの取得に失敗しました: {}", e))?;
    let response = client
        .get(GITHUB_RELEASES_URL)
        .send()
        .map_err(|e| format!("ベータの取得に失敗しました: {}", e))?;
    if !response.status().is_success() {
        return Err("ベータの取得に失敗しました".to_string());
    }
    response
        .json()
        .map_err(|e| format!("ベータの取得に失敗しました: {}", e))
}

pub fn download_beta_installer_to_path(
    version: &str,
    target_path: &PathBuf,
) -> Result<(), String> {
    let releases = fetch_releases()?;
    let asset = find_installer_asset(&releases, version)?;
    let client = reqwest::blocking::Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .map_err(|e| format!("ベータの取得に失敗しました: {}", e))?;
    let response = client
        .get(&asset.browser_download_url)
        .send()
        .map_err(|e| format!("ベータの取得に失敗しました: {}", e))?;
    if !response.status().is_success() {
        return Err("ベータの取得に失敗しました".to_string());
    }
    let mut reader = response;
    let mut bytes = Vec::new();
    let mut chunk = [0u8; 8192];
    let mut total = 0usize;
    while let Ok(n) = reader.read(&mut chunk) {
        if n == 0 {
            break;
        }
        total += n;
        if total > MAX_INSTALLER_BYTES {
            return Err("ベータの取得に失敗しました".to_string());
        }
        bytes.extend_from_slice(&chunk[..n]);
    }
    fs::write(target_path, bytes).map_err(|e| format!("ベータの取得に失敗しました: {}", e))?;
    Ok(())
}

pub fn default_installer_file_name(version: &str) -> Result<String, String> {
    installer_suffix()?;
    if cfg!(target_os = "windows") {
        Ok(format!("schedule-viewer_{}_x64-setup.exe", version))
    } else {
        Ok(format!("schedule-viewer_{}_amd64.deb", version))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn asset_name_matches_platform_installer() {
        assert!(asset_name_matches_installer(
            "schedule-viewer_1.0.1-beta.1_x64-setup.exe",
            "_x64-setup.exe",
        ));
        assert!(asset_name_matches_installer(
            "schedule-viewer_1.0.1-beta.1_amd64.deb",
            "_amd64.deb",
        ));
        assert!(!asset_name_matches_installer("latest.json", "_x64-setup.exe"));
        assert!(!asset_name_matches_installer(
            "schedule-viewer_1.0.1-beta.1_x64-setup.exe.sig",
            "_x64-setup.exe",
        ));
        assert!(!asset_name_matches_installer("SHA256SUMS", "_amd64.deb"));
    }

    #[test]
    fn allows_github_asset_hosts_only() {
        assert!(is_allowed_download_url(
            "https://github.com/shkobayashi/schedule-viewer/releases/download/v1.0.0/foo.exe",
        ));
        assert!(is_allowed_download_url(
            "https://objects.githubusercontent.com/github-production-release-asset-2e65be/1/2",
        ));
        assert!(!is_allowed_download_url("http://github.com/foo"));
        assert!(!is_allowed_download_url("https://evil.example/foo"));
    }
}
