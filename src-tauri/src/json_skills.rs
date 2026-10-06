use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

pub const JSON_SKILL_NAMES: [&str; 3] = ["write-schedule", "write-members", "write-calendar"];

const RESOURCE_SKILLS_DIR: &str = "json-skills";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonSkillHomeDirsResult {
    pub cursor: bool,
    pub claude: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallJsonSkillsParams {
    pub tools: String,
    pub scope: String,
    pub project_folder: Option<String>,
    pub replace: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallJsonSkillsResult {
    pub installed_paths: Vec<String>,
    pub existing_paths: Vec<String>,
    pub claude_user_shadows: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UninstallJsonSkillsParams {
    pub tools: String,
    pub scope: String,
    pub project_folder: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UninstallJsonSkillsResult {
    pub removed_paths: Vec<String>,
    pub missing_paths: Vec<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum JsonSkillTool {
    Cursor,
    Claude,
    Both,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum JsonSkillScope {
    User,
    Project,
}

pub fn parse_tools(raw: &str) -> Result<JsonSkillTool, String> {
    match raw {
        "cursor" => Ok(JsonSkillTool::Cursor),
        "claude" => Ok(JsonSkillTool::Claude),
        "both" => Ok(JsonSkillTool::Both),
        _ => Err("ツールの指定が不正です。".to_string()),
    }
}

pub fn parse_scope(raw: &str) -> Result<JsonSkillScope, String> {
    match raw {
        "user" => Ok(JsonSkillScope::User),
        "project" => Ok(JsonSkillScope::Project),
        _ => Err("範囲の指定が不正です。".to_string()),
    }
}

pub fn validate_project_folder(path: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(path);
    if !candidate.is_absolute() {
        return Err("絶対パスでないフォルダは指定できません。".to_string());
    }
    let meta =
        fs::symlink_metadata(&candidate).map_err(|_| "フォルダが見つかりません。".to_string())?;
    if meta.file_type().is_symlink() {
        return Err("シンボリックリンクのフォルダは指定できません。".to_string());
    }
    if !meta.is_dir() {
        return Err("フォルダ以外は指定できません。".to_string());
    }
    Ok(candidate)
}

pub fn skill_destinations(
    home: &Path,
    tools: JsonSkillTool,
    scope: JsonSkillScope,
    project_folder: Option<&Path>,
) -> Result<Vec<PathBuf>, String> {
    let mut bases: Vec<PathBuf> = Vec::new();
    match scope {
        JsonSkillScope::User => {
            if matches!(tools, JsonSkillTool::Cursor | JsonSkillTool::Both) {
                bases.push(home.join(".cursor").join("skills"));
            }
            if matches!(tools, JsonSkillTool::Claude | JsonSkillTool::Both) {
                bases.push(home.join(".claude").join("skills"));
            }
        }
        JsonSkillScope::Project => {
            let project = project_folder
                .ok_or_else(|| "プロジェクトのフォルダを選んでください。".to_string())?;
            if matches!(tools, JsonSkillTool::Cursor | JsonSkillTool::Both) {
                bases.push(project.join(".cursor").join("skills"));
            }
            if matches!(tools, JsonSkillTool::Claude | JsonSkillTool::Both) {
                bases.push(project.join(".claude").join("skills"));
            }
        }
    }

    let mut out = Vec::new();
    for base in bases {
        for name in JSON_SKILL_NAMES {
            let dest = base.join(name);
            if !is_skill_destination_allowed(&dest, &base, name) {
                return Err("置き先のパスが不正です。".to_string());
            }
            out.push(dest);
        }
    }
    Ok(out)
}

pub fn is_skill_destination_allowed(dest: &Path, skills_base: &Path, skill_name: &str) -> bool {
    if !JSON_SKILL_NAMES.contains(&skill_name) {
        return false;
    }
    if dest.parent() != Some(skills_base) {
        return false;
    }
    dest.components()
        .all(|c| !matches!(c, Component::ParentDir))
}

pub fn existing_skill_paths(paths: &[PathBuf]) -> Vec<String> {
    paths
        .iter()
        .filter(|path| fs::symlink_metadata(path).is_ok())
        .map(|path| path.to_string_lossy().into_owned())
        .collect()
}

pub fn claude_user_shadow_paths(
    home: &Path,
    scope: JsonSkillScope,
    tools: JsonSkillTool,
) -> Vec<String> {
    if scope != JsonSkillScope::Project {
        return Vec::new();
    }
    if !matches!(tools, JsonSkillTool::Claude | JsonSkillTool::Both) {
        return Vec::new();
    }
    let base = home.join(".claude").join("skills");
    JSON_SKILL_NAMES
        .iter()
        .map(|name| base.join(name))
        .filter(|path| path.exists())
        .map(|path| path.to_string_lossy().into_owned())
        .collect()
}

fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("スキルを置けません: {}", e))?;
    for entry in fs::read_dir(src).map_err(|e| format!("スキルを置けません: {}", e))? {
        let entry = entry.map_err(|e| format!("スキルを置けません: {}", e))?;
        let file_type = entry
            .file_type()
            .map_err(|e| format!("スキルを置けません: {}", e))?;
        let target = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_all(&entry.path(), &target)?;
        } else if file_type.is_symlink() {
            return Err("同梱スキルにシンボリックリンクは含められません。".to_string());
        } else {
            fs::copy(entry.path(), &target).map_err(|e| format!("スキルを置けません: {}", e))?;
        }
    }
    Ok(())
}

fn with_partial(error: String, prior_done: bool, note: &str) -> String {
    if prior_done {
        format!("{error}。{note}")
    } else {
        error
    }
}

fn action_label(removing: bool) -> &'static str {
    if removing {
        "スキルを外せません"
    } else {
        "スキルを置けません"
    }
}

fn symlink_refusal(path: &Path, removing: bool) -> String {
    if removing {
        format!("シンボリックリンクの先は外せません: {}", path.display())
    } else {
        format!("シンボリックリンクの先には置けません: {}", path.display())
    }
}

fn ensure_real_dir(path: &Path, create: bool, removing: bool) -> Result<(), String> {
    let label = action_label(removing);
    let inspect = |meta: fs::Metadata| -> Result<(), String> {
        if meta.file_type().is_symlink() {
            return Err(symlink_refusal(path, removing));
        }
        if meta.is_dir() {
            return Ok(());
        }
        Err("置き先のパスが不正です。".to_string())
    };
    match fs::symlink_metadata(path) {
        Ok(meta) => inspect(meta),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            if !create {
                return Ok(());
            }
            match fs::create_dir(path) {
                Ok(()) => {}
                Err(create_error) if create_error.kind() == std::io::ErrorKind::AlreadyExists => {}
                Err(create_error) => {
                    return Err(format!("{label}: {create_error}"));
                }
            }
            let meta = fs::symlink_metadata(path).map_err(|error| format!("{label}: {error}"))?;
            inspect(meta)
        }
        Err(error) => Err(format!("{label}: {error}")),
    }
}

fn ensure_skill_parents(
    dest: &Path,
    create: bool,
    removing: bool,
    allow_symlink_anchor: bool,
) -> Result<(), String> {
    let skills = dest
        .parent()
        .ok_or_else(|| "置き先のパスが不正です。".to_string())?;
    let tool_dir = skills
        .parent()
        .ok_or_else(|| "置き先のパスが不正です。".to_string())?;
    let anchor = tool_dir
        .parent()
        .ok_or_else(|| "置き先のパスが不正です。".to_string())?;
    if allow_symlink_anchor {
        if !anchor.is_dir() {
            return Err("置き先のパスが不正です。".to_string());
        }
    } else {
        ensure_real_dir(anchor, false, removing)?;
    }
    ensure_real_dir(tool_dir, create, removing)?;
    ensure_real_dir(skills, create, removing)?;
    Ok(())
}

fn remove_at_path(path: &Path, action: &str) -> Result<(), String> {
    let meta = fs::symlink_metadata(path).map_err(|e| format!("{action}: {e}"))?;
    if meta.file_type().is_symlink() {
        fs::remove_file(path).map_err(|e| format!("{action}: {e}"))?;
        return Ok(());
    }
    if meta.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("{action}: {e}"))?;
    } else {
        fs::remove_file(path).map_err(|e| format!("{action}: {e}"))?;
    }
    Ok(())
}

fn place_staged_skill(
    staged: &Path,
    dest: &Path,
    allow_symlink_anchor: bool,
) -> Result<(), String> {
    ensure_skill_parents(dest, true, false, allow_symlink_anchor)?;
    let parent = dest
        .parent()
        .ok_or_else(|| "置き先のパスが不正です。".to_string())?;
    let mut backup = if fs::symlink_metadata(dest).is_ok() {
        let dir = tempfile::Builder::new()
            .prefix(".schedule-viewer-skill-bak-")
            .tempdir_in(parent)
            .map_err(|e| format!("スキルを置けません: {e}"))?;
        fs::rename(dest, dir.path().join("original"))
            .map_err(|e| format!("スキルを置けません: {e}"))?;
        Some(dir)
    } else {
        None
    };

    if let Err(error) = copy_dir_all(staged, dest) {
        if fs::symlink_metadata(dest).is_ok() {
            let _ = remove_at_path(dest, "スキルを置けません");
        }
        if let Some(dir) = backup.take() {
            let backup_path = dir.path().join("original");
            if let Err(restore_error) = fs::rename(&backup_path, dest) {
                let kept = dir.keep().join("original");
                return Err(format!(
                    "{error}。元のフォルダは {} に残しています。復元エラー: {restore_error}",
                    kept.display()
                ));
            }
        }
        return Err(error);
    }
    Ok(())
}

fn bundled_skill_dir(resource_dir: &Path, skill_name: &str) -> Result<PathBuf, String> {
    if !JSON_SKILL_NAMES.contains(&skill_name) {
        return Err("同梱スキルが見つかりません。".to_string());
    }
    let path = resource_dir.join(RESOURCE_SKILLS_DIR).join(skill_name);
    if !path.is_dir() {
        return Err("同梱スキルが見つかりません。".to_string());
    }
    Ok(path)
}

pub fn install_json_skills_to_disk(
    resource_dir: &Path,
    home: &Path,
    tools: JsonSkillTool,
    scope: JsonSkillScope,
    project_folder: Option<&Path>,
    replace: bool,
) -> Result<InstallJsonSkillsResult, String> {
    let destinations = skill_destinations(home, tools, scope, project_folder)?;
    let existing_paths = existing_skill_paths(&destinations);
    if !replace && !existing_paths.is_empty() {
        return Ok(InstallJsonSkillsResult {
            installed_paths: Vec::new(),
            existing_paths,
            claude_user_shadows: claude_user_shadow_paths(home, scope, tools),
        });
    }

    let allow_symlink_anchor = scope == JsonSkillScope::User;
    for dest in &destinations {
        let skill_name = dest
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| "置き先のパスが不正です。".to_string())?;
        bundled_skill_dir(resource_dir, skill_name)?;
        ensure_skill_parents(dest, true, false, allow_symlink_anchor)?;
    }

    let mut installed_paths = Vec::new();
    for dest in &destinations {
        let skill_name = dest
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| "置き先のパスが不正です。".to_string())?;
        let source = bundled_skill_dir(resource_dir, skill_name)?;
        let staging = tempfile::tempdir().map_err(|e| format!("スキルを置けません: {e}"))?;
        let staged = staging.path().join(skill_name);
        let note = "先に置けたスキルは、置いたままです。";
        copy_dir_all(&source, &staged)
            .map_err(|error| with_partial(error, !installed_paths.is_empty(), note))?;
        place_staged_skill(&staged, dest, allow_symlink_anchor)
            .map_err(|error| with_partial(error, !installed_paths.is_empty(), note))?;
        installed_paths.push(dest.to_string_lossy().into_owned());
    }

    Ok(InstallJsonSkillsResult {
        installed_paths,
        existing_paths: Vec::new(),
        claude_user_shadows: claude_user_shadow_paths(home, scope, tools),
    })
}

pub fn uninstall_json_skills_from_disk(
    home: &Path,
    tools: JsonSkillTool,
    scope: JsonSkillScope,
    project_folder: Option<&Path>,
) -> Result<UninstallJsonSkillsResult, String> {
    let destinations = skill_destinations(home, tools, scope, project_folder)?;
    let allow_symlink_anchor = scope == JsonSkillScope::User;
    for dest in &destinations {
        ensure_skill_parents(dest, false, true, allow_symlink_anchor)?;
    }
    let mut removed_paths = Vec::new();
    let mut missing_paths = Vec::new();
    for dest in destinations {
        ensure_skill_parents(&dest, false, true, allow_symlink_anchor)?;
        match fs::symlink_metadata(&dest) {
            Ok(_) => {
                let note = "先に外したスキルは、外したままです。";
                remove_at_path(&dest, "スキルを外せません")
                    .map_err(|error| with_partial(error, !removed_paths.is_empty(), note))?;
                removed_paths.push(dest.to_string_lossy().into_owned());
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                missing_paths.push(dest.to_string_lossy().into_owned());
            }
            Err(error) => return Err(format!("スキルを外せません: {error}")),
        }
    }
    Ok(UninstallJsonSkillsResult {
        removed_paths,
        missing_paths,
    })
}

fn resolve_json_skill_params(
    tools: &str,
    scope: &str,
    project_folder: Option<&str>,
) -> Result<(JsonSkillTool, JsonSkillScope, Option<PathBuf>), String> {
    let tools = parse_tools(tools)?;
    let scope = parse_scope(scope)?;
    let project_folder = match scope {
        JsonSkillScope::User => None,
        JsonSkillScope::Project => {
            let folder = project_folder
                .ok_or_else(|| "プロジェクトのフォルダを選んでください。".to_string())?;
            Some(validate_project_folder(folder)?)
        }
    };
    Ok((tools, scope, project_folder))
}

pub fn json_skill_home_dirs_at(home: &Path) -> JsonSkillHomeDirsResult {
    JsonSkillHomeDirsResult {
        cursor: home.join(".cursor").is_dir(),
        claude: home.join(".claude").is_dir(),
    }
}

#[tauri::command]
pub fn json_skill_home_dirs(app: tauri::AppHandle) -> Result<JsonSkillHomeDirsResult, String> {
    let home = app
        .path()
        .home_dir()
        .map_err(|_| "ホームディレクトリが見つかりません。".to_string())?;
    Ok(json_skill_home_dirs_at(&home))
}

#[tauri::command]
pub async fn pick_json_skill_folder(
    window: tauri::Window,
    app: tauri::AppHandle,
) -> Result<Option<String>, String> {
    let picked = app
        .dialog()
        .file()
        .set_parent(&window)
        .blocking_pick_folder();
    match picked {
        Some(file_path) => {
            let path = file_path
                .into_path()
                .map_err(|_| "フォルダが見つかりません。".to_string())?;
            Ok(Some(path.to_string_lossy().into_owned()))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub fn install_json_skills(
    app: tauri::AppHandle,
    params: InstallJsonSkillsParams,
) -> Result<InstallJsonSkillsResult, String> {
    let (tools, scope, project_folder) = resolve_json_skill_params(
        &params.tools,
        &params.scope,
        params.project_folder.as_deref(),
    )?;

    let home = app
        .path()
        .home_dir()
        .map_err(|_| "ホームディレクトリが見つかりません。".to_string())?;
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|_| "同梱スキルが見つかりません。".to_string())?;

    install_json_skills_to_disk(
        &resource_dir,
        &home,
        tools,
        scope,
        project_folder.as_deref(),
        params.replace,
    )
}

#[tauri::command]
pub fn uninstall_json_skills(
    app: tauri::AppHandle,
    params: UninstallJsonSkillsParams,
) -> Result<UninstallJsonSkillsResult, String> {
    let (tools, scope, project_folder) = resolve_json_skill_params(
        &params.tools,
        &params.scope,
        params.project_folder.as_deref(),
    )?;
    let home = app
        .path()
        .home_dir()
        .map_err(|_| "ホームディレクトリが見つかりません。".to_string())?;
    uninstall_json_skills_from_disk(&home, tools, scope, project_folder.as_deref())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_project_folder_rejects_relative_and_symlink() {
        assert!(validate_project_folder("relative/path").is_err());
        let dir = tempfile::tempdir().expect("temp dir");
        let link = dir.path().join("link");
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(dir.path(), &link).expect("symlink");
            assert!(validate_project_folder(link.to_str().unwrap()).is_err());
        }
        assert!(validate_project_folder(dir.path().to_str().unwrap()).is_ok());
    }

    #[test]
    fn skill_destinations_stay_under_allowed_bases() {
        let home = PathBuf::from("/home/me");
        let project = PathBuf::from("/tmp/project");
        let user_cursor =
            skill_destinations(&home, JsonSkillTool::Cursor, JsonSkillScope::User, None).unwrap();
        assert_eq!(user_cursor.len(), 3);
        assert!(user_cursor
            .iter()
            .all(|p| p.starts_with("/home/me/.cursor/skills")));

        let project_both = skill_destinations(
            &home,
            JsonSkillTool::Both,
            JsonSkillScope::Project,
            Some(&project),
        )
        .unwrap();
        assert_eq!(project_both.len(), 6);
    }

    #[test]
    fn install_without_replace_leaves_existing() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        let resource = dir.path().join("resources");
        fs::create_dir_all(home.join(".cursor").join("skills").join("write-schedule"))
            .expect("mkdir");
        fs::create_dir_all(resource.join(RESOURCE_SKILLS_DIR).join("write-schedule"))
            .expect("mkdir resource");
        fs::write(
            resource
                .join(RESOURCE_SKILLS_DIR)
                .join("write-schedule")
                .join("SKILL.md"),
            "test",
        )
        .expect("write");
        for name in JSON_SKILL_NAMES {
            if name == "write-schedule" {
                continue;
            }
            fs::create_dir_all(resource.join(RESOURCE_SKILLS_DIR).join(name)).expect("mkdir");
        }

        let result = install_json_skills_to_disk(
            &resource,
            &home,
            JsonSkillTool::Cursor,
            JsonSkillScope::User,
            None,
            false,
        )
        .expect("install check");
        assert!(!result.existing_paths.is_empty());
        assert!(result.installed_paths.is_empty());
    }

    #[test]
    fn install_replaces_symlink_destination() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        let resource = dir.path().join("resources");
        let real = dir.path().join("real-skill");
        fs::create_dir_all(&real).expect("mkdir real");
        fs::create_dir_all(home.join(".cursor").join("skills")).expect("mkdir skills");
        let dest = home.join(".cursor").join("skills").join("write-schedule");
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&real, &dest).expect("symlink dest");
        }
        #[cfg(not(unix))]
        {
            return;
        }

        for name in JSON_SKILL_NAMES {
            let skill_dir = resource.join(RESOURCE_SKILLS_DIR).join(name);
            fs::create_dir_all(&skill_dir).expect("mkdir skill");
            fs::write(skill_dir.join("SKILL.md"), name).expect("write");
        }

        let result = install_json_skills_to_disk(
            &resource,
            &home,
            JsonSkillTool::Cursor,
            JsonSkillScope::User,
            None,
            true,
        )
        .expect("install");
        assert_eq!(result.installed_paths.len(), 3);
        assert!(real.exists());
        assert!(dest.join("SKILL.md").exists());
        assert!(!dest.symlink_metadata().unwrap().file_type().is_symlink());
    }

    #[test]
    fn uninstall_removes_only_bundled_skill_folders() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        let skills = home.join(".cursor").join("skills");
        fs::create_dir_all(skills.join("write-schedule")).expect("mkdir");
        fs::create_dir_all(skills.join("other-skill")).expect("mkdir other");
        fs::write(skills.join("write-schedule").join("SKILL.md"), "x").expect("write");

        let result = uninstall_json_skills_from_disk(
            &home,
            JsonSkillTool::Cursor,
            JsonSkillScope::User,
            None,
        )
        .expect("uninstall");
        assert_eq!(result.removed_paths.len(), 1);
        assert_eq!(result.missing_paths.len(), 2);
        assert!(!skills.join("write-schedule").exists());
        assert!(skills.join("other-skill").exists());
    }

    fn write_bundled_skills(resource: &Path) {
        for name in JSON_SKILL_NAMES {
            let skill_dir = resource.join(RESOURCE_SKILLS_DIR).join(name);
            fs::create_dir_all(&skill_dir).expect("mkdir skill");
            fs::write(skill_dir.join("SKILL.md"), name).expect("write");
        }
    }

    #[test]
    fn install_creates_real_parent_directories() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        fs::create_dir_all(&home).expect("home");
        let resource = dir.path().join("resources");
        write_bundled_skills(&resource);

        let result = install_json_skills_to_disk(
            &resource,
            &home,
            JsonSkillTool::Cursor,
            JsonSkillScope::User,
            None,
            false,
        )
        .expect("install");
        assert_eq!(result.installed_paths.len(), 3);
        let cursor = home.join(".cursor");
        assert!(!cursor.symlink_metadata().unwrap().file_type().is_symlink());
        assert!(cursor
            .join("skills")
            .join("write-schedule")
            .join("SKILL.md")
            .is_file());
    }

    #[test]
    fn install_without_replace_treats_symlink_as_existing() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        let skills = home.join(".cursor").join("skills");
        fs::create_dir_all(&skills).expect("mkdir");
        let dest = skills.join("write-schedule");
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(dir.path().join("missing-target"), &dest).expect("symlink");
        }
        #[cfg(not(unix))]
        {
            return;
        }

        let result = install_json_skills_to_disk(
            dir.path(),
            &home,
            JsonSkillTool::Cursor,
            JsonSkillScope::User,
            None,
            false,
        )
        .expect("install check");
        assert!(result.installed_paths.is_empty());
        assert_eq!(result.existing_paths.len(), 1);
        assert!(dest.symlink_metadata().unwrap().file_type().is_symlink());
    }

    #[test]
    fn install_does_not_write_through_tool_dir_symlink() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        let project = dir.path().join("project");
        let outside = dir.path().join("outside");
        fs::create_dir_all(&home).expect("home");
        fs::create_dir_all(&project).expect("project");
        fs::create_dir_all(outside.join("skills")).expect("outside");
        fs::write(outside.join("skills").join("marker"), "keep").expect("marker");
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&outside, project.join(".cursor")).expect("symlink");
        }
        #[cfg(not(unix))]
        {
            return;
        }
        let resource = dir.path().join("resources");
        write_bundled_skills(&resource);

        let error = install_json_skills_to_disk(
            &resource,
            &home,
            JsonSkillTool::Cursor,
            JsonSkillScope::Project,
            Some(&project),
            true,
        )
        .err()
        .expect("symlink parent");
        assert!(error.contains("シンボリックリンク"), "{error}");
        assert_eq!(
            fs::read_to_string(outside.join("skills").join("marker")).unwrap(),
            "keep"
        );
        assert!(!outside.join("skills").join("write-schedule").exists());
    }

    #[test]
    fn place_staged_skill_restores_original_when_copy_fails() {
        let dir = tempfile::tempdir().expect("temp dir");
        let skills = dir.path().join(".cursor").join("skills");
        let dest = skills.join("write-schedule");
        fs::create_dir_all(&dest).expect("mkdir");
        fs::write(dest.join("SKILL.md"), "original").expect("write");
        let staged = dir.path().join("missing-staged");

        let error = place_staged_skill(&staged, &dest, true).expect_err("copy fails");
        assert!(error.contains("スキルを置けません"), "{error}");
        assert_eq!(
            fs::read_to_string(dest.join("SKILL.md")).unwrap(),
            "original"
        );

        let empty_dest = skills.join("write-members");
        let error = place_staged_skill(&staged, &empty_dest, true).expect_err("copy fails");
        assert!(error.contains("スキルを置けません"), "{error}");
        assert!(fs::symlink_metadata(&empty_dest).is_err());

        let names: Vec<_> = fs::read_dir(&skills)
            .unwrap()
            .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        assert_eq!(names, vec!["write-schedule".to_string()]);
    }

    #[test]
    fn install_keeps_earlier_skill_when_a_later_copy_fails() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        fs::create_dir_all(&home).expect("home");
        let resource = dir.path().join("resources");
        write_bundled_skills(&resource);
        #[cfg(unix)]
        {
            let members = resource.join(RESOURCE_SKILLS_DIR).join("write-members");
            std::os::unix::fs::symlink(dir.path().join("missing"), members.join("link"))
                .expect("symlink");
        }
        #[cfg(not(unix))]
        {
            return;
        }

        let error = install_json_skills_to_disk(
            &resource,
            &home,
            JsonSkillTool::Cursor,
            JsonSkillScope::User,
            None,
            false,
        )
        .err()
        .expect("later copy fails");
        assert!(error.contains("先に置けた"), "{error}");
        assert!(home
            .join(".cursor")
            .join("skills")
            .join("write-schedule")
            .join("SKILL.md")
            .is_file());
        assert!(!home
            .join(".cursor")
            .join("skills")
            .join("write-members")
            .exists());
        assert!(!home
            .join(".cursor")
            .join("skills")
            .join("write-calendar")
            .exists());
    }

    #[test]
    fn uninstall_does_not_remove_through_tool_dir_symlink() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        let real_cursor = dir.path().join("real-cursor");
        let skill = real_cursor.join("skills").join("write-schedule");
        fs::create_dir_all(&home).expect("home");
        fs::create_dir_all(&skill).expect("skill");
        fs::write(skill.join("SKILL.md"), "keep").expect("write");
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&real_cursor, home.join(".cursor")).expect("symlink");
        }
        #[cfg(not(unix))]
        {
            return;
        }

        let error = uninstall_json_skills_from_disk(
            &home,
            JsonSkillTool::Cursor,
            JsonSkillScope::User,
            None,
        )
        .err()
        .expect("symlink parent");
        assert!(error.contains("シンボリックリンク"), "{error}");
        assert_eq!(fs::read_to_string(skill.join("SKILL.md")).unwrap(), "keep");
    }

    #[test]
    fn uninstall_removes_broken_symlink_at_destination() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        let skills = home.join(".cursor").join("skills");
        fs::create_dir_all(&skills).expect("mkdir");
        let dest = skills.join("write-schedule");
        let target = dir.path().join("missing-target");
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&target, &dest).expect("symlink");
        }
        #[cfg(not(unix))]
        {
            return;
        }

        let result = uninstall_json_skills_from_disk(
            &home,
            JsonSkillTool::Cursor,
            JsonSkillScope::User,
            None,
        )
        .expect("uninstall");
        assert_eq!(result.removed_paths.len(), 1);
        assert_eq!(result.missing_paths.len(), 2);
        assert!(fs::symlink_metadata(&dest).is_err());
        assert!(fs::symlink_metadata(&target).is_err());
    }

    #[test]
    fn uninstall_does_not_follow_symlink_inside_skill() {
        let dir = tempfile::tempdir().expect("temp dir");
        let home = dir.path().join("home");
        let outside = dir.path().join("outside");
        fs::create_dir_all(&outside).expect("outside");
        fs::write(outside.join("keep.txt"), "keep").expect("write");
        let skill = home.join(".cursor").join("skills").join("write-schedule");
        fs::create_dir_all(&skill).expect("skill");
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&outside, skill.join("linked")).expect("symlink");
        }
        #[cfg(not(unix))]
        {
            return;
        }

        uninstall_json_skills_from_disk(&home, JsonSkillTool::Cursor, JsonSkillScope::User, None)
            .expect("uninstall");
        assert_eq!(
            fs::read_to_string(outside.join("keep.txt")).unwrap(),
            "keep"
        );
        assert!(!skill.exists());
    }
}
