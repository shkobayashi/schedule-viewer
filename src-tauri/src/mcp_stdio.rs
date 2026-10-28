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
                write_json_rpc_error(&mut stdout, None, -32700, format!("Parse error: {}", err))?;
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

fn read_tool_window_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "window": {
                "type": "string",
                "description": "開いているウィンドウの内部ラベル（open_windows の label）。省略時は前面ウィンドウ。ファイル名やフォルダ名はここでは使えません。利用者がファイル名などでウィンドウを指したときは、先に open_windows で一覧を取り、省略した言い方を file と folder へ当て、一意に当たったときだけこの引数に label を渡します。0 件または 2 件以上に当たるときは前面の内容で代用せず、file・folder・どちらが前面かだけを伝えて尋ねます（絶対パスは書きません）。「後ろ」「背面」だけでファイル名が無いときは、front が false の行が 1 件ならそれ、複数なら尋ねます。読んでもそのウィンドウは前面にしません。",
            }
        },
        "additionalProperties": false,
    })
}

fn tools_list_result() -> Value {
    let read_schema = read_tool_window_schema();
    json!({
        "tools": [
            {
                "name": "open_windows",
                "description": "開いているスケジュールウィンドウの一覧を JSON 配列で返します。各要素は label、file（パス末尾またはサンプル表示名）、folder（親フォルダ名。無いとき null）、front（引数なしの読み取りが向くウィンドウだけ true）です。絶対パスは含みません。利用者がファイル名や親フォルダ、背面のウィンドウを指したときに、省略した言い方を file と folder へ当てるために使います。一意に当たったときだけ読み取りの window に label を渡します。0 件または 2 件以上のときは前面で代用せず尋ねます。「後ろ」「背面」だけでファイル名が無いときは front が false の 1 件、複数なら尋ねます。ウィンドウもファイルも指していない依頼では呼びません。",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": false,
                }
            },
            {
                "name": "schedule_diff",
                "description": "開いているファイルと画面の編集内容の差分テキスト（FILE-07 と同じ）だけを返します。人が直したあとに前後関係を見直すときに使います。タスク一覧は含みません。window を省略すると前面ウィンドウです。必要なツールだけ呼びます。",
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "baseline_diffs",
                "description": "起点（最後に開いた・保存した・読み直した内容）と、画面とファイルの差分と、id ごとの分類を返します。画面とファイルの両方が動いたときに使います。window を省略すると前面ウィンドウです。必要なツールだけ呼びます。",
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "selected_task",
                "description": "選択がちょうど1件のとき、そのタスクだけを返します。分割や詳細化の相談で「このタスク」を指すときに使います。選択が無いときと2件以上のときは null です。複数のうちの1件を代表にはしません。選択数が不明なときは selected_tasks を使います。応答の先頭の levels は、階層の名前と意味（instruction がある段だけ instruction も入る。最後の段だけ task: true）を一度だけ載せます。続けて statuses は、使用中のステータス一覧（id、name、role、description。instruction がある項目だけ instruction も入る）です。続けて fields は、使用中の追加項目の定義（key、name、type。meaning、instruction、required、percent、choices、default は空でないときだけ）を一度だけ載せます。定義が無いときは空の配列です。タスクには、値があるときだけ fieldValues（合成キーと値）を載せます。window を省略すると前面ウィンドウです。必要なツールだけ呼びます。",
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "selected_tasks",
                "description": "編集の選択を、タスクの配列で返します。選択が1件のときも要素が1つの配列です。選択数が不明なときはこのツールを使います。一括編集の相談で「これらのタスク」を指すときに使います。選択が無いときは空の配列です。並びはカテゴリ、グループ、タスクの文書順です。応答の先頭の levels は、階層の名前と意味（instruction がある段だけ instruction も入る。最後の段だけ task: true）を一度だけ載せます。続けて statuses は、使用中のステータス一覧（id、name、role、description。instruction がある項目だけ instruction も入る）です。続けて fields は、使用中の追加項目の定義（key、name、type。meaning、instruction、required、percent、choices、default は空でないときだけ）を一度だけ載せます。定義が無いときは空の配列です。タスクには、値があるときだけ fieldValues（合成キーと値）を載せます。window を省略すると前面ウィンドウです。必要なツールだけ呼びます。",
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "filtered_tasks",
                "description": "今オンになっている絞り込み条件と、その条件で残るタスク一覧を返します。破綻のみなどは画面でその条件がオンのときだけ反映されます。応答の先頭の levels は、階層の名前と意味（instruction がある段だけ instruction も入る。最後の段だけ task: true）を一度だけ載せます。続けて statuses は、使用中のステータス一覧（id、name、role、description。instruction がある項目だけ instruction も入る）です。続けて fields は、使用中の追加項目の定義（key、name、type。meaning、instruction、required、percent、choices、default は空でないときだけ）を一度だけ載せます。定義が無いときは空の配列です。タスクには、値があるときだけ fieldValues（合成キーと値）を載せます。window を省略すると前面ウィンドウです。必要なツールだけ呼びます。",
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "current_schedule",
                "description": "画面の確定したスケジュール JSON 全体を返します。保存するときと同じ形です。ディスク上のファイルは読みません。未保存の画面を返します。window を省略すると前面ウィンドウです。必要なツールだけ呼びます。",
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "replace_schedule",
                "description": "デスクトップ版が起動しているとき、開いているスケジュールの更新はこのツールへ渡します。新しいスケジュールファイルの作成や、アプリが起動していないときのファイル書きには使いません。levels が無い JSON は段数 3 として扱い、画面が 3 段以外のときは置き換えません。levels がある JSON は、渡した段数と入れ子が揃っているときだけ、画面の段数と違っても置き換えます。揃っていないときは置き換えません。タスクの status には、読み取りツールの応答にある statuses の id だけを書きます。選ぶ材料は description です。name は画面の名前であり、選ぶ定義にはしません。role はアプリの描き方です。role が done だから完了、とは選びません。二つの description が同じ依頼に合うときは id を選ばず尋ねます。合う項目が無いときは id を作らず、利用者に尋ねます。instruction が無い項目のために進捗や確認を足しません。instruction があるときは、選んだあとにそこに書いてあることだけを守ります。進捗の数値が書いてあればその値にし、移す前に確認すると書いてあれば、移る前の項目と移った先の項目のどちらに書いてあっても、スケジュールを書く前に利用者へ尋ね、答えがあるまで書きません。description と instruction はタスクへコピーしません。追加項目の fieldValues は、読み取りツールの応答にある fields の key だけを新しく足します。定義に無い key と差分に出ていない key は残します。instruction が空の項目は、値が無いときだけ埋め、既にある値は書き換えません。差分に無い値は作りません。todos があるタスクの progress は件数から決める。スキルが書いた progress では置き換えない。todos を消すときは todos キーを省き、残す progress を progress に書く。前面ウィンドウのスケジュールだけを、検証済みの JSON 全体で未保存として置き換えます。背面のウィンドウは置き換えません。利用者が前面と違うウィンドウの更新だけを指しているときは、このツールを呼び出さずその旨を伝えます。成功時は FILE-07 と同じ差分テキストだけを返します。ファイルには書きません。",
                "inputSchema": {
                    "type": "object",
                    "description": "schedule-viewer のスケジュール JSON 全体（schemaVersion 8）",
                }
            }
        ]
    })
}

fn handle_tools_call(message: &Value) -> Result<Value, Value> {
    let id = message.get("id").cloned();
    let params = message.get("params").cloned().unwrap_or(Value::Null);
    let name = params.get("name").and_then(|v| v.as_str()).unwrap_or("");
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
        assert!(!is_mcp_stdio_mode(&[
            "--mcp".to_string(),
            "extra".to_string()
        ]));
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
                "open_windows",
                "schedule_diff",
                "baseline_diffs",
                "selected_task",
                "selected_tasks",
                "filtered_tasks",
                "current_schedule",
                "replace_schedule",
            ]
        );
        let schedule_diff = tools
            .iter()
            .find(|t| t.get("name").and_then(|n| n.as_str()) == Some("schedule_diff"))
            .expect("schedule_diff");
        let props = schedule_diff
            .get("inputSchema")
            .and_then(|s| s.get("properties"))
            .and_then(|p| p.get("window"))
            .expect("window property");
        assert_eq!(props.get("type").and_then(|t| t.as_str()), Some("string"));
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
        assert!(selected_task.contains("statuses"));
        assert!(selected_task.contains("fields"));
        assert!(selected_task.contains("fieldValues"));
        assert!(description("filtered_tasks").contains("statuses"));
        assert!(description("filtered_tasks").contains("fields"));
        assert!(selected_tasks.contains("fieldValues"));
        let open_windows = description("open_windows");
        assert!(open_windows.contains("一意に当たったときだけ"));
        assert!(open_windows.contains("0 件または 2 件以上"));
        let window_prop = schedule_diff
            .get("inputSchema")
            .and_then(|s| s.get("properties"))
            .and_then(|p| p.get("window"))
            .and_then(|w| w.get("description"))
            .and_then(|d| d.as_str())
            .unwrap_or("");
        assert!(window_prop.contains("絶対パスは書きません"));
        assert!(window_prop.contains("front が false"));
        let replace_schedule = description("replace_schedule");
        assert!(replace_schedule.contains("開いているスケジュールの更新はこのツールへ渡します"));
        assert!(replace_schedule.contains("新しいスケジュールファイルの作成"));
        assert!(replace_schedule.contains("前面と違うウィンドウ"));
        assert!(replace_schedule.contains("statuses の id だけ"));
        assert!(replace_schedule.contains("選ぶ材料は description"));
        assert!(replace_schedule.contains("role が done だから完了"));
        assert!(replace_schedule.contains("instruction が無い項目"));
        assert!(replace_schedule.contains("差分に出ていない key の値は残します"));
        assert!(replace_schedule.contains("渡した段数と入れ子が揃っているときだけ"));
        assert!(selected_task.contains("instruction がある項目だけ"));
        let replace_schema = tools
            .iter()
            .find(|t| t.get("name").and_then(|n| n.as_str()) == Some("replace_schedule"))
            .and_then(|t| t.get("inputSchema"))
            .expect("replace_schedule schema");
        assert!(replace_schema
            .get("properties")
            .and_then(|p| p.get("window"))
            .is_none());
    }
}
