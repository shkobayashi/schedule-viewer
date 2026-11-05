# 機能と確認の対応

[regression.md](regression.md) のシナリオと、自動テストの対応である。見出し、操作名、MCP ツール名のどれかがここから欠けると、`npm run check:regression-coverage` が失敗する。

## 全機能の見出し

| 項目 | 対応 |
| --- | --- |
| できること | 手動:RG-S1 |
| インストールと起動 | 手動:RG-S1。自動: FirstRunHintCard.dom.test.tsx |
| 画面の見かた | 手動:RG-S2 |
| ファイルを開く・保存する | 手動:RG-S4。自動: headlessScheduleSession.test.ts |
| 表示を動かす | 手動:RG-S2 |
| スクロール | 手動:RG-S2 |
| 拡大と表示単位 | 手動:RG-S2 |
| 折りたたみと一覧の幅 | 手動:RG-S2 |
| 絞り込む | 手動:RG-F3。自動: headlessScheduleSession.test.ts（説明の絞り込み） |
| 色と線の見かた | 手動:RG-S2 |
| 編集する | 手動:RG-S3。自動: headlessScheduleSession.test.ts |
| 選択と移動 | 手動:RG-S3 |
| 詳細パネルと線 | 手動:RG-F1。手動:RG-F4 |
| タスクへの色 | 手動:RG-S2 |
| 右クリックと複製 | 手動:RG-S3。自動: contextMenuItems.test.ts |
| ノートと名前 | 手動:RG-F1。自動: contextMenuItems.test.ts |
| 追加と削除 | 手動:RG-S3。自動: headlessScheduleSession.test.ts |
| 取り消しと、入力中のキー | 手動:RG-F1。自動: headlessScheduleSession.test.ts |
| 書き出す | 手動:RG-F5 |
| 設定 | 手動:RG-F6 |
| ほかのプログラムがファイルを書き換えたとき | 手動:RG-F7 |
| 閉じたあとに、また開くとき | 手動:RG-F8 |
| 操作早見表 | 手動:RG-F2 |
| モード中のキー | 手動:RG-F2 |
| 困ったとき | 手動:RG-F13 |
| ファイルが開けない | 手動:RG-F13 |
| 担当が「メンバー不明」になる | 手動:RG-F13 |
| 「メンバー設定エラー」「カレンダー設定エラー」が出る | 手動:RG-F13 |
| WindowsでSmartScreenが出る | 手動:RG-F14 |
| 書き出せない | 手動:RG-F5 |
| ブラウザ版とデスクトップ版の違い | 手動:RG-S5 |

## 操作

| 項目 | 対応 |
| --- | --- |
| 開く | 手動:RG-S4。自動: headlessScheduleSession.test.ts |
| 最近開いたファイルの1件を開く | 手動:RG-F9 |
| 履歴を消す | 手動:RG-F9 |
| 新しいウィンドウで開く | 手動:RG-F9 |
| 保存 | 手動:RG-S4。自動: headlessScheduleSession.test.ts |
| 別名保存 | 手動:RG-S4。自動: headlessScheduleSession.test.ts |
| 書き出し（HTML / SVG / Excel） | 手動:RG-F5 |
| 設定ファイルを新しいフォルダへ書き出す | 手動:RG-F5 |
| JSON を表示 | 手動:RG-S4。自動: headlessScheduleSession.test.ts |
| 差分を表示 | 手動:RG-S4。自動: headlessScheduleSession.test.ts |
| 差分をコピー | 手動:RG-S4。自動: headlessScheduleSession.test.ts |
| 未保存の差分を開く（状態バー） | 手動:RG-S4。自動: headlessScheduleSession.test.ts |
| 外部ファイル更新の確認 | 手動:RG-F7 |
| 更新を確認 | 手動:RG-F6 |
| 設定を開く | 手動:RG-F6 |
| ウィンドウを閉じる | 手動:RG-F9 |
| ウィンドウを最小化 | 手動:RG-F9 |
| アプリを終了 | 手動:RG-F9 |
| 前面ウィンドウを前面にする | 手動:RG-F9 |
| 開いているウィンドウ一覧を読む | 手動:RG-F9 |
| コマンドパレットを開く／閉じる | 手動:RG-F2。自動: GuideDialog.dom.test.tsx |
| 操作の案内を開く | 手動:RG-F2。自動: GuideDialog.dom.test.tsx |
| ショートカット一覧を開く | 手動:RG-F2。自動: GuideDialog.dom.test.tsx |
| タスク名／ノートで検索 | 手動:RG-F3 |
| 今日へ移動 | 手動:RG-S2 |
| 日表示 | 手動:RG-S2 |
| 週表示 | 手動:RG-S2 |
| 月表示 | 手動:RG-S2 |
| 全体表示 | 手動:RG-S2 |
| 表示サイズを拡大 | 手動:RG-S2 |
| 表示サイズを縮小 | 手動:RG-S2 |
| チャートをスクロール | 手動:RG-S2 |
| ズーム（ホイール） | 手動:RG-S2 |
| 横スクロール（ホイール） | 手動:RG-S2 |
| スケジュールのタイトルを変更 | 手動:RG-F1 |
| 階層の名前・意味・指示を編集 | 手動:RG-F1 |
| 絞り込みパネルを開く | 手動:RG-F3 |
| 絞り込みをすべて解除 | 手動:RG-F3 |
| 系統を表示／解除 | 手動:RG-F3 |
| 系統（繋がりも辿る） | 手動:RG-F3 |
| 線を引くモード | 手動:RG-F3 |
| マイルストン帯の印を非表示 | 手動:RG-S3。自動: contextMenuItems.test.ts |
| このマイルストンだけ表示 | 手動:RG-S3。自動: contextMenuItems.test.ts |
| マイルストン帯の行を非表示 | 手動:RG-S3。自動: contextMenuItems.test.ts |
| この行だけ表示（帯グループ） | 手動:RG-S3。自動: contextMenuItems.test.ts |
| 絞り込み結果のタスク一覧を読む | 手動:RG-F3 |
| 取り消し | 手動:RG-S4。自動: headlessScheduleSession.test.ts |
| やり直し | 手動:RG-S4。自動: headlessScheduleSession.test.ts |
| タスクを追加 | 手動:RG-S3。自動: headlessScheduleSession.test.ts |
| マイルストンを追加 | 手動:RG-S3。自動: contextMenuItems.test.ts |
| タスクを編集（詳細） | 手動:RG-S3。自動: headlessScheduleSession.test.ts |
| タスクを削除 | 手動:RG-S3。自動: headlessScheduleSession.test.ts |
| タスクを複製 | 手動:RG-S3。自動: contextMenuItems.test.ts |
| 同じグループ内で並べ替え | 手動:RG-S3。自動: headlessScheduleSession.test.ts |
| ノートを開く | 手動:RG-S3。自動: contextMenuItems.test.ts |
| 系統を表示／解除（タスク） | 手動:RG-F3 |
| 確定／未確定（タスク） | 手動:RG-S3。自動: contextMenuItems.test.ts |
| 確定／未確定（マイルストン） | 手動:RG-S3。自動: contextMenuItems.test.ts |
| マイルストンを編集 | 手動:RG-S3。自動: contextMenuItems.test.ts |
| マイルストンを削除 | 手動:RG-S3。自動: contextMenuItems.test.ts |
| 前後の線を外す | 手動:RG-S3。自動: contextMenuItems.test.ts |
| 繋がりを外す | 手動:RG-S3。自動: contextMenuItems.test.ts |
| カテゴリ名を変更 | 手動:RG-S3。自動: contextMenuItems.test.ts |
| 下にカテゴリを追加 | 手動:RG-F10。自動: contextMenuItems.test.ts |
| グループを追加（カテゴリ下） | 手動:RG-F10。自動: contextMenuItems.test.ts |
| グループ名を変更 | 手動:RG-S3。自動: contextMenuItems.test.ts |
| 下にグループを追加 | 手動:RG-F10。自動: contextMenuItems.test.ts |
| 階層名を変更（アウトライン） | 手動:RG-F10。自動: contextMenuItems.test.ts |
| 下に階層を追加 | 手動:RG-F10。自動: contextMenuItems.test.ts |
| 子階層を追加 | 手動:RG-F10。自動: contextMenuItems.test.ts |
| カテゴリ／グループ／階層を削除 | 手動:RG-F10。自動: contextMenuItems.test.ts |
| タスクバーをドラッグして期間変更 | 手動:RG-S3。自動: headlessScheduleSession.test.ts（日付の結果） |
| タスクを追加選択 | 手動:RG-S3 |
| タスクを範囲選択 | 手動:RG-S3 |
| 選択を伸ばす | 手動:RG-S3 |
| 説明を消す | 手動:RG-F12。自動: headlessScheduleSession.test.ts |
| 前面スケジュールを置き換え | 手動:RG-F12。自動: headlessScheduleSession.test.ts |
| 選択中タスクを1件読む | 手動:RG-F12。自動: headlessScheduleSession.test.ts |
| 選択中タスクを読む（複数） | 手動:RG-F12。自動: headlessScheduleSession.test.ts |
| 画面のスケジュール JSON を読む | 手動:RG-F12。自動: headlessScheduleSession.test.ts |
| 差分テキストを読む | 手動:RG-F12。自動: headlessScheduleSession.test.ts |
| 起点・画面・ファイルの分類を読む | 手動:RG-F12。自動: headlessScheduleSession.test.ts |
| メンバー／色／ステータス／拡張項目の一覧操作 | 手動:RG-F6 |
| JSON作成スキル・更新確認の設定 | 手動:RG-F6 |
| 説明のための見え方を掛ける | 手動:RG-F12。自動: headlessScheduleSession.test.ts |
| 説明の半透明・試しの計画 | 手動:RG-F12。自動: headlessScheduleSession.test.ts |
| 試しの計画を計画へ反映 | 手動:RG-F12。自動: headlessScheduleSession.test.ts |
| 画面の見方を LLM から変更 | 手動:RG-F12。自動: headlessScheduleSession.test.ts |
| 計画を部分更新 | 手動:RG-S3。自動: headlessScheduleSession.test.ts |
| 文字の切り取り | 手動:RG-F1 |
| 文字のコピー | 手動:RG-F1 |
| 文字の貼り付け | 手動:RG-F1 |
| すべて選択 | 手動:RG-F1 |

## MCP ツール

| 項目 | 対応 |
| --- | --- |
| `open_windows` | 手動:RG-F9 |
| `schedule_diff` | 自動: scheduleDiff.test.ts。手動:RG-F11 |
| `baseline_diffs` | 自動: baselineDiffs.test.ts。手動:RG-F7 |
| `selected_task` | 手動:RG-F12 |
| `selected_tasks` | 手動:RG-F12 |
| `filtered_tasks` | 手動:RG-F3 |
| `current_schedule` | 手動:RG-F12 |
| `replace_schedule` | 自動: replaceSchedule の単体。手動:RG-F12 |
| `focus_window` | 手動:RG-F9 |
| `close_window` | 手動:RG-F9 |
| `minimize_window` | 手動:RG-F9 |
| `open_new_window` | 手動:RG-F9 |
| `set_view` | 自動: mcpSetView の単体。手動:RG-S2 |
| `explain_view` | 自動: headlessScheduleSession.test.ts。手動:RG-F12 |
| `explain_overlay` | 自動: headlessScheduleSession.test.ts。手動:RG-F12 |
| `apply_explanation_pattern` | 自動: explainOverlayPatterns.test.ts。手動:RG-F12 |
| `edit_plan` | 自動: headlessScheduleSession.test.ts。手動:RG-F12 |
| `file_action` | 自動: headlessScheduleSession.test.ts（保存した JSON）。手動:RG-S4 |
| `catalog_action` | 手動:RG-F6 |
| `set_preferences` | 手動:RG-F6 |
| `history` | 自動: headlessScheduleSession.test.ts。手動:RG-S4 |

