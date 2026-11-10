# 機能と確認の対応

見出し、操作名、MCP ツール名を、計算、画面の接続、OS、見た目に分けた対応である。自動済みは、相対パスとテスト名が実在する計算か文言である。自動化予定は合格にしない。この検査は名前と参照の欠落を見るもので、振る舞いが正しいことの保証ではない。

シナリオの手順は [regression.md](regression.md)、付録の仕分けは [regression-tc.md](regression-tc.md) である。

## 全機能の見出し

| ID | 種類 | 項目 | 区分 | 行き先 |
| --- | --- | --- | --- | --- |
| MX-H-1 | 集約 | できること | 対象外 | 理由:総見出し。子の見出しで確認する。この行だけでは合格にしない |
| MX-H-2 | UI | インストールと起動 | 自動済み | 自動:src/components/browserDesktopChrome.dom.test.tsx#hides the first-run card after dismiss across a remount |
| MX-H-3 | 計算 | インストールと起動 | 自動済み | 自動:src/model/firstRunGuidance.test.ts#keeps the screenshot shim on the desktop path and the browser off it |
| MX-H-4 | 見た目 | 画面の見かた | 手動のまま | 手動:RG-S2-6。手動のまま:色が地に溶けて読めるかは人が判断する |
| MX-H-5 | UI | 画面の見かた | 自動化予定 | 自動化予定:#535 |
| MX-H-6 | UI | ファイルを開く・保存する | 自動済み | 自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#saves the open path without a dialog and the design end becomes 2026-04-10 (FILE-02) |
| MX-H-7 | OS | ファイルを開く・保存する | 自動化予定 | 自動化予定:#541 |
| MX-H-8 | UI | 表示を動かす | 自動化予定 | 手動:RG-S2-3。自動化予定:#535 |
| MX-H-9 | UI | 表示を動かす | 自動化予定 | 自動化予定:#535 |
| MX-H-10 | UI | スクロール | 自動化予定 | 手動:RG-S2-2。自動化予定:#535 |
| MX-H-11 | UI | スクロール | 自動化予定 | 自動化予定:#535 |
| MX-H-12 | UI | 拡大と表示単位 | 自動化予定 | 手動:RG-S2-5。自動化予定:#535 |
| MX-H-13 | UI | 拡大と表示単位 | 自動化予定 | 自動化予定:#535 |
| MX-H-14 | UI | 折りたたみと一覧の幅 | 自動化予定 | 手動:RG-S2-7。自動化予定:#535 |
| MX-H-15 | UI | 折りたたみと一覧の幅 | 自動化予定 | 自動化予定:#535 |
| MX-H-16 | UI | 絞り込む | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#keeps only tasks whose name contains the query |
| MX-H-17 | 計算 | 絞り込む | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#keeps only tasks whose name contains the query |
| MX-H-18 | 見た目 | 色と線の見かた | 手動のまま | 手動:RG-S2-6。手動のまま:色が地に溶けて読めるかは人が判断する |
| MX-H-19 | 見た目 | 色と線の見かた | 自動化予定 | 自動化予定:#536 |
| MX-H-20 | UI | 編集する | 自動化予定 | 手動:RG-S3-1。自動化予定:#535 |
| MX-H-21 | 計算 | 編集する | 自動済み | 自動:src/test/headlessScheduleSession.regression.test.ts#toggles 設計 confidence without moving dates and one undo restores it |
| MX-H-22 | 計算 | 選択と移動 | 自動済み | 自動:src/model/taskSelection.test.ts#selects a range with shift+click |
| MX-H-23 | UI | 選択と移動 | 自動済み | 自動:src/operations/contextMenuItems.test.ts#lists only delete when several tasks are selected |
| MX-H-24 | UI | 詳細パネルと線 | 手動のまま | 手動:RG-F1-1。手動のまま:変換中の Enter は実機の日本語変換でしか確認できない |
| MX-H-25 | 見た目 | 詳細パネルと線 | 自動化予定 | 手動:RG-F4-1。自動化予定:#536 |
| MX-H-26 | UI | タスクへの色 | 自動済み | 自動:src/components/settingsHierarchyDiff.dom.test.tsx#keeps the row fill bound to the renamed color |
| MX-H-27 | UI | タスクへの色 | 自動化予定 | 自動化予定:#536 |
| MX-H-28 | 計算 | 右クリックと複製 | 自動済み | 自動:src/operations/contextMenuItems.test.ts#lists only delete when several tasks are selected |
| MX-H-29 | UI | 右クリックと複製 | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#duplicates 調査 on full.schedule with unchanged pointed tasks。自動化予定:#535 |
| MX-H-30 | UI | ノートと名前 | 手動のまま | 手動:RG-F1-2。手動のまま:実機の変換確定は模擬イベントで代用しない |
| MX-H-31 | 計算 | 追加と削除 | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#deletes an empty category and an empty group, then undo restores both |
| MX-H-32 | UI | 追加と削除 | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#restores 調査 note and 設計 predecessor after delete undo and redo。自動:src/test/headlessScheduleSession.regression.test.ts#restores empty group 後半 after removeGroup and one undo。手動:RG-S3-9。自動化予定:#535 |
| MX-H-33 | 計算 | 取り消しと、入力中のキー | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#undo and redo restore the exact saved schedule |
| MX-H-34 | UI | 取り消しと、入力中のキー | 手動のまま | 手動:RG-F1-3。手動のまま:変換中の Escape は実機の日本語変換でしか確認できない |
| MX-H-35 | 見た目 | 書き出す | 自動化予定 | 手動:RG-F5-2。自動化予定:#536 |
| MX-H-36 | 計算 | 書き出す | 自動化予定 | 自動化予定:#536 |
| MX-H-37 | UI | 設定 | 自動済み | 自動:src/components/settingsHierarchyDiff.dom.test.tsx#keeps the member editor open and shows the saved display name on the rows |
| MX-H-38 | UI | 設定 | 一部自動 | 自動:src/components/settingsHierarchyDiff.dom.test.tsx#keeps the status editor open and shows the saved status name。自動:src/components/settingsHierarchyDiff.dom.test.tsx#stores dark and clears the key when returning to the system scheme。自動:src/components/settingsHierarchyDiff.dom.test.tsx#stores the display scale and applies it as --s。自動:src/hooks/useAppAutoUpdate.flow.test.tsx#TC-SET-07: shows the version on display, members, and updates in settings |
| MX-H-39 | UI | ほかのプログラムがファイルを書き換えたとき | 一部自動 | 自動:src/hooks/scheduleFile/externalReloadFlow.dom.test.tsx#TC-SYNC-01: applies a clean disk change after one poll interval。手動:RG-F7-1 |
| MX-H-40 | OS | ほかのプログラムがファイルを書き換えたとき | 自動化予定 | 自動化予定:#541 |
| MX-H-41 | UI | 閉じたあとに、また開くとき | 一部自動 | 自動:src/hooks/scheduleFile/startupRecoveryFlow.dom.test.tsx#TC-SYNC-03: restores unsaved edits when the disk matches baseline。手動:RG-F8-2 |
| MX-H-42 | UI | 閉じたあとに、また開くとき | 一部自動 | 自動:src/hooks/scheduleFile/startupRecoveryFlow.dom.test.tsx#TC-SYNC-03f: blocks date moves until startup recovery settles |
| MX-H-43 | UI | 操作早見表 | 自動化予定 | 手動:RG-F2-2。自動化予定:#535 |
| MX-H-44 | UI | 操作早見表 | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#opens the shortcut list from keys and the menu but not from search |
| MX-H-45 | UI | モード中のキー | 手動のまま | 手動:RG-F1-5。手動のまま:変換中の矢印は実機の日本語変換でしか確認できない |
| MX-H-46 | UI | モード中のキー | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#opens add dialogs from shortcuts and skips them while typing or linking |
| MX-H-47 | 集約 | 困ったとき | 対象外 | 理由:総見出し。子の見出しで確認する。この行だけでは合格にしない |
| MX-H-48 | UI | ファイルが開けない | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#keeps the open schedule when a broken file is rejected |
| MX-H-49 | UI | 担当が「メンバー不明」になる | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#shows unknown assignees and leaves unassigned tasks |
| MX-H-50 | UI | 担当が「メンバー不明」になる | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#shows unknown assignees and leaves unassigned tasks |
| MX-H-51 | UI | 「メンバー設定エラー」「カレンダー設定エラー」が出る | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#shows the calendar error and keeps the schedule |
| MX-H-52 | OS | WindowsでSmartScreenが出る | 手動のまま | 手動:RG-F14-4。手動のまま:SmartScreen は署名した Windows の初回起動でしか確認できない |
| MX-H-53 | UI | 書き出せない | 一部自動 | 自動:src-tauri/src/lib.rs#write_schedule_export_at_path_rejects_an_empty_path。手動:RG-F5-3 |
| MX-H-54 | UI | ブラウザ版とデスクトップ版の違い | 自動済み | 自動:src/components/browserDesktopChrome.dom.test.tsx#omits the first-run card and save hint in the browser runtime |
| MX-H-55 | UI | ブラウザ版とデスクトップ版の違い | 自動済み | 自動:src/components/browserDesktopChrome.dom.test.tsx#omits the screen-state settings section in the browser |

## 操作

| ID | 種類 | 項目 | 区分 | 行き先 |
| --- | --- | --- | --- | --- |
| MX-O-1 | UI | 開く | 手動のまま | 手動のまま:実機の「開く」ダイアログでファイルを選ぶ操作は mock だけでは足りない。 |
| MX-O-2 | OS | 開く | 自動化予定 | 自動化予定:#541 |
| MX-O-3 | 計算 | 最近開いたファイルの1件を開く | 自動済み | 自動:src/model/recentFiles.test.ts#prepends a new path |
| MX-O-4 | UI | 最近開いたファイルの1件を開く | 一部自動 | 自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#opening from history resets filters and fit。自動化予定:#535 |
| MX-O-5 | UI | 履歴を消す | 一部自動 | 自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#clear history leaves the open schedule and the recovery file。手動:RG-F9-2 |
| MX-O-6 | UI | 新しいウィンドウで開く | 自動化予定 | 手動:RG-F9-1。自動化予定:#541 |
| MX-O-7 | OS | 新しいウィンドウで開く | 自動化予定 | 自動化予定:#541 |
| MX-O-8 | 計算 | 保存 | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#stays the same after save, reload, and save again |
| MX-O-9 | OS | 保存 | 一部手動 | 自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#saves the open path without a dialog and the design end becomes 2026-04-10 (FILE-02)。手動のまま:OS の保存ダイアログは mock だけでは足りない。 |
| MX-O-10 | OS | 別名保存 | 一部自動 | 自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#save as then save writes the second change to the new path。手動:RG-S4-5 |
| MX-O-11 | OS | 別名保存 | 手動のまま | 手動のまま:OS の別名保存ダイアログは mock だけでは足りない。 |
| MX-O-12 | 見た目 | 書き出し（HTML / SVG / Excel） | 自動化予定 | 手動:RG-F5-2。自動化予定:#536 |
| MX-O-13 | 計算 | 書き出し（HTML / SVG / Excel） | 自動化予定 | 自動化予定:#536 |
| MX-O-14 | OS | 設定ファイルを新しいフォルダへ書き出す | 一部手動 | 自動:src-tauri/src/lib.rs#write_workspace_bundle_to_folder_omits_builtin_statuses_and_keeps_field_order。手動のまま:OS のフォルダ選択は mock だけでは足りない。 |
| MX-O-15 | UI | JSON を表示 | 自動済み | 自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#JsonDialog shows the edited task name and save is not invoked |
| MX-O-16 | 計算 | 差分を表示 | 自動済み | 自動:src/model/scheduleDiff.test.ts#says there is no difference when the documents match |
| MX-O-17 | UI | 差分を表示 | 一部自動 | 手動:RG-F11-1。自動:src/components/settingsHierarchyDiff.dom.test.tsx#shows the old and new end dates in the diff column。自動化予定:#536 |
| MX-O-18 | UI | 差分をコピー | 一部自動 | 手動:RG-F11-4。自動:src/components/settingsHierarchyDiff.dom.test.tsx#copies diff text to the clipboard。自動化予定:#536 |
| MX-O-19 | UI | 未保存の差分を開く（状態バー） | 一部自動 | 手動:RG-F11-1。自動:src/components/settingsHierarchyDiff.dom.test.tsx#shows the old and new end dates in the diff column。自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#the status bar opens the diff from the real file bytes。自動化予定:#536 |
| MX-O-20 | UI | 外部ファイル更新の確認 | 一部自動 | 自動:src/hooks/scheduleFile/externalReloadFlow.dom.test.tsx#TC-SYNC-01b: keep local edits and show the deferred reload banner |
| MX-O-21 | OS | 外部ファイル更新の確認 | 手動のまま | 手動のまま:OS の外部ファイル更新確認ダイアログは mock だけでは足りない。 |
| MX-O-22 | UI | 更新を確認 | 一部自動 | 自動:src/hooks/useAppAutoUpdate.flow.test.tsx#TC-SET-06m: manual check with no update shows the latest message。手動:RG-F14-2 |
| MX-O-23 | UI | 更新を確認 | 一部自動 | 自動:src/hooks/useAppAutoUpdate.flow.test.tsx#TC-SET-06m3: manual check shows a failure message when check throws |
| MX-O-24 | UI | 設定を開く | 自動済み | 自動:src/components/settingsHierarchyDiff.dom.test.tsx#keeps the member editor open and shows the saved display name on the rows |
| MX-O-25 | OS | ウィンドウを閉じる | 手動のまま | 手動のまま:OS のウィンドウを閉じる操作は mock だけでは足りない。 |
| MX-O-26 | OS | ウィンドウを閉じる | 自動化予定 | 自動化予定:#541 |
| MX-O-27 | OS | ウィンドウを最小化 | 自動化予定 | 手動:RG-F9-4。自動化予定:#541 |
| MX-O-28 | OS | アプリを終了 | 一部自動 | 自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#quit cancel keeps the sample path and does not clear the other window hook |
| MX-O-29 | OS | 前面ウィンドウを前面にする | 自動化予定 | 自動化予定:#541 |
| MX-O-30 | 計算 | 開いているウィンドウ一覧を読む | 自動化予定 | 自動化予定:#543 |
| MX-O-31 | UI | コマンドパレットを開く／閉じる | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#opens and closes the command palette without the guide |
| MX-O-32 | UI | コマンドパレットを開く／閉じる | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#opens and closes the command palette without the guide |
| MX-O-33 | 計算 | 操作の案内を開く | 自動済み | 自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open |
| MX-O-34 | UI | 操作の案内を開く | 自動済み | 自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open |
| MX-O-35 | UI | ショートカット一覧を開く | 自動化予定 | 手動:RG-F2-2。自動化予定:#535 |
| MX-O-36 | UI | ショートカット一覧を開く | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#opens the shortcut list from keys and the menu but not from search |
| MX-O-37 | UI | タスク名／ノートで検索 | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#keeps only tasks whose name contains the query |
| MX-O-38 | 計算 | タスク名／ノートで検索 | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#filters notes from the note search field |
| MX-O-39 | UI | 今日へ移動 | 自動化予定 | 手動:RG-S2-5。自動化予定:#535 |
| MX-O-40 | UI | 今日へ移動 | 自動化予定 | 自動化予定:#535 |
| MX-O-41 | UI | 日表示 | 自動化予定 | 手動:RG-S2-5。自動化予定:#535 |
| MX-O-42 | UI | 週表示 | 自動化予定 | 手動:RG-S2-5。自動化予定:#535 |
| MX-O-43 | UI | 月表示 | 自動化予定 | 手動:RG-S2-5。自動化予定:#535 |
| MX-O-44 | UI | 全体表示 | 自動化予定 | 手動:RG-S2-5。自動化予定:#535 |
| MX-O-45 | UI | 表示サイズを拡大 | 自動化予定 | 自動化予定:#535 |
| MX-O-46 | UI | 表示サイズを縮小 | 自動化予定 | 自動化予定:#535 |
| MX-O-47 | UI | チャートをスクロール | 自動化予定 | 手動:RG-S2-3。自動化予定:#535 |
| MX-O-48 | UI | チャートをスクロール | 自動化予定 | 自動化予定:#535 |
| MX-O-49 | UI | ズーム（ホイール） | 自動化予定 | 自動化予定:#535 |
| MX-O-50 | UI | 横スクロール（ホイール） | 自動化予定 | 手動:RG-S2-4。自動化予定:#535 |
| MX-O-51 | UI | 横スクロール（ホイール） | 自動化予定 | 自動化予定:#535 |
| MX-O-52 | UI | スケジュールのタイトルを変更 | 手動のまま | 手動:RG-F1-4。手動のまま:見出しの実機の変換確定は模擬イベントで代用しない |
| MX-O-53 | UI | 階層の名前・意味・指示を編集 | 一部自動 | 自動:src/components/settingsHierarchyDiff.dom.test.tsx#keeps an applied instruction when the hierarchy dialog is opened again。自動:src/components/settingsHierarchyDiff.dom.test.tsx#drops a blank instruction when the hierarchy dialog is applied。自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#the saved file contains 回帰の指示 and the example file does not |
| MX-O-54 | UI | 階層の名前・意味・指示を編集 | 一部自動 | 自動:src/components/settingsHierarchyDiff.dom.test.tsx#refuses apply when a meaning is empty and drops a name that was not applied。自動化予定:#535 |
| MX-O-55 | UI | 絞り込みパネルを開く | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#filters assignees from the panel and clears one chip |
| MX-O-56 | UI | 絞り込みをすべて解除 | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#filters tags and clears one chip without clearing lineage |
| MX-O-57 | UI | 系統を表示／解除 | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#toggles lineage from the toolbar and the task menu |
| MX-O-58 | UI | 系統（繋がりも辿る） | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#toggles lineage from the toolbar and the task menu |
| MX-O-59 | UI | 線を引くモード | 自動化予定 | 手動:RG-F4-2。自動化予定:#536 |
| MX-O-60 | 見た目 | 線を引くモード | 自動化予定 | 自動化予定:#536 |
| MX-O-61 | UI | マイルストン帯の印を非表示 | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#hides milestone bands and marks from the panel and the menu |
| MX-O-62 | UI | このマイルストンだけ表示 | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#hides milestone bands and marks from the panel and the menu |
| MX-O-63 | UI | マイルストン帯の行を非表示 | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#hides milestone bands and marks from the panel and the menu |
| MX-O-64 | UI | この行だけ表示（帯グループ） | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#hides milestone bands and marks from the panel and the menu |
| MX-O-65 | 計算 | 絞り込み結果のタスク一覧を読む | 自動済み | 自動:src/model/mcpVisible.test.ts#lists rows that intersect the vertical viewport |
| MX-O-66 | 計算 | 絞り込み結果のタスク一覧を読む | 自動化予定 | 自動化予定:#543 |
| MX-O-67 | 計算 | 取り消し | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#undo and redo restore the exact saved schedule |
| MX-O-68 | UI | 取り消し | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#restores 調査 note and 設計 predecessor after delete undo and redo。手動:RG-S3-10。自動化予定:#535 |
| MX-O-69 | 計算 | やり直し | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#undo and redo restore the exact saved schedule |
| MX-O-70 | UI | やり直し | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#restores 調査 note and 設計 predecessor after delete undo and redo。手動:RG-S3-11。自動化予定:#535 |
| MX-O-71 | 計算 | タスクを追加 | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#adds a task, moves it to the empty group, and saves |
| MX-O-72 | UI | タスクを追加 | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#adds unassigned tentative task and relaxes the done filter。自動化予定:#535 |
| MX-O-73 | 計算 | マイルストンを追加 | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#adds and deletes a milestone, then undo restores it |
| MX-O-74 | UI | マイルストンを追加 | 自動済み | 自動:src/operations/contextMenuItems.test.ts#lists only add-milestone on an empty chart |
| MX-O-75 | UI | タスクを編集（詳細） | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#undoes assignee add clear and reorder on 調査。自動:src/test/headlessScheduleSession.regression.test.ts#adds and removes a tag with undo redo and leaves the file dirty until save。自動化予定:#535 |
| MX-O-76 | UI | タスクを削除 | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#restores 調査 note and 設計 predecessor after delete undo and redo。手動:RG-S3-9。自動化予定:#535 |
| MX-O-77 | 計算 | タスクを削除 | 自動済み | 自動:src/test/headlessScheduleSession.regression.test.ts#restores 調査 note and 設計 predecessor after delete undo and redo |
| MX-O-78 | UI | タスクを複製 | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#duplicates 調査 on full.schedule with unchanged pointed tasks。自動化予定:#535 |
| MX-O-79 | UI | 同じグループ内で並べ替え | 自動化予定 | 自動化予定:#535 |
| MX-O-80 | UI | ノートを開く | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#opens the note with ctrl+n and shows the shortcut |
| MX-O-81 | UI | 系統を表示／解除（タスク） | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#toggles lineage from the toolbar and the task menu |
| MX-O-82 | UI | 確定／未確定（タスク） | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#toggles 設計 confidence without moving dates and one undo restores it。自動化予定:#535 |
| MX-O-83 | 見た目 | 確定／未確定（マイルストン） | 自動化予定 | 手動:RG-F4-3。自動化予定:#536 |
| MX-O-84 | UI | マイルストンを編集 | 自動化予定 | 自動化予定:#535 |
| MX-O-85 | 計算 | マイルストンを削除 | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#adds and deletes a milestone, then undo restores it |
| MX-O-86 | UI | マイルストンを削除 | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#clears 調査 milestoneId when 承認 is deleted and undo restores both。自動化予定:#535 |
| MX-O-87 | UI | 前後の線を外す | 自動化予定 | 手動:RG-F4-1。自動化予定:#536 |
| MX-O-88 | 見た目 | 前後の線を外す | 自動化予定 | 自動化予定:#536 |
| MX-O-89 | UI | 繋がりを外す | 自動化予定 | 手動:RG-F4-4。自動化予定:#536 |
| MX-O-90 | UI | カテゴリ名を変更 | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#undo restores 計画 name and keeps category id。自動化予定:#535 |
| MX-O-91 | UI | 下にカテゴリを追加 | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#undo removes a category added under 計画 and its default グループ。自動:src/test/headlessScheduleSession.regression.test.ts#appends category and default group at document end then undo removes both。自動化予定:#535 |
| MX-O-92 | UI | グループを追加（カテゴリ下） | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#appends a group under the chosen category and one undo removes it。自動化予定:#535 |
| MX-O-93 | UI | グループ名を変更 | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#keeps group id when renaming 前半 and undo restores the name。自動化予定:#535 |
| MX-O-94 | UI | 下にグループを追加 | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#appends a group under the chosen category and one undo removes it。自動化予定:#535 |
| MX-O-95 | UI | 階層名を変更（アウトライン） | 一部自動 | 自動:src/components/settingsHierarchyDiff.dom.test.tsx#adds an outline heading from the context menu。自動:src/test/headlessScheduleSession.hierarchy.regression.test.ts#MX-O-95: renameOutlineBranch and undo。自動化予定:#535 |
| MX-O-96 | UI | 下に階層を追加 | 一部自動 | 自動:src/components/settingsHierarchyDiff.dom.test.tsx#adds an outline heading from the context menu。自動:src/test/headlessScheduleSession.hierarchy.regression.test.ts#insertOutlineSiblingAfter commits and undo removes the sibling。自動化予定:#535 |
| MX-O-97 | UI | 子階層を追加 | 一部自動 | 自動:src/test/headlessScheduleSession.hierarchy.regression.test.ts#MX-O-97: appendOutlineChildBranch and undo。自動化予定:#535 |
| MX-O-98 | 計算 | カテゴリ／グループ／階層を削除 | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#deletes an empty category and an empty group, then undo restores both |
| MX-O-99 | UI | カテゴリ／グループ／階層を削除 | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#restores empty group 後半 after removeGroup and one undo。自動:src/test/headlessScheduleSession.regression.test.ts#undo removes a category added under 計画 and its default グループ。自動化予定:#535 |
| MX-O-100 | UI | タスクバーをドラッグして期間変更 | 自動化予定 | 手動:RG-S3-1。自動化予定:#535 |
| MX-O-101 | UI | タスクバーをドラッグして期間変更 | 自動化予定 | 自動化予定:#535 |
| MX-O-102 | 計算 | タスクを追加選択 | 自動済み | 自動:src/model/taskSelection.test.ts#toggles with meta+click |
| MX-O-103 | UI | タスクを追加選択 | 自動化予定 | 自動化予定:#535 |
| MX-O-104 | 計算 | タスクを範囲選択 | 自動済み | 自動:src/model/taskSelection.test.ts#selects a range with shift+click |
| MX-O-105 | UI | タスクを範囲選択 | 自動済み | 自動:src/operations/contextMenuItems.test.ts#lists only delete when several tasks are selected |
| MX-O-106 | 計算 | 選択を伸ばす | 自動済み | 自動:src/model/taskSelection.test.ts#extends selection with shift+arrow |
| MX-O-107 | UI | 選択を伸ばす | 自動化予定 | 自動化予定:#535 |
| MX-O-108 | 計算 | 説明を消す | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#keeps both explanation filter and overlay after two date changes |
| MX-O-109 | 計算 | 前面スケジュールを置き換え | 自動化予定 | 自動化予定:#543 |
| MX-O-110 | 計算 | 選択中タスクを1件読む | 自動済み | 自動:src/model/screenContext.test.ts#returns null when selection is not exactly one task |
| MX-O-111 | 計算 | 選択中タスクを1件読む | 自動化予定 | 自動化予定:#543 |
| MX-O-112 | 計算 | 選択中タスクを読む（複数） | 自動済み | 自動:src/model/screenContext.test.ts#orders by document order not selection order |
| MX-O-113 | 計算 | 選択中タスクを読む（複数） | 自動化予定 | 自動化予定:#543 |
| MX-O-114 | 計算 | 画面のスケジュール JSON を読む | 自動済み | 自動:src/model/screenContext.test.ts#has no top-level fields property |
| MX-O-115 | 計算 | 画面のスケジュール JSON を読む | 自動化予定 | 自動化予定:#543 |
| MX-O-116 | 計算 | 差分テキストを読む | 自動済み | 自動:src/model/scheduleDiff.test.ts#says there is no difference when the documents match |
| MX-O-117 | 計算 | 差分テキストを読む | 自動化予定 | 自動化予定:#543 |
| MX-O-118 | 計算 | 起点・画面・ファイルの分類を読む | 自動済み | 自動:src/model/baselineDiffs.test.ts#reports no changes when baseline, screen, and file match |
| MX-O-119 | 計算 | 起点・画面・ファイルの分類を読む | 自動化予定 | 自動化予定:#543 |
| MX-O-120 | UI | メンバー／色／ステータス／拡張項目の一覧操作 | 一部自動 | 自動:src/components/settingsHierarchyDiff.dom.test.tsx#keeps the member editor open and shows the saved display name on the rows。自動:src/components/settingsHierarchyDiff.dom.test.tsx#keeps the status editor open and shows the saved status name。自動:src/components/settingsHierarchyDiff.dom.test.tsx#keeps the row fill bound to the renamed color。自動:src/hooks/scheduleFile/externalReloadFlow.dom.test.tsx#TC-SET-02e: closes the member catalog editor on reload without writing the draft |
| MX-O-121 | UI | メンバー／色／ステータス／拡張項目の一覧操作 | 自動化予定 | 自動化予定:#536 |
| MX-O-122 | UI | JSON作成スキル・更新確認の設定 | 一部自動 | 自動:src/components/settingsHierarchyDiff.dom.test.tsx#shows the browser skill note, the seven skill names, and a disabled install button。自動:src/components/settingsHierarchyDiff.dom.test.tsx#shows the package version and omits the updates section in the browser。自動:src/components/settingsDesktopChrome.dom.test.tsx#shows the overwrite confirmation when install reports existing paths。自動:src/components/settingsDesktopChrome.dom.test.tsx#disables install and remove when every skill target is unchecked。自動:src/hooks/useAppAutoUpdate.flow.test.tsx#TC-SET-06m: manual check with no update shows the latest message |
| MX-O-123 | 計算 | 説明のための見え方を掛ける | 自動済み | 自動:src/model/screenContext.test.ts#includes view.explanation when explanation view is active。自動:src/model/rows.test.ts#keeps only listed ids and ignores user filters and lineage |
| MX-O-124 | 計算 | 説明の半透明・試しの計画 | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#keeps both explanation filter and overlay after two date changes |
| MX-O-125 | UI | 説明の半透明・試しの計画 | 一部自動 | 自動:src/test/headlessScheduleSession.regression.test.ts#adopts one explanation pattern through MCP dispatch。自動化予定:#535 |
| MX-O-126 | 計算 | 試しの計画を計画へ反映 | 自動済み | 自動:src/test/headlessScheduleSession.regression.test.ts#adopts one explanation pattern through MCP dispatch |
| MX-O-127 | 計算 | 画面の見方を LLM から変更 | 自動済み | 自動:src/model/mcpSetView.test.ts#leaves collapse unchanged when patch has no collapsed fields |
| MX-O-128 | 計算 | 画面の見方を LLM から変更 | 自動化予定 | 自動化予定:#543 |
| MX-O-129 | 計算 | 計画を部分更新 | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#shifts two tasks, keeps the file until save, then clears the diff |
| MX-O-130 | 計算 | 計画を部分更新 | 自動化予定 | 自動化予定:#543 |
| MX-O-131 | UI | 文字の切り取り | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#cuts copies pastes and selects all in the name field |
| MX-O-132 | UI | 文字の切り取り | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#cuts copies pastes and selects all in the name field |
| MX-O-133 | UI | 文字のコピー | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#cuts copies pastes and selects all in the name field |
| MX-O-134 | UI | 文字の貼り付け | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#cuts copies pastes and selects all in the name field |
| MX-O-135 | UI | すべて選択 | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#cuts copies pastes and selects all in the name field |
| MX-O-136 | UI | すべて選択 | 自動済み | 自動:src/components/searchErrorKeys.dom.test.tsx#cuts copies pastes and selects all in the name field |

## MCP

| ID | 種類 | 項目 | 区分 | 行き先 |
| --- | --- | --- | --- | --- |
| MX-T-1 | 計算 | open_windows | 自動化予定 | 自動化予定:#543 |
| MX-T-2 | 計算 | schedule_diff | 自動済み | 自動:src/model/scheduleDiff.test.ts#says there is no difference when the documents match |
| MX-T-3 | 計算 | schedule_diff | 自動化予定 | 自動化予定:#543 |
| MX-T-4 | 計算 | baseline_diffs | 自動済み | 自動:src/model/baselineDiffs.test.ts#reports no changes when baseline, screen, and file match |
| MX-T-5 | 計算 | baseline_diffs | 自動化予定 | 自動化予定:#543 |
| MX-T-6 | 計算 | selected_task | 自動済み | 自動:src/model/screenContext.test.ts#returns null when selection is not exactly one task |
| MX-T-7 | 計算 | selected_task | 自動化予定 | 自動化予定:#543 |
| MX-T-8 | 計算 | selected_tasks | 自動済み | 自動:src/model/screenContext.test.ts#orders by document order not selection order |
| MX-T-9 | 計算 | selected_tasks | 自動化予定 | 自動化予定:#543 |
| MX-T-10 | 計算 | filtered_tasks | 自動済み | 自動:src/model/mcpVisible.test.ts#lists rows that intersect the vertical viewport |
| MX-T-11 | 計算 | filtered_tasks | 自動化予定 | 自動化予定:#543 |
| MX-T-13 | 計算 | current_schedule | 自動化予定 | 自動化予定:#543 |
| MX-T-14 | 計算 | replace_schedule | 自動化予定 | 自動化予定:#543 |
| MX-T-15 | 計算 | focus_window | 自動化予定 | 自動化予定:#543 |
| MX-T-16 | 計算 | close_window | 自動化予定 | 自動化予定:#541 |
| MX-T-17 | 計算 | minimize_window | 自動化予定 | 自動化予定:#541 |
| MX-T-18 | 計算 | open_new_window | 自動化予定 | 自動化予定:#543 |
| MX-T-19 | 計算 | set_view | 自動済み | 自動:src/model/mcpSetView.test.ts#leaves collapse unchanged when patch has no collapsed fields |
| MX-T-20 | 計算 | set_view | 自動化予定 | 自動化予定:#543 |
| MX-T-21 | 計算 | explain_view | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#keeps both explanation filter and overlay after two date changes |
| MX-T-22 | 計算 | explain_view | 自動済み | 自動:src/model/rows.test.ts#keeps only listed ids and ignores user filters and lineage。自動:src/model/screenContext.test.ts#includes view.explanation when explanation view is active |
| MX-T-23 | 計算 | explain_overlay | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#keeps both explanation filter and overlay after two date changes |
| MX-T-24 | 計算 | explain_overlay | 自動済み | 自動:src/test/headlessScheduleSession.regression.test.ts#adopts one explanation pattern through MCP dispatch |
| MX-T-25 | 計算 | apply_explanation_pattern | 自動済み | 自動:src/test/headlessScheduleSession.regression.test.ts#rejects apply_explanation_pattern without overlay or with unknown id。自動:src/test/headlessScheduleSession.regression.test.ts#adopts one explanation pattern through MCP dispatch |
| MX-T-26 | 計算 | edit_plan | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#shifts two tasks, keeps the file until save, then clears the diff |
| MX-T-27 | 計算 | edit_plan | 自動化予定 | 自動化予定:#543 |
| MX-T-28 | 計算 | file_action | 自動済み | 自動:src/hooks/mcpActionExecutor.file.test.ts#TC-MCP-425h: file_action save without a path returns 保存先がありません。。自動:src/hooks/mcpActionExecutor.file.test.ts#TC-MCP-425i: file_action save without overwrite or saveAs returns DISK_HASH_MISMATCH |
| MX-T-29 | 計算 | catalog_action | 自動済み | 自動:src/hooks/mcpActionExecutor.file.test.ts#TC-MCP-425e: catalog_action without save leaves the members file bytes |
| MX-T-30 | 計算 | set_preferences | 自動済み | 自動:src/hooks/mcpActionExecutor.file.test.ts#set_preferences on writes the auto update key and does not call check |
| MX-T-31 | 計算 | history | 自動済み | 自動:src/test/headlessScheduleSession.test.ts#undo and redo restore the exact saved schedule |
| MX-T-32 | 計算 | history | 自動済み | 自動:src/test/headlessScheduleSession.regression.test.ts#restores 調査 note and 設計 predecessor after delete undo and redo |
