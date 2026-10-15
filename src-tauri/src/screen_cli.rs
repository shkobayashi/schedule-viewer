use serde_json::{json, Value};
use std::io::{self, Write};

use crate::mcp_bridge::call_tool_via_bridge;

pub const SCREEN_TOOL_NAMES: [&str; 5] = [
    "schedule_diff",
    "baseline_diffs",
    "selected_task",
    "selected_tasks",
    "filtered_tasks",
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

pub fn run_screen_cli(tool: &str) -> i32 {
    match call_tool_via_bridge(tool, json!({})) {
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
