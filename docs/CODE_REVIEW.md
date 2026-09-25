# コードレビュー結果（2026-09-25）

schedule-viewer の全ソースを読み、不具合リスク、パフォーマンス、可読性、セキュリティの4観点で問題を洗い出した記録である。

| 項目 | 内容 |
|---|---|
| 対象 | `develop` ブランチ、コミット `4ce14ca` 時点の追跡対象ファイル全体（`src/`、`src-tauri/`、`scripts/`、`.cursor/skills/`、設定ファイル、`mockup/`） |
| 読者 | このリポジトリを修正する開発者 |
| 位置づけ | レビュー時点のスナップショット。仕様の正本は [PLANNING.md](PLANNING.md)、JSON 形式の正本は [schedule.schema.json](schedule.schema.json) のままとする |
| 対応状況の管理 | この文書では追跡しない。着手する指摘は ID（例：B-01）を添えて Issue に起こす |

## 重大度と確認状況の読み方

各指摘には、直す優先度を表す重大度と、指摘の根拠の強さを表す確認状況を付けた。

| 重大度 | 基準 |
|---|---|
| Critical | 通常の利用で、表示や判定が誤ったまま気づかれない。配布前に直す |
| High | データの消失や上書きにつながる。配布前に直す |
| Medium | 特定の操作や環境で誤動作する。または保守を継続的に難しくする |
| Low | 影響が限定的。関連箇所を触るときに合わせて直せばよい |

| 確認状況 | 意味 |
|---|---|
| 再現済み | 再現スクリプトで事象を確認した（[実施した確認と結果](#実施した確認と結果) を参照） |
| コード根拠 | ソースコード、または依存ライブラリの実装から確定した。アプリの画面では動かしていない |
| 推定 | OS や WebView の挙動に依存し、実機で確認していない |

Tauri のウィンドウを起動した画面操作の確認は行っていない。パフォーマンスの指摘も計測値ではなく、処理量の見積もりである。サンプルデータは16タスクなので、パフォーマンスの指摘が体感できるのは数百タスク以上の規模を想定している。

## 実施した確認と結果

コードの精読に加え、次を実行した。

| 確認 | 結果 |
|---|---|
| `npx tsc --noEmit` | エラーなし |
| `npm run check:schedule` | OK |
| `npm audit --omit=dev` | 脆弱性 0 件 |
| `cargo clippy`（`src-tauri/`） | 警告なし |
| 再現スクリプト（`src/model` の関数を `tsx` で直接呼ぶ） | 下のログのとおり |

再現スクリプトの出力は次のとおりである。スクリプトは作業用の一時領域に置き、リポジトリには含めていない。

```text
TZ = Asia/Tokyo
[全削除] categories: 0 save ok? false /categories: must NOT have fewer than 1 items
[progress 33.5] save ok? false /categories/0/groups/0/tasks/0/progress: must be integer
[name '   '] save ok? false /categories/0/groups/0/tasks/0/name: タスク名は空白にできません
[start ''] save ok? false /categories/0/groups/0/tasks/0/start: must match format "date"
[start ''] parseDate: Invalid Date
[無変更で保存] history pushed (dirty)? true
[BOM] open ok? false JSON の形式が正しくありません。

TZ = America/New_York
[DST] move +1: 2026-11-01 2026-11-01    ← 10/31〜11/01 のタスクを +1 日移動した結果

validate-schedule.mjs（タスクに未知のプロパティ "notes"）: OK
アプリの検証（同じファイル）: /categories/0/groups/0/tasks/0: must NOT have additional properties
validate-schedule.mjs（"groups": [null]）: TypeError で異常終了
アプリの検証（id が "urn:uuid:00000000-..." のタスク）: 受理
```

## 指摘の一覧

| ID | 観点 | 重大度 | 概要 |
|---|---|---|---|
| B-01 | 不具合 | Critical | 本日の日付が `2026-09-24` に固定されている |
| B-02 | 不具合 | High | ウィンドウを閉じると未保存の変更が確認なしで失われる |
| B-03 | 不具合 | High | 開いた後に外部で更新されたファイルを確認なしで上書きする |
| B-04 | 不具合 | Medium | ファイル保存が原子的でなく、書き込み中の失敗でファイルが壊れる |
| B-05 | 不具合 | Medium | タスク編集ダイアログの入力検証が不足し、保存できない文書になる |
| B-06 | 不具合 | Medium | 最後のタスクを消すとグループとカテゴリが消え、再追加や保存ができなくなる |
| B-07 | 不具合 | Medium | 夏時間のあるタイムゾーンで日付計算が1日ずれる |
| B-08 | 不具合 | Medium | リサイズハンドルの `dragBoundFunc` が座標系を取り違えている |
| B-09 | 不具合 | Medium | ファイルを開いた直後の全体表示が、前のファイルの期間で計算される |
| B-10 | 不具合 | Medium | タイムラインの期間が変わっても横スクロール位置を補正しない |
| B-11 | 不具合 | Medium | 終了日をその日に含むのかが定義されていない |
| B-12 | 不具合 | Medium | Windows と Linux で Ctrl+Shift+Z のやり直しが効かない |
| B-13 | 不具合 | Medium | 持ち出し用の検証スクリプトがアプリより緩く、通ったファイルをアプリが開けない |
| B-14 | 不具合 | Low | Rust 側のエラーメッセージが画面に出ない |
| B-15 | 不具合 | Low | BOM 付き UTF-8 の JSON を開けない |
| B-16 | 不具合 | Low | 何も変えずに編集ダイアログを保存しても「未保存」になる |
| B-17 | 不具合 | Low | 検索欄に空白を入力できない |
| B-18 | 不具合 | Low | 担当者フィルタが、存在しなくなった担当者名のまま残る |
| B-19 | 不具合 | Low | 同じタスクを先行と後続の両方に指定でき、循環になる |
| B-20 | 不具合 | Low | ネイティブのファイルダイアログが親ウィンドウに紐づいていない |
| B-21 | 不具合 | Low | 週末の網掛けが表示の左端で欠ける |
| P-01 | パフォーマンス | Medium | スクロールのたびに App 全体とサイドバーの全行が再描画される |
| P-02 | パフォーマンス | Medium | 1回の編集で文書全体の JSON 化と複製が何度も走る |
| P-03 | パフォーマンス | Low | 目盛りと背景の生成が、毎フレーム全日数を走査する |
| P-04 | パフォーマンス | Low | メモ化が機能していない箇所がある |
| P-05 | パフォーマンス | Low | 前後関係の候補一覧を全件描画する |
| P-06 | パフォーマンス | Low | ブラウザでの HTML 書き出しは HTML を2回生成する |
| P-07 | パフォーマンス | Low | ID によるタスク検索が全走査で、レンダー中に繰り返される |
| R-01 | 可読性 | Medium | 描画ロジックが Konva 版と SVG 書き出し版で二重に実装されている |
| R-02 | 可読性 | Medium | 自動テストと Lint がない |
| R-03 | 可読性 | Medium | App.tsx がレンダー中に setState しており、値の依存が循環している |
| R-04 | 可読性 | Medium | useSchedule の中で文書の状態が二重に保持されている |
| R-05 | 可読性 | Low | useSchedule の責務が大きい |
| R-06 | 可読性 | Low | model 層が sample 層に依存している |
| R-07 | 可読性 | Low | 型の inline import が散在している |
| R-08 | 可読性 | Low | サイズ定数が重複し、未使用の export が残っている |
| R-09 | 可読性 | Low | ファイル名の整形とダウンロード処理が複数実装されている |
| R-10 | 可読性 | Low | 検証エラーのメッセージが日本語と英語で混在する |
| R-11 | 可読性 | Low | ダイアログの実装方法が揃っていない |
| R-12 | 可読性 | Low | テンプレート由来の設定や未使用依存が残っている |
| S-01 | セキュリティ | Medium | CSP が無効になっている |
| S-02 | セキュリティ | Medium | 保存コマンドが WebView から任意のパスを受け取って書き込む |
| S-03 | セキュリティ | Low | 使っていないプラグインと権限を許可している |
| S-04 | セキュリティ | Low | 読み込むファイルのサイズに上限がない |
| S-05 | セキュリティ | Low | モックアップが CDN のスクリプトを完全性検証なしで読み込む |

## 対応の順番

配布前に、データの誤表示と消失につながる指摘を直す。対象は B-01、B-02、B-03、B-05、B-13、S-02 である。B-13 は LLM が生成したファイルがアプリで開けない原因になるため、スキルを他プロジェクトへ配る前に直す。

次に、日常の編集操作で出る誤動作を直す。対象は B-06、B-08、B-09、B-10、B-11、B-12、B-04、S-01 である。B-07 は利用者が全員日本時間なら顕在化しないので、配布先に海外拠点がある場合に優先度を上げる。

これらの修正に先立って、R-02 の自動テストを `src/model/` の純粋関数から入れておく。B-01、B-05、B-07、B-16 はどれも単体テストで再発を防げる。

パフォーマンスの指摘（P-01、P-02）は、数百タスク規模のスケジュールを扱い始めた時点で対応する。

## 不具合リスク

### B-01 本日の日付が固定値になっている

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Critical | コード根拠 | `src/model/timeline.ts:11` |

「本日」が `export const TODAY_ISO = "2026-09-24";` という定数で、実行日の日付を使っていない。この定数は次の判定と表示のすべてに使われている。

- 期限超過の判定と赤表示（`timeline.ts:84-90`、`barColors`）
- 本日のイナズマ線（`Timeline.tsx:412`、`exportHtml.ts:430`）
- 「期限超過」フィルタ（`rows.ts:50`）
- タスク追加時の初期日付（`App.tsx:398`、`App.tsx:402`）
- 書き出し HTML の「本日は …」（`exportHtml.ts:106`）

レビュー日の 2026-09-25 の時点ですでに1日ずれている。配布後は日が経つほど、期限超過のタスクが超過として表示されなくなる。表示はもっともらしいので、利用者は誤りに気づけない。

修正案として、本日を実行時に求め、日付が変わったら再描画する。テストで日付を固定できるよう、判定関数の `today` 引数は残す。

```ts
// model/dates.ts
export function todayIso(now: Date = new Date()): string {
  return isoDate(now);
}

// hooks/useToday.ts: 日付が変わる時刻にタイマーで更新する
export function useToday(): string {
  const [today, setToday] = useState(() => todayIso());
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = window.setTimeout(() => setToday(todayIso()), nextMidnight.getTime() - now.getTime() + 1000);
    return () => window.clearTimeout(timer);
  }, [today]);
  return today;
}
```

`isOverdue`、`lightningDate`、`barColors`、`taskMatchesFilter` は既定値に頼らず、`today` を呼び出し側から渡す形に揃える。

### B-02 ウィンドウを閉じると未保存の変更が確認なしで失われる

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| High | コード根拠 | `src/hooks/useScheduleFile.ts:90-97`（未保存確認は「開く」だけ） |

未保存の確認は「開く」の前にしか出ない。ウィンドウを閉じる操作や、ブラウザ版でタブを閉じる操作には確認がなく、編集内容がそのまま失われる。リポジトリ全体に `onCloseRequested` と `beforeunload` の処理は見当たらない。

修正案として、Tauri では `getCurrentWindow().onCloseRequested` で `isDirty` のときに閉じる処理を止め、確認ダイアログを出す。ブラウザ版では `beforeunload` で同じ判定をする。

### B-03 開いた後に外部で更新されたファイルを確認なしで上書きする

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| High | コード根拠 | `src-tauri/src/lib.rs:67-92`、`src/hooks/useScheduleFile.ts:121-131` |

「保存」は、開いたときのパスへそのまま書き込む。開いた後にファイルが別の手段で更新されていても検知しない。

このアプリは、Claude がスケジュール JSON を生成し、アプリで表示と編集をする運用を前提にしている（README の「背景・目的」）。アプリで開いたまま Claude が同じファイルを更新し、その後アプリで保存すると、Claude の更新は警告なしで消える。

修正案として、開いたときと保存したときにファイルの更新時刻（または内容のハッシュ）を記録する。保存の直前に比べ、変わっていたら「上書き」「別名保存」「取り消し」を選ばせる。

### B-04 ファイル保存が原子的でなく、書き込み中の失敗でファイルが壊れる

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | コード根拠 | `src-tauri/src/lib.rs:17-19` |

`fs::write` は既存ファイルを切り詰めてから書き込む。書き込み途中でディスクが一杯になったり、プロセスが落ちたりすると、元の内容も失われた不完全な JSON が残る。

修正案として、同じディレクトリの一時ファイルへ書き、`fsync` の後に目的のパスへ `rename` する。`tempfile` クレートの `NamedTempFile::persist` を使うと短く書ける。

### B-05 タスク編集ダイアログの入力検証が不足し、保存できない文書になる

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | 再現済み | `src/components/TaskEditDialog.tsx:144`、`:203`、`src/hooks/useSchedule.ts:322`、`:340`、`:345` |

編集ダイアログは「終了日が開始日より後か」だけを確かめて保存する。次の3つの入力は画面上は反映されるが、文書がスキーマ違反になる。保存時の検証（`useScheduleFile.ts:113`）で止まるので壊れたファイルは書かれない。ただし利用者は、どの編集が原因かを英語のエラーパスから探すことになる。

| 入力 | 原因 | 結果 |
|---|---|---|
| 進捗率に `33.5` | `Number(e.target.value)` の小数をそのまま通す。スキーマは整数（`schedule.schema.json:71`） | 保存できない |
| タスク名が空白だけ | `patch.name \|\| task.name` は `"   "` を真とみなす | 保存できない |
| 開始日を空にする | `end <= start` は `start` が `""` だと偽になり、検証を通る | `parseDate("")` が Invalid Date になり、バーと親バーの座標が NaN になる。保存もできない |

修正案として、追加ダイアログが使う `validateNewTask` と同じ種類の検証を編集にも用意し、ダイアログと `saveTaskEdit` の両方で呼ぶ。検証内容は次のとおりである。

- 名前は `trim()` 後に空でないこと
- 開始日と終了日は `isIsoDateString` を満たすこと
- 進捗率は `Math.round` 後に 0〜100 の整数であること

### B-06 最後のタスクを消すとグループとカテゴリが消え、再追加や保存ができなくなる

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | 再現済み | `src/model/tasks.ts:83-100`、`docs/schedule.schema.json:23`、`:92`、`:106`、`src/components/TaskAddDialog.tsx:41-43` |

`removeTask` は、空になったグループとカテゴリをデータから外す（PLANNING.md の仕様どおり）。一方で、タスク追加は既存のグループにしか足せず、グループやカテゴリを作る UI はない。この2つの仕様が組み合わさり、次の状態になる。

- グループの最後のタスクを消すと、そのグループへは二度と追加できない（取り消し操作で戻す以外に手段がない）
- 全タスクを消すと `categories` が空になる。スキーマの `minItems: 1` に反するため保存できず、追加ダイアログにも選択肢が出ない

修正案は2つある。1つは、空のグループとカテゴリを残す仕様に変え、スキーマの `minItems` を外すことである。もう1つは、今の仕様を保ったまま、最後のタスクを削除するときに警告し、全タスクの削除を禁止することである。どちらにするかは仕様の判断なので、PLANNING.md で決めてから直す。

### B-07 夏時間のあるタイムゾーンで日付計算が1日ずれる

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | 再現済み（`TZ=America/New_York`） | `src/model/dates.ts:33-35` |

`addDays` はミリ秒で `n * 86400000` を足している。夏時間が終わる日は25時間あるため、その日をまたいで足すと「前日の23時」になり、`isoDate` が1日前の日付を返す。

再現では、2026-10-31〜2026-11-01 のタスクを +1 日移動すると、開始日と終了日がどちらも 2026-11-01 になった。開始日と終了日が同じ文書はスキーマ違反なので保存できない。影響はバーの移動に限らず、次の処理にも及ぶ。

- 期間変更（`roundToDay` 経由）
- マイルストンの移動
- 日付ヘッダーと週末の網掛け（`Timeline.tsx:460`、`:529`、`:547`）

日本時間には夏時間がないので、利用者が全員日本時間なら発生しない。

修正案として、日付を UTC の日付として扱う。`parseDate` は `Date.UTC` で作り、`isoDate`、`getDay`、`getDate` は `getUTC*` 系に置き換える。`xToDate`（`useTimelineView.ts:38-41`）は小数の日数を `addDays` に渡しているので、同時に確認する。

### B-08 リサイズハンドルの dragBoundFunc が座標系を取り違えている

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | コード根拠（Konva 9.3.22 の `lib/Node.js:1263-1280`） | `src/components/Timeline.tsx:271`、`:312-315`、`:353-356` |

Konva の `dragBoundFunc` は、ステージ上の絶対座標を受け取り、絶対座標を返す関数である（Konva は戻り値を `setAbsolutePosition` に渡す）。リサイズハンドルは、バーの位置に置いた `Group` の子なので、相対座標と絶対座標が一致しない。それにもかかわらず、ハンドルの `dragBoundFunc` は相対座標を返している。その結果、次の3つが起こると見込まれる。

- 両端のハンドルとも、返している `y: handleY`（数 px）が絶対座標として扱われる。ドラッグ中のハンドルはボディの最上部へ飛ぶ
- 右端ハンドルの下限 `-HANDLE_WIDTH / 2 + pxPerDay` は、バーの左端ではなくステージの左端を基準にしている。右端ハンドルをバーの開始位置より左へ引けてしまう
- 左端ハンドルが比べる `rightHandleXRef`（`:271`）は、ハンドルを表示した時点の絶対座標のまま更新されない。表示後に横スクロールすると、比べる位置がずれる

日付の確定は `onDragEnd` で `x` から計算し、`setTaskStart` と `setTaskEnd` が最短1日を保証している。そのため、データが壊れる不具合ではなく、見た目と操作感の不具合である。

修正案として、親の絶対位置を足して絶対座標で返す。

```tsx
dragBoundFunc={function (this: Konva.Node, pos) {
  const parent = this.getParent()!.getAbsolutePosition();
  return {
    x: Math.max(pos.x, parent.x + pxPerDay - HANDLE_WIDTH / 2),
    y: parent.y + handleY,
  };
}}
```

左端ハンドルの右限も、`rightHandleXRef` ではなく、ドラッグ開始時に `bgRef` の幅と親の位置から求める。

### B-09 ファイルを開いた直後の全体表示が、前のファイルの期間で計算される

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | コード根拠 | `src/hooks/useScheduleFile.ts:68-71`、`src/App.tsx:120-122`、`src/hooks/useTimelineView.ts:65-70` |

`applyOpenedFile` は、`replaceDocument` で新しい文書を state に積んだ直後に、同じ処理の中で `onAfterOpen`（中身は `view.fitToWidth`）を呼ぶ。この時点の `fitToWidth` は、前回のレンダーで作られた関数であり、`totalDays` は前の文書の値のままである。そのため、開いたファイルの期間ではなく、直前に表示していた文書の期間に合わせてズームする。

修正案として、「開いた直後に全体表示する」という要求を state に記録し、新しい `range` でレンダーされた後の `useEffect` で `fitToWidth` を実行する。

### B-10 タイムラインの期間が変わっても横スクロール位置を補正しない

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | コード根拠 | `src/hooks/useTimelineView.ts:27-31` |

タイムラインの左端（`timelineStart`）は、最も早いタスクまたはマイルストンの6日前から計算される。横スクロール量 `scrollX` は、この左端からのピクセル数である。左端が変わっても `scrollX` を直さないので、画面上の位置がずれる。

- 最も早いタスクをさらに前へ移動すると、左端が前に延びる。見ている範囲全体が右へずれ、表示が跳ぶ
- タスクの削除や取り消しで期間が縮むと、`scrollX` が上限を超えたまま残る。次に操作するまで右側が空白になる

縦方向は `maxScrollY` の変化で補正しているが（`:29-31`）、横方向には同じ処理がない。

修正案として、スクロール位置を「左端に見えている日付」で保持し、描画時にピクセルへ換算する。最低限の修正としては、`timelineStart` の変化量だけ `scrollX` をずらし、`maxScrollX` で丸める `useEffect` を足す。

### B-11 終了日をその日に含むのかが定義されていない

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | コード根拠 | `src/components/Timeline.tsx:143`、`src/model/scheduleSemantics.ts:100-109`、`src/model/timeline.ts:84-90`、`.cursor/skills/write-schedule/SKILL.md:59` |

実装は、終了日をその日に含まない前提で動いている。バーは開始日の左端から終了日の左端まで描かれ、1日のタスクは「開始 9/1、終了 9/2」で表す。

しかし、終了日の意味はどの文書にも書かれていない。SKILL.md には「終了日が開始日より後（1 日以上）」としかない。編集ダイアログのラベルも「終了日」だけである。

利用者も LLM も、終了日を含めて書く可能性がある。月曜から金曜の5日間の作業を「9/7〜9/11」と入力すると、バーは木曜までの4日分になる。期限超過の判定（「終了日が今日なら超過にしない」）とマイルストン超過の判定も、読み手によって解釈が分かれる。

修正案として、まず終了日を含むかどうかを決め、スキーマの `description`、SKILL.md、PLANNING.md に書く。含まない方式を続けるなら、ダイアログのラベルを「終了日（この日は含まない）」のように変える。含む方式へ変えるなら、描画と判定のすべてに +1 日が必要になり、既存ファイルの移行も要るので、`schemaVersion` を上げる。

### B-12 Windows と Linux で Ctrl+Shift+Z のやり直しが効かない

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | 推定 | `src/App.tsx:137`、`:143` |

ショートカットの判定は `e.key === "z"` と `e.key === "y"` で行っている。Windows（WebView2）と Linux（WebKitGTK）では、Shift を押しているときの `e.key` は大文字の `"Z"` になるので、Ctrl+Shift+Z のやり直しが一致しない。CapsLock が有効なときは Ctrl+Z の取り消しも一致しない。macOS では ⌘ と組み合わせると小文字が返るため、開発者の環境では気づきにくい。

修正案として、`e.key.toLowerCase()` で比べる。キーボード配列に依らない判定にするなら `e.code === "KeyZ"` を使う。

### B-13 持ち出し用の検証スクリプトがアプリより緩く、通ったファイルをアプリが開けない

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | 再現済み | `.cursor/skills/write-schedule/scripts/validate-schedule.mjs:82-157`、`:97`、`:10-11` |

SKILL.md は、LLM が JSON を書いた後に `validate-schedule.mjs` で検証する手順を定めている。このスクリプトとアプリの検証（Ajv とスキーマ）の判定が、次の3点で一致しない。

| 差異 | スクリプト | アプリ |
|---|---|---|
| カテゴリ、グループ、タスクの未知のプロパティ（例：`notes`） | 検査しない。OK になる | `additionalProperties: false` で拒否する |
| `"groups": [null]` のような null 要素 | `group.name` の参照で TypeError になり異常終了する | エラーとして報告する |
| ID の UUID 形式 | バージョン 1〜8 と variant を検査する | `ajv-formats` の `uuid` は `urn:uuid:` 接頭辞や nil UUID も受理する |

1つ目の差異が実害になる。LLM がタスクにメモ欄などを足すと、スキルの検証は通るのに、アプリで開くと拒否される。

修正案として、アプリの `validateSchedule` を esbuild などで単一ファイルにまとめ、スクリプトとして配る。そうすればスキーマと意味規則の正本が1つになる。手作業で揃える運用を続けるなら、R-02 の CI に「両方の検証に同じ不正ファイル群を通し、結果が一致するか」のテストを入れる。

### B-14 Rust 側のエラーメッセージが画面に出ない

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/hooks/useScheduleFile.ts:84-86`、`:133-135`、`src/App.tsx:296-302` |

Rust のコマンドは `Result<_, String>` を返す。失敗すると `invoke` は文字列で reject するので、`error instanceof Error` は偽になる。そのため、Rust 側で用意した「UTF-8 以外の文字コードのファイルです」や「ファイルに書き込めません: …」は表示されず、常に「ファイルを開けませんでした。」などの定型文になる。

修正案として、共通の関数でメッセージを取り出す。

```ts
function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}
```

### B-15 BOM 付き UTF-8 の JSON を開けない

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | 再現済み | `src-tauri/src/lib.rs:12-15`、`src/model/scheduleFile.ts:35` |

Rust 側は先頭の BOM（`U+FEFF`）を残したまま文字列にし、`JSON.parse` がそれを不正な文字として拒否する。Windows のエディタで保存し直したファイルは、BOM 付きになることがある。ブラウザ版の `FileReader.readAsText` は BOM を取り除くので、デスクトップ版だけで起こる。

修正案として、`parseScheduleText` の先頭で `text.replace(/^﻿/, "")` を行う。

### B-16 何も変えずに編集ダイアログを保存しても「未保存」になる

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | 再現済み | `src/hooks/useSchedule.ts:353-361` |

`saveTaskEdit` は、後続タスクの `predecessors` から編集中タスクの ID をいったん外し、末尾に付け直す。後続タスクの `predecessors` で編集中タスクが末尾以外にあると、何も変えずに保存しても配列の順序が変わる。その結果、履歴が1件積まれ、見出しが「未保存」になり、保存したファイルにも差分が出る。

修正案として、後続に残す場合は既存の位置を保ち、新たに後続にした場合だけ末尾に足す。

### B-17 検索欄に空白を入力できない

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/components/Toolbar.tsx:75` |

検索欄は制御コンポーネントで、入力のたびに `e.target.value.trim()` を state に入れる。「API」の後に空白を打つと、その空白がすぐ消える。そのため「API 設計」のような空白を含む名前は、貼り付け以外で検索できない。全角空白も `trim` の対象である。

修正案として、state には入力値をそのまま入れ、`trim` は照合時（`rows.ts:56`）に行う。

### B-18 担当者フィルタが、存在しなくなった担当者名のまま残る

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/components/Toolbar.tsx:77-88`、`src/hooks/useSchedule.ts:158-161` |

担当者で絞り込んだ状態で、その担当者の唯一のタスクを別の担当者に変えると、担当者一覧からその名前が消える。フィルタの値は残るため、`select` は該当する選択肢がない表示になる。一方で絞り込みは効いたままで、行が1つも表示されない。

修正案として、`assignees` に含まれなくなった値は `"all"` に戻す。

### B-19 同じタスクを先行と後続の両方に指定でき、循環になる

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/components/TaskEditDialog.tsx:173`、`:186` |

先行の候補からは選択済みの先行だけを、後続の候補からは選択済みの後続だけを除いている。そのため、同じタスクを先行と後続の両方に追加でき、2つのタスクが互いを先行に持つ。検証も循環を検出しない。系統表示は訪問済み集合で止まるので無限ループにはならない。ただし、前後関係の線と「破綻」の判定が意味をなさなくなる。

修正案として、候補から先行と後続の両方の選択済みを除く。LLM が生成する循環も見つけたいなら、意味規則に循環検出を足す。

### B-20 ネイティブのファイルダイアログが親ウィンドウに紐づいていない

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | 推定 | `src-tauri/src/lib.rs:48-52`、`:78-83`、`:101-106` |

ダイアログを作るときに親ウィンドウを指定していない。OS によってはダイアログがモーダルにならず、表示中もメイン画面を操作できる。「開く」ダイアログの表示中に編集すると、その編集は未保存確認を経ずに、開いたファイルで置き換えられる。「保存」を続けて押すと、保存ダイアログが2つ開く。

修正案として、コマンドで `tauri::Window` を受け取り、`set_parent(&window)` を指定する。フロント側でも、ファイル操作中は該当ボタンを無効にする。

### B-21 週末の網掛けが表示の左端で欠ける

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/components/Timeline.tsx:528-545` |

網掛けは土曜の位置から2日分の矩形を描き、土曜が画面外（`x < -10`）なら描画を飛ばす。土曜が左端の外にあり日曜が見えている場合、日曜が網掛けされない。期間の初日が日曜の場合も同じである。

修正案として、判定を `x + pxPerDay * 2 < 0` に変え、初日が日曜なら1日分の矩形を描く。

## パフォーマンス

### P-01 スクロールのたびに App 全体とサイドバーの全行が再描画される

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | コード根拠（未計測） | `src/App.tsx:111-118`、`src/components/Timeline.tsx:713-724`、`src/components/Sidebar.tsx:50-113`、`:138-153` |

スクロール位置は App 直下の `useTimelineView` が持つ。ドラッグでスクロールすると `mousemove` ごとに `onPan` が state を更新し、App 以下の全コンポーネントが再レンダーされる。対象は Toolbar、Sidebar、Timeline、各ダイアログである。

特にサイドバーは、見えていない行も含めて全行を描き、`translateY` で縦にずらしている。各行の `SlideLabel` はそれぞれ `ResizeObserver` を持ち、レイアウト値（`scrollWidth`）を読む。タスク数に比例して、1フレームごとの再描画と、表示時のレイアウト計算が増える。

また、サイドバー行の `key` に `row.y` が入っている（`Sidebar.tsx:54`、`:70`）。上の行を折りたたむと下の行の key が変わり、再マウントと `ResizeObserver` の作り直しが起こる。

修正案は次のとおりである。

- サイドバーは、Timeline と同じく見えている範囲の行だけを描く
- 行コンポーネントを `React.memo` にし、key から `y` を外す
- スクロールの state 更新は `requestAnimationFrame` で1フレーム1回に間引く
- `ResizeObserver` は1つを共有する

### P-02 1回の編集で文書全体の JSON 化と複製が何度も走る

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | コード根拠（未計測） | `src/model/history.ts:19-30`、`:47`、`:52`、`src/hooks/useSchedule.ts:115`、`src/hooks/useScheduleFile.ts:40-43`、`src/App.tsx:215-223` |

バーを1本動かしただけで、文書全体に対して次の処理が走る。

| 処理 | 回数 | 場所 |
|---|---|---|
| 変化の有無を判定する `JSON.stringify` | 2回（現在と次） | `history.ts:19-30` |
| 履歴用とその適用用の深いコピー | 2回 | `history.ts:47`、`:52` |
| 未保存判定用の整形付き `JSON.stringify` | 1回 | `useScheduleFile.ts:40-43` |
| JSON 表示ダイアログ用の整形付き `JSON.stringify` | 1回（ダイアログが閉じていても実行） | `App.tsx:215-223` |

更新は不変データとして行われているので、「変わったかどうか」は参照の比較で判定できる。修正案は次のとおりである。

- `snapshotsEqual` の文字列比較をやめ、変化がない場合は `buildNext` 側で元の参照を返す
- 深いコピーは、変更した枝だけに限る（構造共有）
- JSON 表示用の文字列は、ダイアログを開いたときだけ作る。作る場合も `useScheduleFile` の `currentJson` を使い回す（両者は同じ文字列である）

### P-03 目盛りと背景の生成が、毎フレーム全日数を走査する

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠（未計測） | `src/components/Timeline.tsx:459-500`、`:528-562` |

日付ヘッダーと背景は、横スクロールのたびに期間の全日数をループし、日ごとに `Date` を作ってから画面内かどうかを判定する。数年の期間でも数千回程度だが、スクロール中は毎フレーム実行される。

修正案として、`scrollX` と `pxPerDay` から見えている日の範囲を先に求め、その範囲だけをループする。

### P-04 メモ化が機能していない箇所がある

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/components/Timeline.tsx:412`、`:628`、`:811`、`src/App.tsx:152-168`、`:225-233`、`:245-253` |

メモ化の依存に毎回新しいオブジェクトが入っているため、再計算や再生成を防げていない。

- `todayDate` はレンダーごとに `new Date` で作られ、`lightningPoints` の `useMemo` の依存に入っている。そのため毎回再計算される
- `onWheelBody`、`handleResizeStart` などの `useCallback` は、レンダーごとに作り直されるフックの戻り値全体（`view`、`schedule`）に依存している。そのため関数は毎回作り直され、Konva のイベント登録も毎回やり直される
- `TaskBar` に渡す `exceeded` は毎回新しい配列になる

修正案として、依存には必要なメンバー（`view.handleWheel` など）だけを書く。R-02 で ESLint の `react-hooks/exhaustive-deps` を入れれば、同種の問題を機械的に見つけられる。

### P-05 前後関係の候補一覧を全件描画する

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/components/TaskEditDialog.tsx:325-347` |

先行と後続の入力欄にフォーカスすると、自分以外の全タスクを候補として描画する。タスクが数千件あると、フォーカスのたびに数千個のボタンを生成する。

修正案として、表示件数を 50 件程度に絞り、「さらに絞り込んでください」と添える。

### P-06 ブラウザでの HTML 書き出しは HTML を2回生成する

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/model/exportHtml.ts:137`、`:145`、`:120` |

`exportScheduleHtml` は先頭で HTML を生成する。ブラウザ経路では、その結果を使わずに `downloadScheduleHtmlInBrowser(input)` を呼び、関数の中で同じ HTML を生成し直している。

修正案として、生成済みの文字列をダウンロード関数に渡す。

### P-07 ID によるタスク検索が全走査で、レンダー中に繰り返される

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/model/rows.ts:122-132`、`src/model/tasks.ts:34-43`、`src/App.tsx:380-402`、`:414-419` |

`findTaskById` と `findTaskPlace` は、見つけた後も最後まで走査する。App では、追加ダイアログと削除ダイアログの表示中にこれらを1回のレンダーで最大4回呼ぶ。

修正案として、`categories` が変わったときに ID からタスクと置き場所への `Map` を1回だけ作り、各所で引く。

## 可読性と保守性

### R-01 描画ロジックが Konva 版と SVG 書き出し版で二重に実装されている

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | コード根拠 | `src/components/Timeline.tsx`、`src/model/exportHtml.ts` |

画面の Konva 描画と、HTML 書き出しの SVG 描画が、同じ見た目を別々のコードで作っている。重複しているのは次の要素である。

- バー、親バー、前後関係の線、イナズマ線、目盛りの寸法計算
- 配色の定数（`Timeline.tsx:55-56` と `exportHtml.ts:38-39`）

すでに差が出ている。週表示の目盛り線の開始位置は、画面では `20 * scale`（`Timeline.tsx:469`）、書き出しでは `26 * scale`（`exportHtml.ts:207`）である。今後、表示仕様を片方だけ変えると、画面と書き出しの見た目がずれていく。

修正案として、行と日付から「矩形、線、文字をどの座標に描くか」の一覧を作る純粋関数を `model/` に置き、Konva と SVG はその一覧を描くだけにする。

### R-02 自動テストと Lint がない

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | コード根拠 | `package.json:9-15` |

テストファイルとテスト実行のスクリプトがなく、ESLint の設定もない。`src/model/` は React に依存しない純粋関数でできているので、単体テストを入れやすい構成である。本レビューの B-01、B-05、B-07、B-15、B-16 は、どれも数行のテストで再発を防げる。

Lint がないため、`App.tsx:215-223` の `jsonText` の依存に `schedule.title` が抜けている箇所も残っている。現状はタイトルが変わるのはファイルを開いたときだけで、同時に `categories` も変わるので表面化していない。

修正案は次のとおりである。

- Vitest を入れ、`src/model/` のテストから始める
- ESLint に `eslint-plugin-react-hooks` を入れる
- GitHub Actions で `tsc`、テスト、`check:schedule`、`cargo clippy`、スキーマ2ファイルの差分チェックを実行する

### R-03 App.tsx がレンダー中に setState しており、値の依存が循環している

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | コード根拠 | `src/App.tsx:65-71`、`:185-191` |

マイルストン帯の高さを state に持ち、レンダー中に計算し直して、違えば `setMilestoneBandHeight` を呼んでいる。これは次の値の循環を断つための回避策と読める。

```text
bodyHeight → useSchedule(maxScrollY) → useTimelineView(pxPerDay)
  → layoutMilestones → milestoneBandHeight → bodyHeight
```

React はレンダー中の setState を許容するが、1回の更新で App が2回レンダーされる。値の流れも追いにくい。

循環の原因は、表示の関心事である `maxScrollY` を、文書の状態を扱う `useSchedule` が計算していることにある（`useSchedule.ts:519`）。修正案として、`maxScrollY` を App 側で `visibleRows.length * rowHeight - bodyHeight` として計算する。そうすれば帯の高さは state にせず、その場で求められる。

### R-04 useSchedule の中で文書の状態が二重に保持されている

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | コード根拠 | `src/hooks/useSchedule.ts:61-72`、`:113-136`、`:437-462` |

文書は `documentRef`（最新値の参照用）と、`categories` と `milestones` の state（描画用）の両方にある。`commitDocument`、`applySnapshot`、`replaceDocument` がそれぞれ両方を更新している。更新箇所を1つでも書き漏らすと、画面と履歴の内容が食い違う。

修正案として、`{ document, history }` を1つの `useReducer` で持ち、編集操作を action として定義する。reducer は純粋関数になるので、R-02 の単体テストの対象にもできる。

### R-05 useSchedule の責務が大きい

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/hooks/useSchedule.ts`（521行、戻り値のメンバー30個） |

1つのフックが、次の関心事をすべて持っている。

- 文書の編集と、取り消しの履歴
- フィルタ
- 折りたたみ
- 選択、系統、ダイアログの開閉

修正案として、R-04 の reducer 化に合わせ、文書と履歴、フィルタ、選択とダイアログの3つに分ける。

### R-06 model 層が sample 層に依存している

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/model/history.ts:1`、`src/model/scheduleFile.ts:7`、`src/hooks/useSchedule.ts:42` |

保存形式への変換 `scheduleToJson` と、担当者一覧を作る `collectAssignees` が、`src/sample/schedule.ts` にある。そのため、本番の処理である履歴とファイル保存が、サンプルデータのモジュールを import している。

修正案として、2つの関数を `src/model/serialize.ts` などへ移し、`sample/` はサンプルデータだけにする。

### R-07 型の inline import が散在している

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/components/Timeline.tsx:33-51`、`:636`、`src/components/MilestoneBand.tsx:9-18`、`src/components/Sidebar.tsx:19`、`src/model/exportHtml.ts:21`、`:317` |

`import("../model/types").ScheduleId` という書き方が、同じファイルの中で何度も出てくる。各ファイルの先頭で `import type { ScheduleId }` すれば足りる。

### R-08 サイズ定数が重複し、未使用の export が残っている

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/model/timeline.ts:5-7`、`src/App.tsx:59-64`、`src/model/rows.ts:15`、`src/model/exportHtml.ts:186` |

基準サイズの定義と実際に使われる値が、別々の場所にある。

- `HEADER_HEIGHT`、`BODY_VIEWPORT_HEIGHT`、`BAR_HEIGHT` は export されているが、どこからも使われていない
- App は同じ値を `40`、`32`、`20` の数値で直接書いている
- 書き出しは `headerHeight / 40` で倍率を逆算している

修正案として、基準サイズを1つの定数オブジェクトにまとめ、`uiScale` を掛けた値を App から配る。

### R-09 ファイル名の整形とダウンロード処理が複数実装されている

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src-tauri/src/lib.rs:21-44`、`src/model/scheduleFile.ts:115-129`、`src/model/exportHtml.ts:43-46`、`:119-131` |

タイトルからファイル名を作る処理が3つあり、禁止文字の扱いが揃っていない。Rust 版と JSON 用は `_` に置き換え、HTML 用は削除する。3つとも、Windows の予約名（`CON` など）、末尾のピリオドと空白、制御文字には対応していない。

ブラウザでのダウンロード処理も2つある。JSON 用（`scheduleFile.ts:115-123`）は `a` 要素を DOM に追加せずにクリックし、HTML 用（`exportHtml.ts:119-131`）は追加してからクリックする。

修正案として、ファイル名の整形はフロントの1つの関数にまとめ、Rust 側は同じ規則で検査するだけにする。ダウンロード処理も1つにまとめる。

### R-10 検証エラーのメッセージが日本語と英語で混在する

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | 再現済み | `src/model/validateSchedule.ts:15-21` |

意味規則のエラーは日本語だが、スキーマ違反のエラーは Ajv の英語（`must be integer` など）のまま表示される。エラーの場所も `/categories/0/groups/0/tasks/0/progress` という JSON Pointer で、利用者はどのタスクかを特定しにくい。

修正案として、`ajv-i18n` の日本語ロケールを使う。JSON Pointer は、該当するカテゴリ名、グループ名、タスク名に置き換えて表示する。

### R-11 ダイアログの実装方法が揃っていない

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src/components/TaskEditDialog.tsx:58-69`、`:204`、`src/components/MilestoneEditDialog.tsx:18-22`、`:56`、`src/hooks/useSchedule.ts:275` |

ダイアログごとに、同じ役割の処理を違う方法で書いている。

- 編集ダイアログは、表示対象が変わると `useEffect` で state を詰め直す。そのため最初の1フレームは前の値が表示される。追加ダイアログのように、開くたびにマウントし直す（`key` を変える）方が単純である
- 入力エラーを、編集ダイアログは `window.alert` で、追加ダイアログは画面内の文言で出す
- マイルストン編集は、`saveMilestoneEdit` が閉じた後に、ダイアログ側でも `onClose` を呼んでいる

修正案として、入力エラーは画面内の文言に揃え、`key` によるマウントし直しで初期化する。

### R-12 テンプレート由来の設定や未使用依存が残っている

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src-tauri/Cargo.toml:4-5`、`:25`、`src-tauri/src/lib.rs:118`、`package.json:19`、`index.html:5`、`src-tauri/tauri.conf.json:16-17` |

Tauri と Vite の雛形から残っている項目がある。

- `Cargo.toml` の `description = "A Tauri App"` と `authors = ["you"]`
- 使っていない依存（`serde_json`、`tauri-plugin-opener`、`@tauri-apps/plugin-opener`）
- `vite.svg` のファビコンと、使っていない `public/tauri.svg`、`src/assets/react.svg`

ウィンドウの初期サイズ `800x600` は、UI の基準サイズ `1100x780`（`uiScale.ts:3-4`）より小さい。起動直後はツールバーが折り返す。Rust の引数 `&PathBuf` は `&Path` で足りる。

## セキュリティ

このアプリは、LLM が生成した JSON を読み込んで表示する。読み込む内容は信頼できない入力として扱う前提で見た。

現状、読み込んだ文字列が HTML として解釈される経路は見つからなかった。画面の文字は React と Konva が描き、書き出し HTML は `esc`（`exportHtml.ts:501-507`）で全テキストをエスケープし、属性はすべて二重引用符で囲まれている。以下の指摘は、この前提が将来崩れたときに被害を広げないための多層防御と、権限の最小化である。

### S-01 CSP が無効になっている

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | コード根拠 | `src-tauri/tauri.conf.json:20-22` |

`"csp": null` で、Content Security Policy を無効にしている。将来の変更で WebView にスクリプトを差し込まれる不具合が入ると、CSP がないため、そのスクリプトは S-02 のファイル書き込みコマンドを呼べる。

修正案として、次を起点に CSP を設定し、`npm run tauri dev` と `npm run tauri build` の両方で動作を確かめる。開発時の Vite は `<style>` を差し込むので、必要なら `devCsp` を別に設定する。

```json
"security": {
  "csp": "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src ipc: http://ipc.localhost"
}
```

### S-02 保存コマンドが WebView から任意のパスを受け取って書き込む

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Medium | コード根拠 | `src-tauri/src/lib.rs:67-92` |

`save_schedule_file` は `path: Option<String>` を WebView から受け取り、パスが渡されればダイアログを出さずに書き込む。パスの範囲や拡張子は確かめていない。WebView 上で任意のスクリプトが動くと、利用者が書き込める任意のファイル（シェルの設定ファイルやスタートアップフォルダなど）を上書きできる。

修正案として、書き込み先のパスを Rust 側で保持する。

- `tauri::State<Mutex<Option<PathBuf>>>` に、開くダイアログと保存ダイアログで選ばれたパスだけを記録する
- 「保存」ではフロントからパスを受け取らず、記録済みのパスへ書く
- 少なくとも、拡張子が `.json` であること、記録済みのパスと一致することを確かめる

### S-03 使っていないプラグインと権限を許可している

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src-tauri/capabilities/default.json:8-9`、`src-tauri/src/lib.rs:118` |

WebView に、使っていない2つの権限を与えている。

- `opener:default`：URL やファイルを既定のアプリで開く権限。opener プラグインはフロントのどこからも使われていない
- `dialog:default`：JavaScript から直接ダイアログを開く権限。ダイアログは Rust の `DialogExt` から開いているので、WebView には不要である

修正案として、opener プラグインを依存ごと削除し、`dialog:default` も capability から外す。独自コマンドの3つの権限だけを残す。

### S-04 読み込むファイルのサイズに上限がない

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `src-tauri/src/lib.rs:12-15` |

`fs::read` はファイル全体をメモリに読み込む。誤って巨大なファイルを選ぶと、読み込み、`JSON.parse`、描画でアプリが長時間固まる。

修正案として、`fs::metadata` でサイズを確かめ、上限（例：10 MB）を超えたらエラーにする。

### S-05 モックアップが CDN のスクリプトを完全性検証なしで読み込む

| 重大度 | 確認状況 | 場所 |
|---|---|---|
| Low | コード根拠 | `mockup/schedule-viewer-mockup.html:112` |

モックアップは cdnjs から Konva を `integrity` 属性なしで読み込んでいる。配布物には含まれないので影響は開発者の手元に限られるが、CDN 側が改ざんされると、ブラウザで開いたときに任意のスクリプトが動く。

修正案として、`integrity` と `crossorigin` を付ける。もしくは、PLANNING.md の既知の課題（CDN から読めない事象）とあわせて、`node_modules` の Konva を参照する形に変える。

## 問題が見つからなかった点

次の点は確認したうえで問題がなかった。修正の際に崩さないよう記録しておく。

- 読み込み時に、Ajv によるスキーマ検証と意味規則の検証を両方通している（`validateSchedule.ts:27-41`）
- 書き出し HTML は、利用者由来の文字列をすべてエスケープしている
- 独自コマンドは、それぞれ個別の権限ファイル（`src-tauri/permissions/`）で許可されている
- 依存パッケージに既知の脆弱性はない（`npm audit`）。Rust 側は clippy の警告がない
- `src/model/` の大半が React に依存しない純粋関数で、テストを足しやすい
