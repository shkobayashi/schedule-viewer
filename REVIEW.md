# ソースと文書の全体レビュー

## 概要

2026-09-30 時点の `schedule-viewer` を、次の観点でレビューした。

- 実装: 不具合の可能性、パフォーマンス、セキュリティ、アクセシビリティ、可読性
- 文書: 直訳調、未説明の用語、上から読んだときの流れ、冗長さ、文書間の整合

対象は `src/`、`src-tauri/`、`scripts/`、GitHub Actions、Tauri の権限設定、主要な設定ファイル、`docs/*.md`、JSON Schema、`README.md`、`AGENTS.md`、`CHANGELOG.md`、`.cursor/skills/*/SKILL.md` である。テストコードは、重要な分岐と [docs/test-spec.md](docs/test-spec.md) の一覧との整合を中心に見た。

次は生成物または履歴固定用ファイルなので、内容の逐語レビューから外した。

- `package-lock.json`、`Cargo.lock`
- `.cursor/skills/*/scripts/*.bundle.mjs`
- `src/model/generated/`
- `src-tauri/gen/`、`src-tauri/icons/`、`src-tauri/target/`
- `dist/`、`mockup/`

ただし、生成物が CI で正しく同期されるかはレビュー対象に含めた。

指摘は実装 19 件（高 1、中 12、低 6）、文書 10 件（中 3、低 7）である。レビューで見つけた横断的な手順は `.cursor/skills/review-project/SKILL.md` と `.cursor/skills/implement-change/SKILL.md` に反映した。指摘の本文は残し、ソースと文書は各指摘の「対応」に従って直した。

## 対応状況

- 実装: 対応済み 16、見送り 3
- 文書: 対応済み 10
- 文書とソースの食い違い: 対応済み 4

## 自動チェック

| 検査 | 結果 |
| --- | --- |
| `npm run lint` | 成功 |
| `npx tsc --noEmit` | 成功 |
| `npm test` | 成功。28 ファイル、197 テスト |
| `cargo clippy -- -D warnings` | 成功 |
| `cargo test --locked` | 成功。Rust 10 テスト |
| `npm audit --omit=dev` | 既知の脆弱性 0 件 |

各 npm コマンドは、環境の `devdir` 設定が次の npm メジャーバージョンで使えなくなるという警告を出した。プロジェクト内の設定ではないため、本レビューの指摘には数えていない。

## 優先して直したい指摘

1. [C-01](#c-01-release-が検査なしで公開される): `main` への push が、テストやバージョン整合を確認せず Release を公開する。
2. [C-02](#c-02-起動復旧の-accept-後に画面反映を中止できる): 起動復旧中の編集によって、Rust が覚えるファイルと画面が一時的に食い違う。
3. [C-03](#c-03-保存処理を二重に開始できる): 外部更新の確認中に保存を再度開始できる。
4. [C-04](#c-04-画面外を含む-mousemove-で-timeline-全体を再描画する): マウス移動のたびに重い当たり判定と Konva の再描画が走る。
5. [C-05](#c-05-非稼働日の判定ごとに-set-を作り直す): 日ごとの判定でカレンダー全体を何度も `Set` に変換する。
6. [C-10](#c-10-ci-の変更パス判定に抜けがある): `index.html` と `rust-toolchain.toml` の単独変更で必要な CI が動かない。
7. [C-11](#c-11-アプリ用の生成済み検証器を-ci-で差分検査しない): スキーマとコミット済み検証器のずれを CI が見逃す。
8. [D-01](#d-01-planning-の今後の項目が実装済みの状態と食い違う): 計画文書の「今後」が現在の実装より古い。

## 実装の指摘

### 不具合の可能性

#### C-02 起動復旧の `accept` 後に画面反映を中止できる

対応: 対応済み。画面へ載せる前に `accept` し、起動の世代が変わっていたら文書を置き換えない。起動復旧が終わるまでだけ文書の変更を止め、終わったあとは受け付ける。そのあいだのディスクの変更は、開いたあと外部更新として読む。

- 重要度: 中
- 場所: [src/hooks/useScheduleFile.ts:219](src/hooks/useScheduleFile.ts#L219)、[src/hooks/useScheduleFile.ts:300](src/hooks/useScheduleFile.ts#L300)

`applyRecoverySession` は先に `acceptOpenedScheduleViaTauri` を待ち、その後で `abortIfMovedOn` を判定する。起動復旧中は `fileBusy` になるが、無効になるのは主にファイル操作で、タスク編集や絞り込みは操作できる。`accept` の待ち時間中に画面が未保存になると、Rust 側は前回のファイルを開いた状態へ進む一方、React 側は文書の置換を中止する。

起動復旧中は文書の編集も止めるか、画面へ反映することを確定してから Rust 側を `accept` する。処理の世代番号を持ち、古い復旧処理が Rust と React のどちらにも状態を残さない形が望ましい。

#### C-03 保存処理を二重に開始できる

対応: 対応済み。保存の開始で同期的な印を立て、終わるまで次の保存を始めない。

- 重要度: 中
- 場所: [src/hooks/useScheduleFile.ts:726](src/hooks/useScheduleFile.ts#L726)、[src/hooks/useScheduleFile.ts:807](src/hooks/useScheduleFile.ts#L807)

`save` は `fileBusy` を入口の条件にするが、`performSave` が `setFileBusy(true)` を呼ぶのは外部更新の確認後である。確認の `await` 中に Ctrl/⌘+S をもう一度押すと、二つ目の保存も開始できる。React の state 更新直後にも同じレンダーのクロージャから再入できる。

処理の冒頭で `fileBusyRef.current` を同期的に立てるか、保存中の Promise を一つだけ保持して直列化する。

#### C-07 空白だけのノートが読み込み検証を通る

対応: 対応済み。意味規則で空白だけのノートを拒否し、持ち出し用の検証器も同じ規則にした。

- 重要度: 中
- 場所: [src/model/scheduleSemantics.ts:138](src/model/scheduleSemantics.ts#L138)、[docs/schedule.schema.json:102](docs/schedule.schema.json#L102)

データ仕様は、空白だけの `note` をプロパティとして書かないと定めている。JSON Schema は `minLength: 1` なので空白を拒否せず、意味規則にも `note.trim()` の検査がない。画面から保存すると `normalizeTaskNote` が消すため、読み込んだ値が次の保存で黙って失われる。

意味規則で空白だけのノートを拒否し、アプリ用と持ち出し用の検証器の両方へ同じ規則を反映する。

#### C-08 候補一覧を Escape で閉じると編集ダイアログも閉じる

対応: 対応済み。候補一覧が開いているときの Escape は一覧だけを閉じる。

- 重要度: 中
- 場所: [src/components/TaskEditDialog.tsx:419](src/components/TaskEditDialog.tsx#L419)、[src/components/ModalDialog.tsx:80](src/components/ModalDialog.tsx#L80)

先行・後続の候補一覧は Escape で `setOpen(false)` を行うが、イベントを止めない。その keydown が `ModalDialog` まで伝わり、ダイアログ全体の `onClose` も実行する。候補一覧だけを閉じるつもりで、それまでの編集を破棄し得る。

候補一覧が Escape を処理したら `preventDefault` と `stopPropagation` を行う。候補一覧と親ダイアログを段階的に閉じるテストも加える。

#### C-13 循環エラーがタスク名ではなく UUID を表示する

対応: 対応済み。最初のタスクの JSON Pointer と、カテゴリ、グループ、タスク名による循環経路を返す。

- 重要度: 中
- 場所: [src/model/scheduleSemantics.ts:211](src/model/scheduleSemantics.ts#L211)

循環を検出したとき、場所は常に `/categories`、メッセージはタスク ID の列である。外部仕様の FILE-01 は、読み込みエラーの場所をカテゴリ、グループ、タスクの名前で示すとしている。壊れた JSON を直す利用者には UUID の列だけでは場所が分かりにくい。

ID から階層とタスク名を引き、最初のタスクの JSON Pointer と、名前による循環経路を返す。

#### C-14 追加後に残せる検索条件まで解除する

対応: 対応済み。追加後に検索を緩める判定も、表示と同じく前後の空白を除いて比べる。

- 重要度: 低
- 場所: [src/model/rows.ts:75](src/model/rows.ts#L75)、[src/model/rows.ts:90](src/model/rows.ts#L90)、[src/model/rows.ts:143](src/model/rows.ts#L143)

通常のタスク名検索は前後の空白を除いて比べるが、追加・複製後に絞り込みを緩める箇所は元の文字列で `includes` する。たとえば検索欄が `"  Alpha  "` で、追加した名前が `"Alpha task"` の場合、通常の判定では表示できるのに検索条件を空へ戻す。

緩和判定も `taskMatchesFilter` に統一するか、同じ `trim()` 済みの値を使う。

### パフォーマンス

#### C-04 画面外を含む `mousemove` で Timeline 全体を再描画する

対応: 対応済み。チャート上（線を引くときはサイドバーも）の移動だけを `requestAnimationFrame` で間引き、ホバー対象が変わったときだけ state を更新する。

- 重要度: 中
- 場所: [src/components/Timeline.tsx:1188](src/components/Timeline.tsx#L1188)、[src/components/Timeline.tsx:1206](src/components/Timeline.tsx#L1206)、[src/components/Timeline.tsx:1316](src/components/Timeline.tsx#L1316)

`window` の `mousemove` ごとに `clientPointer` を state へ入れる。マウスがチャート外にあってもレンダーが発生し、マイルストン、全バーのアンカー、全依存線の当たり判定をやり直す。hover した線の太さを変えるために Konva ツリーも再構築する。

Stage 上のポインターだけを対象にし、`requestAnimationFrame` で間引く。ポインター位置は ref に置き、hover 対象が変わったときだけ state を更新する。

#### C-05 非稼働日の判定ごとに `Set` を作り直す

対応: 対応済み。カレンダー文書をキーに、週末と日付の集合を一度だけ作る。

- 重要度: 中
- 場所: [src/model/nonWorkingDay.ts:11](src/model/nonWorkingDay.ts#L11)、[src/model/nonWorkingDay.ts:61](src/model/nonWorkingDay.ts#L61)

`isNonWorkingDay` は呼ばれるたびに `weekends`、`nonWorkingDays`、`workingDays` の `Set` を作る。背景を描くループは日ごとにこの関数を呼ぶため、計算量はおおむね「表示日数 × カレンダー項目数」になる。スクロールと書き出しの両方に影響する。

カレンダーを読み込んだ時点で検索用の集合を一度作るか、`CalendarDocument` をキーにキャッシュする。

#### C-06 Rust の監視処理がファイル読み込み中も Mutex を保持する

対応: 対応済み。ロック中はパスだけを取り、読み込みとハッシュ計算はロックの外で行う。

- 重要度: 中
- 場所: [src-tauri/src/lib.rs:190](src-tauri/src/lib.rs#L190)、[src-tauri/src/lib.rs:207](src-tauri/src/lib.rs#L207)

`check_schedule_file_changed` と `poll_schedule_file_update` は `ScheduleFileState` をロックしたまま、最大 10MB の同期読み込みとハッシュ計算を行う。1.5 秒ごとの監視中に、保存や別のコマンドが同じ Mutex を待つ。

ロック中はパスと期待ハッシュだけを複製し、ファイルの読み込みとハッシュ計算をロック外で行う。比較時だけ短く再ロックする。

#### C-12 マイルストンの段割り当てが最悪 O(n²)

対応: 対応済み。空いている段の番号をヒープで選び、最も小さい番号を使う今の割り当ては変えない。

- 重要度: 中
- 場所: [src/model/milestones.ts:87](src/model/milestones.ts#L87)

各マイルストンについて、空いている段を `laneEnds.findIndex` で先頭から探す。日付が近く、名前が長いマイルストンが多数あると段数も増え、二乗時間になる。件数の上限はスキーマにない。

段の終端をヒープで管理するか、終端順を維持して二分探索する。変更前後を多数の重なったマイルストンで計測する。

#### C-16 履歴へ積むたび文書全体を二度文字列化する

対応: 見送り。先に大きなサンプルで測定してから判断する。別計画にする。

- 重要度: 低
- 場所: [src/model/history.ts:19](src/model/history.ts#L19)

同じ内容を履歴へ積まない判定で、現在と次のスナップショットを毎回 `scheduleToJson` と `JSON.stringify` に通す。大きな文書の編集ごとに全体を二度走査し、その後に複製も行う。

変更を作る関数が同一性を返す、またはスナップショットにハッシュを持たせる方法を検討する。まず大きなサンプルで測定し、最適化の必要性を確認する。

### セキュリティと堅牢性

#### C-01 Release が検査なしで公開される

対応: 見送り。開発は当面ひとりで、GitHub Actions は無料枠に収める。検査は `develop` 向け pull request の変わった側だけで、Release は配布物のビルドと公開のままにする。

- 重要度: 高
- 場所: [.github/workflows/release.yml:3](.github/workflows/release.yml#L3)

`main` への push は `npm ci` のあと、すぐに Ubuntu と Windows の配布物を作って公開する。`version:check`、TypeScript のビルド、lint、Vitest、Clippy、Rust テストを実行しない。一方、通常の CI は `develop` 向け pull request でしか動かない。直接 push、誤ったマージ、必須チェックの設定漏れがあると、壊れた配布物や版番号の違うタグを公開できる。

Release ジョブ自身に最低でも `version:check`、`build`、`lint`、`test`、`cargo clippy`、`cargo test --locked` を置く。ブランチ保護だけに依存する場合も、Release 側で版番号とビルドを再確認する。

#### C-10 CI の変更パス判定に抜けがある

対応: 対応済み。`index.html` と `rust-toolchain.toml` を変更パスに足し、Rust の版は `rust-toolchain.toml` を正本にした。開発ガイドに、ビルド入力を足したら CI の対象パスにも足す手順を書いた。パス判定を別スクリプトへ切り出してテストすることは見送った。

- 重要度: 中
- 場所: [.github/workflows/ci.yml:24](.github/workflows/ci.yml#L24)

`index.html` の単独変更ではフロントジョブが動かず、`rust-toolchain.toml` の単独変更では Rust ジョブが動かない。Rust の版は workflow にも `1.98.1` と直書きされており、正本が二つある。

変更パスへ両ファイルを追加し、Rust の版は `rust-toolchain.toml` を正本として workflow から読む。パス一覧には「ビルド入力を追加したら CI の対象にも追加する」テストまたは保守手順が必要である。

#### C-11 アプリ用の生成済み検証器を CI で差分検査しない

対応: 対応済み。フロントジョブの `git diff --exit-code` に `src/model/generated/` を足した。

- 重要度: 中
- 場所: [.github/workflows/ci.yml:50](.github/workflows/ci.yml#L50)、[src/model/generated/](src/model/generated/)

CI はスキルへ同梱するスキーマと bundle の差分だけを見る。`npm run build` と `npm test` が `src/model/generated/` を再生成しても、この追跡済みファイルの差分は検査しない。スキーマを変えて生成物をコミットし忘れても CI が成功する。

生成後に `git diff --exit-code src/model/generated/` も実行する。

#### C-17 ブラウザ版のファイル読み込みにサイズ上限がない

対応: 対応済み。ブラウザ版もスケジュールは 10MB、メンバーとカレンダーは 2MB で、選んだ直後に拒否する。

- 重要度: 低
- 場所: [src/model/scheduleFile.ts:134](src/model/scheduleFile.ts#L134)、[src/model/memberAppData.ts:156](src/model/memberAppData.ts#L156)、[src/model/calendarAppData.ts:144](src/model/calendarAppData.ts#L144)

デスクトップ版は 10MB または 2MB で拒否するが、ブラウザ版は `FileReader.readAsText` で全体を読み、その後に JSON の解析と検証を行う。外部仕様にも差として明記されており、隠れた不具合ではないが、巨大ファイルによるタブの長時間停止やメモリ不足を避けられない。

差を維持する理由がなければ、`File.size` で同じ上限を適用する。差を維持するなら、操作マニュアルのブラウザ版の制約にも明記する。

#### C-18 2MB ファイルの上限検査と読み込みが一体でない

対応: 対応済み。開いたファイルから上限付きで一度だけ読む。

- 重要度: 低
- 場所: [src-tauri/src/lib.rs:40](src-tauri/src/lib.rs#L40)、[src-tauri/src/lib.rs:450](src-tauri/src/lib.rs#L450)、[src-tauri/src/lib.rs:734](src-tauri/src/lib.rs#L734)

メンバーとカレンダーは 2MB の metadata 検査後、共通の `read_utf8` で再び metadata を取り、上限 10MB として読み込む。検査の間に同じ利用者権限の別プロセスがファイルを差し替えると、2MB を超えた内容を読める。

`read_utf8(path, max_bytes)` として、開いたファイルから上限付きで一度だけ読む。通常利用の危険性は低いが、「2MB 上限」という仕様を実装で保証しやすくなる。

セキュリティ面では、HTML/SVG の利用者入力は `exportHtml.ts` の `esc` を通り、Tauri の CSP に `unsafe-eval` はなく、GitHub Actions は commit SHA で固定されていた。今回の範囲では、利用者入力から直接コード実行へ至る経路は確認できなかった。`npm audit --omit=dev` も 0 件だった。

### アクセシビリティと可読性

#### C-09 メニューと絞り込みをキーボード・支援技術で識別しにくい

対応: 対応済み。メニューを開くと最初の項目へフォーカスし、上下と Home/End で移動する。検索欄と選択欄に名前を付け、フォームのエラーは `role="alert"` にした。

- 重要度: 中
- 場所: [src/components/AppMenu.tsx:65](src/components/AppMenu.tsx#L65)、[src/components/ContextMenu.tsx:63](src/components/ContextMenu.tsx#L63)、[src/components/Toolbar.tsx:134](src/components/Toolbar.tsx#L134)

二つのメニューは `role="menu"` と `role="menuitem"` を持つが、開いたときのフォーカス移動、上下キー、Home/End がない。Toolbar の検索欄と複数の select は、placeholder や最初の option に名前を頼り、`label` や `aria-label` がない。

WAI-ARIA のメニューパターンに合わせ、メニューを開いたら最初の項目へフォーカスする。検索欄と select には操作マニュアルと同じ名前のラベルを付ける。フォームエラーには `role="alert"` または `aria-live` も付ける。

#### C-15 localStorage の書き込み失敗を一部だけ処理していない

対応: 対応済み。メンバーとカレンダーの保存失敗は利用者向けのエラーにする。カレンダーは本文と表示名の途中失敗で両方を戻す。

- 重要度: 低
- 場所: [src/model/memberAppData.ts:42](src/model/memberAppData.ts#L42)、[src/model/calendarAppData.ts:26](src/model/calendarAppData.ts#L26)

表示サイズ、配色、一覧幅は localStorage の例外を処理するが、メンバーとカレンダーは `setItem`、`removeItem` の例外をそのまま返す。容量不足や保存を禁止した環境で、取り込み操作が未処理の reject になり得る。

失敗を利用者向けエラーへ変換し、本文と表示名を二つの key へ書くカレンダーは途中失敗時にロールバックする。

#### C-19 中核ファイルへ責務が集中している

対応: 見送り。ファイル分割は別計画にする。

- 重要度: 低
- 場所: [src/App.tsx](src/App.tsx)、[src/components/Timeline.tsx](src/components/Timeline.tsx)、[src/hooks/useScheduleFile.ts](src/hooks/useScheduleFile.ts)

それぞれ約 1,400 行、1,700 行、1,000 行あり、キーボード操作、当たり判定、ポーリング、復旧、保存などの状態機械が一つのファイルに集まる。今回の多重実行や Escape の問題も、離れたイベント処理の組み合わせから生じている。

機能 ID を境界に、`useAppKeyboard`、ポインターと hover、保存、監視、起動復旧へ分ける。分割前に、現在手動だけの重要な分岐へテストを足す。

## 文書の指摘

### D-01 PLANNING の今後の項目が実装済みの状態と食い違う

対応: 対応済み。絞り込み、保存、外部更新、復旧を完了として外し、自動保存の要否だけを検討に残した。`mockup/` の CDN は参照しないため対応しない、と閉じた。

- 重要度: 中
- 観点: ストーリー、冗長
- 場所: [docs/PLANNING.md:91](docs/PLANNING.md#L91)

「フィルタリングの軸の最終決定」「動作確認」「保存したりとかそういうやつ」が今後の項目に残るが、現在は 10 種類の絞り込み、保存、外部更新、復旧がある。アプリから使わない `mockup/` の CDN 読み込みも、既知の課題として最後に残っている。ロードマップを上から読んだ読者が、現在の未実装範囲を誤解する。

決定済み・完了・今後を現在の状態で整理し、`mockup/` の問題は「参照しないため対応しない」と閉じるか削除する。「保存したりとかそういうやつ」は「自動保存の要否」のように検討事項を具体化する。

### D-02 テスト仕様のケース一覧が実装より 8 件少ない

対応: 対応済み。欠けた 8 件を一覧へ足した。テスト名一覧の CI 生成は見送った。

- 重要度: 中
- 観点: ストーリー、冗長
- 場所: [docs/test-spec.md:176](docs/test-spec.md#L176)、[docs/test-spec.md:223](docs/test-spec.md#L223)

`shortcuts.test.ts` は 14 個の `it` を持つが一覧は 7 件であり、`colorScheme.test.ts` の `accepts light and dark` も無い。手書きで約 200 ケースを列挙する構成は、今回すでに実装へ追従できていない。

直近では欠けた 8 件を足す。長期的にはテスト名の一覧を CI で生成・照合し、本文は「機能 ID とテストファイルの対応」と「重要な境界」に絞る。

### D-03 マイルストンの確度操作が一部の要約から抜けている

対応: 対応済み。操作早見表、マイルストン編集ダイアログ、`TC-EDIT-11b` を、編集、確度の切り替え、削除の三つに揃えた。

- 重要度: 中
- 観点: ストーリー、文書間の整合
- 場所: [docs/user-manual.md:220](docs/user-manual.md#L220)、[docs/external-spec.md:660](docs/external-spec.md#L660)、[docs/test-spec.md:405](docs/test-spec.md#L405)

本文では、マイルストンの右クリックメニューに確度の切り替えがある。一方、操作早見表は「編集」と「削除」だけ、外部仕様のダイアログ表は保存対象が名前と日付だけ、`TC-EDIT-11b` もメニューを「編集」と「削除」だけとしている。上から詳しい本文を読んだあと、要約で機能が減って見える。

早見表、ダイアログ表、手動テストを現在の三項目に揃える。

### D-04 配布用ビルドの例が 0.6.0 のまま固定されている

対応: 対応済み。配布物の例を README と同じ `X.Y.Z` にした。

- 重要度: 低
- 観点: ストーリー
- 場所: [docs/development.md:273](docs/development.md#L273)

現在の版は 0.8.0 だが、deb、AppImage、dmg、NSIS、MSI の例がすべて 0.6.0 である。コマンドをコピーする読者には存在しないパスになる。

README と同じ `X.Y.Z` を使うか、シェル変数を使った例にする。

### D-05 外部仕様の機能 ID が番号順に並んでいない

対応: 対応済み。番号は変えず、EDIT-12、EDIT-13、EDIT-14 と SET-02、SET-03、SET-04 の順へ本文を並べた。

- 重要度: 低
- 観点: ストーリー
- 場所: [docs/external-spec.md:568](docs/external-spec.md#L568)、[docs/external-spec.md:584](docs/external-spec.md#L584)、[docs/external-spec.md:632](docs/external-spec.md#L632)

EDIT-13、EDIT-14 のあとに EDIT-12 があり、SET-04 のあとに SET-02、SET-03 が続く。機能表では番号順なので、本文をたどると前後する。

番号を変えず、本文の節だけ ID 順へ並べる。

### D-06 「足る」という誤記が複数の文書にある

対応: 対応済み。操作マニュアルとテスト仕様の該当 3 箇所を「追加される」または「加わる」にした。

- 重要度: 低
- 観点: 日本語
- 場所: [docs/user-manual.md:211](docs/user-manual.md#L211)、[docs/test-spec.md:399](docs/test-spec.md#L399)、[docs/test-spec.md:413](docs/test-spec.md#L413)

「タスクが足る」「線が 1 本足る」は、「追加される」または「1 本加わる」が自然である。同じ誤記がコピーされているため、一括で直す。

### D-07 「親バー」と「イナズマ線」が定義より先に現れる

対応: 対応済み。外部仕様の用語表に定義を足し、README と操作マニュアルの画面図の初出に短い説明を添えた。

- 重要度: 低
- 観点: 未説明の造語
- 場所: [README.md:18](README.md#L18)、[docs/user-manual.md:36](docs/user-manual.md#L36)、[docs/external-spec.md:15](docs/external-spec.md#L15)

「系統」「控え」は外部仕様の用語表にあるが、「親バー」と「イナズマ線」はない。README と操作マニュアルの画面図では、説明前に突然現れる。

外部仕様の用語表に短い定義を置き、操作マニュアルの画面図では「カテゴリ・グループの期間を示す親バー」「今日の進み方を示す線」のように初出で補う。

### D-08 「原子的な書き込み」が直訳調である

対応: 対応済み。一覧の文言を「一時ファイルを使った安全な置き換え」にし、仕組みの説明は永続化の節に残した。

- 重要度: 低
- 観点: 直訳調
- 場所: [docs/internal-spec.md:30](docs/internal-spec.md#L30)

後の「一時ファイルへ書き、置き換える」は具体的で分かりやすい。「原子的な書き込み」は atomic write の直訳で、初見の読者には方法も利点も伝わりにくい。

一覧では「一時ファイルを使った安全な置き換え」とし、永続化の節で仕組みを説明する。

### D-09 内部仕様の状態説明が操作単位まで入り込みすぎる

対応: 対応済み。履歴は文書だけで表示状態は入れないことと、その例外だけを残した。

- 重要度: 低
- 観点: 冗長
- 場所: [docs/internal-spec.md:95](docs/internal-spec.md#L95)

「状態」節の一段落が、線、マイルストン、複製、削除、絞り込みまで操作ごとの履歴の積み方を列挙する。同じ内容は外部仕様の EDIT-* にもあり、内部仕様で伝えたい「履歴は文書だけ、表示状態は入れない」が埋もれる。

共通原則と例外だけを残し、各操作の 1 ステップ性は外部仕様またはテスト仕様へ任せる。

### D-10 外部仕様の一段落が長く、規則を検索しにくい

対応: 対応済み。FILE-07、EDIT-07、EDIT-12 の「挙動」を、対応づけ、表示順、失敗時、履歴のような短い箇条書きに分けた。規則は削っていない。

- 重要度: 低
- 観点: 冗長、ストーリー
- 場所: [docs/external-spec.md:211](docs/external-spec.md#L211)、[docs/external-spec.md:520](docs/external-spec.md#L520)、[docs/external-spec.md:588](docs/external-spec.md#L588)

FILE-07、EDIT-07、EDIT-12 は、一つの「挙動」段落に対応づけ、順序、例外、履歴、表示状態が連続している。内容自体は仕様として必要だが、主メッセージと例外の境界が見えない。

「対応づけ」「表示順」「失敗時」「履歴」のような短い箇条書きに分ける。仕様を削るのではなく、規則の単位を見える形にする。

## 文書とソースの食い違い

1. [docs/internal-spec.md:36](docs/internal-spec.md#L36) は依存が図の向きだけとするが、`App.tsx`、`Toolbar.tsx`、`Timeline.tsx` などのコンポーネントは `src/model/` を直接 import している。図に `components --> model` を足すか、依存をフック経由へ変える必要がある。対応: 対応済み。図に `components --> model` を足した。import をフック経由へ寄せることは、C-19 と同じ分割になるので見送った。
2. 外部仕様 FILE-01 の「エラーの場所は名前で示す」に対し、循環だけは UUID の列になる。詳細は [C-13](#c-13-循環エラーがタスク名ではなく-uuid-を表示する)。対応: 対応済み。循環経路を名前で返す。
3. テスト仕様の自動テスト一覧は、実装より 8 件少ない。詳細は [D-02](#d-02-テスト仕様のケース一覧が実装より-8-件少ない)。対応: 対応済み。欠けた 8 件を一覧へ足した。
4. マイルストンの確度切り替えは実装と外部仕様本文にあるが、操作早見表、ダイアログ表、手動テストの一部から抜けている。詳細は [D-03](#d-03-マイルストンの確度操作が一部の要約から抜けている)。対応: 対応済み。三つの要約を編集、確度の切り替え、削除に揃えた。

## テストについての所見

モデルの主要部分には 197 件の Vitest があり、移行、差分、復旧判断、ドラッグ中の日付、依存線、配色、設定を広く確認している。Rust の 10 件は、上書きパス、控えのパス、前回ファイルの選択、書き出し名を確認している。自動チェックはすべて成功した。

優先して追加したいテストは次のとおりである。

1. `useScheduleFile`: 起動復旧の `accept` 中に画面が変わった場合と、保存を二重に呼んだ場合
2. `TaskEditDialog`: 候補一覧を Escape で閉じてもダイアログは残ること
3. `dependencies.ts`: 同日を破綻にしない境界と、枝分かれした系統
4. `exportHtml.ts`: 行数・幅・高さの上限と、利用者入力の HTML/SVG エスケープ
5. `history.ts`: 100 件の上限、同一内容を積まないこと、undo/redo の境界
6. `rows.ts`: 担当、ステータス、期限、破綻、前後空白を含む検索の組み合わせ
7. `release.yml` と CI のパス判定: `index.html`、`rust-toolchain.toml`、生成済み検証器の変更

画面操作の自動テスト基盤がないため、復旧、保存、フォーカス、メニュー、Konva の hover は手動テストだけである。今回見つかった問題は複数のイベントをまたぐものが多い。少なくともブラウザで再現できるダイアログとキーボード操作には、Testing Library または Playwright の小さいテスト層を加える効果が大きい。画面テストの基盤は今回は足さない。ダイアログとキーボードは手動ケースとブラウザ確認にする。

## スキルに足した手順

### `.cursor/skills/review-project/SKILL.md`

- 「文書の観点」へ、版番号入りの例、今後の予定、既知の課題が現在の実装に追いついているかを見る手順を追加した。きっかけは D-01、D-04。
- 「実装の観点」へ、アクセシビリティ、ブラウザ版とデスクトップ版の差、CI と Release、テスト仕様と実テスト名の照合を追加した。きっかけは C-01、C-09、C-10、C-17、D-02。

### `.cursor/skills/implement-change/SKILL.md`

- 「画面と操作」へ、入力のラベル、動的エラーの通知、子 UI が処理した Escape を親まで伝えない手順を追加した。きっかけは C-08、C-09。
- 「状態・モデル・描画・Tauri」へ、多重実行、`await` 中の状態変更、世代番号、state と ref の同期を確認する手順を追加した。きっかけは C-02、C-03。
- 同じ節へ、ブラウザ版とデスクトップ版のサイズ上限、検証、エラー処理の差が意図したものか確認する手順を追加した。きっかけは C-17。

1 か所だけに固有の指摘はスキルへ足していない。`write-schedule`、`write-members`、`write-calendar` にアプリ実装の手順も追加していない。
