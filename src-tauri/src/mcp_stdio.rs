use serde_json::{json, Value};
use std::io::{self, BufRead, Write};

use crate::mcp_bridge::call_tool_via_bridge;

const SERVER_NAME: &str = "schedule-viewer";
const SERVER_VERSION: &str = "1.3.1";

pub fn run_mcp_stdio() -> io::Result<()> {
    let stdin = io::stdin();
    let mut stdout = io::stdout();
    let lines = stdin.lock().lines();
    for line in lines {
        let line = line?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let message: Value = match serde_json::from_str(trimmed) {
            Ok(value) => value,
            Err(err) => {
                write_json_rpc_error(
                    &mut stdout,
                    None,
                    -32700,
                    format!("Parse error: {}", err),
                )?;
                continue;
            }
        };
        if let Some(response) = handle_message(&message)? {
            serde_json::to_writer(&mut stdout, &response)?;
            stdout.write_all(b"\n")?;
            stdout.flush()?;
        }
    }
    Ok(())
}

fn handle_message(message: &Value) -> io::Result<Option<Value>> {
    let method = message.get("method").and_then(|v| v.as_str());
    let id = message.get("id").cloned();
    if method.is_none() {
        return Ok(None);
    }
    let method = method.unwrap();
    if id.is_none() && method.starts_with("notifications/") {
        return Ok(None);
    }
    let result = match method {
        "initialize" => Ok(initialize_result()),
        "ping" => Ok(json!({})),
        "tools/list" => Ok(tools_list_result()),
        "tools/call" => handle_tools_call(message),
        _ => Err(json_rpc_error_object(
            id.clone(),
            -32601,
            format!("Method not found: {}", method),
        )),
    };
    match result {
        Ok(value) => Ok(Some(json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": value,
        }))),
        Err(err_obj) => Ok(Some(err_obj)),
    }
}

fn initialize_result() -> Value {
    json!({
        "protocolVersion": "2024-11-05",
        "capabilities": {
            "tools": {}
        },
        "serverInfo": {
            "name": SERVER_NAME,
            "version": SERVER_VERSION,
        }
    })
}

fn tools_list_result() -> Value {
    json!({
        "tools": [
            {
                "name": "schedule_diff",
                "description": "開いているファイルと画面の編集内容の差分テキスト（FILE-07 と同じ）だけを返します。人が直したあとに前後関係を見直すときに使います。タスク一覧は含みません。6つのツールをまとめて呼ぶ必要はありません。",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": false,
                }
            },
            {
                "name": "baseline_diffs",
                "description": "起点（最後に開いた・保存した・読み直した内容）と、画面とファイルの差分と、id ごとの分類を返します。画面とファイルの両方が動いたときに使います。6つのツールをまとめて呼ぶ必要はありません。",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": false,
                }
            },
            {
                "name": "selected_task",
                "description": "前面ウィンドウで選択がちょうど1件のとき、そのタスクだけを返します。分割や詳細化の相談で「このタスク」を指すときに使います。選択が無いときと2件以上のときは null です。複数のうちの1件を代表にはしません。選択数が不明なときは selected_tasks を使います。6つのツールをまとめて呼ぶ必要はありません。",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": false,
                }
            },
            {
                "name": "selected_tasks",
                "description": "前面ウィンドウの編集の選択を、タスクの配列で返します。選択が1件のときも要素が1つの配列です。選択数が不明なときはこのツールを使います。一括編集の相談で「これらのタスク」を指すときに使います。選択が無いときは空の配列です。並びはカテゴリ、グループ、タスクの文書順です。6つのツールをまとめて呼ぶ必要はありません。",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": false,
                }
            },
            {
                "name": "filtered_tasks",
                "description": "今オンになっている絞り込み条件と、その条件で残るタスク一覧を返します。破綻のみなどは画面でその条件がオンのときだけ反映されます。6つのツールをまとめて呼ぶ必要はありません。",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": false,
                }
            },
            {
                "name": "replace_schedule",
                "description": "前面ウィンドウのスケジュールを、検証済みの JSON 全体で未保存として置き換えます。成功時は FILE-07 と同じ差分テキストだけを返します。ファイルには書きません。",
                "inputSchema": {
                    "type": "object",
                    "description": "schedule-viewer のスケジュール JSON 全体（schemaVersion 7）",
                }
            }
        ]
    })
}

fn handle_tools_call(message: &Value) -> Result<Value, Value> {
    let id = message.get("id").cloned();
    let params = message.get("params").cloned().unwrap_or(Value::Null);
    let name = params
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let arguments = params.get("arguments").cloned().unwrap_or(json!({}));
    if name.is_empty() {
        return Err(json_rpc_error_object(
            id,
            -32602,
            "Invalid params: missing tool name".to_string(),
        ));
    }
    Ok(match call_tool_via_bridge(name, arguments) {
        Ok(body) => body,
        Err(err) => tool_error_result(&err.user_message()),
    })
}

fn tool_error_result(text: &str) -> Value {
    json!({
        "content": [{ "type": "text", "text": text }],
        "isError": true,
    })
}

fn json_rpc_error_object(id: Option<Value>, code: i32, message: String) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "error": {
            "code": code,
            "message": message,
        }
    })
}

fn write_json_rpc_error(
    stdout: &mut io::Stdout,
    id: Option<Value>,
    code: i32,
    message: String,
) -> io::Result<()> {
    let err = json_rpc_error_object(id, code, message);
    serde_json::to_writer(&mut *stdout, &err)?;
    stdout.write_all(b"\n")?;
    stdout.flush()?;
    Ok(())
}

pub fn is_mcp_stdio_mode(args: &[String]) -> bool {
    args.len() == 1 && args[0] == "--mcp"
}

#[cfg(test)]
mod tests {
    use super::{is_mcp_stdio_mode, tools_list_result};

    #[test]
    fn mcp_stdio_mode_requires_only_flag() {
        assert!(is_mcp_stdio_mode(&["--mcp".to_string()]));
        assert!(!is_mcp_stdio_mode(&[]));
        assert!(!is_mcp_stdio_mode(&["--mcp".to_string(), "extra".to_string()]));
    }

    #[test]
    fn tools_list_exposes_screen_tools() {
        let result = tools_list_result();
        let tools = result
            .get("tools")
            .and_then(|v| v.as_array())
            .expect("tools array");
        let names: Vec<&str> = tools
            .iter()
            .filter_map(|t| t.get("name").and_then(|n| n.as_str()))
            .collect();
        assert_eq!(
            names,
            [
                "schedule_diff",
                "baseline_diffs",
                "selected_task",
                "selected_tasks",
                "filtered_tasks",
                "replace_schedule",
            ]
        );
        assert!(!names.contains(&"screen_context"));
        let description = |name: &str| {
            tools
                .iter()
                .find(|t| t.get("name").and_then(|n| n.as_str()) == Some(name))
                .and_then(|t| t.get("description").and_then(|d| d.as_str()))
                .unwrap_or("")
        };
        let selected_tasks = description("selected_tasks");
        assert!(selected_tasks.contains("選択が1件のときも要素が1つの配列です"));
        assert!(selected_tasks.contains("選択数が不明なときはこのツールを使います"));
        let selected_task = description("selected_task");
        assert!(selected_task.contains("選択数が不明なときは selected_tasks を使います"));
    }
}
