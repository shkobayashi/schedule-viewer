# 回帰確認の通し

自動テストのあと、この文書の手順を行う。自動化予定、保留、未検証、対象外が残っているあいだは、この通しを終えても全機能を確認し終えたことにはしない。付録の 466 行は [regression-tc.md](regression-tc.md) に全文がある。追跡用であり、毎回の必須実施ではない。

機能の対応は [regression-matrix.md](regression-matrix.md) である。

## 自動化予定（許可と更新）

`scripts/check-regression-coverage.ts` が `自動化予定:#` を検査する。許可する Issue 番号は #541 と #543 だけである。手順の「扱い」本文も同じ検査に含める。番号を変えるときは、付録・対応表・手順の扱いと、この節を同じ変更で揃える。

### #541

Windows の CI で `cargo test --locked` が通っても、次は自動済みに移さない。

- `src-tauri/tests/mcp_running_app.rs` の `#[ignore]` 8 本（PR #570 別報告）
- 付録 `TC-FILE-10` の前面化の読み直しと再起動後の拡張名（試験 `workspace_window_catalogs_differ_from_the_plain_window` は初回 workspace 読み取りだけを見る）

Windows CI 後に区分だけ見直す切替候補は、試験本文でその行の期待を断言できた次の 7 行だけである。付録 `TC-MCP-425c`、`TC-MCP-01c`、`TC-WIN-01e`、`TC-WIN-01f`。対応表 `MX-O-26`、`MX-O-29`、`MX-T-16`。`TC-FILE-10` は切替候補に含めない。

### #543

- **未着手**（自動参照なし）: 対応表 `MX-O-111`、`MX-O-113`、`MX-T-7`、`MX-T-9`
- **未解決の観測**: 上記 `#[ignore]` 8 本と、`TC-FILE-10` の前面化・再起動（どちらも #541 の一覧にも入れない）
- **Windows CI 待ち**（`自動:` が `mcp_running_app.rs`）: 付録 `TC-MCP-425a`、`TC-MCP-425g`、`TC-SYNC-01k`、`TC-WIN-01g`、`TC-VIEW-16h`、`TC-MCP-01`、`TC-MCP-01i`、`TC-MCP-01e`、`TC-MCP-01f`、`TC-MCP-01g`、`TC-MCP-01j`、`TC-MCP-01p`、`TC-MCP-02`。対応表 `MX-O-30`、`MX-O-66`、`MX-O-109`、`MX-O-115`、`MX-O-117`、`MX-O-119`、`MX-O-128`、`MX-O-130`、`MX-T-1`、`MX-T-3`、`MX-T-5`、`MX-T-11`、`MX-T-13`、`MX-T-14`、`MX-T-15`、`MX-T-20`、`MX-T-27`。Linux で通っていても、Windows の `cargo test` が通るまで自動済みにしない。

閉じた #535、#540、#547、#563 と、#536、#538 へは移さない。

## 実施範囲の索引

人が必ず行う記録は、末尾の「結果の記録」テンプレートを範囲ごとに使う。付録 466 行は追跡用であり、毎回走らせない。欄が空の項目は未実施である。未実施は合格ではない。約 2 時間 10 分と手順 62 は見積であり、記録の実測ではない。Windows と macOS は未測定である。

**短い確認**（目標 10〜15 分。見積。実測は未実施）:

- 実 IME: `RG-F1-1`〜`RG-F1-5`（追跡 `TC-FILTER-07e`、`TC-FILTER-12j`。短い確認の時間には別枠）
- 実ドラッグの感触と右クリック直後のポインタ: [RG-S3 ドラッグと、右クリックの直後](#rg-s3-ドラッグと右クリックの直後) の目的欄。`RG-S3-1` で「設計」バーを一度動かし、感触とポインタだけ記録する（日付の期待は e2e に任せる。新しい手順 ID は作らない）
- 色と読みやすさ: `RG-S2-6`（`TC-VIEW-15b`）
- 実 Excel: `RG-F5-2` のうち、表計算アプリで開いた見た目だけ（payload の自動試験は手で行わない）
- 実 OS の代表（開発版）: 開くダイアログ `RG-S4-8`、新しいウィンドウ `RG-F9-1`、外部更新の監視の残り `RG-F7-1`、起動復旧の残り `RG-F8-2`
- 固定プロンプトの実 LLM: `RG-F12-3`、`RG-F12-4`、`RG-F12-5`、`RG-F12-8`。クライアントが無いときは保留で合格にしない

**フル**: 短い確認に、まだ人が行う残りの手順を足す。扱いに「手で行わない」「手で通さない」と書いてある手順は除く。一部自動でも OS のダイアログ、別名保存、DragDrop、ファイル監視の残りなど人が行う操作が残る手順は含める。次の 12 手順は既存のテストが期待を断言するためフル記録には載せない: `RG-S1-1`、`RG-S1-2`、`RG-S1-4`、`RG-S3-13`、`RG-S4-3`、`RG-S4-6`、`RG-F7-2`、`RG-F7-3`、`RG-F8-1`、`RG-F10-3`、`RG-F10-4`、`RG-F14-3`。未実施と記録する `RG-F12-6` と未検証の `RG-F12-7` は常に載せる。配布物専用の `RG-F14-1`、`RG-F14-4`、`RG-F14-5` は含めない。`RG-F12-7` は #543 が終わるまで未検証であり、手で行っても自動の合格にはしない。

ブラウザ版では [準備](#準備) のとおり `TC-SYNC-01c` を加え `TC-SYNC-03` は対象外とする。`RG-S5` は手で行わない。`npm run test:browser-regression` はこの子 Issue の作業中と PR 前には入れない。

**配布前**: [test-spec.md](test-spec.md) の「リリース前確認」1 から 16。本文は test-spec に一つだけ置き、この節は索引である。OS ごとの列はテンプレートの配布前欄を使う。

旧い「短い通し」（RG-S2 から RG-S4 を一括で回す定義、約 22 分・手順 72 の見積）は、**人が必須の範囲の定義ではない**。自動の手順と OS のダイアログが混ざっている。

## 親 Issue #534 への対応

#537 がこの文書で担うものは、必須手動の範囲、付録と対応表の照合、空欄の記録テンプレート、親のレビュー指摘との対応である。準備・コピー復元・再起動・実 IME・実ドラッグ・色・実 Excel・OS の配布物・実 LLM の実測は未実施である。親 Issue #534 の最終チェックは付けない。

子 Issue の状態（2026-11-11、`gh issue list` で確認）: closed が #542、#539、#546、#544、#540、#545、#547、#535、#563。open が #548、#536、#538、#543、#541、#537、#566。

レビュー 7 節の時間目標と残す手動、優先修正の最終判定は #537 の担当のままである。1〜6 節と 7 節の各自動化は、それぞれ担当の子 Issue のままである。#541 と #543 が open のあいだは、全機能確認済みとはしない。

目標との比較欄（短い確認 10〜15 分、フル 45〜70 分、OS 別配布 5〜10 分、P6 未完了時のフル 60〜90 分）は空欄のままである。実測は書かない。

## 準備

原本はリポジトリの `examples/` のままにする。実施の前に作業用フォルダへコピーし、シナリオのたびに、そのシナリオが使うファイルだけ原本からコピーし直す。作業用を保存しても原本は変わらない。

```
rm -rf "$TMPDIR/schedule-viewer-regression"
mkdir -p "$TMPDIR/schedule-viewer-regression"
cp examples/regression/* "$TMPDIR/schedule-viewer-regression/"
cp examples/hierarchy/levels-3.schedule.json examples/hierarchy/levels-5.schedule.json "$TMPDIR/schedule-viewer-regression/"
cp examples/jp-2026.calendar.json "$TMPDIR/schedule-viewer-regression/"
```

基準日は 2026-04-15 である。OS の日付をこの日にできないときは、今日線の手順だけ未検証とし、合にも否にもしない。終了が 2020-01-05 の「期限超過の作業」は、今日が 2020-01-06 以降なら実行日に依らず期限超過である。

開始時の画面は、絞り込みなし、系統なし、表示倍率 100%、窓は 1 枚である。カタログは手順が指定したファイルだけを選ぶ。各シナリオの終わりで、開いたダイアログを閉じ、作業用の変更は捨ててよい。原本を上書きしたら、その実施は無効である。

前提に書いていない手順は、デスクトップ版を起動し、サンプルが表示された状態から始める。ブラウザ版で結果が違う手順は、その手順に書く。

TC-MCP-01、TC-MCP-01b、TC-MCP-01c は macOS、Ubuntu、Windows の配布物で同じ手順を見る。実機で登録した MCP から確認できたのは macOS だけである。Ubuntu と Windows は未確認であり、未確認を合格にしない。

TC-MCP-01k から TC-MCP-01o は、ツールを直接呼ばない。画面を操作したあと、Cursor のチャットの答えで判定する。答えが画面と違う、渡していないズームや点線や確定前の入力を埋める、ステータスの色だけで id を選ぶ、のどれかなら失敗である。

各 OS の配布物を上から確認する範囲は、テスト仕様のリリース前確認に残してある。ブラウザ版では TC-SYNC-01c を加え、TC-SYNC-03 は対象外である。

## 自動を先に流す

リポジトリの直下で、Node.js 24 を使う。

1. `npm test`
2. `npm run lint`
3. `npm run check:operation-entries`
4. `npm run check:regression-coverage`
5. `npm run check:madge-circular-baseline`
6. `npm run check:architecture-warn`
7. `npm run test:coverage`
8. `npm run check:schedule`
9. `npm run check:schedule -- examples/regression/smoke.schedule.json`
10. `npm run check:schedule -- examples/regression/long.schedule.json`
11. `npm run check:schedule -- examples/regression/full.schedule.json`
12. `npm run check:members -- examples/regression/members.json`

`open-fail.schedule.json` と `broken.calendar.json` は、開けないことの見本なので、この成功コマンドには入れない。デスクトップ版が要る確認は、このあとの手動である。カバレッジが床を下回ったら、先に自動を直してから手動へ進む。

この検査は、名前と参照の欠落を見る。振る舞いが正しいことの保証ではない。

## 短い通しと、全体

人が必須の範囲は [実施範囲の索引](#実施範囲の索引) を正とする。次の「短い通し」は、従来どおり RG-S2 から RG-S4 を一括で回す見積の説明であり、必須範囲の定義ではない。

短い通しは RG-S2 から RG-S4 である。RG-S1 と RG-S5 は自動テストが見ている。シナリオの見積は RG-S2 が 12 分、RG-S3 が 15 分、RG-S4 が 18 分である。基準は feature-436 時点の 39 分・約 2 時間 38 分・手順 89 である（#547 の 9 手順・約 22 分、RG-S3-13 の 1 分、以前分の約 16 分は再引きしない）。いまの目安は約 22 分である（39 分−17 分＝22 分。見積。短い通しで引く手順は RG-S2-1〜5・RG-S2-7、RG-S3-1・2・4・5・6・9・12 の 13 件で、見積として RG-S2 から約 11 分・RG-S3 から約 6 分を割り当てる。RG-S3-3 右端、RG-S3-7、RG-S3-8、RG-S2-6、RG-S3-10、RG-S3-11 は引かない）。全体の代表手順は、それに RG-F1 から RG-F14 を足して約 2 時間 10 分である（158 分−17 分−8 分−3 分＝130 分。見積。短い通しの 17 分に加え RG-F2-1〜3 に 8 分、RG-F10-2 に 3 分を割り当てて引く。RG-F2 の 8 分は F2-1〜3 のみで、RG-F2-4 と RG-F2-5 は DOM 自動で以前から手で行わないため二重に引かない。RG-F9 の分は引かない）。シナリオの見積は RG-F2 が 10 分、RG-F9 が 14 分、RG-F10 が 9 分である。RG-F9-3 は覆いの前面化が手動のまま残る。RG-S1-4 は扱いが自動になったが、89 の引き算には含めない。RG-S3-7 と RG-S3-8 はメニュー表示は e2e が見ているが、手順数と時間の引き算には含めない。RG-F7-1 と RG-F8-2 は実機の監視が残るため、上の引き算には含めない。RG-F5-3・RG-F9-2 のファイルダイアログ部分・RG-F14-2 は扱い本文に手動が残るため、時間と手順数の引き算には含めない。RG-F3 と RG-F13 は手で通さない。#543 では手順も分数も引かない。見積。#541 は手順も分数も引かない。シナリオは 19 本、手順は 62 である（72−10＝62。引いた 10 手順は RG-F4-1・RG-F4-3・RG-F4-4・RG-F5-1・RG-F10-1・RG-F11-1・RG-F11-2・RG-F11-4・RG-S3-10・RG-S3-11。RG-F4-2・RG-F5-2・RG-F10-2・そのほか手動が残る手順は含めない）。#536 で自動化した RG-F4・RG-F5・RG-F10・RG-F11・RG-S3 の 10 手順は、シナリオ見積の分数は引かない（各シナリオの目安分は、表計算アプリや追随矢印など手動が残る分を含むため）。この分数は見積で、実測ではない。`test.skip` で合格にするテストは自動済みに数えない。

各手順の番号ごとに、合、否、保留、未検証、対象外のいずれかと、違ったときは見えた文を記録する。記録の型は末尾にある。自動化予定と書いた手順を手で行っても、その Issue が終わるまで自動の代わりの合格にはしない。

## RG-S1 起動と初回の案内

目的は、初回のカードが閉じたあとも出ないことと、保存のヒントが保存で消えることである。文言の読み上げと、閉じたあとの残り、保存ヒントの出入りは自動テストが断言する。配布したアプリを初めて起動したときの見切れは、この手順には含めていない。

### RG-S1-1

開始: 初回相当。サンプルが表示されている。

操作: 右下のカードを見る。

期待: 見出しはサンプルを表示している旨である。項目は「スケジュールを用意する」「操作の案内を読む」「LLM（MCP）とつなぐ」である。「LLM で作る」と「ある JSON を開く」がある。

扱い: 自動:src/components/FirstRunHintCard.dom.test.tsx#shows the sample heading, three items, and two prepare buttons。この手順の期待は既存のテストが断言している。

### RG-S1-2

操作: 「操作の案内を読む」を押し、閉じる。

期待: 案内に「最初にやる 3 つ」「開く・保存」「画面の見方」「もう少し知りたいとき」がある。

扱い: 自動:src/components/GuideDialog.dom.test.tsx#shows the four headings while open。この手順の期待は既存のテストが断言している。

### RG-S1-3

操作: カードの閉じるを押し、同じ環境でもう一度起動する。

期待: カードは出ない。

扱い: 自動:src/components/browserDesktopChrome.dom.test.tsx#hides the first-run card after dismiss across a remount。この手順は手で行わない。

### RG-S1-4

開始: 作業用の `smoke.schedule.json` を開く。保存先はそのコピーである。

操作: 「調査」の名前を「調査メモ」に変える。状態バーを見てから、その作業用ファイルへ保存する。

期待: 変えた直後、状態バーは「保存は ☰ または Ctrl+S」（Mac では ⌘S）である。保存後、同じ環境ではその文は出ない。作業用ファイルの名前は「調査メモ」である。原本の `examples/regression/smoke.schedule.json` の名前は「調査」のままである。終わったら作業用を原本からコピーし直す。

扱い: 自動:src/components/browserDesktopChrome.dom.test.tsx#shows the save hint while the document is dirty and clears it after save。自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#saves the open path without a dialog and the design end becomes 2026-04-10 (FILE-02)。ヒントの出入りと保存内容は既存のテストが断言している。

## RG-S2 表示と色

目的は、決めた窓と倍率で、横移動、縦スクロール、表示の切り替え、色の読みやすさを分けて見ることである。対象はデスクトップ版である。目安は 12 分である。移動と拡大は `npm run test:browser-regression` が見ている。色が読めるかの最終判断は人が残す。

### RG-S2-1

開始: 作業用の `smoke.schedule.json`。窓の内側は幅 1280、高さ 800。表示倍率は 100% である。

操作: 開く。

期待: タイトルは「回帰確認」である。「調査」「設計」「期限超過の作業」、空の「後半」、空の分類が見える。

扱い: 自動:e2e/browser-regression/specs/smoke-view-nav.spec.ts#shows the smoke fixture title and task names (VIEW-01)。この手順は手で行わない。

### RG-S2-2

開始: 作業用の `long.schedule.json` を開く。窓は RG-S2-1 と同じである。

操作: 左の一覧を一番下まで送る。

期待: 「行40」が見え、「行01」は上に隠れる。チャートの縦位置は一覧と同じ行である。

扱い: 自動:e2e/browser-regression/specs/smoke-nav-scroll.spec.ts#scrolls the long list until row 40...。この手順は手で行わない。

### RG-S2-3

開始: 作業用の `smoke.schedule.json`。表示は日である。

操作: チャートの空白を、押した位置から右へ 80px 動かし、離す。

期待: 日付の見出しが左へ動く。左の一覧の行は縦に動かない。

扱い: 自動:e2e/browser-regression/specs/smoke-view-nav.spec.ts#pans the empty chart 80px without moving the list vertically (NAV-01)。この手順は手で行わない。


### RG-S2-4

操作: Shift を押したままホイールを下へ回す。

期待: 横方向だけが動く。一覧の縦位置は変わらない。

扱い: 自動:e2e/browser-regression/specs/smoke-nav-scroll.spec.ts#shifts the chart horizontally with shift and the wheel。この手順は手で行わない。


### RG-S2-5

操作: 日、週、月、全体、今日の順に押す。

期待: 基準日 2026-04-15 なら、日の表示で今日線が 2026 年 4 月の範囲に見える。OS の日付を変えられないときは未検証とし、合にしない。

扱い: 自動:e2e/browser-regression/specs/smoke-view-nav.spec.ts#sets day week and month widths to 40 22 and 8 and fits (NAV-02, NAV-03)。自動:e2e/browser-regression/specs/layout-f2.spec.ts#runs 今日 from the command palette and ignores the palette shortcut while a dialog is open。この手順は手で行わない。


### RG-S2-6

操作: ライトとダークを切り替える。

期待: 進行中の色、期限超過の赤、「調査」の未割当、土日の塗りが、地に溶けて読めなくならない。読めない色の名前を記録する。

扱い: 手動のまま:色が地に溶けて読めるかは人が判断する。この手順は自動化しない。

### RG-S2-7

操作: 左の境界を、窓の左から 200px の位置から 360px の位置へドラッグする。

期待: 「調査」の行で、名前の縦位置とバーの縦位置がずれない。境界の横移動で行が上下にずれない。

扱い: 自動:e2e/browser-regression/specs/smoke-nav-scroll.spec.ts#drags the sidebar boundary and keeps the row and bar on the same y。この手順は手で行わない。


## RG-S3 ドラッグと、右クリックの直後

目的は、離して確定する操作と、離す前の Escape を分け、削除の確認と取り消しの戻りを見ることである。対象はデスクトップ版である。見本は作業用の `smoke.schedule.json` である。各手順の前に原本からコピーし直す。目安は 15 分である（見積で、実測ではない）。座標とドラッグの確定は `npm run test:browser-regression` が見ている。削除と取り消し・やり直しの結果の計算は `headlessScheduleSession.regression.test.ts` が持っている。ドラッグの感触と、右クリックの直後のポインタは、手順の外で人が残す。

### RG-S3-1

開始: 「設計」の開始は 2026-04-04、終了は 2026-04-08 である。

操作: 「設計」のバー本体を右へ動かし、月日が 2026-04-06 から 2026-04-10 と出たところで離す。

期待: 開始は 2026-04-06、終了は 2026-04-10 である。日数の差は 4 日のままである。取り消しの履歴が 1 段増える。

扱い: 自動:e2e/browser-regression/specs/smoke-view-nav.spec.ts#moves 設計 to 2026-04-06 through 2026-04-10 on release and adds one undo (EDIT-02)。この手順は手で行わない。

### RG-S3-2

開始: 原本からコピーし直す。開始は 2026-04-04、終了は 2026-04-08 である。

操作: 「設計」のバー本体を右へ押し、離す前に Escape を押す。

期待: 開始は 2026-04-04、終了は 2026-04-08 のままである。取り消しの履歴は増えない。

扱い: 自動:e2e/browser-regression/specs/smoke-view-nav.spec.ts#leaves 設計 unchanged when escape is pressed before release (EDIT-02)。この手順は手で行わない。

### RG-S3-3

操作: 「設計」の右端を左へ動かし、1 日より短くしようとする。

期待: 終了は開始の 2026-04-04 より前にならない。最短でも開始と同じ日である。

扱い: 手動のまま:headless では Konva の右端ドラッグが再現できない。期間端クリックは自動:e2e/browser-regression/specs/smoke-edit-drag.spec.ts#does not focus the detail name when the period edge is clicked。

### RG-S3-4

操作: 「設計」を選んでいない状態で、期間の端をクリックする。

期待: 詳細の名前欄へフォーカスは移らない。

扱い: 自動:e2e/browser-regression/specs/smoke-edit-drag.spec.ts#does not focus the detail name when the period edge is clicked。この手順は手で行わない。

### RG-S3-5

操作: 「設計」のバーを右クリックし、メニューを閉じないまま、そのままバーを右へ動かして離す。取り消しを 1 回押す。

期待: 離した時点の日付が一度確定する。取り消し 1 回で、開始 2026-04-04、終了 2026-04-08 に戻る。

扱い: 自動:e2e/browser-regression/specs/smoke-edit-drag.spec.ts#commits a drag that starts as a right click and undoes it once。この手順は手で行わない。

### RG-S3-6

操作: 「設計」を選び、期間ハンドルとそのすぐ内側を右クリックする。

期待: メニューは出ない。選択は「設計」のままである。

扱い: 自動:e2e/browser-regression/specs/smoke-edit-drag.spec.ts#keeps 設計 selected when the handle or its inside edge is right-clicked。この手順は手で行わない。

### RG-S3-7

操作: 「調査」をクリックし、Shift を押したまま「設計」をクリックする。右クリックする。削除は押さない。

期待: メニューは削除だけである。2 件とも残る。

扱い: 自動:src/operations/contextMenuItems.test.ts#lists only delete when several tasks are selected。自動:e2e/browser-regression/specs/smoke-edit-drag.spec.ts#shows only delete after shift-clicking 調査 and 設計。この手順は手で行わない。

### RG-S3-8

操作: チャートの空白を右クリックする。

期待: 「マイルストンを追加」だけである。

扱い: 自動:src/operations/contextMenuItems.test.ts#lists only add-milestone on an empty chart。自動:e2e/browser-regression/specs/smoke-edit-drag.spec.ts#shows only add-milestone on an empty chart right click。この手順は手で行わない。

### RG-S3-9

操作: 「調査」を削除し、確認でキャンセルする。

期待: 「調査」が残る。ノート「回帰確認用のノート」も残る。担当は未割当のままである。

扱い: 自動:e2e/browser-regression/specs/smoke-edit-drag.spec.ts#keeps 調査 when delete is cancelled。この手順は手で行わない。

### RG-S3-10

操作: 「調査」を削除し、確認で削除する。取り消しを 1 回押す。

期待: 「調査」が戻る。ノート、未割当が削除前と同じである。先行が「調査」だった「設計」の線も戻る。選択が削除前と同じになることは、アプリはまだ保証しない（`pruneTaskSelection` のあと空のまま残る）。

扱い: 自動:src/test/headlessScheduleSession.regression.test.ts#restores 調査 note and 設計 predecessor after delete undo and redo。自動:e2e/browser-regression/specs/view-appearance.spec.ts#restores the survey note and the design link after delete and undo, and leaves the selection empty。この手順は手で行わない。

### RG-S3-11

操作: やり直しを 1 回押し、もう一度取り消しを押す。

期待: やり直しで「調査」が消え、取り消しで RG-S3-10 の戻りと同じになる（選択の復元を除く）。

扱い: 自動:src/test/headlessScheduleSession.regression.test.ts#restores 調査 note and 設計 predecessor after delete undo and redo。自動:e2e/browser-regression/specs/view-appearance.spec.ts#removes the survey on redo and restores it again on undo, with the selection still empty。この手順は手で行わない。

### RG-S3-12

開始: 原本からコピーし直す。空の「後半」は、タスクのある「前半」と同じ分類にある。

操作: 「後半」の削除を開き、確認でキャンセルする。

期待: 「後半」は残る。

扱い: 自動:e2e/browser-regression/specs/smoke-edit-drag.spec.ts#keeps the empty group 後半 when delete is cancelled。この手順は手で行わない。

### RG-S3-13

操作: 「後半」を削除し、確認で削除する。取り消しを 1 回押す。

期待: 削除のあと「後半」は消え、取り消し 1 回で空のグループとして戻る。

扱い: 自動:src/test/headlessScheduleSession.regression.test.ts#restores empty group 後半 after removeGroup and one undo。この手順の期待はこのテストが断言している。

## RG-S4 保存して開き直す

目的は、保存先が無い新規、保存先がある通常保存、別名保存、破棄、ドロップ、ショートカットを分けることである。対象はデスクトップ版である。原本は上書きしない。目安は 18 分である。保存の分岐の多くは `fileSaveFlow.dom.test.tsx` が見ている。OS のダイアログで選ぶ操作は人が残す。

### RG-S4-1

開始: サンプルが表示され、保存先は無い。

操作: タイトルを「回帰の新規」に変え、保存する。ダイアログでは作業用の `new.schedule.json` を指定する。

期待: 保存先を聞く。作業用にファイルができ、タイトルは「回帰の新規」である。原本は増えない。

扱い: OS の保存ダイアログは手動のままである。

### RG-S4-2

開始: 保存先が無い状態で、タイトルを「キャンセルの確認」に変える。

操作: 保存のダイアログを開き、キャンセルする。

期待: 未保存のままである。作業用に `new.schedule.json` はできない。

扱い: OS の保存ダイアログは手動のままである。

### RG-S4-3

開始: 作業用の `smoke.schedule.json` を開く。保存先はそのパスである。

操作: 「設計」の終了を 2026-04-10 に変え、保存する。

期待: 保存先のダイアログは出ない。作業用ファイルの終了は 2026-04-10 である。原本の終了は 2026-04-08 のままである。差分列の差は消える。

扱い: 自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#saves the open path without a dialog and the design end becomes 2026-04-10 (FILE-02)。この手順の期待は既存のテストが断言している。

### RG-S4-4

操作: 別名保存を開き、キャンセルする。

期待: 保存先は作業用の `smoke.schedule.json` のままである。

扱い: OS の別名保存ダイアログは手動のままである。

### RG-S4-5

操作: 別名保存で作業用の `copy.schedule.json` を確定する。そのあとタイトルを「別名の確認」に変える。まだ保存しない。閉じる確認で破棄する。

期待: 保存先は一度 `copy.schedule.json` になる。破棄のあと、そのファイルのタイトルは「回帰確認」のままである。「別名の確認」は残らない。

扱い: 自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#save as then save writes the second change to the new path。OS の別名保存ダイアログは手動のままである。

### RG-S4-6

開始: 作業用の `smoke.schedule.json`。

操作: 「設計」の開始を 2026-04-05 に変え、保存せずに終了する。未保存を残す方を選んで起動する。

期待: 起動後の開始は 2026-04-05 である。原本は 2026-04-04 のままである。

扱い: 自動:src/hooks/scheduleFile/startupRecoveryFlow.dom.test.tsx#TC-SYNC-03: restores unsaved start date for RG-S4-6。この手順の期待はこのテストが断言している。

### RG-S4-7

操作: 作業用の `smoke.schedule.json` をウィンドウへ 1 つ落とす。続けて JSON を 2 つ同時に落とす。

期待: 1 つのときは開く。2 つのときは開かず、「スケジュールの JSON を1つだけ落としてください。」が出る。

扱い: 手動のまま:ウィンドウへ JSON を落とす操作は DragDrop で、試験から送れない。

### RG-S4-8

操作: ⌘O または Ctrl+O で作業用の `smoke.schedule.json` を選ぶ。

期待: タイトルは「回帰確認」である。ダイアログが開いているあいだは、このキーは開かない。

扱い: OS の開くダイアログは手動のままである。

## RG-S5 ブラウザ版との差

目的は、通常のブラウザにデスクトップだけの案内が無く、ファイルを監視しないことである。対象は `npm run dev` のブラウザ（ポート 5173）である。撮影用の shim モードとは分けて見る。この 3 手順は自動テストが断言する。

### RG-S5-1

操作: ブラウザ版を開く。

期待: 初回カードも、保存のヒントも出ない。

扱い: 自動:src/components/browserDesktopChrome.dom.test.tsx#omits the first-run card and save hint in the browser runtime。この手順は手で行わない。

### RG-S5-2

操作: 設定を開く。

期待: 「画面の状態を渡す」が無い。

扱い: 自動:src/components/browserDesktopChrome.dom.test.tsx#omits the screen-state settings section in the browser。この手順は手で行わない。

### RG-S5-3

開始: 作業用の `smoke.schedule.json` を、ブラウザのファイル選択で開く。

操作: 別のエディタで、その作業用ファイルのタイトルを「外部変更」にして保存し、5 秒待つ。

期待: 画面のタイトルは「回帰確認」のままである。バーのドラッグはできる。デスクトップ版の監視は RG-F7 で見る。

扱い: 自動:src/components/browserDesktopChrome.dom.test.tsx#does not poll an external file or write filters in the browser。この手順は手で行わない。待った秒数だけでは合格にしない。

## RG-F1 日本語変換

目的は、変換の確定と、欄の保存を分けることである。対象は、日本語変換が使える OS のデスクトップ版である。見本は作業用の `smoke.schedule.json` である。目安は 12 分である。短い通しには入れない。模擬の入力イベントは実機の変換の代わりにしない。切り取り、コピー、貼り付け、全選択のキー配線は自動テストが断言する。実機の日本語変換は、このシナリオの残る手順で見る。

### RG-F1-1

操作: 「調査」の詳細で名前を編集し、かな「ちょうさ」の変換中に Enter を押す。

期待: 変換の候補が確定するだけで、欄は閉じない。名前はまだ保存されない。

扱い: 手動のまま:変換中の Enter は実機の日本語変換でしか確認できない。この手順は自動化しない。

### RG-F1-2

操作: 変換を「調査メモ」で確定し、そのあと Enter で欄を閉じる。

期待: 名前は「調査メモ」である。原本へは保存しない。

扱い: 手動のまま:実機の変換確定は模擬イベントで代用しない。この手順は自動化しない。

### RG-F1-3

操作: 同じ欄を開き、かな「へんかん」の変換中に Escape を押す。欄が閉じたあとに届く blur を待つ。

期待: 変換だけがキャンセルされる。欄を閉じる Escape とは別である。「へんかん」は名前に残らない。

扱い: 手動のまま:変換中の Escape は実機の日本語変換でしか確認できない。この手順は自動化しない。

### RG-F1-4

操作: 見出しのタイトルを編集し、かな「たいとる」を「回帰確認タイトル」に確定してから Enter で閉じる。

期待: タイトルは「回帰確認タイトル」である。

扱い: 手動のまま:見出しの実機の変換確定は模擬イベントで代用しない。この手順は自動化しない。

### RG-F1-5

操作: 絞り込みの候補を開いたまま、かな「せっけい」を変換中に下矢印を押し、Enter を押す。

期待: 強調行は動かない。Enter で候補は決まらない。

扱い: 手動のまま:変換中の矢印は実機の日本語変換でしか確認できない。この手順は自動化しない。

### RG-F1-6

操作: 名前欄で「設計メモ」を入れ、全選択、切り取り、貼り付けの順に行う。コピーは切り取る前に 1 回行う。

期待: 貼り付けのあと、欄の文字は「設計メモ」である。OS のクリップボードを 1 往復する。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#cuts copies pastes and selects all in the name field。この手順は手で行わない。jsdom は OS のクリップボードを往復しない。アプリが全選択、切り取り、コピー、貼り付けのキーを奪わないことと、貼ったあとの欄の文字は、このテストが断言する。

## RG-F2 メニューと狭い窓

目的は、決めた 2 つの窓で、短いラベル、一覧、右下のメニュー、パレットを分けることである。対象はデスクトップ版である。目安は 10 分である。短い通しには入れない。狭い窓の見た目は `npm run test:browser-regression` が見ている。メニューとパレットのキーは自動テストが断言する。

### RG-F2-1

開始: 窓の内側は幅 1280、高さ 800 である。

操作: ツールバーの「案内」「日」「週」「月」「追加」を見る。

期待: ラベルは短いままである。ボタンの説明は正式名である。

扱い: 自動:e2e/browser-regression/specs/layout-f2.spec.ts#shows only short toolbar labels at 1280 by 800。この手順は手で行わない。

### RG-F2-2

操作: 窓の内側を幅 480、高さ 640 にする。? または F1 でショートカット一覧を開く。

期待: 1 列に畳まれ、文字が切れない。

扱い: 自動:e2e/browser-regression/specs/layout-f2.spec.ts#folds the shortcut list into one column at 480 by 640。この手順は手で行わない。


### RG-F2-3

操作: 幅 480、高さ 640 のまま、窓の右端から 8px、下端から 8px の位置を右クリックする。

期待: メニューは窓の中に収まる。上下に往復しない。

扱い: 自動:e2e/browser-regression/specs/layout-f2.spec.ts#keeps the corner context menu inside the 480 by 640 window。この手順は手で行わない。


### RG-F2-4

操作: ☰ を開き、下、上、Home、End の順に押し、Escape を押す。

期待: 項目を移動でき、Escape で閉じる。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#moves the menu with arrows home and end and closes it with escape。この手順は手で行わない。

### RG-F2-5

操作: ⌘K または Ctrl+K でコマンドパレットを開き、Escape で閉じる。

期待: パレットが開いて閉じる。案内ダイアログは開かない。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#opens and closes the command palette without the guide。この手順は手で行わない。

## RG-F3 絞り込みの画面

目的は、決めた語と担当と状態で、残る行と解除後を見ることである。対象はデスクトップ版である。短い通しには入れない。条件の計算と、画面の配線は自動テストが断言する。このシナリオは手で行わない。

### RG-F3-1

開始: 作業用の `smoke.schedule.json`。絞り込みは無い。

操作: 名前に「設計」と入れる。

期待: 「設計」だけが残る。件数は 1 である。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#keeps only tasks whose name contains the query。この手順は手で行わない。

### RG-F3-2

操作: 「設計」から系統を出す。条件をすべて解除する。

期待: 系統は残る。名前の条件は外れる。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#keeps lineage when every filter chip is cleared。この手順は手で行わない。

### RG-F3-3

操作: ⌘F または Ctrl+F を押す。

期待: 検索欄にフォーカスがある。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#focuses the search field and selects its text on ctrl+f。この手順は手で行わない。

### RG-F3-4

開始: 作業用の `full.schedule.json` を開き、作業用の `members.json` を選ぶ。

操作: 担当を「田中」にする。

期待: 「調査」と「設計」が残る。「やること付き」は残らない。札は田中である。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#filters assignees from the panel and clears one chip。この手順は手で行わない。

### RG-F3-5

操作: ステータスを「進行中」（id は `in-progress`）にする。札を押す。

期待: 札があるあいだは「設計」が残る。札を押すと、その条件だけ外れる。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#filters assignees from the panel and clears one chip。この手順は手で行わない。

### RG-F3-6

操作: タグ「回帰」で残し、そのあと絞り込みをすべて解除する。

期待: タグのあいだは「設計」が残る。解除後は「調査」「設計」「期限超過の作業」「やること付き」「拡張あり」「不明担当」と「行01」以降が戻る。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#filters tags and clears one chip without clearing lineage。この手順は手で行わない。

### RG-F3-7

操作: 「設計」を選んでから、名前の絞り込みを「調査」に変える。

期待: 選択は外れる。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#clears the selection when the name query changes。この手順は手で行わない。

## RG-F4 線の見た目

目的は、線の削除、破綻する相手、節目の形、円弧を分けることである。対象はデスクトップ版である。目安は 12 分である。短い通しには入れない。RG-F4-2 の追随矢印の赤と太さは手動のままである。読みやすさは人が残す。

### RG-F4-1

開始: 作業用の `smoke.schedule.json`。「設計」の先行は「調査」である。

操作: 「調査」と「設計」のあいだの線の上にポインタを置き、Delete を押す。取り消しを 1 回押す。

期待: 線だけが外れ、2 件のタスクは残る。取り消しで線が戻る。Escape は押していない。

扱い: 自動:e2e/browser-regression/specs/links-f4.spec.ts#deletes the hovered predecessor with Delete and restores it with undo。この手順は手で行わない。

### RG-F4-2

開始: 原本からコピーし直す。線を引くモードにする。

操作: 「設計」から「期限超過の作業」へ線をドラッグする。「期限超過の作業」の終了は 2020-01-05 で、「設計」の開始 2026-04-04 より前である。離す前に Escape を押す。

期待: ドラッグ中の線だけが赤く太くなる。Escape のあと、線は増えない。「設計」の先行は「調査」のままである。

扱い: 自動:e2e/browser-regression/specs/links-f4.spec.ts#cancels a link drag onto an earlier task with Escape。手動のまま:線を引くモードの追随矢印は通常色のままなので、ドラッグ中の赤と太さは人が見る。

### RG-F4-3

操作: マイルストン「承認」と「未確定の節目」を見る。

期待: 「承認」のひし形は塗られている。「未確定の節目」のひし形は中空である。

扱い: 自動:e2e/browser-regression/specs/links-f4.spec.ts#shows a filled approval diamond and a hollow tentative diamond。自動:e2e/browser-regression/specs/export-f5.spec.ts#matches exported summary bars, hollow milestones, and hatches to the screen。この手順は手で行わない。

### RG-F4-4

開始: 作業用の `full.schedule.json`。繋がり「相談」は「調査」と「設計」である。

操作: 円弧が見えることを確認し、線の上で Delete を押し、取り消しを 1 回押す。

期待: 円弧が消え、取り消しで「相談」が戻る。タスクは残る。

扱い: 自動:e2e/browser-regression/specs/links-f4.spec.ts#deletes the hovered connection arc with Delete and restores the label with undo。この手順は手で行わない。

## RG-F5 書き出しの見た目

目的は、HTML、SVG、Excel を決めた場所へ出し、空の確定を分けることである。対象はデスクトップ版である。目安は 14 分である。短い通しには入れない。HTML と SVG の構造は e2e が見ている。Excel を実アプリで開く見た目は人が残す。

### RG-F5-1

開始: 作業用の `smoke.schedule.json`。

操作: HTML を作業用の `out.html` へ、SVG を作業用の `out.svg` へ書き出す。HTML をブラウザで開く。

期待: 左の「調査」と、同じ行のバーが対応する。SVG にも「調査」の文字がある。原本は変わらない。

扱い: 自動:e2e/browser-regression/specs/export-f5.spec.ts#downloads HTML and SVG of the smoke schedule and opens the HTML。この手順は手で行わない。

### RG-F5-2

操作: 同じ見本を Excel で作業用の `out.xlsx` へ書き出す。表計算のアプリで開く。続けて作業用の `levels-3.schedule.json` を開き、HTML で書き出す。

期待: Excel に「調査」、開始 2026-04-01、日本語の名前がある。3 段の HTML は、段の字下げと親バーが画面の行と対応する。

扱い: 自動:src/model/exportExcel.test.ts#puts the smoke task name, start date, and Japanese text in the excel payload。自動:e2e/browser-regression/specs/export-f5.spec.ts#matches exported summary bars, hollow milestones, and hatches to the screen。表計算アプリで開いた見た目は手動のままである。手動:RG-F5-2。

### RG-F5-3

操作: 書き出し先を空のまま確定できるかを試す。

期待: ダイアログが空を渡せるときは、書き出せず理由が出る。空を渡せないときは対象外と記録し、合格にしない。

扱い: 自動:src-tauri/src/lib.rs#write_schedule_export_at_path_rejects_an_empty_path。ダイアログが空を渡せるかは手動のままである。

## RG-F6 設定の読み込みと編集

目的は、担当と色が付いた見本で、表示名の変更がチャートへ残り、外部の読み直しで下書きが消えることである。対象はデスクトップ版である。目安は 16 分である。短い通しには入れない。担当、ステータス、色、追加項目の表示と編集は、画面部品テスト `settingsHierarchyDiff.dom.test.tsx` が確かめている。別プログラムがファイルを書く監視は手動のままである。

### RG-F6-1

開始: 作業用の `full.schedule.json` を開く。作業用の `members.json`、`colors.json`、`statuses.json`、`fields.json`、`jp-2026.calendar.json` を選ぶ。

操作: 「設計」の行を見る。

期待: 担当は田中と佐藤である。色の id は `focus`（名前は注力）である。ステータスは進行中である。「拡張あり」のメモは「回帰メモ」である。「やること付き」に「下書き」と「確認」がある。

扱い: 自動:src/components/settingsHierarchyDiff.dom.test.tsx#shows assignee, status, color name, and extension memo from the selected catalogs。この手順は手で行わない。

### RG-F6-2

操作: 設定のメンバーで「項目を編集…」を開き、id `tanaka` の表示名を「田中改」にして保存する。

期待: 覆いは開いたままである。「設計」と「調査」の担当表示が「田中改」になる。

扱い: 自動:src/components/settingsHierarchyDiff.dom.test.tsx#keeps the member editor open and shows the saved display name on the rows。この手順は手で行わない。

### RG-F6-3

操作: ステータスの覆いで、id `in-progress` の表示名を「進行」にして保存する。

期待: 「設計」の札が「進行」になる。覆いは開いたままである。

扱い: 自動:src/components/settingsHierarchyDiff.dom.test.tsx#keeps the status editor open and shows the saved status name。この手順は手で行わない。

### RG-F6-4

操作: 色の覆いで、id `focus` の名前を「注力改」にして保存する。

期待: 「設計」の地の色は変わらず、詳細の色の欄に「注力改」が出る。

扱い: 自動:src/components/settingsHierarchyDiff.dom.test.tsx#keeps the row fill bound to the renamed color。この手順は手で行わない。

### RG-F6-5

開始: メンバーの覆いを開いたままにする。保存はまだ押さない下書きを 1 文字入れる。

操作: 別のプログラムで、作業用の `full.schedule.json` の「調査」の終了を 2026-04-02 に変えて保存する。読み直しを選ぶ。

期待: 読み直しの前に覆いが閉じる。下書きはカタログのファイルへ書かない。「調査」の終了は 2026-04-02 である。

扱い: 自動:src/components/settingsHierarchyDiff.dom.test.tsx#closes catalog editors on external reload and leaves the draft out of storage。自動:src/hooks/scheduleFile/externalReloadFlow.dom.test.tsx#TC-SET-02e: closes the member catalog editor on reload without writing the draft。実機のファイル監視は手動のままである。

## RG-F7 外部更新の対話

目的は、未保存が無いとき、別のタスクの変更、同じ項目の衝突を分けることである。対象はデスクトップ版である。見本は作業用の `full.schedule.json` で、一度保存したパスを使う。各手順の前に原本からコピーし直して開く。目安は 14 分である。短い通しには入れない。分岐の多くは `externalReloadFlow.dom.test.tsx` が見ている。実機の監視は人が残す。

### RG-F7-1

開始: 未保存は無い。

操作: 別のエディタで「調査」のノートを「外部のノート」にして保存する。

期待: 画面が変わり、「ファイルを反映しました」と出る。ノートは「外部のノート」である。

扱い: 自動:src/hooks/scheduleFile/externalReloadFlow.dom.test.tsx#TC-SYNC-01: applies a clean disk change after one poll interval。実機のファイル監視は手動のままである。

### RG-F7-2

開始: 原本からコピーし直す。

操作: 画面で「設計」の終了を 2026-04-12 にする。保存しない。別のエディタで「調査」のノートを「衝突しないノート」にして保存する。確認で「画面の編集を残す」を押す。

期待: 確認が出る。押したあと、状態バーに確認へ戻る操作が出る。「設計」の終了は 2026-04-12 のままである。

扱い: 自動:src/hooks/scheduleFile/externalReloadFlow.dom.test.tsx#TC-SYNC-01b: keep local edits and show the deferred reload banner。この手順の期待は既存のテストが断言している。

### RG-F7-3

開始: 原本からコピーし直す。

操作: 画面で「調査」のノートを「画面のノート」にする。別のエディタで同じノートを「ファイルのノート」にして保存する。確認を開く。

期待: 「両方を画面へ反映」は出ない。

扱い: 自動:src/hooks/scheduleFile/externalReloadFlow.dom.test.tsx#TC-SYNC-01f: blocks merge when the same task conflicts。この手順の期待は既存のテストが断言している。

## RG-F8 起動復旧のタイミング

目的は、復旧中のドラッグを、人が捕まえられないときは未検証にすることである。対象はデスクトップ版である。目安は 6 分である。短い通しには入れない。待ちを止める自動は `startupRecoveryFlow.dom.test.tsx` が見ている。本番の起動に待ち時間は足さない。

### RG-F8-1

開始: 作業用の `smoke.schedule.json` を保存して終了する。

操作: すぐ起動し、復旧が終わる前に「設計」のバーをドラッグしようとする。

期待: 終わる前に掴めたときは、終わるまで日付は変わらない。終わったあと、ドラッグできる。掴める前に復旧が終わったときは、未検証とし、合にも否にもしない。

扱い: 自動:src/hooks/scheduleFile/startupRecoveryFlow.dom.test.tsx#TC-SYNC-03f: blocks date moves until startup recovery settles。この手順の期待は既存のテストが断言している。

### RG-F8-2

操作: 「設計」の開始を 2026-04-05 に変え、保存せずに閉じ、起動する。

期待: 開始 2026-04-05 の未保存が戻る。RG-S4-6 と同じ戻りである。

扱い: 自動:src/hooks/scheduleFile/startupRecoveryFlow.dom.test.tsx#TC-SYNC-03: restores unsaved edits when the disk matches baseline。本番の起動タイミングは手動のままである。

## RG-F9 複数のウィンドウ

目的は、2 枚の窓、履歴の消去、同じカタログの選択を分けることである。対象はデスクトップ版である。目安は 14 分である。短い通しには入れない。履歴の計算は `recentFiles.test.ts` が持っている。履歴消去の自動は `fileSaveFlow.dom.test.tsx` が見ている。窓が残ることの自動は #543、実機の前面は #541 である。

### RG-F9-1

開始: 作業用の `smoke.schedule.json` を開く。作業用の `members.json` を選ぶ。

操作: 「新しいウィンドウで開く」で作業用の `full.schedule.json` を開く。2 枚目でも同じ `members.json` を選ぶ。

期待: 元の窓は残り、タイトルは「回帰確認」である。新しい窓のタイトルは「回帰の詳細」である。

扱い: 手動のまま:「新しいウィンドウで開く」と、2 枚目で `members.json` を選ぶ操作は、ファイルを選ぶ画面が要る。

### RG-F9-2

操作: ☰ の「最近開いたファイル」を見る。続けて「履歴を消す」を押す。

期待: 消す前は両方のファイルが出る。消したあと、開いているスケジュールは残る。履歴の項目は押せない。

扱い: 自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#clear history leaves the open schedule and the recovery file。自動:src/model/recentFiles.test.ts#drops the oldest on the sixth add。自動:src/components/AppMenu.recent.dom.test.tsx#lists schedule and workspace recent files, shows the path on hover, and clears history。ファイルダイアログ部分は手動のまま。時間と手順数の引き算には含めない。

### RG-F9-3

操作: 1 枚目でメンバーの覆いを開いたまま、2 枚目から同じ `members.json` を選び直す。

期待: 編集中の 1 枚目が前面になる。2 枚目では、その操作では選ばれない。

扱い: 手動のまま:覆いを開いたまま、もう一方で同じメンバーを選ぶ操作は、覆いのボタンが要る。

### RG-F9-4

操作: 2 枚目を最小化する。未保存が無ければ閉じる。未保存があれば閉じる確認でキャンセルする。

期待: 最小化から戻せる。キャンセルした窓は閉じない。

扱い: 手動のまま:最小化から戻すことと、閉じる確認のキャンセルは、`open_windows` では見えない。

## RG-F10 階層の線

目的は、畳む枝、追加する名前、下書きが保存されないことを分けることである。対象はデスクトップ版である。目安は 9 分である（見積で、実測ではない）。短い通しには入れない。折りたたみ時の縦線は e2e が見ている。見出しの追加、意味が空のときに適用できないこと、指示の入力は、`settingsHierarchyDiff.dom.test.tsx` が確かめている。見出し追加の取り消しは `headlessScheduleSession.hierarchy.regression.test.ts` の `appendOutlineHeadingAtLevel on levels-2.schedule.json commits, saves, and parses` が確かめている。

### RG-F10-1

開始: 作業用の `levels-5.schedule.json` を開く。

操作: 見出し「事業甲」を畳み、もう一度開く。

期待: 畳んだあいだ、その枝の下へ縦線が続かない。開くと、行の境で縦線は切れない。

扱い: 自動:e2e/browser-regression/specs/hierarchy-guides.spec.ts#drops the stem under a collapsed five-level heading and rejoins it when expanded。この手順は手で行わない。

### RG-F10-2

操作: 最上段の見出しを右クリックし、段の名前で 1 件追加する。名前は「回帰の見出し」である。取り消しを 1 回押す。

期待: 「回帰の見出し」が足る。取り消し 1 回で消える。

扱い: 自動:src/test/headlessScheduleSession.hierarchy.regression.test.ts#appendOutlineHeadingAtLevel on levels-2.schedule.json commits, saves, and parses。取り消しも同じテスト。自動:src/components/settingsHierarchyDiff.dom.test.tsx#adds an outline heading from the context menu。自動:e2e/browser-regression/specs/hierarchy-reorder.spec.ts#adds a heading from the toolbar menu and from the row menu, then undoes。この手順は手で行わない。

### RG-F10-3

開始: 作業用の `levels-3.schedule.json` を開く。

操作: 「階層編集」を開く。意味を空にして適用する。名前だけ「回帰の下書き」と書き、適用せずに閉じる。ファイルを保存しない。

期待: 空の意味では適用できない。閉じたあと、作業用ファイルに「回帰の下書き」は無い。

扱い: 自動:src/components/settingsHierarchyDiff.dom.test.tsx#refuses apply when a meaning is empty and drops a name that was not applied。自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#an unapplied name 回帰の下書き is absent from the file。この手順の期待は既存のテストが断言している。

### RG-F10-4

操作: 「階層編集」で指示に「回帰の指示」と書き、適用してから作業用へ保存する。

期待: 保存した JSON にその指示が残る。原本の `examples/hierarchy/levels-3.schedule.json` には残らない。終わったら作業用を原本からコピーし直す。

扱い: 自動:src/components/settingsHierarchyDiff.dom.test.tsx#keeps an applied instruction when the hierarchy dialog is opened again。自動:src/components/settingsHierarchyDiff.dom.test.tsx#drops a blank instruction when the hierarchy dialog is applied。自動:src/hooks/scheduleFile/fileSaveFlow.dom.test.tsx#the saved file contains 回帰の指示 and the example file does not。この手順の期待は既存のテストが断言している。

## RG-F11 差分列の配置

目的は、旧値と新値、詳細との並び、キー、コピーの知らせを分けることである。対象はデスクトップ版である。見本は作業用の `long.schedule.json` である。目安は 12 分である。短い通しには入れない。列の文面とコピー先の文字列は `settingsHierarchyDiff.dom.test.tsx` が見ている。フォーカスと上下キーは `searchErrorKeys.dom.test.tsx` が見ている。幅、重なり、高さ 800 のスクロール、コピー知らせの位置は e2e が見ている。差分の文面の計算は `scheduleDiff.test.ts` が持っている。

### RG-F11-1

開始: 「行01」の終了は 2026-04-02 である。

操作: 「行01」の終了を 2026-04-03 に変え、差分の取っ手を押す。

期待: 列が開く。「行01」の終了の旧値は 2026-04-02、新値は 2026-04-03 である。

扱い: 自動:src/components/settingsHierarchyDiff.dom.test.tsx#shows the old and new end dates in the diff column。自動:e2e/browser-regression/specs/settings-diff.spec.ts#opens the diff from the right-edge handle and shows the old and new end。この手順は手で行わない。

### RG-F11-2

操作: 「行20」の詳細を開いたまま、差分列を開く。

期待: チャートの幅は、詳細と差分列を除いた残りである。2 つは重ならない。

扱い: 自動:e2e/browser-regression/specs/settings-diff.spec.ts#keeps the chart width as the remainder beside the detail and the diff column。この手順は手で行わない。

### RG-F11-3

操作: 差分の一覧にフォーカスを置き、上下キーを押す。そのあとチャートをクリックし、上下キーを押す。

期待: 差分にフォーカスがあるあいだ、「行20」の選択は動かない。チャートでは上下で選択が動く。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#leaves task selection still while the diff list is focused。この手順は手で行わない。

### RG-F11-4

操作: 差分のコピーを押し、出た知らせの位置を見る。

期待: 知らせは、コピーのあとで出る。差分列の上には重ならない。行は「行01」から「行40」まであり、高さ 800 の窓では一覧が縦にスクロールする。

扱い: 自動:src/components/settingsHierarchyDiff.dom.test.tsx#copies diff text to the clipboard。自動:e2e/browser-regression/specs/settings-diff.spec.ts#places the copy notice off the diff column and scrolls only the list at height 800。この手順は手で行わない。

## RG-F12 本物の LLM

目的は、決めた依頼文で、説明と、渡していない値を作らないことを見ることである。対象はデスクトップ版で、Cursor または Claude に MCP を登録してあるときだけである。クライアントが無いときは、このシナリオを保留とし、合格にしない。目安は 20 分である。短い通しには入れない。窓の要らない JSON-RPC と CLI の拒否は自動テスト、起動中のアプリへの `tools/call` は #543、文の解釈は人が残す。#538 では手順も分数も引かない。

### RG-F12-1

操作: クライアントが登録できるかを見る。

期待: 登録できないときは保留である。合にしない。

扱い: 手動のまま、実クライアントが登録できるかを人が見て、できないときは保留とし、合にしない。あわせて initialize、tools/list、壊れた JSON、未知のメソッド、名前の無い tools/call の自動は、src-tauri/tests/mcp_stdio_client.rs の `initialize_echoes_id_and_returns_protocol_version_server_name_and_tools_capability`、`tools_list_returns_twenty_one_tools_with_each_input_schema`、`invalid_json_returns_parse_error_then_initialize_still_succeeds`、`unknown_method_returns_method_not_found_and_echoes_id`、`tools_call_missing_name_returns_invalid_params_and_not_the_no_window_message` である。

### RG-F12-2

操作: 設定の「画面の状態を渡す」で JSON をコピーし、クライアントへ登録する。

期待: アプリは、設定からクライアントのプロセスを起動しない。

扱い: 自動:src/components/settingsDesktopChrome.dom.test.tsx#copies the mcp json to the clipboard and does not invoke tauri again on copy。手動のまま、実クライアントの mcp.json への初回の貼り付けは人が残す。

### RG-F12-3

開始: 作業用の `smoke.schedule.json`。「設計」を選ぶ。

操作: 「選んでいるタスクを 2 日後ろにずらして」と送る。続けて「やっぱり戻して」と送る。

期待: 画面は未保存になり、ファイルの更新時刻は変わらない。戻したあと、開始は 2026-04-04、終了は 2026-04-08 である。

扱い: 手動のまま:本物の LLM の解釈は固定クライアントで代用しない。この手順は自動化しない。

計算は `headlessScheduleSession.test.ts` の `shifts two tasks, keeps the file until save, then clears the diff` と `undo and redo restore the exact saved schedule` が持っている。本物の文面は人が見る。

### RG-F12-4

操作: 「調査の終了を 2026-04-05 にし、設計の開始を 2026-04-06 にする試しを2案出して。1案を計画に入れて。」と送る。

期待: 試しの行が画面に出る。採用した案は文書に入る。説明用の絞り込みと半透明の両方が出る。チャットに、何をなぜ変えたかが続く。

扱い: 手動のまま:試しの採用を人が読める説明で判断する。この手順は自動化しない。

試しの計算の自動は `headlessScheduleSession.regression.test.ts` の `adopts one explanation pattern through MCP dispatch` が持っている。自由な言い換えではなく、この文で見る。

### RG-F12-5

操作: 折りたたみが無い状態で、「今、折りたたんでいる行はあるか。無いなら無いとだけ答えて。渡していない色の id や、画面に無い担当は作らないで。」と送る。

期待: 無い、と答える。画面に無い色の id や担当を作ったら失敗である。ステータスの色だけで id を選んだら失敗である。

扱い: 手動のまま:渡していない値を作らないかは本物のチャットで判断する。この手順は自動化しない。

### RG-F12-6

操作: 複数の窓の読み取りと、`--screen` の CLI は、この通しでは行わない。

期待: 未実施と記録する。合格にしない。

扱い: 自動:src-tauri/tests/mcp_stdio_client.rs#front_only_tools_with_window_exit_1_with_empty_stdout_and_the_rejection_on_stderr、src-tauri/tests/mcp_stdio_client.rs#unknown_screen_tool_exits_1_and_writes_usage_to_stderr、src-tauri/tests/mcp_stdio_client.rs#screen_flag_without_tool_exits_1_and_writes_usage_to_stderr、src-tauri/tests/mcp_stdio_client.rs#screen_with_extra_arg_exits_1_and_writes_usage_to_stderr、src-tauri/tests/mcp_stdio_client.rs#replace_schedule_over_ten_megabytes_exits_1_and_writes_too_large_to_stderr、src-tauri/tests/mcp_stdio_client.rs#replace_schedule_invalid_json_exits_1_and_writes_unreadable_to_stderr、src-tauri/tests/mcp_stdio_client.rs#stdin_action_tools_reject_invalid_json_with_exit_1_and_the_action_message、src-tauri/tests/mcp_stdio_client.rs#schedule_diff_without_gui_exits_1_and_writes_no_window_to_stderr。起動中のアプリへの `--screen` の成功は自動:src-tauri/tests/mcp_running_app.rs#screen_seven_reads_and_replace_schedule_exit_0_and_write_the_tool_text_to_stdout。複数の窓の読み取りは自動:src-tauri/tests/mcp_running_app.rs#filtered_tasks_follows_the_front_window_status_filter、src-tauri/tests/mcp_running_app.rs#six_reads_leave_open_windows_front_on_main。本物の LLM の通しでは、窓の要らない CLI の試験は自動試験が行い、起動中のアプリへの成功と複数窓の読み取りは行わず、未実施と記録し、合格にしない。

### RG-F12-7

操作: バーをドラッグしている途中に、別のアプリから計画の更新を送る手順は、人が同時に安定して行えない。

期待: 未検証と記録する。合格にしない。自動は #543 である。

扱い: 自動化予定:#543。この Issue が終わると、この手順は手で行わない。

### RG-F12-8

操作: 付録の TC-MCP-01k、TC-MCP-01l、TC-MCP-01m、TC-MCP-01n、TC-MCP-01o の依頼文を、その順に 1 件ずつ送る。

期待: 各行の期待と違う答え、渡していない値を埋めた答え、ステータスの色だけで id を選んだ答えは失敗である。クライアントが無いときは保留とし、合にしない。

扱い: 手動のまま:付録の依頼文への答えは本物のチャットで判断する。この手順は自動化しない。

## RG-F13 開けないファイルとエラー

目的は、壊れたスケジュール、一覧に無い担当、壊れたカレンダーを分けることである。対象はデスクトップ版である。短い通しには入れない。表示は自動テストが断言する。このシナリオは手で行わない。

### RG-F13-1

開始: 作業用の `smoke.schedule.json` を開いておく。

操作: 作業用の `open-fail.schedule.json` を開く。

期待: 開かない。理由が出る。それまで開いていた「回帰確認」は残る。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#keeps the open schedule when a broken file is rejected。この手順は手で行わない。

### RG-F13-2

開始: メンバー一覧を選んでいない。

操作: 作業用の `full.schedule.json` を開く。

期待: 「不明担当」（assigneeId は `missing-member`）は「メンバー不明」である。`tanaka` の「調査」も、一覧が無いので「メンバー不明」である。担当が null の「期限超過の作業」は未割当のままである。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#shows unknown assignees and leaves unassigned tasks。この手順は手で行わない。

### RG-F13-3

操作: 設定で作業用の `broken.calendar.json` を読む。

期待: カレンダーのエラーが出る。開いているスケジュールは閉じない。

扱い: 自動:src/components/searchErrorKeys.dom.test.tsx#shows the calendar error and keeps the schedule。この手順は手で行わない。

## RG-F14 更新の知らせ

目的は、配布物の更新を、最新、より新しい版、失敗、初回の PC に分けることである。開発ビルドでは対象外である。目安は 8 分である。短い通しには入れない。応答の分岐の多くは `useAppAutoUpdate.flow.test.tsx` が見ている。署名、SmartScreen、実更新は配布時の条件付きであり、通常の開発通しの合格には数えない。

### RG-F14-1

開始: 署名した Windows の配布物が無い。

操作: 行わない。

期待: 対象外と記録する。合にしない。

扱い: 手動のまま:署名した配布物が無い開発ビルドでは確認しない。この手順は自動化しない。

### RG-F14-2

開始: 署名した Windows の配布物がある。今の版が最新である。

操作: 設定の「更新」で確認する。

期待: 入れ直す案内は出ない。より新しい版が公開されていないときは、更新ありの確認は未検証とする。

扱い: 自動:src/hooks/useAppAutoUpdate.flow.test.tsx#TC-SET-06m: manual check with no update shows the latest message。実物の配布 URL は手動のままである。

### RG-F14-3

操作: 通信できない状態で「更新」を確認する。

期待: 失敗の知らせが出る。接続が無いことを、最新版である旨と取り違えない。再起動の案内は、入れ直しを選んだときだけである。

扱い: 自動:src/hooks/useAppAutoUpdate.flow.test.tsx#TC-SET-06m3: manual check shows a failure message when check throws。この手順の期待は既存のテストが断言している。

### RG-F14-4

開始: 証明書を入れていない、その PC の初めてのユーザーである。用意できないときは行わない。

操作: 署名した Pre-release を起動する。

期待: SmartScreen の確認が出たら、出た文言を記録する。用意できないときは未検証とし、合にしない。

扱い: 手動のまま:SmartScreen は署名した Windows の初回起動でしか確認できない。この手順は自動化しない。

### RG-F14-5

操作: macOS の dmg と Ubuntu の deb のインストールは、この開発通しでは行わない。

期待: 対象外と記録する。配布時の範囲はテスト仕様のリリース前確認に残してある。未確認の OS を合格にしない。

扱い: 手動のまま:dmg と deb のインストールは配布物でしか確認できない。この手順は自動化しない。

## 結果の記録

欄が空の項目は未実施である。未実施は合格ではない。約 2 時間 10 分と手順 62 は見積であり、この記録の実測ではない。Windows と macOS は未測定である。自動化予定の手順を手で行っても、その Issue が終わるまで自動の代わりの合格にはしない。実施範囲は [実施範囲の索引](#実施範囲の索引) を正とする。手順の全文は上のシナリオ節を見る。

### 共通欄

```
実施日:
実施者:
ビルド（版またはコミット）:
OS と配布形態:
基準日を 2026-04-15 にできたか:
原本を変更したか（はいなら実施は無効）:
自動を先に流したコマンドと合否（regression.md「自動を先に流す」）:
準備・コピー復元（分）:
操作（分）:
LLM 待ち（分）:
合計（分）:
```

各手順欄は `ID: 合否= 分= 備考=` とする。合否は合、否、保留、未検証、対象外、未実施のいずれか。

### 短い確認（目標 10〜15 分・見積）

```
RG-F1-1:
RG-F1-2:
RG-F1-3:
RG-F1-4:
RG-F1-5:
RG-S2-6:
RG-S3 ドラッグ感触・右クリック直後ポインタ（RG-S3-1 で設計バーを動かした観測）:
RG-F5-2（表計算で開いた見た目のみ）:
RG-S4-8:
RG-F9-1:
RG-F7-1:
RG-F8-2:
RG-F12-3:
RG-F12-4:
RG-F12-5:
RG-F12-8:
目標 10〜15 分との比較（分）:
```

### フル（目標 45〜70 分・見積。短い確認を足した残り）

[実施範囲の索引](#実施範囲の索引) のフルと同じ規則。配布物専用 `RG-F14-1`・`RG-F14-4`・`RG-F14-5` は含めない。

```
RG-S3-3:
RG-S4-1:
RG-S4-2:
RG-S4-4:
RG-S4-5:
RG-S4-7:
RG-F4-2:
RG-F5-3:
RG-F6-5:
RG-F9-2:
RG-F9-3:
RG-F9-4:
RG-F12-1:
RG-F12-2:
RG-F12-6:
RG-F12-7（#543 終了まで未検証。合格にしない）:
RG-F14-2:
目標 45〜70 分との比較（分）:
P6 未完了時の暫定 60〜90 分との比較（分）:
```

### 配布前（[test-spec.md](test-spec.md) のリリース前確認 1〜16）

付録を毎回走らせない。番号ごとに test-spec の項目と付録 ID を開いて行う。

```
| # | macOS | Windows | Ubuntu | 分 |
| --- | --- | --- | --- | --- |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |
| 9 | | | | |
| 10 | | | | |
| 11 | | | | |
| 12 | | | | |
| 13 | | | | |
| 14 | | | | |
| 15 | | | | |
| 16 | | | | |
目標 OS 別 5〜10 分との比較（分）:
```

### その他

```
否または未検証の手順と、見えた文:
```
