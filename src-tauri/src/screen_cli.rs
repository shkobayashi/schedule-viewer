use serde_json::{json, Value};
use std::io::{self, Read, Write};
use std::path::PathBuf;

use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;

use crate::mcp_bridge::call_tool_via_bridge;

pub const OPEN_WINDOWS_TOOL_NAME: &str = "open_windows";

pub const SCREEN_READ_TOOL_NAMES: [&str; 7] = [
    "schedule_diff",
    "baseline_diffs",
    "selected_task",
    "selected_tasks",
    "filtered_tasks",
    "current_schedule",
    OPEN_WINDOWS_TOOL_NAME,
];

pub const SCREEN_READ_TOOLS_WITH_WINDOW: [&str; 6] = [
    "schedule_diff",
    "baseline_diffs",
    "selected_task",
    "selected_tasks",
    "filtered_tasks",
    "current_schedule",
];

pub const SCREEN_REPLACE_TOOL_NAME: &str = "replace_schedule";

pub const MAX_SCHEDULE_BYTES: usize = 10 * 1024 * 1024;

const REPLACE_SCHEDULE_TOO_LARGE: &str =
    "スケジュールが大きすぎるため、置き換えられません。";
const REPLACE_SCHEDULE_INVALID_JSON: &str =
    "スケジュールの JSON として読めないので、置き換えられません。";
pub const REPLACE_SCHEDULE_WINDOW_NOT_SUPPORTED: &str =
    "replace_schedule は前面ウィンドウだけを置き換えます。--window は使えません。";
pub const OPEN_WINDOWS_WINDOW_NOT_SUPPORTED: &str =
    "open_windows は --window を受け付けません。";

pub const SCREEN_TOOL_NAMES: [&str; 8] = [
    "schedule_diff",
    "baseline_diffs",
    "selected_task",
    "selected_tasks",
    "filtered_tasks",
    "current_schedule",
    OPEN_WINDOWS_TOOL_NAME,
    "replace_schedule",
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScreenCliInvocation {
    pub tool: String,
    pub window: Option<String>,
}

/// `--screen <tool>` または `--screen <読み取り> --window <label>` のときだけ返す。
pub fn parse_screen_cli(args: &[String]) -> Option<ScreenCliInvocation> {
    if args.is_empty() || args[0] != "--screen" {
        return None;
    }
    if args.len() == 2 {
        let name = args[1].as_str();
        if SCREEN_TOOL_NAMES.contains(&name) {
            return Some(ScreenCliInvocation {
                tool: name.to_string(),
                window: None,
            });
        }
        return None;
    }
    if args.len() == 4 && args[2] == "--window" {
        let name = args[1].as_str();
        if SCREEN_READ_TOOLS_WITH_WINDOW.contains(&name)
            || name == OPEN_WINDOWS_TOOL_NAME
            || name == SCREEN_REPLACE_TOOL_NAME
        {
            return Some(ScreenCliInvocation {
                tool: name.to_string(),
                window: Some(args[3].clone()),
            });
        }
    }
    None
}

/// `--window` が付いているが使えないツールのとき、標準エラーへ出す文。
pub fn screen_cli_window_rejection_message(
    tool: &str,
    window: Option<&str>,
) -> Option<&'static str> {
    if window.is_none() {
        None
    } else if tool == SCREEN_REPLACE_TOOL_NAME {
        Some(REPLACE_SCHEDULE_WINDOW_NOT_SUPPORTED)
    } else if tool == OPEN_WINDOWS_TOOL_NAME {
        Some(OPEN_WINDOWS_WINDOW_NOT_SUPPORTED)
    } else {
        None
    }
}

/// 後方互換のため、ツール名だけ返す（`parse_screen_cli` が成功したとき）。
pub fn parse_screen_tool(args: &[String]) -> Option<&str> {
    if parse_screen_cli(args).is_some() {
        args.get(1).map(|name| name.as_str())
    } else {
        None
    }
}

pub fn is_screen_flag(args: &[String]) -> bool {
    args.first().map(|s| s.as_str()) == Some("--screen")
}

fn strip_utf8_bom(data: &[u8]) -> &[u8] {
    if data.starts_with(&[0xEF, 0xBB, 0xBF]) {
        &data[3..]
    } else {
        data
    }
}

/// 標準入力から読んだバイト列を `replace_schedule` の引数 JSON にする。
pub fn parse_replace_schedule_stdin_bytes(data: &[u8]) -> Result<Value, String> {
    if data.len() > MAX_SCHEDULE_BYTES {
        return Err(REPLACE_SCHEDULE_TOO_LARGE.to_string());
    }
    let payload = strip_utf8_bom(data);
    if payload.is_empty() {
        return Err(REPLACE_SCHEDULE_INVALID_JSON.to_string());
    }
    serde_json::from_slice(payload).map_err(|_| REPLACE_SCHEDULE_INVALID_JSON.to_string())
}

fn read_replace_schedule_stdin() -> Result<Value, String> {
    let mut buf = Vec::new();
    io::stdin()
        .take((MAX_SCHEDULE_BYTES + 1) as u64)
        .read_to_end(&mut buf)
        .map_err(|err| err.to_string())?;
    parse_replace_schedule_stdin_bytes(&buf)
}

pub fn run_screen_cli(invocation: &ScreenCliInvocation) -> i32 {
    if let Some(message) =
        screen_cli_window_rejection_message(&invocation.tool, invocation.window.as_deref())
    {
        eprintln!("{message}");
        return 1;
    }
    let arguments = if invocation.tool == SCREEN_REPLACE_TOOL_NAME {
        match read_replace_schedule_stdin() {
            Ok(value) => value,
            Err(message) => {
                eprintln!("{message}");
                return 1;
            }
        }
    } else if let Some(label) = &invocation.window {
        json!({ "window": label })
    } else {
        json!({})
    };
    match call_tool_via_bridge(&invocation.tool, arguments) {
        Ok(body) => match extract_tool_output(&body) {
            Ok(output) => {
                if let Err(err) = writeln!(io::stdout(), "{}", output.text) {
                    eprintln!("{err}");
                    return 1;
                }
                if let Some(path) = output.image_path {
                    if let Err(err) = writeln!(io::stdout(), "{}", path.display()) {
                        eprintln!("{err}");
                        return 1;
                    }
                }
                0
            }
            Err(text) => {
                eprintln!("{text}");
                1
            }
        },
        Err(err) => {
            eprintln!("{}", err.user_message());
            1
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ScreenCliOutput {
    text: String,
    image_path: Option<PathBuf>,
}


fn write_screen_image_from_content(content: &[Value]) -> Result<Option<PathBuf>, String> {
    if content.len() < 2 {
        return Ok(None);
    }
    let item = &content[1];
    if item.get("type").and_then(|v| v.as_str()) != Some("image") {
        return Ok(None);
    }
    let data = item
        .get("data")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "画像のデータがありません。".to_string())?;
    let bytes = BASE64_STANDARD
        .decode(data)
        .map_err(|_| "画像のデータを読めません。".to_string())?;
    let mut file = tempfile::NamedTempFile::new()
        .map_err(|err| err.to_string())?;
    file.write_all(&bytes)
        .map_err(|err| err.to_string())?;
    file.flush().map_err(|err| err.to_string())?;
    let path = file.into_temp_path();
    let png_path = path.with_extension("png");
    path.persist(&png_path)
        .map_err(|err| err.error.to_string())?;
    Ok(Some(png_path))
}

fn extract_tool_output(body: &Value) -> Result<ScreenCliOutput, String> {
    let is_error = body.get("isError").and_then(|v| v.as_bool()).unwrap_or(false);
    let content = body
        .get("content")
        .and_then(|c| c.as_array())
        .cloned()
        .unwrap_or_default();
    let text = content
        .first()
        .and_then(|item| item.get("text"))
        .and_then(|t| t.as_str())
        .unwrap_or("")
        .to_string();
    if is_error {
        return Err(text);
    }
    let image_path = write_screen_image_from_content(&content)?;
    Ok(ScreenCliOutput { text, image_path })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn screen_tool_requires_exactly_two_args() {
        assert!(parse_screen_cli(&["--screen".to_string()]).is_none());
        assert_eq!(
            parse_screen_cli(&["--screen".to_string(), "schedule_diff".to_string()]),
            Some(ScreenCliInvocation {
                tool: "schedule_diff".to_string(),
                window: None,
            })
        );
        assert_eq!(
            parse_screen_cli(&["--screen".to_string(), "open_windows".to_string()]),
            Some(ScreenCliInvocation {
                tool: "open_windows".to_string(),
                window: None,
            })
        );
        assert!(
            parse_screen_cli(&[
                "--screen".to_string(),
                "schedule_diff".to_string(),
                "extra".to_string(),
            ])
                .is_none()
        );
    }

    #[test]
    fn screen_tool_accepts_read_window_flag() {
        assert_eq!(
            parse_screen_cli(&[
                "--screen".to_string(),
                "selected_tasks".to_string(),
                "--window".to_string(),
                "schedule-2".to_string(),
            ]),
            Some(ScreenCliInvocation {
                tool: "selected_tasks".to_string(),
                window: Some("schedule-2".to_string()),
            })
        );
    }

    #[test]
    fn screen_tool_parses_window_on_open_windows_for_rejection() {
        assert_eq!(
            parse_screen_cli(&[
                "--screen".to_string(),
                "open_windows".to_string(),
                "--window".to_string(),
                "schedule-2".to_string(),
            ]),
            Some(ScreenCliInvocation {
                tool: "open_windows".to_string(),
                window: Some("schedule-2".to_string()),
            })
        );
        assert_eq!(
            screen_cli_window_rejection_message("open_windows", Some("schedule-2")),
            Some(OPEN_WINDOWS_WINDOW_NOT_SUPPORTED)
        );
    }

    #[test]
    fn screen_tool_parses_window_on_replace_schedule_for_rejection() {
        assert_eq!(
            parse_screen_cli(&[
                "--screen".to_string(),
                "replace_schedule".to_string(),
                "--window".to_string(),
                "schedule-2".to_string(),
            ]),
            Some(ScreenCliInvocation {
                tool: "replace_schedule".to_string(),
                window: Some("schedule-2".to_string()),
            })
        );
        assert_eq!(
            screen_cli_window_rejection_message("replace_schedule", Some("schedule-2")),
            Some(REPLACE_SCHEDULE_WINDOW_NOT_SUPPORTED)
        );
    }

    #[test]
    fn screen_tool_rejects_unknown_name() {
        assert!(parse_screen_cli(&["--screen".to_string(), "screen_context".to_string()]).is_none());
    }

    #[test]
    fn screen_tool_accepts_replace_schedule() {
        assert_eq!(
            parse_screen_cli(&["--screen".to_string(), "replace_schedule".to_string()]),
            Some(ScreenCliInvocation {
                tool: "replace_schedule".to_string(),
                window: None,
            })
        );
    }

    #[test]
    fn replace_schedule_stdin_rejects_over_max_bytes() {
        let over = vec![b'x'; MAX_SCHEDULE_BYTES + 1];
        assert_eq!(
            parse_replace_schedule_stdin_bytes(&over).unwrap_err(),
            REPLACE_SCHEDULE_TOO_LARGE
        );
    }

    #[test]
    fn replace_schedule_stdin_rejects_empty() {
        assert_eq!(
            parse_replace_schedule_stdin_bytes(&[]).unwrap_err(),
            REPLACE_SCHEDULE_INVALID_JSON
        );
    }

    #[test]
    fn replace_schedule_stdin_rejects_invalid_json() {
        assert_eq!(
            parse_replace_schedule_stdin_bytes(b"{").unwrap_err(),
            REPLACE_SCHEDULE_INVALID_JSON
        );
    }

    #[test]
    fn replace_schedule_stdin_accepts_json_object() {
        let value = parse_replace_schedule_stdin_bytes(b"{}").unwrap();
        assert!(value.is_object());
    }

    #[test]
    fn replace_schedule_stdin_strips_bom_before_parse() {
        let mut with_bom = vec![0xEF, 0xBB, 0xBF];
        with_bom.extend_from_slice(b"{}");
        let value = parse_replace_schedule_stdin_bytes(&with_bom).unwrap();
        assert!(value.is_object());
    }

    #[test]
    fn extract_tool_output_splits_success_and_error() {
        let ok = json!({
            "content": [{ "type": "text", "text": "hello" }],
            "isError": false,
        });
        assert_eq!(
            extract_tool_output(&ok).unwrap(),
            ScreenCliOutput {
                text: "hello".to_string(),
                image_path: None,
            }
        );

        let err = json!({
            "content": [{ "type": "text", "text": "失敗" }],
            "isError": true,
        });
        assert_eq!(extract_tool_output(&err).unwrap_err(), "失敗");
    }

    #[test]
    fn extract_tool_output_writes_image_to_temp_path() {
        let png = [
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        ];
        let data = BASE64_STANDARD.encode(png);
        let ok = json!({
            "content": [
                { "type": "text", "text": "{}" },
                { "type": "image", "data": data, "mimeType": "image/png" },
            ],
            "isError": false,
        });
        let output = extract_tool_output(&ok).unwrap();
        assert_eq!(output.text, "{}");
        let path = output.image_path.expect("image path");
        assert!(path.exists());
        let written = std::fs::read(&path).expect("read png");
        assert_eq!(written, png);
        std::fs::remove_file(&path).expect("remove temp png");
    }
}
