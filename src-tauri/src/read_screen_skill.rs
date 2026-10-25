use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

use crate::json_skills::{
    ensure_skill_parents, existing_skill_paths, parse_tool_selection, place_staged_skill,
    remove_at_path, JsonSkillToolSelection,
};
use crate::store_distribution::{STORE_EXECUTABLE_ALIAS, mcp_executable_command_path};

pub const READ_SCREEN_SKILL_NAME: &str = "read-screen";
pub const EXECUTABLE_PLACEHOLDER: &str = "{{SCHEDULE_VIEWER_EXECUTABLE}}";
pub const INVOCATION_PLACEHOLDER: &str = "{{SCHEDULE_VIEWER_INVOCATION}}";
const RESOURCE_TEMPLATE_DIR: &str = "read-screen";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallReadScreenSkillParams {
    pub cursor: bool,
    pub claude: bool,
    pub copilot: bool,
    pub replace: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallReadScreenSkillResult {
    pub installed_paths: Vec<String>,
    pub existing_paths: Vec<String>,
    pub executable_path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UninstallReadScreenSkillParams {
    pub cursor: bool,
    pub claude: bool,
    pub copilot: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UninstallReadScreenSkillResult {
    pub removed_paths: Vec<String>,
    pub missing_paths: Vec<String>,
}

pub fn read_screen_destinations(home: &Path, tools: JsonSkillToolSelection) -> Vec<PathBuf> {
    let mut out = Vec::new();
    if tools.cursor {
        out.push(
            home.join(".cursor")
                .join("skills")
                .join(READ_SCREEN_SKILL_NAME),
        );
    }
    if tools.claude {
        out.push(
            home.join(".claude")
                .join("skills")
                .join(READ_SCREEN_SKILL_NAME),
        );
    }
    if tools.copilot {
        out.push(
            home.join(".copilot")
                .join("skills")
                .join(READ_SCREEN_SKILL_NAME),
        );
    }
    out
}

fn bundled_template_path(resource_dir: &Path) -> PathBuf {
    resource_dir.join(RESOURCE_TEMPLATE_DIR).join("SKILL.md")
}

fn normalize_path_slashes(path: &str) -> String {
    path.replace('\\', "/")
}

fn trim_trailing_slashes(path: &str) -> &str {
    path.trim_end_matches('/')
}

/// Local AppData 配下なら `"$LOCALAPPDATA/相対パス"` を返す。それ以外は None。
pub fn read_screen_local_app_data_token(
    executable_path: &str,
    local_app_data: Option<&str>,
) -> Option<String> {
    let prefix_raw = local_app_data?;
    let exe = normalize_path_slashes(executable_path);
    let prefix_owned = normalize_path_slashes(prefix_raw);
    let prefix = trim_trailing_slashes(&prefix_owned);
    if prefix.is_empty() {
        return None;
    }
    let exe_lower = exe.to_ascii_lowercase();
    let prefix_lower = prefix.to_ascii_lowercase();
    if !exe_lower.starts_with(&prefix_lower) {
        return None;
    }
    let after = &exe_lower[prefix_lower.len()..];
    if !after.starts_with('/') {
        return None;
    }
    let relative = &exe[prefix.len() + 1..];
    if relative.is_empty() {
        return None;
    }
    Some(format!("\"$LOCALAPPDATA/{relative}\""))
}

pub fn read_screen_invocation_block(executable_path: &str, local_app_data: Option<&str>) -> String {
    if executable_path.eq_ignore_ascii_case(STORE_EXECUTABLE_ALIAS) {
        return format!(
            "次の1行を実行します。\n\n```\n{executable_path} --screen schedule_diff\n```\n\n読み取りのツール名は `open_windows`、`schedule_diff`、`baseline_diffs`、`selected_task`、`selected_tasks`、`filtered_tasks` に置き換えます。背面のウィンドウを読むときは、先に `--screen open_windows` で一覧を取り、当たった `label` を `--screen <読み取り> --window <label>` に付けます（同じ1行のうしろに `--window` とラベルを足します）。`replace_schedule` は標準入力にスケジュール JSON 全体を渡し、前面ウィンドウだけを置き換えます。`replace_schedule` と `open_windows` に `--window` は付けません。\n"
        );
    }
    if let Some(token) = read_screen_local_app_data_token(executable_path, local_app_data) {
        format!(
            "次の1行を、`$LOCALAPPDATA` を展開せずに実行します。\n\n```\n{token} --screen schedule_diff\n```\n\n読み取りのツール名は `open_windows`、`schedule_diff`、`baseline_diffs`、`selected_task`、`selected_tasks`、`filtered_tasks` に置き換えます。背面のウィンドウを読むときは、先に `--screen open_windows` で一覧を取り、当たった `label` を `--screen <読み取り> --window <label>` に付けます（同じ1行のうしろに `--window` とラベルを足します）。`replace_schedule` は標準入力にスケジュール JSON 全体を渡し、前面ウィンドウだけを置き換えます。`replace_schedule` と `open_windows` に `--window` は付けません。\n"
        )
    } else {
        format!(
            "次の実行ファイルを起動します。\n\n実行ファイル:\n\n{executable_path}\n\n例（差分だけ欲しいとき。1行目が実行ファイル、2行目が引数です）:\n\n```\n{executable_path}\n--screen schedule_diff\n```\n\n背面のウィンドウを読むときは、先に `--screen open_windows` を実行し、当たった `label` を次のように渡します（3行目と4行目です）。\n\n```\n{executable_path}\n--screen selected_task\n--window schedule-2\n```\n\n読み取りのツール名は `open_windows`、`schedule_diff`、`baseline_diffs`、`selected_task`、`selected_tasks`、`filtered_tasks` に置き換えます。`replace_schedule` は標準入力にスケジュール JSON 全体を渡し、前面ウィンドウだけを置き換えます。\n"
        )
    }
}

pub fn render_read_screen_skill(
    template: &str,
    executable_path: &str,
    local_app_data: Option<&str>,
) -> Result<String, String> {
    if executable_path.is_empty() {
        return Err("実行ファイルの場所を取得できません。".to_string());
    }
    let token = read_screen_local_app_data_token(executable_path, local_app_data)
        .unwrap_or_else(|| executable_path.to_string());
    if token.contains(EXECUTABLE_PLACEHOLDER) || token.contains(INVOCATION_PLACEHOLDER) {
        return Err("スキル本文を書き込めません。".to_string());
    }
    let invocation = read_screen_invocation_block(executable_path, local_app_data);
    if invocation.contains(EXECUTABLE_PLACEHOLDER) || invocation.contains(INVOCATION_PLACEHOLDER) {
        return Err("スキル本文を書き込めません。".to_string());
    }
    let rendered = template
        .replace(INVOCATION_PLACEHOLDER, &invocation)
        .replace(EXECUTABLE_PLACEHOLDER, &token);
    if rendered.contains(INVOCATION_PLACEHOLDER) || rendered.contains(EXECUTABLE_PLACEHOLDER) {
        return Err("スキル本文を書き込めません。".to_string());
    }
    Ok(rendered)
}

pub fn install_read_screen_skill_to_disk(
    resource_dir: &Path,
    home: &Path,
    tools: JsonSkillToolSelection,
    executable_path: &str,
    local_app_data: Option<&str>,
    replace: bool,
) -> Result<InstallReadScreenSkillResult, String> {
    let template_path = bundled_template_path(resource_dir);
    let template = fs::read_to_string(&template_path)
        .map_err(|_| "同梱スキルが見つかりません。".to_string())?;
    let rendered = render_read_screen_skill(&template, executable_path, local_app_data)?;

    let destinations = read_screen_destinations(home, tools);
    let existing_paths = existing_skill_paths(&destinations);
    if !replace && !existing_paths.is_empty() {
        return Ok(InstallReadScreenSkillResult {
            installed_paths: Vec::new(),
            existing_paths,
            executable_path: executable_path.to_string(),
        });
    }

    let staged = tempfile::tempdir().map_err(|e| format!("スキルを置けません: {e}"))?;
    fs::write(staged.path().join("SKILL.md"), rendered.as_bytes())
        .map_err(|e| format!("スキルを置けません: {e}"))?;

    let mut installed_paths = Vec::new();
    for dest in destinations {
        place_staged_skill(staged.path(), &dest, false)?;
        installed_paths.push(dest.to_string_lossy().into_owned());
    }

    Ok(InstallReadScreenSkillResult {
        installed_paths,
        existing_paths: Vec::new(),
        executable_path: executable_path.to_string(),
    })
}

pub fn uninstall_read_screen_skill_from_disk(
    home: &Path,
    tools: JsonSkillToolSelection,
) -> Result<UninstallReadScreenSkillResult, String> {
    let destinations = read_screen_destinations(home, tools);
    for dest in &destinations {
        ensure_skill_parents(dest, false, true, false)?;
    }
    let mut removed_paths = Vec::new();
    let mut missing_paths = Vec::new();
    for dest in destinations {
        ensure_skill_parents(&dest, false, true, false)?;
        match fs::symlink_metadata(&dest) {
            Ok(_) => {
                remove_at_path(&dest, "スキルを外せません")?;
                removed_paths.push(dest.to_string_lossy().into_owned());
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                missing_paths.push(dest.to_string_lossy().into_owned());
            }
            Err(error) => return Err(format!("スキルを外せません: {error}")),
        }
    }
    Ok(UninstallReadScreenSkillResult {
        removed_paths,
        missing_paths,
    })
}

#[tauri::command]
pub fn install_read_screen_skill(
    app: tauri::AppHandle,
    params: InstallReadScreenSkillParams,
) -> Result<InstallReadScreenSkillResult, String> {
    let tools = parse_tool_selection(params.cursor, params.claude, params.copilot)?;
    let home = app
        .path()
        .home_dir()
        .map_err(|_| "ホームディレクトリが見つかりません。".to_string())?;
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|_| "同梱スキルが見つかりません。".to_string())?;
    let executable_path = mcp_executable_command_path()?;
    let local_app_data = if executable_path.eq_ignore_ascii_case(STORE_EXECUTABLE_ALIAS) {
        None
    } else {
        local_app_data_prefix()
    };

    install_read_screen_skill_to_disk(
        &resource_dir,
        &home,
        tools,
        &executable_path,
        local_app_data.as_deref(),
        params.replace,
    )
}

fn local_app_data_prefix() -> Option<String> {
    #[cfg(windows)]
    {
        std::env::var("LOCALAPPDATA").ok()
    }
    #[cfg(not(windows))]
    {
        None
    }
}

#[tauri::command]
pub fn uninstall_read_screen_skill(
    app: tauri::AppHandle,
    params: UninstallReadScreenSkillParams,
) -> Result<UninstallReadScreenSkillResult, String> {
    let tools = parse_tool_selection(params.cursor, params.claude, params.copilot)?;
    let home = app
        .path()
        .home_dir()
        .map_err(|_| "ホームディレクトリが見つかりません。".to_string())?;
    uninstall_read_screen_skill_from_disk(&home, tools)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn store_alias_invocation_is_one_line() {
        let block = read_screen_invocation_block("schedule-viewer.exe", None);
        assert!(block.contains("schedule-viewer.exe --screen schedule_diff"));
        assert!(!block.contains("$LOCALAPPDATA"));
    }

    #[test]
    fn render_replaces_executable_placeholder() {
        let template = "exe:\n{{SCHEDULE_VIEWER_EXECUTABLE}}\n";
        let out = render_read_screen_skill(template, "/app/bin", None).unwrap();
        assert_eq!(out, "exe:\n/app/bin\n");
        assert!(!out.contains(EXECUTABLE_PLACEHOLDER));
    }

    #[test]
    fn render_fails_when_executable_path_is_empty() {
        let template = "{{SCHEDULE_VIEWER_EXECUTABLE}}";
        assert!(render_read_screen_skill(template, "", None).is_err());
    }

    #[test]
    fn render_fails_when_placeholder_remains_after_replace() {
        let template = "path: {{SCHEDULE_VIEWER_EXECUTABLE}}";
        let executable_path = "/bin/{{SCHEDULE_VIEWER_EXECUTABLE}}";
        assert!(render_read_screen_skill(template, executable_path, None).is_err());
    }

    #[test]
    fn render_uses_localappdata_command_when_path_is_under_it() {
        let template = "body\n{{SCHEDULE_VIEWER_INVOCATION}}\n";
        let executable_path = r"C:\Users\me\AppData\Local\schedule-viewer\schedule-viewer.exe";
        let local_app_data = r"C:\Users\me\AppData\Local";
        let out =
            render_read_screen_skill(template, executable_path, Some(local_app_data)).unwrap();
        assert!(out.contains(
            "\"$LOCALAPPDATA/schedule-viewer/schedule-viewer.exe\" --screen schedule_diff"
        ));
        assert!(!out.contains("AppData"));
        assert!(!out.contains(executable_path));

        let forward = render_read_screen_skill(
            template,
            "C:/Users/me/AppData/Local/schedule-viewer/schedule-viewer.exe",
            Some("C:/Users/me/AppData/Local/"),
        )
        .unwrap();
        assert!(forward.contains(
            "\"$LOCALAPPDATA/schedule-viewer/schedule-viewer.exe\" --screen schedule_diff"
        ));

        let different_case = render_read_screen_skill(
            template,
            r"c:\users\me\appdata\local\schedule-viewer\schedule-viewer.exe",
            Some(r"C:\Users\me\AppData\Local"),
        )
        .unwrap();
        assert!(different_case.contains(
            "\"$LOCALAPPDATA/schedule-viewer/schedule-viewer.exe\" --screen schedule_diff"
        ));

        let not_prefix = render_read_screen_skill(
            template,
            r"C:\Users\me\AppData\LocalExtra\schedule-viewer.exe",
            Some(local_app_data),
        )
        .unwrap();
        assert!(not_prefix.contains(r"C:\Users\me\AppData\LocalExtra\schedule-viewer.exe"));
        assert!(!not_prefix.contains("$LOCALAPPDATA"));
    }

    #[test]
    fn render_keeps_absolute_path_on_separate_lines_outside_localappdata() {
        let template = "{{SCHEDULE_VIEWER_INVOCATION}}";
        let executable_path = "/Applications/schedule-viewer.app/Contents/MacOS/schedule-viewer";
        let out = render_read_screen_skill(
            template,
            executable_path,
            Some(r"C:\Users\me\AppData\Local"),
        )
        .unwrap();
        let fence = format!("{executable_path}\n--screen schedule_diff");
        assert!(out.contains(&fence));
        assert!(!out.contains(&format!("\"{executable_path}\"")));
        assert!(!out.contains("$LOCALAPPDATA"));
    }

    #[test]
    fn destinations_are_user_skill_dirs_only() {
        let home = PathBuf::from("/home/me");
        let cursor_claude = read_screen_destinations(
            home.as_path(),
            JsonSkillToolSelection {
                cursor: true,
                claude: true,
                copilot: false,
            },
        );
        assert_eq!(cursor_claude.len(), 2);
        assert!(cursor_claude[0].ends_with(".cursor/skills/read-screen"));
        assert!(cursor_claude[1].ends_with(".claude/skills/read-screen"));

        let copilot_only = read_screen_destinations(
            home.as_path(),
            JsonSkillToolSelection {
                cursor: false,
                claude: false,
                copilot: true,
            },
        );
        assert_eq!(copilot_only.len(), 1);
        assert!(copilot_only[0].ends_with(".copilot/skills/read-screen"));
        assert!(!copilot_only[0].to_string_lossy().contains(".github"));

        let all = read_screen_destinations(
            home.as_path(),
            JsonSkillToolSelection {
                cursor: true,
                claude: true,
                copilot: true,
            },
        );
        assert_eq!(all.len(), 3);
        assert!(all[0].ends_with(".cursor/skills/read-screen"));
        assert!(all[1].ends_with(".claude/skills/read-screen"));
        assert!(all[2].ends_with(".copilot/skills/read-screen"));
    }

    #[test]
    fn parse_tool_selection_requires_at_least_one_for_read_screen() {
        let err = parse_tool_selection(false, false, false)
            .err()
            .expect("error");
        assert!(err.contains("ツールを1つ以上"));
    }

    #[test]
    fn install_without_replace_leaves_existing() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        let resource = dir.path().join("resources");
        fs::create_dir_all(
            home.join(".cursor")
                .join("skills")
                .join(READ_SCREEN_SKILL_NAME),
        )
        .expect("mkdir");
        fs::create_dir_all(resource.join(RESOURCE_TEMPLATE_DIR)).expect("mkdir resource");
        fs::write(
            resource.join(RESOURCE_TEMPLATE_DIR).join("SKILL.md"),
            "exe: {{SCHEDULE_VIEWER_EXECUTABLE}}",
        )
        .expect("write");

        let result = install_read_screen_skill_to_disk(
            &resource,
            &home,
            JsonSkillToolSelection {
                cursor: true,
                claude: false,
                copilot: false,
            },
            "/bin/schedule-viewer",
            None,
            false,
        )
        .expect("install");
        assert!(result.existing_paths.len() == 1);
        assert!(result.installed_paths.is_empty());
    }

    #[test]
    fn install_writes_copilot_skill_with_same_invocation_rules() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        fs::create_dir_all(&home).expect("home");
        let resource = dir.path().join("resources");
        fs::create_dir_all(resource.join(RESOURCE_TEMPLATE_DIR)).expect("mkdir resource");
        fs::write(
            resource.join(RESOURCE_TEMPLATE_DIR).join("SKILL.md"),
            "inv:\n{{SCHEDULE_VIEWER_INVOCATION}}\n",
        )
        .expect("write");

        let result = install_read_screen_skill_to_disk(
            &resource,
            &home,
            JsonSkillToolSelection {
                cursor: false,
                claude: false,
                copilot: true,
            },
            "/Applications/schedule-viewer.app/Contents/MacOS/schedule-viewer",
            None,
            false,
        )
        .expect("install");
        assert_eq!(result.installed_paths.len(), 1);
        let skill_md = home
            .join(".copilot")
            .join("skills")
            .join(READ_SCREEN_SKILL_NAME)
            .join("SKILL.md");
        let body = fs::read_to_string(skill_md).expect("read");
        let executable_path =
            "/Applications/schedule-viewer.app/Contents/MacOS/schedule-viewer";
        let fence = format!("{executable_path}\n--screen schedule_diff");
        assert!(body.contains(&fence));
        assert!(!body.contains(&format!("\"{executable_path}\"")));
    }

    #[test]
    fn install_writes_copilot_skill_with_localappdata_one_line() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        fs::create_dir_all(&home).expect("home");
        let resource = dir.path().join("resources");
        fs::create_dir_all(resource.join(RESOURCE_TEMPLATE_DIR)).expect("mkdir resource");
        fs::write(
            resource.join(RESOURCE_TEMPLATE_DIR).join("SKILL.md"),
            "inv:\n{{SCHEDULE_VIEWER_INVOCATION}}\n",
        )
        .expect("write");
        let executable_path = r"C:\Users\me\AppData\Local\schedule-viewer\schedule-viewer.exe";
        let local_app_data = r"C:\Users\me\AppData\Local";

        install_read_screen_skill_to_disk(
            &resource,
            &home,
            JsonSkillToolSelection {
                cursor: false,
                claude: false,
                copilot: true,
            },
            executable_path,
            Some(local_app_data),
            false,
        )
        .expect("install");

        let body = fs::read_to_string(
            home.join(".copilot")
                .join("skills")
                .join(READ_SCREEN_SKILL_NAME)
                .join("SKILL.md"),
        )
        .expect("read");
        assert!(body.contains(
            "\"$LOCALAPPDATA/schedule-viewer/schedule-viewer.exe\" --screen schedule_diff"
        ));
        assert!(!body.contains("AppData"));
        assert!(!body.contains(executable_path));
    }

    #[test]
    fn install_does_not_write_through_tool_dir_symlink() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        let resource = dir.path().join("resources");
        fs::create_dir_all(resource.join(RESOURCE_TEMPLATE_DIR)).expect("mkdir resource");
        fs::write(
            resource.join(RESOURCE_TEMPLATE_DIR).join("SKILL.md"),
            "{{SCHEDULE_VIEWER_EXECUTABLE}}",
        )
        .expect("write");
        fs::create_dir_all(home.join("real")).expect("mkdir");
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink("real", home.join(".cursor")).expect("symlink");
            let result = install_read_screen_skill_to_disk(
                &resource,
                &home,
                JsonSkillToolSelection {
                    cursor: true,
                    claude: false,
                    copilot: false,
                },
                "/bin/schedule-viewer",
                None,
                true,
            );
            assert!(result.is_err());
            assert!(result
                .err()
                .expect("error message")
                .contains("シンボリックリンク"));
        }
    }

    #[cfg(unix)]
    fn write_minimal_read_screen_template(resource: &Path) {
        fs::create_dir_all(resource.join(RESOURCE_TEMPLATE_DIR)).expect("mkdir resource");
        fs::write(
            resource.join(RESOURCE_TEMPLATE_DIR).join("SKILL.md"),
            "{{SCHEDULE_VIEWER_EXECUTABLE}}",
        )
        .expect("write");
    }

    #[test]
    #[cfg(unix)]
    fn install_and_uninstall_skip_copilot_when_dot_copilot_is_symlink() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        let outside = dir.path().join("outside");
        let skill = outside
            .join("skills")
            .join(READ_SCREEN_SKILL_NAME);
        fs::create_dir_all(&skill).expect("skill");
        fs::write(skill.join("SKILL.md"), "keep").expect("write");
        fs::create_dir_all(&home).expect("home");
        std::os::unix::fs::symlink(&outside, home.join(".copilot")).expect("symlink");
        let resource = dir.path().join("resources");
        write_minimal_read_screen_template(&resource);
        let tools = JsonSkillToolSelection {
            cursor: false,
            claude: false,
            copilot: true,
        };

        let install_err = install_read_screen_skill_to_disk(
            &resource,
            &home,
            tools,
            "/bin/schedule-viewer",
            None,
            true,
        )
        .err()
        .expect("install fails");
        assert!(install_err.contains("シンボリックリンク"), "{install_err}");
        assert_eq!(fs::read_to_string(skill.join("SKILL.md")).unwrap(), "keep");

        let uninstall_err =
            uninstall_read_screen_skill_from_disk(&home, tools).err().expect("uninstall fails");
        assert!(uninstall_err.contains("シンボリックリンク"), "{uninstall_err}");
        assert_eq!(fs::read_to_string(skill.join("SKILL.md")).unwrap(), "keep");
    }

    #[test]
    #[cfg(unix)]
    fn install_and_uninstall_skip_copilot_when_skills_under_copilot_is_symlink() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        let outside = dir.path().join("outside");
        let skill = outside.join(READ_SCREEN_SKILL_NAME);
        fs::create_dir_all(&skill).expect("skill");
        fs::write(skill.join("SKILL.md"), "keep").expect("write");
        fs::create_dir_all(home.join(".copilot")).expect("copilot");
        std::os::unix::fs::symlink(&outside, home.join(".copilot").join("skills")).expect("symlink");
        let resource = dir.path().join("resources");
        write_minimal_read_screen_template(&resource);
        let tools = JsonSkillToolSelection {
            cursor: false,
            claude: false,
            copilot: true,
        };

        let install_err = install_read_screen_skill_to_disk(
            &resource,
            &home,
            tools,
            "/bin/schedule-viewer",
            None,
            true,
        )
        .err()
        .expect("install fails");
        assert!(install_err.contains("シンボリックリンク"), "{install_err}");
        assert_eq!(fs::read_to_string(skill.join("SKILL.md")).unwrap(), "keep");

        let uninstall_err =
            uninstall_read_screen_skill_from_disk(&home, tools).err().expect("uninstall fails");
        assert!(uninstall_err.contains("シンボリックリンク"), "{uninstall_err}");
        assert_eq!(fs::read_to_string(skill.join("SKILL.md")).unwrap(), "keep");
    }

    #[test]
    #[cfg(unix)]
    fn uninstall_with_symlink_copilot_does_not_remove_cursor_read_screen() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        let outside = dir.path().join("outside");
        fs::create_dir_all(&home).expect("home");
        fs::create_dir_all(outside.join("skills")).expect("outside");
        std::os::unix::fs::symlink(&outside, home.join(".copilot")).expect("symlink");
        let resource = dir.path().join("resources");
        write_minimal_read_screen_template(&resource);

        install_read_screen_skill_to_disk(
            &resource,
            &home,
            JsonSkillToolSelection {
                cursor: true,
                claude: false,
                copilot: false,
            },
            "/bin/schedule-viewer",
            None,
            false,
        )
        .expect("install cursor");

        let cursor_skill = home
            .join(".cursor")
            .join("skills")
            .join(READ_SCREEN_SKILL_NAME)
            .join("SKILL.md");
        assert!(cursor_skill.is_file());

        let uninstall_err = uninstall_read_screen_skill_from_disk(
            &home,
            JsonSkillToolSelection {
                cursor: true,
                claude: false,
                copilot: true,
            },
        )
        .err()
        .expect("uninstall fails on copilot symlink");
        assert!(uninstall_err.contains("シンボリックリンク"), "{uninstall_err}");
        assert!(cursor_skill.is_file());
    }
}
