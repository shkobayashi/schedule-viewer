# 色を LLM から操作するテスト — 実行記録

実施日: 2026-10-28  
前提: #404 の変更を作業ツリーに載せ、デスクトップ版（`tauri dev`）と MCP 接続済み。前面ウィンドウは `examples/colors/workspace.json`（フォルダ A と同内容）。作業データは [examples/llm-color-test/](.) 。

自動再実行: 前面で colors workspace を開いた状態で `node scripts/llm-color-test.mjs` 。単体テスト: `npm test -- src/model/screenContext.test.ts`（30 件 pass）。

## 1. 色の一覧を作る（write-colors）

| 項目 | 結果 | 根拠 |
| --- | --- | --- |
| id 指定の新規 JSON・検証 | pass | `scratch/new-steady-id-user-specified.json` → validate OK |
| 既存更新（risk の light を `#FEE2E2`） | pass | `scratch/updated-risk-light-only.json` → validate OK |
| 9 件超過 | pass | `nine-colors-invalid-count.json` → schema 拒否 |
| id 無し依頼で JSON を書かない | 未実行 | エージェント手順の想定のみ。依頼して確認していない |
| 明るさ範囲外の黙って置換 | 未実行 | スキル本文の確認のみ |
| 黄と橙の同一覧 | 未実行 | スキルどおり尋ねる想定。依頼していない |
| スケジュールに色値を書かない | pass | replace / 作成 JSON ともに `colorId` のみ（validate と replace の差分） |

## 2. 読み取る

| 項目 | 結果 | 根拠 |
| --- | --- | --- |
| `levels`→`statuses`→`colors`→`fields` | pass | MCP `filtered_tasks` のキー順 |
| colors 3 件・形状 | pass | focus/wait/risk、light/dark 両方 |
| タスク `colorId` / 無キー / missing-color | pass | MCP 応答 |
| `current_schedule` に colors 無し | pass | MCP + 自動スクリプト |
| 選択 0 件 `selected_task` null | pass | MCP |
| フォルダ C（colors キー無し） | 手動 | `folder-c/workspace.json` を開いて `colors: []` を確認する |
| 色 JSON 読み込み失敗 | 手動 | 壊した JSON で状態バー文言を確認する |
| ユーザ設定の未選択 / 設定ファイル束縛 | 手動 | 別ウィンドウで設定と読み取りを比較する |

## 3. 色 id を書く

| 項目 | 結果 | 根拠 |
| --- | --- | --- |
| 色なしタスクへ `focus` | pass | `--screen replace_schedule`、差分 `colorId: （なし） → focus` |
| `schedule_diff` | pass | `--screen replace_schedule` の差分テキスト |
| 取り消し | 未実行 | UI で ⌘/Ctrl+Z を確認していない |
| description のみで選ぶ / 曖昧時は尋ねる | 未実行 | スキル・仕様の照合のみ。依頼して確認していない |
| 非色更新で colorId 残す | 未実行 | 規則の照合のみ。end のみ変更は未実行 |
| 一覧に無い id を拒否しない | pass | MCP で `missing-color` タスクの `colorId` が残る |
| フォルダ C で色を書かない | 手動 | folder-c を開いた状態で依頼 |

## 4. 設定ファイルと一覧の更新

| 項目 | 結果 | 根拠 |
| --- | --- | --- |
| colors.json 変更後、開き直しまで古い description | 手動 | ディスク編集 + MCP 再読取 |
| 同一 workspace を 2 ウィンドウ | 手動 | 背面を前面にした読み直し |
| 色の一覧覆い中の replace | 手動 | 「画面の操作が途中」 |
| 覆いの同時編集 1 ウィンドウ | 手動 | SET-09 |

## 5. 複数ウィンドウ

| 項目 | 結果 | 根拠 |
| --- | --- | --- |
| 前面 / `--window` で colors が分かれる | 手動 | folder-a と folder-b を別ウィンドウで開く |
| replace は前面のみ | 未実行 | 仕様の確認のみ。2 ウィンドウで未確認 |
| 同一ファイル 2 ウィンドウ + 保存 | 手動 | WIN-02 |

## 6. 衝突

| 項目 | 結果 | 根拠 |
| --- | --- | --- |
| 画面のみ（色だけ未保存） | pass | `baseline_diffs` → `画面のみ` |
| ファイルのみ（未保存無しで colorId 変更） | 未実行 | 外部エディタでの保存と画面反映を未確認 |
| 同一タスク 色 vs end → `異なる` | pass | 未保存 wait + ファイル end 変更（scratch JSON） |
| focus vs wait 同一タスク | pass | 上記 colorId 行を含む `異なる` |
| 別タスク 画面のみ / ファイルのみ | 手動 | 2 タスクに分けた baseline |
| 削除と変更 | 手動 | ファイル側でタスク削除 |
| 衝突確認中の replace | 手動 | TC-SYNC-01k 相当 |
| 確認中（非衝突）の replace 拒否 | 手動 | 一般ダイアログ OPEN 時 |

## 不合格時の扱い

計画どおり、不合格が出た時点で以降は実行しない。自動実行と MCP で確認した項目に不合格は無い。手動項目と未実行は、利用者が `folder-a` / `folder-b` / `folder-c` を開いて確認する。

## 利用者への保存

`replace_schedule` で画面を変えたあとは、利用者が ☰ から保存する。自動スクリプトは最後にファイル内容へ画面を戻している。
