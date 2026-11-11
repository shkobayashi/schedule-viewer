//! MCP 標準入出力と `--screen` CLI の統合試験（起動中の GUI 不要）。

use schedule_viewer_lib::screen_cli::MAX_SCHEDULE_BYTES;

const SCREEN_TOOL_NAMES: [&str; 21] = [
    "open_windows",
    "schedule_diff",
    "baseline_diffs",
    "selected_task",
    "selected_tasks",
    "filtered_tasks",
    "current_schedule",
    "replace_schedule",
    "focus_window",
    "open_new_window",
    "close_window",
    "minimize_window",
    "set_view",
    "explain_view",
    "explain_overlay",
    "apply_explanation_pattern",
    "edit_plan",
    "file_action",
    "catalog_action",
    "set_preferences",
    "history",
];

const MCP_FRONT_ONLY_TOOL_NAMES: [&str; 12] = [
    "open_windows",
    "replace_schedule",
    "open_new_window",
    "set_view",
    "explain_view",
    "explain_overlay",
    "apply_explanation_pattern",
    "edit_plan",
    "file_action",
    "catalog_action",
    "set_preferences",
    "history",
];

const MCP_STDIN_ACTION_TOOL_NAMES: [&str; 10] = [
    "set_view",
    "explain_view",
    "explain_overlay",
    "apply_explanation_pattern",
    "edit_plan",
    "file_action",
    "catalog_action",
    "set_preferences",
    "history",
    "open_new_window",
];
use serde_json::Value;
use std::io::{Read, Write};
use std::process::{Child, Command, Stdio};
use std::time::Duration;

/// `MCP_PIPE_CONNECT_TIMEOUT`（5 秒）より長い上限。
const CHILD_WAIT_TIMEOUT: Duration = Duration::from_secs(10);
const USAGE_LINE: &str = "使えるのは --screen schedule_diff、--screen baseline_diffs、--screen selected_task、--screen selected_tasks、--screen filtered_tasks、--screen current_schedule、--screen open_windows、--screen replace_schedule、または読み取り 6 つに --window <label> を付ける形だけです。";

const NO_WINDOW_STDERR: &str = "スケジュールのウィンドウが開いていないので、渡せません。";

const READ_SIX: [&str; 6] = [
    "schedule_diff",
    "baseline_diffs",
    "selected_task",
    "selected_tasks",
    "filtered_tasks",
    "current_schedule",
];

fn executable() -> &'static str {
    env!("CARGO_BIN_EXE_schedule-viewer")
}

fn normalize_text(text: &str) -> String {
    text.trim_end_matches(|c| c == '\n' || c == '\r')
        .replace("\r\n", "\n")
}

struct ProcessOutput {
    code: i32,
    stdout: String,
    stderr: String,
}

fn with_isolated_home(cmd: &mut Command) -> tempfile::TempDir {
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().to_string_lossy().into_owned();
    cmd.env("HOME", &path);
    cmd.env("XDG_DATA_HOME", &path);
    dir
}

fn finish_child(mut child: Child) -> ProcessOutput {
    let stdout_reader = child.stdout.take().map(|mut out| {
        std::thread::spawn(move || {
            let mut buf = Vec::new();
            out.read_to_end(&mut buf).expect("read stdout");
            buf
        })
    });
    let stderr_reader = child.stderr.take().map(|mut err| {
        std::thread::spawn(move || {
            let mut buf = Vec::new();
            err.read_to_end(&mut buf).expect("read stderr");
            buf
        })
    });

    let deadline = std::time::Instant::now() + CHILD_WAIT_TIMEOUT;
    let status = loop {
        if let Some(status) = child.try_wait().expect("try_wait") {
            break status;
        }
        if std::time::Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            panic!("child did not exit within {CHILD_WAIT_TIMEOUT:?}");
        }
        std::thread::sleep(Duration::from_millis(100));
    };

    let stdout_bytes = stdout_reader
        .map(|handle| handle.join().expect("stdout thread"))
        .unwrap_or_default();
    let stderr_bytes = stderr_reader
        .map(|handle| handle.join().expect("stderr thread"))
        .unwrap_or_default();

    ProcessOutput {
        code: status.code().unwrap_or(-1),
        stdout: normalize_text(&String::from_utf8_lossy(&stdout_bytes)),
        stderr: normalize_text(&String::from_utf8_lossy(&stderr_bytes)),
    }
}

fn run_mcp_stdio(stdin_body: &str) -> ProcessOutput {
    let mut cmd = Command::new(executable());
    cmd.arg("--mcp");
    let _home = with_isolated_home(&mut cmd);
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    let mut child = cmd.spawn().expect("spawn mcp");
    {
        let mut stdin = child.stdin.take().expect("stdin");
        stdin
            .write_all(stdin_body.as_bytes())
            .expect("write mcp stdin");
    }
    drop(child.stdin.take());
    finish_child(child)
}

fn run_screen(args: &[&str], stdin: Option<&[u8]>) -> ProcessOutput {
    let mut cmd = Command::new(executable());
    cmd.args(args);
    let _home = with_isolated_home(&mut cmd);
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    let mut child = cmd.spawn().expect("spawn screen");
    if let Some(body) = stdin {
        let mut stdin_pipe = child.stdin.take().expect("stdin");
        stdin_pipe.write_all(body).expect("write screen stdin");
    }
    drop(child.stdin.take());
    finish_child(child)
}

fn parse_stdout_lines(stdout: &str) -> Vec<Value> {
    stdout
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| serde_json::from_str(line).expect("stdout json line"))
        .collect()
}

#[test]
fn initialize_echoes_id_and_returns_protocol_version_server_name_and_tools_capability() {
    let out = run_mcp_stdio(
        r#"{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}"#,
    );
    assert_eq!(out.code, 0);
    let lines = parse_stdout_lines(&out.stdout);
    assert_eq!(lines.len(), 1);
    let response = &lines[0];
    assert_eq!(response.get("jsonrpc").and_then(|v| v.as_str()), Some("2.0"));
    assert_eq!(response.get("id"), Some(&Value::from(1)));
    let result = response.get("result").expect("result");
    assert_eq!(
        result.get("protocolVersion").and_then(|v| v.as_str()),
        Some("2024-11-05")
    );
    assert_eq!(
        result
            .get("serverInfo")
            .and_then(|v| v.get("name"))
            .and_then(|v| v.as_str()),
        Some("schedule-viewer")
    );
    let tools_capability = result
        .get("capabilities")
        .and_then(|v| v.get("tools"))
        .expect("capabilities.tools");
    assert!(tools_capability.is_object());
}

#[test]
fn tools_list_returns_twenty_one_tools_with_each_input_schema() {
    let out = run_mcp_stdio(r#"{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}"#);
    assert_eq!(out.code, 0);
    let lines = parse_stdout_lines(&out.stdout);
    let result = lines[0].get("result").expect("result");
    let tools = result.get("tools").and_then(|v| v.as_array()).expect("tools");
    assert_eq!(tools.len(), 21);
    let names: Vec<&str> = tools
        .iter()
        .map(|t| t.get("name").and_then(|n| n.as_str()).expect("tool name"))
        .collect();
    assert_eq!(names, SCREEN_TOOL_NAMES);
    assert!(!names.contains(&"screen_context"));

    for tool in tools {
        let name = tool.get("name").and_then(|n| n.as_str()).expect("name");
        let schema = tool.get("inputSchema").expect("inputSchema");
        if name == "open_windows" {
            let props = schema.get("properties").and_then(|v| v.as_object());
            assert!(props.is_some_and(|p| p.is_empty()));
            assert_eq!(
                schema.get("additionalProperties").and_then(|v| v.as_bool()),
                Some(false)
            );
            assert!(schema.get("properties").and_then(|p| p.get("window")).is_none());
        } else if READ_SIX.contains(&name)
            || ["focus_window", "close_window", "minimize_window"].contains(&name)
        {
            let window = schema
                .get("properties")
                .and_then(|p| p.get("window"))
                .expect("window");
            assert_eq!(window.get("type").and_then(|v| v.as_str()), Some("string"));
            assert_eq!(
                schema.get("additionalProperties").and_then(|v| v.as_bool()),
                Some(false)
            );
        } else if name == "replace_schedule" {
            assert_eq!(schema.get("type").and_then(|v| v.as_str()), Some("object"));
            let description = schema
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            assert!(description.contains("schemaVersion 8"));
            assert!(schema.get("properties").and_then(|p| p.get("window")).is_none());
        } else if name == "open_new_window" {
            assert_eq!(schema.get("type").and_then(|v| v.as_str()), Some("object"));
            let props = schema.get("properties").and_then(|v| v.as_object()).unwrap();
            assert_eq!(props.get("path").and_then(|v| v.get("type")).and_then(|v| v.as_str()), Some("string"));
            assert_eq!(
                props.get("workspacePath").and_then(|v| v.get("type")).and_then(|v| v.as_str()),
                Some("string")
            );
            let required = schema
                .get("required")
                .and_then(|v| v.as_array())
                .expect("required");
            assert_eq!(required.len(), 1);
            assert_eq!(required[0].as_str(), Some("path"));
            assert!(schema.get("properties").and_then(|p| p.get("window")).is_none());
        } else if name == "apply_explanation_pattern" {
            let props = schema.get("properties").and_then(|v| v.as_object()).unwrap();
            assert_eq!(
                props.get("patternId").and_then(|v| v.get("type")).and_then(|v| v.as_str()),
                Some("string")
            );
            let required = schema.get("required").and_then(|v| v.as_array()).unwrap();
            assert!(required.iter().any(|v| v.as_str() == Some("patternId")));
            assert!(schema.get("properties").and_then(|p| p.get("window")).is_none());
        } else if [
            "set_view",
            "explain_view",
            "explain_overlay",
            "edit_plan",
            "file_action",
            "catalog_action",
            "set_preferences",
            "history",
        ]
        .contains(&name)
        {
            assert_eq!(schema, &serde_json::json!({ "type": "object" }));
        } else {
            panic!("unexpected tool schema branch: {name}");
        }
    }
}

#[test]
fn invalid_json_returns_parse_error_then_initialize_still_succeeds() {
    let out = run_mcp_stdio(
        "{\n{\"jsonrpc\":\"2.0\",\"method\":\"initialize\",\"params\":{},\"id\":2}\n",
    );
    assert_eq!(out.code, 0);
    let lines = parse_stdout_lines(&out.stdout);
    assert_eq!(lines.len(), 2);
    let err = &lines[0];
    assert_eq!(
        err.get("error").and_then(|e| e.get("code")).and_then(|c| c.as_i64()),
        Some(-32700)
    );
    assert_eq!(err.get("id"), Some(&Value::Null));
    let message = err
        .get("error")
        .and_then(|e| e.get("message"))
        .and_then(|m| m.as_str())
        .expect("message");
    assert!(message.starts_with("Parse error:"));
    assert!(lines[1].get("result").is_some());
}

#[test]
fn unknown_method_returns_method_not_found_and_echoes_id() {
    let out = run_mcp_stdio(
        r#"{"jsonrpc":"2.0","method":"no-such-method","params":{},"id":9}"#,
    );
    assert_eq!(out.code, 0);
    let lines = parse_stdout_lines(&out.stdout);
    assert_eq!(lines.len(), 1);
    let err = &lines[0];
    assert_eq!(
        err.get("error").and_then(|e| e.get("code")).and_then(|c| c.as_i64()),
        Some(-32601)
    );
    assert_eq!(
        err.get("error").and_then(|e| e.get("message")).and_then(|m| m.as_str()),
        Some("Method not found: no-such-method")
    );
    assert_eq!(err.get("id"), Some(&Value::from(9)));
}

#[test]
fn tools_call_missing_name_returns_invalid_params_and_not_the_no_window_message() {
    let out = run_mcp_stdio(r#"{"jsonrpc":"2.0","method":"tools/call","params":{},"id":3}"#);
    assert_eq!(out.code, 0);
    let lines = parse_stdout_lines(&out.stdout);
    let err = &lines[0];
    assert_eq!(
        err.get("error").and_then(|e| e.get("code")).and_then(|c| c.as_i64()),
        Some(-32602)
    );
    assert_eq!(
        err.get("error").and_then(|e| e.get("message")).and_then(|m| m.as_str()),
        Some("Invalid params: missing tool name")
    );
    assert!(!out.stdout.contains(NO_WINDOW_STDERR));
}

#[test]
fn notification_writes_no_line_and_ping_returns_empty_object() {
    let out = run_mcp_stdio(
        "{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\",\"params\":{}}\n{\"jsonrpc\":\"2.0\",\"method\":\"ping\",\"params\":{},\"id\":3}\n",
    );
    assert_eq!(out.code, 0);
    let lines = parse_stdout_lines(&out.stdout);
    assert_eq!(lines.len(), 1);
    assert_eq!(lines[0].get("result"), Some(&serde_json::json!({})));
    assert_eq!(lines[0].get("id"), Some(&Value::from(3)));
}

#[test]
fn blank_line_produces_no_response_and_ping_echoes_id() {
    let out = run_mcp_stdio("\n{\"jsonrpc\":\"2.0\",\"method\":\"ping\",\"params\":{},\"id\":4}\n");
    assert_eq!(out.code, 0);
    let lines = parse_stdout_lines(&out.stdout);
    assert_eq!(lines.len(), 1);
    assert_eq!(lines[0].get("id"), Some(&Value::from(4)));
}

#[test]
fn mcp_exits_0_when_stdin_closes_without_a_request() {
    let out = run_mcp_stdio("");
    assert_eq!(out.code, 0);
    assert!(out.stdout.is_empty());
    assert!(out.stderr.is_empty());
}

#[test]
fn front_only_tools_with_window_exit_1_with_empty_stdout_and_the_rejection_on_stderr() {
    for tool in MCP_FRONT_ONLY_TOOL_NAMES {
        let args = [
            "--screen",
            tool,
            "--window",
            "schedule-2",
        ];
        let out = run_screen(&args, None);
        assert_eq!(out.code, 1, "tool {tool}");
        assert!(out.stdout.is_empty(), "tool {tool}");
        let expected = if tool == "open_windows" {
            "open_windows は --window を受け付けません。".to_string()
        } else if tool == "replace_schedule" {
            "replace_schedule は前面ウィンドウだけを置き換えます。--window は使えません。".to_string()
        } else {
            format!("{tool} は前面ウィンドウだけに届きます。--window は使えません。")
        };
        assert_eq!(out.stderr, expected, "tool {tool}");
    }
}

#[test]
fn unknown_screen_tool_exits_1_and_writes_usage_to_stderr() {
    let out = run_screen(&["--screen", "screen_context"], None);
    assert_eq!(out.code, 1);
    assert!(out.stdout.is_empty());
    assert_eq!(out.stderr, USAGE_LINE);
}

#[test]
fn screen_flag_without_tool_exits_1_and_writes_usage_to_stderr() {
    let out = run_screen(&["--screen"], None);
    assert_eq!(out.code, 1);
    assert!(out.stdout.is_empty());
    assert_eq!(out.stderr, USAGE_LINE);
}

#[test]
fn screen_with_extra_arg_exits_1_and_writes_usage_to_stderr() {
    let out = run_screen(&["--screen", "schedule_diff", "extra"], None);
    assert_eq!(out.code, 1);
    assert!(out.stdout.is_empty());
    assert_eq!(out.stderr, USAGE_LINE);
}

#[test]
fn replace_schedule_over_ten_megabytes_exits_1_and_writes_too_large_to_stderr() {
    let stdin = vec![b'x'; MAX_SCHEDULE_BYTES + 1];
    let out = run_screen(&["--screen", "replace_schedule"], Some(&stdin));
    assert_eq!(out.code, 1);
    assert!(out.stdout.is_empty());
    assert_eq!(
        out.stderr,
        "スケジュールが大きすぎるため、置き換えられません。"
    );
    assert!(!out.stderr.contains(NO_WINDOW_STDERR));
}

#[test]
fn replace_schedule_invalid_json_exits_1_and_writes_unreadable_to_stderr() {
    let out = run_screen(&["--screen", "replace_schedule"], Some(b"{"));
    assert_eq!(out.code, 1);
    assert_eq!(
        out.stderr,
        "スケジュールの JSON として読めないので、置き換えられません。"
    );
}

#[test]
fn stdin_action_tools_reject_invalid_json_with_exit_1_and_the_action_message() {
    let message = "操作の JSON として読めないので、実行できません。";
    for tool in MCP_STDIN_ACTION_TOOL_NAMES {
        let out = run_screen(&["--screen", tool], Some(b"{"));
        assert_eq!(out.code, 1, "tool {tool}");
        assert!(out.stdout.is_empty(), "tool {tool}");
        assert_eq!(out.stderr, message, "tool {tool}");
    }
}

#[test]
fn schedule_diff_without_gui_exits_1_and_writes_no_window_to_stderr() {
    let out = run_screen(&["--screen", "schedule_diff"], None);
    assert_eq!(out.code, 1);
    assert!(out.stdout.is_empty());
    assert_eq!(out.stderr, NO_WINDOW_STDERR);
    assert!(!out.stderr.contains("前面のウィンドウが開いていないので、渡せません。"));
}
