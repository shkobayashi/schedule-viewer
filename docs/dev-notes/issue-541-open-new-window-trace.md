# Issue #541: MCP `open_new_window` 二重ウィンドウの診断トレース

本番で再発したときだけ、原因仮説 H1〜H3 を切り分けるための **観測専用** 記録です。挙動は変えていません。再現が無い間は原因未証明のままです。

## 仮説とトレース上の見え方

| 仮説 | 内容 | 再発時に supporting となりうる署名 | refuting となりうる署名 |
| --- | --- | --- | --- |
| H1 | ブリッジが配信成功後に emit 失敗とみなし同一 `requestId` で再試行し、二回作成する | **同一 `requestId`** で `bridge-emit-failed` → `bridge-emit-retry` のあと **`frontend-created` が 2 行**（ラベルが異なる） | 同一 `requestId` で `frontend-created` が 1 行だけ、または `frontend-duplicate-skip` で 2 回目が抑止 |
| H2 | クライアントがタイムアウト後に **別の MCP 呼び出し**を送り、`requestId` が 2 つで各 1 作成 | **`bridge-receive` が 2 行で `requestId` が異なる**、各 ID に `frontend-created` が 1 行 | 二重ウィンドウなのに `bridge-receive` が 1 `requestId` だけ |
| H3 | 同一 ID の遅延再配信が、フロントの in-flight 解除後に実行され、`bridge-emit-failed` 無しで二回作成 | **同一 `requestId`**、`bridge-emit-failed` / `bridge-emit-retry` **無し**で `frontend-receive` または `frontend-execute-start` が **2 回**し、**`frontend-created` が 2 行** | 2 回目が `frontend-duplicate-skip` のみ |

`schedule-pending-open` は本番 UI が listen していないため、二重の原因仮説には含めません。

## ログの場所と取得

- ファイル名: `open-new-window-trace.jsonl`
- 場所: デスクトップ版のアプリデータディレクトリ（OS ごとに [development.md](../development.md) の「アプリデータ」と同じルート）
- 1 行 1 レコード（JSON）。上限おおよそ 256 KiB（超過時は末尾側を残して切り詰め）

```bash
# Linux の例（実際のパスは環境による）
tail -n 50 ~/.local/share/schedule-viewer/open-new-window-trace.jsonl
```

## フィールド（allowlist）

| フィールド | 意味 |
| --- | --- |
| `requestId` | ブリッジ〜前面 WebView まで共通の UUID（層ごとに別 ID は付けない） |
| `phase` | 下表の固定値のみ |
| `origin` | `bridge` または `frontend` |
| `windowLabel` | 分かるときだけ（新規ラベルや返却ラベル）。パス・JSON 本文は記録しない |
| `handlerLabel` | MCP を処理した前面ウィンドウのラベル |
| `sequence` | 省略可。emit 再試行の回数（0 が初回） |

### `phase` 一覧

- `bridge-receive` — ブリッジが `open_new_window` を受信
- `bridge-emit` — WebView への emit 成功
- `bridge-emit-failed` — emit 失敗
- `bridge-emit-retry` — 失敗後の再 emit 開始
- `bridge-timeout` — 応答待ちタイムアウト
- `bridge-complete` — ブリッジが応答を返す直前（成功時は `windowLabel` に返却ラベル）
- `frontend-receive` — `mcp-screen-request` を受信
- `frontend-duplicate-skip` — 同一 `requestId` の in-flight 重複を無視（H3 抑止）
- `frontend-execute-start` — `create_schedule_window` 呼び出し直前
- `frontend-created` — 作成成功（`windowLabel` が新ラベル）

記録の失敗は操作を失敗させません（非同期・握りつぶし）。
