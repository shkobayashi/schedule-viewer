# 内部仕様

開発者が構成と処理の流れを追うための文書である。正本はソースコードで、この文書と食い違ったときはコードに合わせる。画面の挙動は [外部仕様](external-spec.md)、ファイルの形は [データ仕様](data-format.md) にある。

## 全体構成

画面は React で、時間軸は react-konva で描く。ファイルの読み書きは Tauri の Rust 側が行う。Rust は JSON の意味を解釈しない。検証、行の計算、取り消し履歴、書き出すファイルの生成は、フロントの `src/model/` にある。

```mermaid
flowchart TD
  components[components と App]
  hooks[hooks]
  model[model の純粋関数]
  ipc[model の I/O ラッパ]
  rust[src-tauri のコマンド]
  components --> hooks
  components --> model
  hooks --> model
  hooks --> ipc
  ipc --> rust
```

| 場所 | 責務 |
| --- | --- |
| `src/main.tsx` | React のマウント |
| `src/App.tsx` | 画面の組み立て、ダイアログの接続、右クリックメニュー。キーボードは `useAppKeyboard` |
| `src/components/` | ツールバー、サイドバー、タイムライン、各ダイアログ |
| `src/hooks/` | 文書（スケジュールの内容）、ファイル、ズーム、今日、メンバー、カレンダーの状態 |
| `src/model/` | 型、検証、行、座標、履歴、書き出し。I/O を持つのは一部だけ |
| `src/sample/` | 起動時のサンプル |
| `src-tauri/src/lib.rs` | ダイアログ、一時ファイルを使った安全な置き換え、アプリデータ、内容ハッシュ |
| `scripts/` | 検証器の生成、サンプル検査、バージョン同期 |
| `docs/*.schema.json` | JSON Schema の正本 |
| `.cursor/skills/` | LLM 用のスキル。`implement-change` はこのリポジトリの実装手順、`review-project` は全体レビューの手順。`update-schedule-schema` はスケジュール JSON の形を変えるとき。`write-schedule`、`write-members`、`write-calendar` は他のリポジトリへコピーして使う |

依存は上の図の向きだけである。コンポーネントは、モデルの純粋関数を直接呼ぶことがある。`model` はコンポーネントを参照しない。

## モジュール一覧

### コンポーネント

| ファイル | 役割 |
| --- | --- |
| `AppMenu.tsx` | ☰ メニュー |
| `ContextMenu.tsx` | タスク、マイルストン、カテゴリ、グループ、チャートの空きの右クリックメニュー。タスクは編集、複製、確度、ノート、系統、削除。カテゴリは名前の変更、下へのカテゴリ追加、グループ追加、条件付きの削除。グループは名前の変更、下へのグループ追加、条件付きの削除。マイルストンは編集、確度の切り替え、削除。日付ヘッダー、マイルストン帯の空き、チャート本体の空きは「マイルストンを追加」だけ。`#root` に出す |
| `Toolbar.tsx` | 見出し、検索、絞り込み、系統、線を引く、追加、マイルストン追加、削除、ズーム |
| `Sidebar.tsx` | 左の行、折りたたみ、名前の横ずらし、タスク行の縦ドラッグによる並べ替えと別グループへの移動、グループ行の縦ドラッグによる並べ替えと別カテゴリへの移動、カテゴリ行の縦ドラッグによる並べ替え |
| `Timeline.tsx` | Konva のヘッダー、バー、前後の線、イナズマ線、ドラッグでのスクロール。ポインターの当たりは `useTimelinePointer` |
| `MilestoneBand.tsx` | マイルストンのひし形 |
| `*Dialog.tsx` | [外部仕様](external-spec.md#ダイアログ) の各ダイアログ |
| `ModalDialog.tsx` | 共通の枠。Escape、フォーカスの保持、背面の操作禁止 |
| `TaskNoteButton.tsx` | ノートの有無で色を分けるボタン |

### フック

どれも React の状態か副作用を持つ。

| フック | 持つもの |
| --- | --- |
| `useSchedule` | 文書、取り消し、絞り込み、選択、折りたたみ、系統、編集対象、複製元、タスクとカテゴリの並べ替えのプレビュー |
| `useScheduleFile` | パス、未保存の基準、開く、閉じる確認。保存、控え、外部更新、起動復旧は `src/hooks/scheduleFile/` に分け、戻り値はここがまとめる |
| `useAppKeyboard` | ウィンドウのキー。押した結果の判断は `appKeyboard.ts` |
| `useTimelinePointer` | チャートとマイルストン帯のホバー、線を引くときの追随。当たりは `chartHitTest.ts` |
| `useTimelineView` | 1日あたりの幅、スクロール、ホイール。キーの `scrollBy` は `useAppKeyboard` から呼ぶ |
| `useToday` | 今日の日付。日付が変わると更新する |
| `useMemberCatalog` | カタログの読み込みと選択 |
| `useAppCalendar` | カレンダーの読み込み |

### モデル

純粋関数が大半である。副作用があるのは、`scheduleFile.ts`、`memberAppData.ts`、`calendarAppData.ts`、`exportHtml.ts` の保存、`uiScale.ts` と `colorScheme.ts` と `sidebarWidth.ts` の localStorage だけである。

| 関心 | ファイル |
| --- | --- |
| 型 | `types.ts`、`memberTypes.ts`、`calendarTypes.ts` |
| 検証 | `validateSchedule.ts`、`validateMembers.ts`、`validateCalendar.ts`、`*Semantics.ts`、`scheduleMigrate.ts`、`uuidV5.ts`、`validationMessages.ts`、`generated/` |
| 行と前後関係 | `rows.ts`、`stickyRows.ts`、`dependencies.ts`、`summary.ts`、`tasks.ts`、`taskOrder.ts`、`categoryOrder.ts`、`groupOrder.ts` |
| 時間軸 | `timeline.ts`、`timelineVisibleDays.ts`、`dates.ts`、`nonWorkingDay.ts`、`milestones.ts`、`chartHitTest.ts` |
| 担当とノート | `assigneeDisplay.ts`、`taskNote.ts` |
| 履歴と保存形式 | `history.ts`、`serialize.ts` |
| 画面と開いているファイルの差分 | `scheduleDiff.ts` |
| ファイルの入出力と、外部更新・控えの判定 | `scheduleExternalReload.ts`、`scheduleRecovery.ts`、`scheduleFile.ts` |
| アプリデータ | `memberAppData.ts`、`calendarAppData.ts` |
| 書き出し | `exportHtml.ts`、`exportView.ts`、`exportFilename.ts` |
| 見た目の寸法と配色 | `layoutSizes.ts`、`uiScale.ts`、`sidebarWidth.ts`、`colorScheme.ts`、`palette.ts` |
| キーボードショートカット | `shortcuts.ts` |

## 状態

状態は3種類に分かれる。

| 種類 | 中身 | 置く場所 | 残るか |
| --- | --- | --- | --- |
| 文書（`ScheduleDocument`） | タイトル、カテゴリ、マイルストン | `useSchedule` | ファイルと控えだけ。取り消しはメモリ |
| 表示 | 絞り込み、選択、折りたたみ、系統、線を引くモード、ズーム、スクロール | `useSchedule`、`App.tsx`、`useTimelineView` | 残さない。ファイルを開くと初期化する |
| ファイル | パス、未保存判定の基準にする JSON、ディスクのハッシュ | `useScheduleFile` と Rust の `ScheduleFileState` | 前回のパスは `last-schedule.json`。未保存の控えはアプリデータ |

取り消しのスナップショットに入るのは `categories` と `milestones` だけである。タイトルも、絞り込みなどの表示状態も履歴に入らない。`history.ts` は、内容が同じ変更を積まず、最大 100 件で古いものから捨てる。比較は保存形式の文字列で行い、現在の文書のキーを覚えているので、次の文書だけを文字列化する。文書を変える操作は、確定したときに 1 ステップだけ積む。失敗した変更は積まない。マイルストンを消して絞り込みを「すべて」に戻すことだけは表示状態で、その戻りは履歴に入らない。線を引くモードの起点は表示状態で、選択が起点と違う値になったときモードは終わる。

表示の状態のうち、表示サイズ、配色、左一覧の基準幅だけは localStorage に残る。キーの一覧は [データ仕様](data-format.md#アプリデータ) にある。画面に反映する解決済みの配色（ライトかダーク）は React の状態で持ち、システム追従のときは `prefers-color-scheme` の変化を監視する。左一覧の幅は、希望の基準幅と、チャートが 200px を下回らないよう縮めた表示幅を分ける。ウィンドウを狭めたときは表示だけ縮め、希望幅は残す。

## 主な処理の流れ

### 開く

```mermaid
flowchart TD
  openCmd[開く]
  dirty{未保存か}
  discard[破棄の確認]
  read[ダイアログで読む]
  validate[validateSchedule]
  accept[accept_opened_schedule]
  replace[文書を置き換え履歴を空にする]
  openCmd --> dirty
  dirty -->|yes| discard
  dirty -->|no| read
  discard -->|破棄| read
  read --> validate
  validate -->|失敗| errorDlg[エラー。保存先は変えない]
  validate -->|成功| accept
  accept --> replace
```

ブラウザ版はダイアログの代わりにファイル選択を使い、`accept_opened_schedule` は呼ばない。

### 保存

`save_schedule_file` は、上書きのとき開いているパスと要求パスが一致することを見る。パスが無いときは、フロントが別名保存として保存ダイアログを開く。`skip_disk_hash_check` が無いときは、記憶している SHA-256 とディスクを比べ、違えば `DISK_HASH_MISMATCH` を返す。フロントはこのとき SYNC-02 の確認を出す。確認の待ち時間にも保存は一つだけである。この直列化は `useScheduleSave` が持つ。書き込みは一時ファイルへ書いてから置き換える。

### 外部更新

```mermaid
flowchart TD
  poll[1.5秒ごとに poll_schedule_file_update]
  decide[decideExternalReload]
  poll --> decide
  decide -->|invalid| keep[反映しない]
  decide -->|noop| ack[ハッシュだけ更新]
  decide -->|apply| apply[未保存でなく編集中でもなければ反映]
  decide -->|confirm| ask[読み直すか画面の編集を残すか]
```

判断は `scheduleExternalReload.ts` の純粋関数である。自分の保存のあとは `acknowledge_schedule_file_contents` でハッシュを更新し、直後の監視を外部更新とみなさない。監視の開始、停止、5回連続の読み取り失敗は `useScheduleExternalReload` が持つ。ファイル操作中と保存の確認中は、読んだ内容を反映しない。監視は、ロック中にパスと期待ハッシュだけを取り、ファイルの読み込みとハッシュ計算はロックの外で行う。読み終わったときにパスが違っていたら、その結果は使わずにもう一度読む。

### 差分

「差分を表示」は、画面の保存形式と、`read_open_schedule_file` で読んだ開いているファイルを `formatScheduleDiff` に渡す。カテゴリ、グループ、タスク、マイルストンは id で対応づける。グループは、別のカテゴリへ移っていても同じ id なら変更である。パスが無い、またはブラウザ版のときはファイルを読まず、「比べるファイルがありません」と出す。検証に失敗したときは差分ダイアログを出さない。読んだ内容は保存しない。`content_hash` は変えない。

### 前回のファイルと控え

開く成功と保存の成功で、`record_open` が `last-schedule.json` にパスを書く。未保存でパスがあるとき、変更から約1秒後と閉じる直前に `write_schedule_recovery` を呼ぶ。パスが無い状態で閉じるときは `clear_last_schedule_path` で覚えたパスを消す。

起動時の判断と画面への反映は `useScheduleStartupRecovery`、控えの書き込みと削除は `useScheduleRecoveryDraft` が行う。起動時は `read_last_schedule_file` と `read_schedule_recovery` を読む。`read_last_schedule_file` は呼び出し元からパスを受け取らず、`last-schedule.json` のパスだけを読む。そのファイルが無いときは、控えの `path` に戻る。`decideRecoveryStartup` が、保存済みで開く、未保存の復元、競合、ファイル無し、不正を返す。覚えたパスと控えのパスが違うときは、覚えたパスを優先して控えは消す。ファイルが無く未保存があるときは、先にその内容を画面へ載せてから警告する。この起動でファイル無しを知らせたあとは、そのパスが再び読めるまで監視のファイルダイアログを出さない。`read_schedule_file_at_path` は、控えに書いてあるパスと一致するファイルだけを読む。起動復旧が終わるまでだけ、文書の変更、取り消し、やり直しは受け付けない。終わったあとは受け付ける。開き終わる前にディスクが変わっていれば、開いたあと通常の外部更新として読む。ファイルの書き込みは止めない。画面へ載せる前に、パスも未保存も無いかを見てから `accept_opened_schedule` する。そのあと起動の世代が変わっていたら、文書は置き換えない。

保存は、外部更新の確認を待つあいだも一つの処理だけが進む。確認を出して戻ったあとに、上書きや別名保存を続ける。

### 書き出し

`exportView.ts` が見える行からマイルストンと期間を決め、`exportHtml.ts` が SVG を組み立てる。デスクトップ版は `save_html_file`、ブラウザ版はダウンロードである。

## 検証の流れ

配布ビルドの CSP には `unsafe-eval` が無い。Ajv でスキーマを実行時にコンパイルできないので、`scripts/compile-validators.mjs` がスキーマから、単体で動く検証コード（Ajv の standalone 出力）を `src/model/generated/` に作る。`dev`、`build`、`test` は先にこれを実行する。

スケジュールは次の順で見る。

1. schemaVersion 1 なら、終了日を1日戻して schemaVersion 2 にする
2. schemaVersion 2 は拒否する
3. schemaVersion 3 なら、確度が無いタスクに `committed` を足して schemaVersion 4 にする。既にある `confidence` はそのまま残す
4. schemaVersion 4 なら、カテゴリとグループへ名前から決まる UUID を付けて schemaVersion 5 にする。同じ内容なら ID は毎回同じである。タスクやマイルストンの ID とぶつかったときだけ別の ID にする
5. schemaVersion 5 のマイルストンに確度が無いときは `committed` を足す。既にある `confidence` はそのまま残す
6. JSON Schema（schemaVersion 5）
7. 意味規則（ID の重複、先行の実在、循環など、スキーマでは表せない規則）。ID はカテゴリ、グループ、タスク、マイルストンを通して重複できない

メンバーとカレンダーも、JSON Schema のあとに意味規則を見る。`validationMessages.ts` は、エラーの場所を示す JSON Pointer をカテゴリやタスクの名前に置き換えて、エラー文言を作る。

`write-schedule`、`write-calendar`、`write-members` に同梱する検証スクリプトは、`scripts/build-validate-skill.mjs` が同じ検証を1ファイルにまとめて作る。このスクリプトは、スキーマもスキルのフォルダへコピーする。CI は、その結果がコミット済みと一致するかを見る。手順は [開発ガイド](development.md#スキーマを変えるとき) にある。

## Tauri コマンド

実装は `src-tauri/src/lib.rs`、許可は `src-tauri/capabilities/default.json` と `src-tauri/permissions/` にある。

| コマンド | 引数と戻り値 | 失敗と上限 | permission | TS |
| --- | --- | --- | --- | --- |
| `open_schedule_file` | ダイアログ。任意の初期ディレクトリ。パスと本文、または取り消し | 10MB、UTF-8 | `open-schedule-file.toml` | `scheduleFile.ts` |
| `accept_opened_schedule` | パスと本文。状態を記録 | 10MB | 同上 | 同上 |
| `check_schedule_file_changed` | ディスクのハッシュが記憶と違うか | ファイルを開いていない | `check-schedule-file-changed.toml` | 同上 |
| `poll_schedule_file_update` | 変化したときだけ本文 | 同上 | `poll-schedule-file-update.toml` | 同上 |
| `read_open_schedule_file` | 引数なし。開いているパスの本文 | ファイルを開いていない、10MB、UTF-8 以外 | `read-open-schedule-file.toml` | 同上 |
| `acknowledge_schedule_file_contents` | 本文。ハッシュを更新 | ファイルを開いていない | `poll-schedule-file-update.toml` | 同上 |
| `save_schedule_file` | 本文、別名か、提案名、期待パス、ハッシュ確認を飛ばすか。保存したパス | 10MB、`DISK_HASH_MISMATCH`、パス不一致、拡張子 | `save-schedule-file.toml` | 同上 |
| `save_html_file` | 本文、提案名、拡張子 | 10MB | `save-html-file.toml` | `exportHtml.ts` |
| `get_members_settings` | カタログ一覧と選択中 ID | — | `members-app-data.toml` | `memberAppData.ts` |
| `read_member_catalog` | カタログ ID。本文 | 2MB | 同上 | 同上 |
| `import_member_catalog` | ID、本文、上書きするか | 2MB、重複 | 同上 | 同上 |
| `delete_member_catalog` | ID | — | 同上 | 同上 |
| `set_selected_member_catalog` | ID または無し | — | 同上 | 同上 |
| `get_calendar_state` | 表示名 | — | `calendar-app-data.toml` | `calendarAppData.ts` |
| `read_app_calendar` | 本文 | 2MB | 同上 | 同上 |
| `import_app_calendar` | 表示名と本文 | 2MB | 同上 | 同上 |
| `delete_app_calendar` | なし | — | 同上 | 同上 |
| `read_schedule_recovery` | 控えの本文 | 10MB | `schedule-recovery.toml` | `scheduleFile.ts` |
| `write_schedule_recovery` | 本文 | 10MB | 同上 | 同上 |
| `delete_schedule_recovery` | なし | — | 同上 | 同上 |
| `read_schedule_file_at_path` | パス。控えのパスと一致するときだけ本文 | `SCHEDULE_FILE_NOT_FOUND` | 同上 | 同上 |
| `read_last_schedule_file` | 引数なし。覚えたパスと本文。無ければ null | 記録の形式。欠落は戻り値の error に `SCHEDULE_FILE_NOT_FOUND` | 同上 | 同上 |
| `clear_last_schedule_path` | なし | — | 同上 | 同上 |

ダイアログで選んだだけでは `ScheduleFileState` は更新されない。検証に通したあと `accept_opened_schedule` を呼ぶ。

## 永続化

`ScheduleFileState` はプロセス内の Mutex で、開いているパスと本文の SHA-256 を持つ。フロントの未保存判定（基準 JSON との文字列比較）とは別である。前回開いたパスは `last-schedule.json` に残る。

`write_utf8_atomic` は、同じディレクトリの一時ファイルへ書き、flush と sync のあと `persist` で置き換える。

アプリデータと localStorage の中身は [データ仕様](data-format.md#アプリデータ) のとおりである。上限は `MAX_SCHEDULE_BYTES`、`MAX_HTML_BYTES` が 10MB、`MAX_MEMBERS_BYTES` と `MAX_CALENDAR_BYTES` が 2MB である。

## セキュリティ

CSP は `default-src 'self'` で、インラインのスタイルと、Tauri の IPC 接続だけを追加で許す。Windows の IPC のため `connect-src` に `ipc:` と `http://ipc.localhost`、`https://ipc.localhost` がある。スクリプトの eval は許さない。

capability はメインウィンドウに、`core:default`、ウィンドウの close と destroy、上のコマンドだけを与える。close と destroy は、未保存の確認のあとフロントからウィンドウを閉じるために必要である。

上書きは、開いているパスとフロントが渡したパスが一致するときだけ行う。任意のパスを読めるコマンドは無く、`read_last_schedule_file` は覚えたパス（無ければ控えのパス）だけを読む。`read_schedule_file_at_path` は控えに書いたパスだけを読む。`read_open_schedule_file` は呼び出し元からパスを受け取らず、`ScheduleFileState` が覚えている開いているパスだけを読む。保存するファイル名は、区切り文字、制御文字、Windows の予約名を除く。カタログ ID も、パスに使えない文字を拒否する。

## 描画

`Timeline.tsx` は日付ヘッダー、本体、前後の線、親バー、タスクバー、イナズマ線を Konva で描く。未確定のタスクバーの地は、`hatch.ts` の斜線パターンである。確定はベタ塗りである。進捗の濃い帯は斜線の上にベタで描く。書き出しの SVG も同じ定数の `pattern` を使う。マイルストンは `MilestoneBand.tsx` である。未確定のひし形も同じ斜線で、確定は塗りつぶす。左の名前は DOM の `Sidebar.tsx` で、縦位置だけをチャートと揃える。左の一覧の行の上のホイールは、`useTimelineView` の `handleWheel` をチャート本体と同じく呼ぶ。ズームの基準はチャートの左端である。`Sidebar.tsx` は `passive: false` で受け、既定のスクロールは止める。縦スクロールで残すカテゴリとグループは `stickyRows.ts` の `layoutStickyHeaders` が決める。左は、その行をスクロール層から外し、ビューポート上端のオーバーレイに同じ行として描く。右は、スクロールする本体を `clipTop` より下だけ描き、固定層には同じ地、非稼働日、縦格子、下端の線、親バーを、その行のクリップ矩形の中だけ描く。親バーの x は `dateToX` のままである。ポインタの y が `clipTop` 未満のときは、`resolveChartHover` がタスクと線に当てない。書き出しは行の y も並びも変えない。一覧の幅は `--sidebar-w` に、希望の基準幅をチャート余白で縮めた値を入れ、表示倍率を掛けて描く。右端の境界をドラッグすると希望の基準幅が変わる。表示が動かないドラッグでは希望幅を変えない。境界にフォーカスがあるとき、修飾キーの無い左右キーは幅を変える。⌘ または Ctrl がある左右は幅を変えず、チャートの横スクロールになる。そこに Shift または Alt も一緒のときは、幅もスクロールも変えない。

前後の線は `dependencies.ts` の `linkPoints` である。間隔があるときは先行の右端から 12px 右で折れ、後続の左端へ入る。右へ出る余地が頭の長さより狭いときは、先行バーの外側を回ってから左端の手前で右を向く。最後の区間は右向きで、頭（`LINK_POINTER_LENGTH`）が後続バーの外に残る。画面の Arrow と書き出しの marker はその長さを共有する。線はバーより先に描く。

線を引くモードでは、起点バーの右端からポインタまで、確定した矢印と同じ `linkPoints` の折れ線を通常色で描く。クリックは受けない。タスクバーの上ではそのバーの左端まで、左の一覧の上ではチャートの左端まで、それ以外はポインタの位置で終わる。スクロールで起点が動くと始点も動く。モードが終わると消える。後続にできるタスクバーだけ、選択や状態色とは別の `linkTargetStroke` で囲む。

見えている線の当たりは、描画とは別の座標計算である。`chartHitTest.ts` がタスクバー、マイルストン、線の順で一つに決める。マイルストンの当たりは `milestoneMarkHit` で、ひし形の円（見た目の半径に 2px）と、名前の矩形と、そのあいだの隙間である。名前の幅は `milestoneLabelWidth`、左端は描画と同じくひし形の半径に 5px を足した位置、上下は円の直径と文字の高さのうち広い方である。名前幅が 0 のときは円だけである。帯のクリック、ドラッグ、右クリックは `MilestoneBand.tsx` が、同じ形の Konva の当たりで受ける。線は `nearestLinkHit` が閾値 8px 以内で一番近い 1 本を返す。選択中バーは端のハンドルの幅だけ当たりを広げる。線を引くモードでは広げない。右クリックの線も同じタスクの当たりを使う。線のレイヤはクリックを受けない。タスクバーとマイルストンが先である。日付ヘッダー、マイルストン帯の空き、チャート本体の空き（親バーと、固定段より上を含む）の右クリックは「マイルストンを追加」だけを出す。新しい当たり図形は足さない。日付は `dates.ts` の `isoDateAtChartX` で、ポインタの横位置が含まれる暦日である。日の左端を含み、次の日の左端は含まない。表示期間の外は出さない。印とタスクバーは先に受け、空きの項目は出さない。線を引くモードでは出さない。

⌘ または Ctrl と矢印の判定は `shortcuts.ts` の `matchChartScroll` と `chartScrollOffset` である。`useAppKeyboard` が `scrollBy` を呼ぶ。キーを押したときの編集、削除、ファイル操作、取り消しは `appKeyboard.ts` が決め、フックが画面の操作を呼ぶ。移動量は表示倍率を掛けた行の高さで、押し続けは keydown のリピートである。Shift または Alt が一緒のときと、ダイアログが開いているときは呼ばない。右クリックメニューはこのキーで閉じる。端で位置が変わらなくても閉じる。⌘ または Ctrl と L は `matchAppShortcut` の `link` で、線を引くモードの開始と終了である。修飾キーの無い L では始まらない。ダイアログ、検索欄、入力欄、選択欄では効かない。ボタンにフォーカスがあっても効く。⌘ または Ctrl と N は `note` で、選択中のタスクのノートダイアログを開く。効く場所は L と同じである。選択が無いときと線を引くモードでは開かない。キーのリピートでは開かない。右クリックメニューは閉じる。Shift も Alt も無い ⌘/Ctrl+N は `blocksBrowserShortcut` が真で、開かないときもブラウザに渡さない。Shift 付きは渡す。⌘ または Ctrl と +、=、− は `matchDisplayScale` で、`stepDisplayScale` が表示サイズを一段進める。押し続けは keydown のリピートである。ダイアログ、検索欄、入力欄、選択欄、ボタンでも `preventDefault` してページズームを止め、右クリックメニューを閉じる。線を引くモードは終わらせない。固定の端で段が変わらないときは保存値を変えない。自動は解決済みの倍率を小数第2位で段と比べ、固定の段にして保存する。自動で 200% の拡大は 200% を保存する。

座標の基準は `pxPerDay` である。日付から x を計算し、ズームのたびに描き直す。CSS の拡大は使わない。表示期間は、全タスクと全マイルストンのうち、最も早い日付の6日前から最も遅い日付の7日後までである（`computeTimelineRange`）。書き出しは、見えている行から同じ余白で決め直す。

バーの移動と端のドラッグのあいだ、開始日と終了日は `dragDates.ts` の `layoutDragDateChips` で置き、`Timeline.tsx` が Konva の文字で描く。文字の大きさは `headerHeight / 40`（表示倍率）に従い、`pxPerDay` には従わない。文書は離すまで変えない。触っているタスクが端の線だけ、`previewLinkBroken` の日付で色を決め、そのバーの見た目の位置へアンカーを移す。他の線は確定した位置と色のままである。日付は書き出しには入らない。

`uiScale` は文字と行の倍率で、`layoutSizes.ts` のヘッダー 40px、行 32px、バー 20px、マイルストン段 26px に掛ける。自動は幅 1100px、高さ 780px を基準にし、1 未満にはしない。固定は 0.5 から 2 である。

マイルストンの段は、日付順に見て、前のラベルと重ならない最初の段に置く。どの段にも入らなければ段を増やす。横位置の原点は固定なので、スクロールしても段は変わらない。

## 主なアルゴリズム

| 処理 | 場所 | 内容 |
| --- | --- | --- |
| 行の絞り込み | `rows.ts` の `taskMatchesFilter` と `showEmptyHierarchyRows` | 系統、担当、ステータス、確度、期限、破綻、マイルストン、名前、ノートをすべて満たすタスクだけを残す。絞り込みも系統も無いときはタスク0件のグループとカテゴリも行に出す。それ以外は0件のグループとカテゴリは行にしない。折りたたみの鍵はカテゴリとグループの `id` である |
| 見出し行の固定 | `stickyRows.ts` の `layoutStickyHeaders` と `scrollYToRevealTask` | 見えている行のうち、展開して配下が残っているカテゴリとグループを、上端へ最大2行残す。画面に収まるときと折りたたんだ行は残さない。タスクを見せるスクロールは固定段の下に合わせる |
| 系統 | `dependencies.ts` の `lineageTaskIds` | 起点から先行と後続を辿る。起点を通らない枝は入れない |
| 線を足す | `dependencies.ts` の `tryAddPredecessorLink` | 後続の `predecessors` に起点を足した候補を、循環と先行参照と先行 ID の重複で見る。通ったときだけ保存する |
| 前後の線 | `dependencies.ts` の `linkPoints` | 先行の右端から後続の左端へ。最後は右向きで、頭がバーの外に残る。間隔が足りないときは先行バーの外側を回る |
| 線の当たり | `dependencies.ts` の `nearestLinkHit` | ポインタから折れ線までの距離が 8px 以内の、一番近い 1 本 |
| チャートの当たり | `chartHitTest.ts` の `resolveChartHover` と `milestoneMarkHit` | タスク、マイルストン、線の順。マイルストンは円と名前と隙間。選択中バーはハンドル分広げる。固定段より上はタスクと線に当てない。線モードの終点は一覧、バーの左端、ポインタ。空きの右クリックは当たりを足さず、「マイルストンを追加」になる。日付は `isoDateAtChartX` |
| 循環 | `scheduleSemantics.ts` の `validateDependencyCycles` | 先行を深さ優先でたどり、たどっている途中のタスクへ戻ったら循環とみなす。編集の保存時と、チャートで線を足すときにも見る |
| 破綻 | `dependencies.ts` の `isBrokenLink` | 後続の開始が先行の終了より前。同じ日は破綻でない |
| ドラッグ中の日付 | `dragDates.ts` の `layoutDragDateChips` と `previewDatesForDrag` | 開始と終了を月/日で、棒と互いの地と他の棒を避けて置く。離したときに入る日に数字を合わせる |
| ドラッグ中の線の色 | `dragDates.ts` の `previewLinkBroken` | 触っているタスクが端の線だけ、preview の日付で破綻を見る |
| 親バー | `summary.ts` の `summarizeSpans` | 開始順に並べ、次が前の終了の翌日以前ならつなぐ。1日空くと分ける |
| イナズマ線 | `timeline.ts` の `lightningDate` | 期限超過なら終了日。着手済みで開始が今日より後なら開始日。それ以外は今日 |
| 期限超過 | `timeline.ts` の `isOverdue` | 完了以外で終了日が今日より前 |
| マイルストン超過 | `milestones.ts` の `milestonesExceededBy` | 終了日が対応マイルストンの日付より後 |
| 外部更新の判断 | `scheduleExternalReload.ts` | 不正、同じ内容、確認、即時反映 |
| 起動時の前回ファイル | `scheduleRecovery.ts` | 保存済みなら開く。一致なら未保存を復元、違いなら競合。ファイル無しと不正は別の結果 |
| 書き出しの期間 | `exportView.ts` | 見えている行と、選んだマイルストン。画面全体の期間は使わない |

## ビルドとツール

Vite は、ブラウザ版の `npm run dev` ではポート 5173、`tauri dev` ではポート 1420 を使い、`src-tauri` の変更では再起動しない。Vitest は `src/**/*.test.ts` を Node 上で実行する。TypeScript は `strict` で、`npm run build` の `tsc` が型を見る。ESLint は `dist`、`src-tauri`、`mockup`、`.cursor` を見ない。

Rust は 1.98.1 で、CI は `cargo clippy -- -D warnings` と `cargo test --locked` を実行する。バージョン番号は `package.json`、`package-lock.json`、`tauri.conf.json`、`Cargo.toml`、`Cargo.lock` を `scripts/check-version-sync.mjs` で揃える。`postinstall` は、その OS 向けの Tauri CLI があることを確認する。

npm スクリプトと CI の分岐は [開発ガイド](development.md#npm-スクリプト) にある。

## 注意点

- `rows.ts` の `ROW_HEIGHT` と `layoutSizes.ts` の `LAYOUT_ROW_HEIGHT` は、どちらも 32 で二重に定義されている。画面が使うのは、`App.tsx` が `scaledLayoutSizes` から渡す高さである
- 書き出しは、表示中の Konva を撮るのではなく、モデルから SVG を組み立て直す。見た目は近づけるが、別の実装である
- `mockup/schedule-viewer-mockup.html` は初期の検証用で、アプリからは参照しない。ESLint の対象外である
- schemaVersion 1 の移行関数はあるが、移行結果の 2 は必ず拒否する。schemaVersion 3 は確度が無いタスクを `committed` にしてから、schemaVersion 4 と同じくカテゴリとグループへ名前から決まる ID を付ける。schemaVersion 5 のマイルストンに確度が無いときは `committed` を足す。未保存の比較は、その schemaVersion 5 の保存形式である。実際に開けるのは 3、4、5 である
- 取り消しはドラッグの途中では積まない。離したときの確定が1ステップである
- タスクの並べ替えと別グループへの移動は `tasks.ts` の `reorderTaskInGroup` と `moveTaskToGroup`、`taskOrder.ts` の `resolveTaskDropTarget` が挿入位置と兄弟の可視性を決める。同じグループの挿入位置は、動かしているタスクを除いたあとである。折りたたんだグループ行は候補にしない。グループの並べ替えと別カテゴリへの移動は `tasks.ts` の `moveGroupToCategory` と `groupOrder.ts` の `resolveGroupDropTarget` が挿入位置と、同じカテゴリのグループが全部行に出ているかを決める。名前が重なる位置と、元のカテゴリのグループが無くなる位置は候補にしない。カテゴリとグループの追加と削除は `tasks.ts` の純粋関数と `useSchedule` が確定する。カテゴリの並べ替えは `tasks.ts` の `reorderCategories` と `categoryOrder.ts` が挿入位置と、行に出ているカテゴリが全部かを決める。ドラッグ中は `useSchedule` が `reorderPreview` で行だけを仮表示し、離したときに `commitCategories` で1件積む
