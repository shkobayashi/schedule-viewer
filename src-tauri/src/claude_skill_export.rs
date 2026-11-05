use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

use crate::json_skills::{copy_dir_all, JSON_SKILL_BUNDLE_DIR};
use crate::read_screen_skill::{
    bundled_read_screen_template_path, local_app_data_prefix_for_read_screen,
    render_read_screen_skill_for_claude, READ_SCREEN_SKILL_NAME,
};

/// JSON 作成向け（schedule-talk は read-screen 側の zip に載せる）
pub const CLAUDE_JSON_AUTHORING_SKILL_NAMES: [&str; 6] = [
    "write-schedule",
    "write-members",
    "write-calendar",
    "write-workspace",
    "write-fields",
    "write-colors",
];

pub const CLAUDE_READ_SCREEN_BUNDLE_SKILL_NAMES: [&str; 2] = ["read-screen", "schedule-talk"];

pub const CLAUDE_JSON_EXPORT_DIR_NAME: &str = "schedule-viewer-claude-json-skills";
pub const CLAUDE_READ_SCREEN_EXPORT_DIR_NAME: &str = "schedule-viewer-claude-read-screen";

pub const CLAUDE_UPLOAD_HINT: &str =
    "Claude Desktop または claude.ai で Customize → Skills → ＋ → Create skill → Upload a skill を開き、書き出した zip を1つずつアップロードします。Code execution and file creation をオンにしてください。";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportClaudeSkillsResult {
    pub export_dir: String,
    pub zip_paths: Vec<String>,
    pub upload_hint: String,
}

fn claude_description(skill_name: &str) -> &'static str {
    match skill_name {
        "write-schedule" => {
            "schedule-viewer 用スケジュール JSON を作る。起動中はファイルを書かず MCP で置き換える。"
        }
        "write-members" => "schedule-viewer 用メンバー一覧 JSON を作る。",
        "write-calendar" => "schedule-viewer 用稼働日カレンダー JSON を作る。",
        "write-workspace" => "schedule-viewer 用 workspace.json（パス指定）を作る。",
        "write-fields" => "schedule-viewer 用拡張項目定義 JSON を作る。",
        "write-colors" => "schedule-viewer 用色一覧 JSON を作る。",
        "schedule-talk" => {
            "schedule-viewer の画面を見ながら相談・更新するときの判断手順。MCP と read-screen と組み合わせる。"
        }
        "read-screen" => {
            "MCP 連携時の schedule-viewer 読み取り・置き換えの形。Claude Desktop では MCP 必須。"
        }
        _ => "schedule-viewer 向けスキル。",
    }
}

fn strip_frontmatter(content: &str) -> Option<&str> {
    if !content.starts_with("---") {
        return None;
    }
    let rest = &content[3..];
    let end = rest.find("\n---")?;
    Some(&rest[end + 4..])
}

pub fn skill_md_for_claude_upload(content: &str, skill_name: &str) -> String {
    let body = strip_frontmatter(content).unwrap_or(content);
    let desc = claude_description(skill_name);
    format!("---\nname: {skill_name}\ndescription: {desc}\n---{body}")
}

pub fn claude_description_char_len(skill_name: &str) -> usize {
    claude_description(skill_name).chars().count()
}

fn add_path_to_zip(
    zip: &mut ZipWriter<fs::File>,
    options: SimpleFileOptions,
    skill_name: &str,
    skill_src_dir: &Path,
    path: &Path,
) -> Result<(), String> {
    let rel = path
        .strip_prefix(skill_src_dir)
        .map_err(|_| "zip を書けません。".to_string())?;
    if rel.as_os_str().is_empty() {
        if path.is_dir() {
            for entry in fs::read_dir(path).map_err(|e| format!("zip を書けません: {e}"))? {
                let entry = entry.map_err(|e| format!("zip を書けません: {e}"))?;
                add_path_to_zip(zip, options, skill_name, skill_src_dir, &entry.path())?;
            }
        }
        return Ok(());
    }
    let rel_str = rel.to_string_lossy().replace('\\', "/");
    let name_in_zip = format!("{skill_name}/{rel_str}");
    let meta = fs::symlink_metadata(path).map_err(|e| format!("zip を書けません: {e}"))?;
    if meta.file_type().is_symlink() {
        return Err("同梱スキルにシンボリックリンクは含められません。".to_string());
    }
    if meta.is_dir() {
        zip.add_directory(name_in_zip, options)
            .map_err(|e| format!("zip を書けません: {e}"))?;
        for entry in fs::read_dir(path).map_err(|e| format!("zip を書けません: {e}"))? {
            let entry = entry.map_err(|e| format!("zip を書けません: {e}"))?;
            add_path_to_zip(zip, options, skill_name, skill_src_dir, &entry.path())?;
        }
        return Ok(());
    }
    let bytes = fs::read(path).map_err(|e| format!("zip を書けません: {e}"))?;
    let payload = if rel_str == "SKILL.md" || rel_str.ends_with("/SKILL.md") {
        let text = String::from_utf8(bytes).map_err(|_| "SKILL.md を読めません。".to_string())?;
        skill_md_for_claude_upload(&text, skill_name)
    } else {
        String::from_utf8(bytes).map_err(|_| "スキルを読めません。".to_string())?
    };
    zip.start_file(name_in_zip, options)
        .map_err(|e| format!("zip を書けません: {e}"))?;
    zip.write_all(payload.as_bytes())
        .map_err(|e| format!("zip を書けません: {e}"))?;
    Ok(())
}

fn write_skill_zip(skill_name: &str, skill_src_dir: &Path, zip_path: &Path) -> Result<(), String> {
    if !skill_src_dir.is_dir() {
        return Err(format!("同梱スキルが見つかりません: {skill_name}"));
    }
    let file = fs::File::create(zip_path).map_err(|e| format!("zip を書けません: {e}"))?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    add_path_to_zip(&mut zip, options, skill_name, skill_src_dir, skill_src_dir)?;
    zip.finish()
        .map_err(|e| format!("zip を書けません: {e}"))?;
    Ok(())
}

fn bundled_json_skill_dir(resource_dir: &Path, name: &str) -> PathBuf {
    resource_dir.join(JSON_SKILL_BUNDLE_DIR).join(name)
}

fn zip_paths_to_strings(paths: Vec<PathBuf>) -> Vec<String> {
    paths
        .into_iter()
        .map(|p| p.to_string_lossy().into_owned())
        .collect()
}

pub fn export_claude_json_skills_to_disk(
    resource_dir: &Path,
    dest_root: &Path,
) -> Result<ExportClaudeSkillsResult, String> {
    let export_dir = dest_root.join(CLAUDE_JSON_EXPORT_DIR_NAME);
    fs::create_dir_all(&export_dir).map_err(|e| format!("フォルダを作れません: {e}"))?;
    let staging_root = tempfile::tempdir().map_err(|e| format!("zip を書けません: {e}"))?;
    let mut zip_paths = Vec::new();
    for name in CLAUDE_JSON_AUTHORING_SKILL_NAMES {
        let src = bundled_json_skill_dir(resource_dir, name);
        let skill_staging = staging_root.path().join(name);
        fs::create_dir_all(&skill_staging).map_err(|e| format!("zip を書けません: {e}"))?;
        copy_dir_all(&src, &skill_staging)?;
        let skill_md_path = skill_staging.join("SKILL.md");
        let raw = fs::read_to_string(&skill_md_path)
            .map_err(|_| "同梱スキルが見つかりません。".to_string())?;
        fs::write(
            &skill_md_path,
            skill_md_for_claude_upload(&raw, name).as_bytes(),
        )
        .map_err(|e| format!("zip を書けません: {e}"))?;
        let zip_path = export_dir.join(format!("{name}.zip"));
        write_skill_zip(name, &skill_staging, &zip_path)?;
        zip_paths.push(zip_path);
    }
    Ok(ExportClaudeSkillsResult {
        export_dir: export_dir.to_string_lossy().into_owned(),
        zip_paths: zip_paths_to_strings(zip_paths),
        upload_hint: CLAUDE_UPLOAD_HINT.to_string(),
    })
}

pub fn export_claude_read_screen_to_disk(
    resource_dir: &Path,
    dest_root: &Path,
    executable_path: &str,
    local_app_data: Option<&str>,
) -> Result<ExportClaudeSkillsResult, String> {
    let export_dir = dest_root.join(CLAUDE_READ_SCREEN_EXPORT_DIR_NAME);
    fs::create_dir_all(&export_dir).map_err(|e| format!("フォルダを作れません: {e}"))?;
    let staging_root = tempfile::tempdir().map_err(|e| format!("zip を書けません: {e}"))?;
    let mut zip_paths = Vec::new();

    for name in CLAUDE_READ_SCREEN_BUNDLE_SKILL_NAMES {
        let zip_path = export_dir.join(format!("{name}.zip"));
        let skill_staging = staging_root.path().join(name);
        if name == READ_SCREEN_SKILL_NAME {
            let template_path = bundled_read_screen_template_path(resource_dir);
            let template = fs::read_to_string(&template_path)
                .map_err(|_| "同梱スキルが見つかりません。".to_string())?;
            let rendered =
                render_read_screen_skill_for_claude(&template, executable_path, local_app_data)?;
            fs::create_dir_all(&skill_staging).map_err(|e| format!("zip を書けません: {e}"))?;
            fs::write(
                skill_staging.join("SKILL.md"),
                skill_md_for_claude_upload(&rendered, name).as_bytes(),
            )
            .map_err(|e| format!("zip を書けません: {e}"))?;
            write_skill_zip(name, &skill_staging, &zip_path)?;
        } else {
            let src = bundled_json_skill_dir(resource_dir, name);
            fs::create_dir_all(&skill_staging).map_err(|e| format!("zip を書けません: {e}"))?;
            copy_dir_all(&src, &skill_staging)?;
            let skill_md_path = skill_staging.join("SKILL.md");
            let raw = fs::read_to_string(&skill_md_path)
                .map_err(|_| "同梱スキルが見つかりません。".to_string())?;
            fs::write(
                &skill_md_path,
                skill_md_for_claude_upload(&raw, name).as_bytes(),
            )
            .map_err(|e| format!("zip を書けません: {e}"))?;
            write_skill_zip(name, &skill_staging, &zip_path)?;
        }
        zip_paths.push(zip_path);
    }

    Ok(ExportClaudeSkillsResult {
        export_dir: export_dir.to_string_lossy().into_owned(),
        zip_paths: zip_paths_to_strings(zip_paths),
        upload_hint: format!(
            "{CLAUDE_UPLOAD_HINT} read-screen.zip と schedule-talk.zip の両方をアップロードしてください。"
        ),
    })
}

fn resolve_executable(_app: &tauri::AppHandle) -> Result<(String, Option<String>), String> {
    let executable_path = crate::store_distribution::mcp_executable_command_path()?;
    let local_app_data = if executable_path.eq_ignore_ascii_case(crate::store_distribution::STORE_EXECUTABLE_ALIAS) {
        None
    } else {
        local_app_data_prefix_for_read_screen()
    };
    Ok((executable_path, local_app_data))
}

fn open_export_dir(app: &tauri::AppHandle, export_dir: &Path) -> Result<(), String> {
    app.opener()
        .open_path(export_dir.to_string_lossy(), None::<&str>)
        .map_err(|e| format!("フォルダを開けません: {e}"))
}

#[tauri::command]
pub async fn export_claude_json_skills_zip(
    window: tauri::Window,
    app: tauri::AppHandle,
) -> Result<Option<ExportClaudeSkillsResult>, String> {
    let picked = app
        .dialog()
        .file()
        .set_parent(&window)
        .blocking_pick_folder();
    let Some(file_path) = picked else {
        return Ok(None);
    };
    let dest_root = file_path
        .into_path()
        .map_err(|_| "フォルダが見つかりません。".to_string())?;
    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|_| PathBuf::new());
    let result = export_claude_json_skills_to_disk(&resource_dir, &dest_root)?;
    open_export_dir(&app, Path::new(&result.export_dir))?;
    Ok(Some(result))
}

#[tauri::command]
pub async fn export_claude_read_screen_skills_zip(
    window: tauri::Window,
    app: tauri::AppHandle,
) -> Result<Option<ExportClaudeSkillsResult>, String> {
    let picked = app
        .dialog()
        .file()
        .set_parent(&window)
        .blocking_pick_folder();
    let Some(file_path) = picked else {
        return Ok(None);
    };
    let dest_root = file_path
        .into_path()
        .map_err(|_| "フォルダが見つかりません。".to_string())?;
    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|_| PathBuf::new());
    let (executable_path, local_app_data) = resolve_executable(&app)?;
    let result = export_claude_read_screen_to_disk(
        &resource_dir,
        &dest_root,
        &executable_path,
        local_app_data.as_deref(),
    )?;
    open_export_dir(&app, Path::new(&result.export_dir))?;
    Ok(Some(result))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::json_skills::write_minimal_bundled_skills;

    #[test]
    fn claude_descriptions_fit_anthropic_limit() {
        for name in CLAUDE_JSON_AUTHORING_SKILL_NAMES
            .iter()
            .chain(CLAUDE_READ_SCREEN_BUNDLE_SKILL_NAMES.iter())
        {
            assert!(
                claude_description_char_len(name) <= 200,
                "{name} description too long"
            );
        }
    }

    #[test]
    fn json_export_writes_one_zip_per_authoring_skill() {
        let dir = tempfile::tempdir().expect("temp");
        let resource = dir.path().join("resources");
        write_minimal_bundled_skills(&resource);
        let dest = dir.path().join("out");
        fs::create_dir_all(&dest).expect("dest");
        let result = export_claude_json_skills_to_disk(&resource, &dest).expect("export");
        assert_eq!(result.zip_paths.len(), 6);
        for name in CLAUDE_JSON_AUTHORING_SKILL_NAMES {
            let zip = Path::new(&result.export_dir).join(format!("{name}.zip"));
            assert!(zip.is_file(), "missing {zip:?}");
        }
    }

    #[test]
    fn read_screen_export_includes_mcp_preamble_in_skill_md() {
        let dir = tempfile::tempdir().expect("temp");
        let resource = dir.path().join("resources");
        write_minimal_bundled_skills(&resource);
        fs::create_dir_all(resource.join("read-screen")).expect("read-screen dir");
        fs::write(
            resource.join("read-screen/SKILL.md"),
            "---\nname: read-screen\ndescription: test\n---\n\n{{SCHEDULE_VIEWER_INVOCATION}}\n",
        )
        .expect("template");
        let dest = dir.path().join("out");
        fs::create_dir_all(&dest).expect("dest");
        let result = export_claude_read_screen_to_disk(
            &resource,
            &dest,
            "/app/schedule-viewer",
            None,
        )
        .expect("export");
        assert_eq!(result.zip_paths.len(), 2);
        let template = fs::read_to_string(resource.join("read-screen/SKILL.md")).unwrap();
        let rendered =
            render_read_screen_skill_for_claude(&template, "/app/schedule-viewer", None).unwrap();
        assert!(rendered.contains("MCP とつないだ Claude Desktop"));
        assert!(rendered.contains("`--screen` で起動することは**できません**"));
    }
}
