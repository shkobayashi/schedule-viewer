use serde_json::{json, Value};
use std::io::{self, Read, Write};

use crate::mcp_bridge::call_tool_via_bridge;

pub const SCREEN_READ_TOOL_NAMES: [&str; 5] = [
    "schedule_diff",
    "baseline_diffs",
    "selected_task",
    "selected_tasks",
    "filtered_tasks",
];

pub const SCREEN_REPLACE_TOOL_NAME: &str = "replace_schedule";

pub const MAX_SCHEDULE_BYTES: usize = 10 * 1024 * 1024;

const REPLACE_SCHEDULE_TOO_LARGE: &str =
    "スケジュールが大きすぎるため、置き換えられません。";
const REPLACE_SCHEDULE_INVALID_JSON: &str =
    "スケジュールの JSON として読めないので、置き換えられません。";

pub const SCREEN_TOOL_NAMES: [&str; 6] = [
    "schedule_diff",
    "baseline_diffs",
    "selected_task",
    "selected_tasks",
    "filtered_tasks",
    "replace_schedule",
];

/// `--screen <tool>` のときだけツール名を返す。引数が不正なときは `None`。
pub fn parse_screen_tool(args: &[String]) -> Option<&str> {
    if args.len() != 2 || args[0] != "--screen" {
        return None;
    }
    let name = args[1].as_str();
    if SCREEN_TOOL_NAMES.contains(&name) {
        Some(name)
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

pub fn run_screen_cli(tool: &str) -> i32 {
    let arguments = if tool == SCREEN_REPLACE_TOOL_NAME {
        match read_replace_schedule_stdin() {
            Ok(value) => value,
            Err(message) => {
                eprintln!("{message}");
                return 1;
            }
        }
    } else {
        json!({})
    };
    match call_tool_via_bridge(tool, arguments) {
        Ok(body) => match extract_tool_output(&body) {
            Ok(text) => {
                if let Err(err) = writeln!(io::stdout(), "{text}") {
                    eprintln!("{err}");
                    return 1;
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

fn extract_tool_output(body: &Value) -> Result<String, String> {
    let is_error = body.get("isError").and_then(|v| v.as_bool()).unwrap_or(false);
    let text = body
        .get("content")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.first())
        .and_then(|item| item.get("text"))
        .and_then(|t| t.as_str())
        .unwrap_or("");
    if is_error {
        Err(text.to_string())
    } else {
        Ok(text.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn screen_tool_requires_exactly_two_args() {
        assert!(parse_screen_tool(&["--screen".to_string()]).is_none());
        assert!(
            parse_screen_tool(&["--screen".to_string(), "schedule_diff".to_string()])
                .is_some()
        );
        assert!(
            parse_screen_tool(&["--screen".to_string(), "selected_tasks".to_string()])
                .is_some()
        );
        assert!(
            parse_screen_tool(&[
                "--screen".to_string(),
                "schedule_diff".to_string(),
                "extra".to_string(),
            ])
                .is_none()
        );
    }

    #[test]
    fn screen_tool_rejects_unknown_name() {
        assert!(parse_screen_tool(&["--screen".to_string(), "screen_context".to_string()]).is_none());
    }

    #[test]
    fn screen_tool_accepts_replace_schedule() {
        assert_eq!(
            parse_screen_tool(&["--screen".to_string(), "replace_schedule".to_string()]),
            Some("replace_schedule")
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
        assert_eq!(extract_tool_output(&ok).unwrap(), "hello");

        let err = json!({
            "content": [{ "type": "text", "text": "失敗" }],
            "isError": true,
        });
        assert_eq!(extract_tool_output(&err).unwrap_err(), "失敗");
    }
}
