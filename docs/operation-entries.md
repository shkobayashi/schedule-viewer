# 操作の入口一覧

利用者が同じ操作を始められる場所を、内部用に1行1操作で並べた表である。利用者向けの手順書ではない。[機能チェックリスト](feature-checklist.md) の「操作の入口」と [外部仕様](external-spec.md) の機能 ID と対応づける。

## 列の意味

| 列 | 意味 |
| --- | --- |
| 操作 | この行で扱う操作の呼び名（表内の見出し用。入口のラベルとは限らない） |
| 正式名 | ☰・macOS・パレット・右クリック・案内の共通ラベル（`src/model/operationLabels.ts` の `OPERATION_FORMAL`） |
| 略称 | ツールバーだけの短いラベル（同ファイルの `TOOLBAR_SHORT`） |
| ツールバー | 画面上部ツールバー。略称がある操作は `TOOLBAR_SHORT`、それ以外は正式名 |
| 右クリック | チャート／一覧のコンテキストメニュー（`src/App.tsx` の `contextMenuItems`） |
| コマンドパレット | ⌘/Ctrl+K の一覧（`src/model/commandPalette.ts` の `label`） |
| ショートカット (Mac / Win) | キー割り当て（`src/model/shortcuts.ts` とメニューに出すヒント。未記載の入口は空） |
| macOS メニュー | Tauri アプリメニュー（`src/hooks/useMacOSAppMenu.ts`。デスクトップ macOS のみ） |
| ☰ | ☰ メニュー（`src/components/AppMenu.tsx`） |
| 操作の案内 | `src/model/guideContent.ts` でその操作に触れる文（要約。ボタン名ではない） |
| MCP | MCP ツール名（`src/model/mcpToolNames.ts`）。`file_action` などは JSON の `action` を括弧で足す |
| CLI | `--screen` のツール名（MCP と同じ名前。読み取りで `--window` が要るものは注記） |
| 機能 ID | [外部仕様の機能](external-spec.md#機能) の ID |

空のセルは、その入口からは始められない（または該当する固定ラベルが無い）ことを示す。

## ラベルの出所

表示名は、上記ソースの文字列をそのまま書く。動的なラベルは、ソースの式をバッククォートで示す。macOS の `PredefinedMenuItem`（Cut など）は Tauri が OS 文言を出すため、コード上の識別子を書く。

---

## ファイルとウィンドウ

| 操作 | ツールバー | 右クリック | コマンドパレット | ショートカット (Mac / Win) | macOS メニュー | ☰ | 操作の案内 | MCP | CLI | 機能 ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 開く | | | 開く | ⌘O / Ctrl+O | 開く | 開く | スケジュールは、☰ の「開く」で読み込む | `file_action` (open) | `--screen file_action` | `FILE-01` |
| 最近開いたファイルの1件を開く | | | `recentFileCommandPaletteLabel(\`最近開いたファイル ${prefix}${entry.label}\`)`（`src/model/recentFiles.ts`） | | サブメニュー内 `entry.label` | サブメニュー内 `entry.label` | | `file_action` (open) | `--screen file_action` | `FILE-09` |
| 履歴を消す | | | 履歴を消す | | 履歴を消す | 履歴を消す | | | | `FILE-09` |
| 新しいウィンドウで開く | | | 新しいウィンドウで開く | ⌘⇧O / Ctrl+Shift+O | 新しいウィンドウで開く | 新しいウィンドウで開く | | `open_new_window` | `--screen open_new_window` | `WIN-04` |
| 保存 | | | 保存 | ⌘S / Ctrl+S | 保存 | 保存 | | `file_action` (save) | `--screen file_action` | `FILE-02` |
| 別名保存 | | | 別名保存 | ⌘⇧S / Ctrl+Shift+S | 別名保存 | 別名保存 | | `file_action` (saveAs) | `--screen file_action` | `FILE-03` |
| 書き出し（HTML / SVG / Excel） | | | 書き出し | | 書き出し | 書き出し | ☰ の「書き出し」で HTML、SVG、または Excel（デスクトップ版） | `file_action` (export) | `--screen file_action` | `EXPORT-01`〜`EXPORT-03` |
| 設定ファイルを新しいフォルダへ書き出す | | | | | 設定ファイルを新しいフォルダへ書き出す | 設定ファイルを新しいフォルダへ書き出す | | `file_action` (exportWorkspace) | `--screen file_action` | `FILE-11` |
| JSON を表示 | | | JSON を表示 | | JSON を表示 | JSON を表示 | | | | `FILE-06` |
| 差分を表示 | | | 差分を表示 | | 差分を表示 | 差分を表示 | 画面と開いているファイルの違いは、☰ の「差分を表示」、または状態バーの「未保存」 | | | `FILE-04` |
| 差分をコピー | | | 差分をコピー | ⌘⇧D / Ctrl+Shift+D | 差分をコピー | 差分をコピー | | | | `FILE-05` |
| 未保存の差分を開く（状態バー） | `未保存`（`saveStatus`。`StatusBar.tsx`） | | | | | | 同上 | | | `FILE-04` |
| 外部ファイル更新の確認 | `ファイルに更新あり — 確認する` | | | | | | 状態バーの「ファイルに更新あり — 確認する」から確認を開く | | | `SYNC-01` |
| 更新を確認 | | | 更新を確認 | | schedule-viewer を終了 の上（アプリメニュー） | 更新を確認 | 設定の「更新」（案内内の説明） | | | `SET-06` |
| 設定を開く | | | 設定 | ⌘, / Ctrl+, | 設定（⌘,） | 設定（⌘, / Ctrl+,） | | `set_preferences` | `--screen set_preferences` | `SET-01` 他 |
| ウィンドウを閉じる | | | | ⌘W（macOS メニューのみ） | 閉じる | | | `close_window` | `--screen close_window --window <label>` | `FILE-07` |
| ウィンドウを最小化 | | | | ⌘M（`PredefinedMenuItem` Minimize） | Minimize | | | `minimize_window` | `--screen minimize_window --window <label>` | |
| アプリを終了 | | | | ⌘Q（`matchMacAppQuit`。メニューは schedule-viewer を終了） | schedule-viewer を終了 | | | | | `FILE-07` |
| 前面ウィンドウを前面にする | | | | | | | | `focus_window` | `--screen focus_window --window <label>` | `MCP-01` |
| 開いているウィンドウ一覧を読む | | | | | | | | `open_windows` | `--screen open_windows` | `MCP-01` |

---

## 画面の移動と入口

| 操作 | ツールバー | 右クリック | コマンドパレット | ショートカット (Mac / Win) | macOS メニュー | ☰ | 操作の案内 | MCP | CLI | 機能 ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| コマンドパレットを開く／閉じる | | | （パレット自身） | ⌘K / Ctrl+K | | | ⌘ または Ctrl+K でコマンドパレットを開く | | | `NAV-07` |
| 操作の案内を開く | 案内（`TOOLBAR_SHORT.guide`。title は操作の案内） | | 操作の案内 | | 操作の案内 | 操作の案内 | （ダイアログ本文。固定ラベルではない） | | | `NAV-08` |
| ショートカット一覧を開く | `?`（title: ショートカット一覧（?、F1）） | | ショートカット一覧 | ? / F1 | ショートカット一覧 | ショートカット一覧 | キーの一覧は、? と F1、または「ショートカット一覧」 | | | `NAV-08` |
| タスク名／ノートで検索 | `名前` / `ノート`（select）＋ placeholder `タスク名で検索` / `ノートで検索` | | 検索 | ⌘F / Ctrl+F | | | 上の「絞り込み」で、残す行を選ぶ（検索欄自体は案内に未記名） | `set_view`（filters） | `--screen set_view` | `FILTER-01` |
| 今日へ移動 | 今日（title に T） | | 今日 | T | 今日（T） | | | `set_view` | `--screen set_view` | `NAV-01` |
| 日表示 | `日`（tier-toggle。title に ⌘/Ctrl+1） | | 日表示 | ⌘1 / Ctrl+1 | 日表示（⌘1） | | | `set_view` | `--screen set_view` | `NAV-02` |
| 週表示 | `週`（title に ⌘/Ctrl+2） | | 週表示 | ⌘2 / Ctrl+2 | 週表示（⌘2） | | | `set_view` | `--screen set_view` | `NAV-02` |
| 月表示 | `月`（title に ⌘/Ctrl+3） | | 月表示 | ⌘3 / Ctrl+3 | 月表示（⌘3） | | | `set_view` | `--screen set_view` | `NAV-02` |
| 全体表示 | 全体（title に ⌘/Ctrl+4） | | 全体 | ⌘4 / Ctrl+4 | 全体（⌘4） | | | `set_view` | `--screen set_view` | `NAV-03` |
| 表示サイズを拡大 | | | 表示サイズを拡大 | ⌘+ / ⌘= / Ctrl+ / Ctrl= | | | | `set_view` | `--screen set_view` | `NAV-01` |
| 表示サイズを縮小 | | | 表示サイズを縮小 | ⌘− / Ctrl− | | | | `set_view` | `--screen set_view` | `NAV-01` |
| チャートをスクロール | | | | ⌘矢印 / Ctrl+矢印 | | | | `set_view` | `--screen set_view` | `NAV-01` |
| ズーム（ホイール） | | | | ⌘+ホイール / Ctrl+ホイール（`shortcutReferenceRows`） | | | | | | `NAV-01` |
| 横スクロール（ホイール） | | | | Shift+ホイール | | | | | | `NAV-01` |
| スケジュールのタイトルを変更 | `タイトルを変更`（aria-label / title。鉛筆） | | タイトルを変更 | | | | 見出しの右の鉛筆で、スケジュールのタイトル（JSON の title）をその場で変えられる | `edit_plan` | `--screen edit_plan` | `EDIT-20` |
| 階層の名前・意味・指示を編集 | 階層編集 | | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-21` |

---

## 絞り込み

| 操作 | ツールバー | 右クリック | コマンドパレット | ショートカット (Mac / Win) | macOS メニュー | ☰ | 操作の案内 | MCP | CLI | 機能 ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 絞り込みパネルを開く | `絞り込み`（title に ⌘⇧F / Ctrl+Shift+F） | | 絞り込み | ⌘⇧F / Ctrl+Shift+F | | | 上の「絞り込み」で、残す行を選ぶ | `set_view` | `--screen set_view` | `FILTER-01` 他 |
| 絞り込みをすべて解除 | `すべて解除`（`ActiveFilterBar.tsx`） | | | | | | | `set_view` | `--screen set_view` | `FILTER-01` |
| 系統を表示／解除 | `系統` または `系統: ${lineageName}`（title に ⌘⇧L / Ctrl+Shift+L） | | `系統を表示` / `系統を解除` | ⌘⇧L / Ctrl+Shift+L | | | タスクを選んで「系統」を押すと… | `set_view` | `--screen set_view` | `FILTER-08` |
| 系統（繋がりも辿る） | `繋がりも辿る`（系統 split メニュー） | | | | | | | `set_view` | `--screen set_view` | `FILTER-08` |
| 線を引くモード | `線を引く` または `線を引く: ${linkSourceName}` | | 線を引く | ⌘L / Ctrl+L | | | | | | `EDIT-05` |
| マイルストン帯の印を非表示 | | 非表示 | | | | | | `set_view` | `--screen set_view` | `FILTER-06` |
| このマイルストンだけ表示 | | このマイルストンだけ表示 | | | | | | `set_view` | `--screen set_view` | `FILTER-06` |
| マイルストン帯の行を非表示 | | 非表示 | | | | | | `set_view` | `--screen set_view` | `FILTER-06` |
| この行だけ表示（帯グループ） | | この行だけ表示 | | | | | | `set_view` | `--screen set_view` | `FILTER-06` |
| 絞り込み結果のタスク一覧を読む | | | | | | | | `filtered_tasks` | `--screen filtered_tasks --window <label>` | `MCP-01` |

---

## 編集

| 操作 | ツールバー | 右クリック | コマンドパレット | ショートカット (Mac / Win) | macOS メニュー | ☰ | 操作の案内 | MCP | CLI | 機能 ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 取り消し | 取り消し | | 取り消し | ⌘Z / Ctrl+Z | 取り消し | | | `history` (undo) | `--screen history` | `EDIT-10` |
| やり直し | やり直し | | やり直し | ⌘⇧Z / Ctrl+Shift+Z / Ctrl+Y | やり直し | | | `history` (redo) | `--screen history` | `EDIT-10` |
| タスクを追加 | `追加`（split 主ボタン）／メニュー `タスクを追加` | | タスクを追加 | ⌘+Enter / Insert / Ctrl+Enter | | | | `edit_plan` | `--screen edit_plan` | `EDIT-08` |
| マイルストンを追加 | 追加メニュー `マイルストンを追加` | マイルストンを追加 | マイルストンを追加 | ⌘⇧Enter / Ctrl+Shift+Enter | | | | `edit_plan` | `--screen edit_plan` | `EDIT-07` |
| タスクを編集（詳細） | | 編集 | 編集 | Enter | | | | `edit_plan` | `--screen edit_plan` | `EDIT-04` |
| タスクを削除 | 削除 | 削除 | 削除 | Delete / Backspace | | | | `edit_plan` | `--screen edit_plan` | `EDIT-09` |
| タスクを複製 | | 複製 | 複製 | Alt+Shift+↓ | | | | `edit_plan` | `--screen edit_plan` | `EDIT-14` |
| 同じグループ内で並べ替え | | | | Alt+↑ / Alt+↓ | | | | `edit_plan` | `--screen edit_plan` | `EDIT-15` |
| ノートを開く | | ノート | ノート | ⌘N / Ctrl+N | | | | `edit_plan` | `--screen edit_plan` | `EDIT-06` |
| 系統を表示／解除（タスク） | | `系統を表示` / `系統を解除`（⌘⇧L / Ctrl+Shift+L） | `系統を表示` / `系統を解除` | ⌘⇧L / Ctrl+Shift+L | | | | `set_view` | `--screen set_view` | `FILTER-08` |
| 確定／未確定（タスク） | | `確定にする` / `未確定にする`（⌘⇧U / Ctrl+Shift+U） | | ⌘⇧U / Ctrl+Shift+U | | | | `edit_plan` | `--screen edit_plan` | `VIEW-07` |
| 確定／未確定（マイルストン） | | 同上 | | | | | | `edit_plan` | `--screen edit_plan` | `VIEW-07` |
| マイルストンを編集 | | 編集 | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-07` |
| マイルストンを削除 | | 削除 | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-07` |
| 前後の線を外す | | `線を外す` | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-12` |
| 繋がりを外す | | 繋がりを外す | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-23` |
| カテゴリ名を変更 | | 名前を変更 | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-13` |
| 下にカテゴリを追加 | | 下にカテゴリを追加 | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-18` |
| グループを追加（カテゴリ下） | | グループを追加 | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-18` |
| グループ名を変更 | | 名前を変更 | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-13` |
| 下にグループを追加 | | 下にグループを追加 | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-18` |
| 階層名を変更（アウトライン） | | 名前を変更 | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-13` |
| 下に階層を追加 | | `下に${levelName}を追加` | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-18` |
| 子階層を追加 | | `${childName}を追加` | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-18` |
| カテゴリ／グループ／階層を削除 | | 削除 | | | | | | `edit_plan` | `--screen edit_plan` | `EDIT-19` |
| タスクバーをドラッグして期間変更 | （ドラッグ。固定ラベルなし） | | | | | | チャートのバーを横にドラッグすると、期間が動く | `edit_plan` | `--screen edit_plan` | `EDIT-02`、`EDIT-03` |
| タスクを追加選択 | | | | ⌘+クリック / Ctrl+クリック | | | | | | `EDIT-01` |
| タスクを範囲選択 | | | | Shift+クリック | | | | | | `EDIT-01` |
| 選択を伸ばす | | | | Shift+↑↓ | | | | | | `EDIT-01` |
| 説明を消す | `説明を消す`（バナー） | | | | | | 「説明を消す」で元の見え方に戻る | | | `VIEW-16` |
| 前面スケジュールを置き換え | | | | | | | | `replace_schedule` | `--screen replace_schedule` | `MCP-01` |
| 選択中タスクを1件読む | | | | | | | | `selected_task` | `--screen selected_task --window <label>` | `MCP-01` |
| 選択中タスクを読む（複数） | | | | | | | | `selected_tasks` | `--screen selected_tasks --window <label>` | `MCP-01` |
| 画面のスケジュール JSON を読む | | | | | | | | `current_schedule` | `--screen current_schedule --window <label>` | `MCP-01` |
| 差分テキストを読む | | | | | | | | `schedule_diff` | `--screen schedule_diff --window <label>` | `MCP-01` |
| 起点・画面・ファイルの分類を読む | | | | | | | | `baseline_diffs` | `--screen baseline_diffs --window <label>` | `MCP-01` |

---

## 書き出し・設定・LLM

| 操作 | ツールバー | 右クリック | コマンドパレット | ショートカット (Mac / Win) | macOS メニュー | ☰ | 操作の案内 | MCP | CLI | 機能 ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| メンバー／色／ステータス／拡張項目の一覧操作 | （設定ダイアログ内） | | | | | | 設定の「メンバー」でカタログを1件選ぶ 等 | `catalog_action` | `--screen catalog_action` | `SET-02`〜`SET-10` |
| JSON作成スキル・更新確認の設定 | （設定ダイアログ内） | | | | | | JSON作成スキルを置く（案内） | `set_preferences` | `--screen set_preferences` | `SET-05`、`SET-06` |
| 説明のための見え方を掛ける | | | | | | | 説明を表示しています（バナー） | `explain_view` | `--screen explain_view` | `VIEW-16` |
| 説明の半透明・試しの計画 | | | | | | | | `explain_overlay` | `--screen explain_overlay` | `VIEW-16` |
| 試しの計画を計画へ反映 | | | | | | | | `apply_explanation_pattern` | `--screen apply_explanation_pattern` | `VIEW-16` |
| 画面の見方を LLM から変更 | | | | | | | | `set_view` | `--screen set_view` | `MCP-01`、`VIEW-16` |
| 計画を部分更新 | | | | | | | | `edit_plan` | `--screen edit_plan` | `MCP-01` |

---

## 編集中・モード内のキー（入口のショートカットではない）

利用頻度の低い画面を開くためのキーは付けない。挙動の正本は `src/model/modeKeyboardReference.ts` とショートカット一覧ダイアログの「編集中・モード内」節。

| 場面 | Esc | Enter | Tab | 矢印 |
| --- | --- | --- | --- | --- |
| 階層の編集（EDIT-21） | 閉じる | — | 次の欄 | 行を移動 |
| 階層の名前を変更 | キャンセル | 保存 | 次の欄 | — |
| 設定：項目編集（ステータス／メンバー／色／拡張） | 閉じる | 確定 | 次の要素 | 行を選ぶ |
| タスク詳細パネル（EDIT-04） | 入力取り消し | 確定 | 次の欄 | — |
| 線を引くモード（EDIT-05） | 終了 | — | — | スクロール／選択 |
| 絞り込みパネル（FILTER-01） | 閉じる | 候補を選ぶ | 次の欄 | 候補／— |

表の下に、場面ごとの補足（下書きと「適用」、絞り込み中の一覧 ↑↓ など）をショートカット一覧と同じ文で載せる。

---

## macOS 編集メニュー（文字入力）

| 操作 | ツールバー | 右クリック | コマンドパレット | ショートカット (Mac / Win) | macOS メニュー | ☰ | 操作の案内 | MCP | CLI | 機能 ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 文字の切り取り | | | | | Cut（`PredefinedMenuItem`） | | | | | |
| 文字のコピー | | | | | Copy | | | | | |
| 文字の貼り付け | | | | | Paste | | | | | |
| すべて選択 | | | | | SelectAll | | | | | |

---

## LLM が計画を変えたあと（MCP / read-screen）

`edit_plan` と `replace_schedule` で計画を変えたあとの説明の手順は、同梱の `schedule-talk` スキル `references/consultation-flow.md` の「計画を変えたあとの説明」に書く。MCP の各ツール説明と `read-screen` スキルは、手順の重複を避け、そこへ当てる。

| きっかけ | LLM が行うこと（要約） |
| --- | --- |
| `edit_plan` または `replace_schedule` が成功し、差分で変わったタスクが **2件以上** | 必ず `explain_view` で変えたタスクを示す。必要なら `explain_overlay` で場所を指す。何をなぜ変えたかを短く伝え、「やっぱり戻して」で `history` の取り消しが使える旨を添える |
| 同上で **1件だけ** | 説明するか LLM の判断 |
| 件数の数え方 | 成功時の差分テキスト（FILE-07 と同じ規則。追加・削除・変更のタスク id を重複なく数える）。足りないときは `schedule_diff` / `baseline_diffs`。差分が「比べるファイルがありません」だけのときは、今回の `ops` または置き換え JSON で意図したタスク id を数える |
| `explain_view` の制約 | 文書に残っている id だけ渡す。削除した id は渡せないので、削除はチャットで伝える |
