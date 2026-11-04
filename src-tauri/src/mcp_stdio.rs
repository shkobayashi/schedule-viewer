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

const MCP_CONNECTION_RULES: &str = "繋がりはルートの `connections` である。predecessors とは別で、日の前後は見ない。日程は動かさない。色、太さ、ふくらみは JSON に書かない。各要素は `taskIds`（実在タスクの UUID がちょうど2つ。同じ id は不可。並びは方向ではない）と `label`（前後の空白を除いて1文字以上）である。taskIds の順だけが違うときは同じ組である。同じ組は1つだけである。足すのは、その組が無いときだけである。自分自身とは組まない。相手が一つに定まらないとき、言葉が空または空白だけのときは、JSON を書かず理由を返す。言葉を変えるときは、同じ組の `label` だけを変える。組を外すときはその要素を除く。残が0件ならキーを書かない。空配列は書かない。繋がりの話でない更新では、`current_schedule` にある `connections` をそのまま残す。足さないし、消さないし、taskIds の順も変えない。タスクを消すときは、その id を含む繋がりも外す。残ったタスク同士はつなぎ直さない。キーの位置は `milestones` のあと、`categories` または `levels` の前である。";

const MCP_CURRENT_SCHEDULE_CONNECTION_READ: &str = "繋がりがあるときはルートの `connections` が保存形と同じ位置で入る。1件以上あるときだけキーがある。`selected_task`、`selected_tasks`、`filtered_tasks` には載らない。";

const MCP_STATUSES_IN_READ_TOOLS: &str = "続けて statuses は、使用中のステータス一覧（id、name、role、description、color.light.bg、color.light.border、color.dark.bg、color.dark.border。instruction がある項目だけ instruction も入る）です。ステータスの色はバーの見た目である。id を選ぶ材料にしない。選ぶ材料は description である。";

const MCP_VIEW_IN_READ_TOOLS: &str = "続けて view は、そのウィンドウの見方（折りたたみ、今映っている日付と行、表示サイズ、行の密度、イナズマ線、左一覧の追加列、配色、稼働日カレンダー）を一度だけ載せます。view.collapsed は今畳んでいる行（kind、id、name）です。view.explanation は説明のための見え方が掛かっているときだけ載り、taskIds と baseCollapsed を含みます。view.explanation.baseCollapsed は人が選んだ折りたたみです。view.visible.dates はチャートに掛っている日付の start と end です。view.visible.rows は縦に見えている行と上に残している見出しです。試しの新しいタスク行だけ kind が task の要素に `trial: true` を載せます。各タスクの visibility は visible、collapsed、scrolledOut のいずれかで、見えている、畳んで隠している、スクロールの外を表します。折りたたみではタスクを減らさない。filtered_tasks の tasks には畳んだ行のタスクも残ります。explanationOverlay は半透明が出ているときだけ載り、`translucent`、`summary`、各印（`taskId` または `date`、`kind`、`label`、任意の `number`、任意の `color`、`visible`）を含みます。任意の `patterns`（各パターンの `id`、`name`、`color`、試しの `tasks`（`trial: true`）、`changes`）も載せます。explanationOverlay.patterns は試しの計画で、`filtered_tasks` の tasks には混ぜない。`current_schedule` には混ぜない。計画のタスクやバーの色ではない。PNG には半透明、抜き、吹き出し、`summary`、試しのバーを写さない。open_windows、schedule_diff、baseline_diffs、current_schedule には explanationOverlay を含めません。同じ応答のあとに、同じ .main の PNG を載せます。設定と閉じているメニューは写しません。1 日の幅は渡しません。displayScale の preference は auto または固定の段、effective は今のウィンドウで効いている倍率です。自動のときは効いている倍率も effective に載せます。colorScheme の preference が system のとき、effective は今効いている light か dark です。システムに合わせているときは効いている方を載せます。ズーム、1 日の幅、日・週・月、スクロール量、左一覧の幅、マイルストンの縦点線、ダイアログの開閉は view に含みません。";

const MCP_SCHEDULE_TALK_HINT: &str = "判断の手順は schedule-talk スキルにある。";

fn tools_list_result() -> Value {
    let read_schema = read_tool_window_schema();
    let current_schedule_description = [
        "画面の確定したスケジュール JSON 全体を返します。保存するときと同じ形です。ディスク上のファイルは読みません。未保存の画面を返します。",
        MCP_CURRENT_SCHEDULE_CONNECTION_READ,
        " window を省略すると前面ウィンドウです。必要なツールだけ呼びます。",
        MCP_SCHEDULE_TALK_HINT,
    ]
    .concat();
    let replace_schedule_description = [
        "デスクトップ版が起動しているとき、開いているスケジュールの更新はこのツールへ渡します。新しいスケジュールファイルの作成や、アプリが起動していないときのファイル書きには使いません。levels が無い JSON は段数 3 として扱い、画面が 3 段以外のときは置き換えません。levels がある JSON は、渡した段数と入れ子が揃っているときだけ、画面の段数と違っても置き換えます。揃っていないときは置き換えません。タスクの status には、読み取りツールの応答にある statuses の id だけを書きます。選ぶ材料は description です。name は画面の名前であり、選ぶ定義にはしません。role はアプリの描き方です。role が done だから完了、とは選びません。二つの description が同じ依頼に合うときは id を選ばず尋ねます。合う項目が無いときは id を作らず、利用者に尋ねます。instruction が無い項目のために進捗や確認を足しません。instruction があるときは、選んだあとにそこに書いてあることだけを守ります。進捗の数値が書いてあればその値にし、移す前に確認すると書いてあれば、移る前の項目と移った先の項目のどちらに書いてあっても、スケジュールを書く前に利用者へ尋ね、答えがあるまで書きません。description と instruction はタスクへコピーしません。タスクの colorId には、色の一覧の id だけを書きます。一覧は、設定ファイルに colors があるときはその JSON を読み、起動中でも MCP の一覧は使わない。設定ファイルはあるが colors が無いときは色の id を書かない。設定ファイルが無いときは読み取りツールの応答にある colors を使う。それも空なら書かない。id は作らない。色を選ぶ材料は description です。name と色の値は選ぶ定義にしません。色を付ける依頼では、文に合う項目が一つならその id を書く。どれにも合わないタスクには colorId を書かず、既に付いていても外す。二つ以上に合いそうなときは id を選ばず尋ね、答えがあるまで書かない。色の話でない更新では今ある colorId を残す。足さないし、消さない。色を外すと頼まれたときだけキーを省く。一覧に無い id を書いた colorId も残します。タスクの assigneeId には、メンバー一覧の id だけを書きます。一覧は、設定ファイルに members があるときはその JSON を読み、起動中でも MCP の一覧は使わない。設定ファイルはあるが members が無いとき、担当を付ける依頼は JSON を書かず不足として返す。設定ファイルが無いときは読み取りツールの応答にある members を使う。それも空なら、担当を付ける依頼は不足として返す。id は作らない。仕事の内容から選ぶときは description だけを見る。表示名は、この選び方には使わない。一つに合う人だけを担当にする。二つ以上に合うときと、どれにも合わないときは尋ね、id は作らない。説明が無い人は、名指しされたときだけ担当に使う。名指しが id か表示名で一人に定まるときは、その id を使う。表示名が二人以上に当たるときは尋ねる。名指しされた人は、説明が別の人に合っていても付け替えない。description はタスクへコピーしない。担当は assigneeId だけである。担当の話でない更新では今ある assigneeId を残す。追加項目の fieldValues は、読み取りツールの応答にある fields の key だけを新しく足します。定義に無い key と差分に出ていない key の値は残します。instruction が空の項目は、値が無いときだけ埋め、既にある値は書き換えません。差分に無い値は作りません。todos があるタスクの progress は件数から決める。スキルが書いた progress では置き換えない。todos を消すときは todos キーを省き、残す progress を progress に書く。",
        MCP_CONNECTION_RULES,
        " 前面ウィンドウのスケジュールだけを、検証済みの JSON 全体で未保存として置き換えます。背面のウィンドウは置き換えません。利用者が前面と違うウィンドウの更新だけを指しているときは、このツールを呼び出さずその旨を伝えます。外部更新の衝突確認が開いているときも置き換えられ、確認は閉じます。ファイルには書きません。置き換えたあと、内容を確認して問題なければ保存するよう利用者に促してください。成功時は FILE-07 と同じ差分テキストだけを返します。",
    ]
    .concat();
    let read_tools_shared_suffix = [
        "応答の先頭の levels は、階層の名前と意味（instruction がある段だけ instruction も入る。最後の段だけ task: true）を一度だけ載せます。",
        MCP_STATUSES_IN_READ_TOOLS,
        "続けて colors は、使用中の色の一覧（id、name、description、color.light.bg、color.dark.bg。一覧が無いときは空の配列）です。続けて members は、メンバー一覧（id、name。空でない description がある人だけ description も入る。一覧が無いときは空の配列）です。assigneeId には members の id だけを書く。一覧は、設定ファイルに members があるときはその JSON を読み、起動中でも MCP の一覧は使わない。設定ファイルはあるが members が無いとき、担当を付ける依頼は JSON を書かず不足として返す。設定ファイルが無いときはこの応答の members を使う。それも空なら、担当を付ける依頼は不足として返す。id は作らない。仕事の内容から選ぶときは description だけを見る。表示名は、この選び方には使わない。一つに合う人だけを担当にする。二つ以上に合うときと、どれにも合わないときは尋ね、id は作らない。説明が無い人は、名指しされたときだけ担当に使う。名指しが id か表示名で一人に定まるときは、その id を使う。表示名が二人以上に当たるときは尋ねる。名指しされた人は、説明が別の人に合っていても付け替えない。description はタスクへコピーしない。担当は assigneeId だけである。続けて fields は、使用中の追加項目の定義（key、name、type。meaning、instruction、required、percent、choices、default は空でないときだけ）を一度だけ載せます。定義が無いときは空の配列です。タスクには、colorId があるときだけ colorId を載せます。値があるときだけ fieldValues（合成キーと値）を載せます。colorId には色の一覧の id だけを書く。一覧は、設定ファイルに colors があるときはその JSON を読み、起動中でも MCP の一覧は使わない。設定ファイルはあるが colors が無いときは色の id を書かない。設定ファイルが無いときはこの応答の colors を使う。それも空なら書かない。色を選ぶ材料は description です。",
        MCP_VIEW_IN_READ_TOOLS,
        " window を省略すると前面ウィンドウです。必要なツールだけ呼びます。",
        MCP_SCHEDULE_TALK_HINT,
    ]
    .concat();
    let selected_task_description = [
        "選択がちょうど1件のとき、そのタスクだけを返します。分割や詳細化の相談で「このタスク」を指すときに使います。選択が無いときと2件以上のときは null です。複数のうちの1件を代表にはしません。選択数が不明なときは selected_tasks を使います。",
        read_tools_shared_suffix.as_str(),
    ]
    .concat();
    let selected_tasks_description = [
        "編集の選択を、タスクの配列で返します。選択が1件のときも要素が1つの配列です。選択数が不明なときはこのツールを使います。一括編集の相談で「これらのタスク」を指すときに使います。選択が無いときは空の配列です。並びはカテゴリ、グループ、タスクの文書順です。",
        read_tools_shared_suffix.as_str(),
    ]
    .concat();
    let filtered_tasks_description = [
        "今オンになっている絞り込み条件と、その条件で残るタスク一覧を返します。破綻のみなどは画面でその条件がオンのときだけ反映されます。",
        read_tools_shared_suffix.as_str(),
    ]
    .concat();
    json!({
        "tools": [
            {
                "name": "open_windows",
                "description": concat!(
                    "開いているスケジュールウィンドウの一覧を JSON 配列で返します。各要素は label、file（パス末尾またはサンプル表示名）、folder（親フォルダ名。無いとき null）、front（引数なしの読み取りが向くウィンドウだけ true）です。絶対パスは含みません。利用者がファイル名や親フォルダ、背面のウィンドウを指したときに、省略した言い方を file と folder へ当てるために使います。一意に当たったときだけ読み取りの window に label を渡します。0 件または 2 件以上のときは前面で代用せず尋ねます。「後ろ」「背面」だけでファイル名が無いときは front が false の 1 件、複数なら尋ねます。ウィンドウもファイルも指していない依頼では呼びません。",
                    "判断の手順は schedule-talk スキルにある。"
                ),
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": false,
                }
            },
            {
                "name": "schedule_diff",
                "description": concat!(
                    "開いているファイルと画面の編集内容の差分テキスト（FILE-07 と同じ）だけを返します。人が直したあとに前後関係を見直すときに使います。タスク一覧は含みません。window を省略すると前面ウィンドウです。必要なツールだけ呼びます。",
                    "判断の手順は schedule-talk スキルにある。"
                ),
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "baseline_diffs",
                "description": concat!(
                    "起点（最後に開いた・保存した・読み直した内容）と、画面とファイルの差分と、id ごとの分類を返します。画面とファイルの両方が動いたときに使います。window を省略すると前面ウィンドウです。必要なツールだけ呼びます。",
                    "判断の手順は schedule-talk スキルにある。"
                ),
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "selected_task",
                "description": selected_task_description,
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "selected_tasks",
                "description": selected_tasks_description,
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "filtered_tasks",
                "description": filtered_tasks_description,
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "current_schedule",
                "description": current_schedule_description,
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "replace_schedule",
                "description": replace_schedule_description,
                "inputSchema": {
                    "type": "object",
                    "description": "schedule-viewer のスケジュール JSON 全体（schemaVersion 8）",
                }
            },
            {
                "name": "focus_window",
                "description": "open_windows の label のウィンドウを前面にします。文書も見方も変えません。読み取りツールは前面にしません。",
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "open_new_window",
                "description": "path のスケジュールを新しいウィンドウで開きます。前面ウィンドウだけに届きます。標準入力に path と workspacePath（任意）を JSON で渡します。",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "path": { "type": "string" },
                        "workspacePath": { "type": "string" },
                    },
                    "required": ["path"],
                }
            },
            {
                "name": "close_window",
                "description": "label のウィンドウを閉じます。未保存のときは discardUnsaved が true のときだけ閉じます。",
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "minimize_window",
                "description": "label のウィンドウを最小化します。文書は変えません。",
                "inputSchema": read_schema.clone(),
            },
            {
                "name": "set_view",
                "description": "前面ウィンドウの見方だけを変えます。計画のファイルは変えず、未保存にもしません。絞り込み、折りたたみ、表示サイズ、行の密度、追加列、配色、イナズマ線、稼働日、ズーム、スクロール、Fit を標準入力の JSON で渡します。",
                "inputSchema": { "type": "object" }
            },
            {
                "name": "explain_view",
                "description": "前面ウィンドウに、説明のための絞り込みと折りたたみだけを掛けます。taskIds と折りたたみの id を標準入力の JSON で渡します。clear で絞り込み、折りたたみ、半透明を消します。次回起動の記録には残しません。読み取りでは view.explanation を見てください。判断の手順は schedule-talk スキルにある。",
                "inputSchema": { "type": "object" }
            },
            {
                "name": "explain_overlay",
                "description": "前面ウィンドウの左の一覧とチャート（日付ヘッダー、マイルストン帯、本体）に、説明の半透明と印を重ねます。translucent が true のとき summary、marks、任意の patterns で置き換え、false で消します。patterns は試しの計画の比較用で、文書には残しません。各印の color は任意で、`#rgb` または `#rrggbb` だけです。省略した印は kind の既定の枠のままです。計画のファイル、差分、次回起動の記録には残しません。読み取り 3 ツールの explanationOverlay を見てください。判断の手順は schedule-talk スキルにある。",
                "inputSchema": { "type": "object" }
            },
            {
                "name": "edit_plan",
                "description": "前面の計画を未保存のまま変えます。ops に日付、担当、並べ替え、先行を順に渡します。成功時は差分テキストを返します。",
                "inputSchema": { "type": "object" }
            },
            {
                "name": "file_action",
                "description": "保存、別名保存、書き出し、開く、設定ファイルの書き出しを、結果の JSON だけで行います。ダイアログは開きません。",
                "inputSchema": { "type": "object" }
            },
            {
                "name": "catalog_action",
                "description": "メンバー、色、ステータス、追加項目の一覧を編集し、save が true のときだけファイルを書きます。",
                "inputSchema": { "type": "object" }
            },
            {
                "name": "set_preferences",
                "description": "JSON作成スキルの置き場所と、起動時の更新確認のオンオフを結果で受け取ります。",
                "inputSchema": { "type": "object" }
            },
            {
                "name": "history",
                "description": "前面ウィンドウで取り消しまたはやり直しを1段だけ行います。見方や選択は戻りません。",
                "inputSchema": { "type": "object" }
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
    use super::{is_mcp_stdio_mode, tools_list_result, MCP_SCHEDULE_TALK_HINT};

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
        assert!(names.contains(&"open_windows"));
        assert!(names.contains(&"replace_schedule"));
        assert!(names.contains(&"set_view"));
        assert!(names.contains(&"explain_view"));
        assert!(names.contains(&"explain_overlay"));
        assert!(names.contains(&"edit_plan"));
        assert!(names.contains(&"focus_window"));
        assert_eq!(names.len(), 20);
        let explain_view = description("explain_view");
        assert!(explain_view.contains("view.explanation"));
        assert!(explain_view.contains("次回起動の記録には残しません"));
        assert!(explain_view.contains(MCP_SCHEDULE_TALK_HINT));
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
        assert!(selected_task.contains("colors"));
        assert!(selected_task.contains("members"));
        assert!(selected_task.contains("colorId があるときだけ colorId"));
        assert!(selected_task.contains("fields"));
        assert!(selected_task.contains("fieldValues"));
        let view_rule_phrases = [
            "折りたたみではタスクを減らさない",
            "view.explanation",
            "explanationOverlay は半透明が出ているときだけ載り、計画のタスクやバーの色ではない。PNG には半透明、抜き、吹き出し、`summary`、試しのバーを写さない。",
            "explanationOverlay.patterns は試しの計画で、`filtered_tasks` の tasks には混ぜない",
            "各印（`taskId` または `date`、`kind`、`label`、任意の `number`、任意の `color`、`visible`）",
            "open_windows、schedule_diff、baseline_diffs、current_schedule には explanationOverlay を含めません",
            "view.visible.dates",
            "試しの新しいタスク行だけ kind が task の要素に `trial: true` を載せます",
            "見えている、畳んで隠している、スクロールの外",
            "自動のときは効いている倍率",
            "システムに合わせているときは効いている",
        ];
        let read_screen_skill = std::fs::read_to_string(
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../read-screen/SKILL.md"),
        )
        .expect("read-screen SKILL.md");
        assert!(
            read_screen_skill.contains("`current_schedule` には `explanationOverlay` を含めない"),
            "read-screen SKILL.md missing explanationOverlay exclusion"
        );
        for phrase in view_rule_phrases {
            assert!(
                read_screen_skill.contains(phrase),
                "read-screen SKILL.md missing {phrase}"
            );
            assert!(
                MCP_VIEW_IN_READ_TOOLS.contains(phrase),
                "MCP_VIEW_IN_READ_TOOLS missing {phrase}"
            );
        }
        for tool in ["selected_task", "selected_tasks", "filtered_tasks"] {
            let desc = description(tool);
            assert!(desc.contains("view"), "{tool} missing view");
            for phrase in view_rule_phrases {
                assert!(
                    desc.contains(phrase),
                    "{tool} description missing {phrase}"
                );
            }
        }
        assert!(selected_task.contains("ステータスの色はバーの見た目"));
        assert!(selected_task.contains("id を選ぶ材料にしない"));
        assert!(selected_task.contains("起動中でも MCP の一覧は使わない"));
        assert!(selected_task.contains("色を選ぶ材料は description"));
        assert!(selected_task.contains("名指し"));
        assert!(description("selected_tasks").contains("起動中でも MCP の一覧は使わない"));
        assert!(description("selected_tasks").contains("members"));
        assert!(description("selected_tasks").contains("名指し"));
        assert!(description("selected_tasks").contains("色を選ぶ材料は description"));
        assert!(description("filtered_tasks").contains("statuses"));
        assert!(description("filtered_tasks").contains("colors"));
        assert!(description("filtered_tasks").contains("members"));
        assert!(description("filtered_tasks").contains("名指し"));
        assert!(description("filtered_tasks").contains("fields"));
        assert!(description("filtered_tasks").contains("起動中でも MCP の一覧は使わない"));
        assert!(description("filtered_tasks").contains("色を選ぶ材料は description"));
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
        assert!(replace_schedule.contains("起動中でも MCP の一覧は使わない"));
        assert!(replace_schedule.contains("members"));
        assert!(replace_schedule.contains("名指し"));
        assert!(replace_schedule.contains("色を選ぶ材料は description"));
        assert!(!replace_schedule.contains("colors の id だけ"));
        assert!(replace_schedule.contains("選ぶ材料は description"));
        assert!(replace_schedule.contains("role が done だから完了"));
        assert!(replace_schedule.contains("instruction が無い項目"));
        assert!(replace_schedule.contains("差分に出ていない key の値は残します"));
        assert!(replace_schedule.contains("渡した段数と入れ子が揃っているときだけ"));
        assert!(replace_schedule.contains("外部更新の衝突確認が開いているときも置き換えられ"));
        assert!(replace_schedule.contains("保存するよう利用者に促してください"));
        assert!(selected_task.contains("instruction がある項目だけ"));
        assert!(replace_schedule.contains("predecessors とは別"));
        assert!(replace_schedule.contains("日の前後は見ない"));
        assert!(replace_schedule.contains("色、太さ、ふくらみは JSON に書かない"));
        assert!(replace_schedule.contains("taskIds の順だけが違うときは同じ組"));
        assert!(replace_schedule.contains("言葉が空または空白だけ"));
        assert!(replace_schedule.contains("繋がりの話でない更新では"));
        assert!(replace_schedule.contains("taskIds の順も変えない"));
        assert!(replace_schedule.contains("残ったタスク同士はつなぎ直さない"));
        let current_schedule = description("current_schedule");
        assert!(current_schedule.contains("connections"));
        assert!(current_schedule.contains("selected_task"));
        assert!(current_schedule.contains("filtered_tasks"));
        assert!(current_schedule.contains("には載らない"));
        const READ_TOOLS: [&str; 7] = [
            "open_windows",
            "schedule_diff",
            "baseline_diffs",
            "selected_task",
            "selected_tasks",
            "filtered_tasks",
            "current_schedule",
        ];
        for tool in READ_TOOLS {
            assert!(
                description(tool).contains(MCP_SCHEDULE_TALK_HINT),
                "{tool} missing schedule-talk hint"
            );
        }
        assert!(
            !replace_schedule.contains(MCP_SCHEDULE_TALK_HINT),
            "replace_schedule must not mention schedule-talk hint"
        );
        let point_by_appearance = std::fs::read_to_string(
            std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("../.cursor/skills/schedule-talk/references/point-by-appearance.md"),
        )
        .expect("point-by-appearance.md");
        for phrase in [
            "斜線はタスクバーだけ",
            "未確定のひし形は中空",
            "イナズマ線は候補にしない",
            "半透明のあいだは人に確認する",
            "色は選ぶ材料にしない",
        ] {
            assert!(
                point_by_appearance.contains(phrase),
                "point-by-appearance.md missing {phrase}"
            );
            assert!(
                !read_screen_skill.contains(phrase),
                "read-screen must not contain appearance phrase {phrase}"
            );
            assert!(
                !selected_task.contains(phrase),
                "selected_task description must not contain appearance phrase {phrase}"
            );
        }
        let screen_judgment = std::fs::read_to_string(
            std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("../.cursor/skills/schedule-talk/references/screen-judgment.md"),
        )
        .expect("screen-judgment.md");
        assert!(screen_judgment.contains("色を選ぶ材料は description"));
        assert!(
            !read_screen_skill.contains("色を選ぶ材料は description"),
            "read-screen must not contain color selection rule"
        );
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
