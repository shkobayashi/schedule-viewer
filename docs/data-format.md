# データ仕様

スケジュール、メンバー、ステータス一覧、稼働日カレンダーの JSON と、アプリが自分で書くファイルの形を定める。フィールドの正本は各 JSON Schema である。ID の重複や前後関係の循環のように、スキーマでは表せない規則は `src/model/` の検証コードで確かめる。この文書では、これを意味規則と呼ぶ。画面での見え方は [外部仕様](external-spec.md) を参照する。

スキーマファイルは `scripts/` と CI がパスを直接参照している。場所は変えない。

## ファイルの一覧

| ファイル | 誰が書くか | どこに置くか |
| --- | --- | --- |
| スケジュール JSON | LLM のスキル、またはアプリの「保存」「別名保存」 | 利用者が選んだパス。アプリはパスをスケジュールの中に書かない |
| メンバー JSON | 利用者が用意し、設定の「メンバー」から取り込む | 取り込み後はアプリデータ。スケジュール JSON には含めない |
| ステータス一覧 JSON | 利用者が用意し、設定の「ステータス」から取り込む | 取り込み後はアプリデータ。スケジュール JSON には含めない |
| 稼働日カレンダー JSON | 利用者が用意し、設定の「稼働日」から取り込む | 取り込み後はアプリデータに1件。スケジュール JSON には含めない |
| HTML / SVG | アプリの「書き出し」 | 利用者が選んだパス、またはブラウザのダウンロード |
| アプリデータ | アプリだけ | 下の「アプリデータ」 |

画面の絞り込み、折りたたみ、ズーム、系統、選択、取り消し履歴は、どの JSON にも書かない。

## スケジュール JSON（schemaVersion 8）

正本は [schedule.schema.json](schedule.schema.json)。追加の意味規則は [src/model/scheduleSemantics.ts](../src/model/scheduleSemantics.ts) にある。

ルートは `schemaVersion`、`title`、`milestoneGroups`、`milestones` を必ず持つ。タスクの入れ子は `categories` か、任意の `levels` と `outline` の組み合わせで書く。知らないプロパティは拒否する。

```json
{
  "schemaVersion": 8,
  "title": "プロジェクト名",
  "milestoneGroups": [{ "id": "<uuid>", "name": "マイルストン" }],
  "milestones": [{ "id": "<uuid>", "name": "要件確定", "date": "2026-04-01", "confidence": "committed", "groupId": "<milestone-group-uuid>" }],
  "categories": [{
    "id": "<uuid>",
    "name": "カテゴリ",
    "groups": [{
      "id": "<uuid>",
      "name": "グループ",
      "tasks": [{
        "id": "<uuid>",
        "name": "タスク",
        "start": "2026-04-01",
        "end": "2026-04-03",
        "assigneeId": null,
        "status": "not-started",
        "progress": 0,
        "confidence": "committed",
        "predecessors": [],
        "milestoneId": null
      }]
    }]
  }]
}
```

| フィールド | 内容 |
| --- | --- |
| `schemaVersion` | `8` 固定 |
| `title` | 1文字以上。空白だけは不可 |
| `milestoneGroups` | マイルストン帯の行。空でもよい。タスクのカテゴリ・グループとは別 |
| `milestones` | マイルストンの配列。空でもよい |
| `categories` | 定義が無いとき、または `levels` が3段で `outline` を書かないときは1件以上。中の `groups` も1件以上。`tasks` は空でもよい |
| `levels` | 任意。1〜5段。各要素は `name` と `meaning`（いずれも1文字以上）。`meaning` は保存するが画面には出さない |
| `outline` | 任意。`levels` の段数に合う入れ子。3段以外では `categories` の代わりに使う。枝は `id`、`name`、`children`。最下段はタスク |
| `id` | カテゴリ、グループ、タスク、マイルストン、マイルストングループの UUID。1つのスケジュールの中で、この5種を通して重複しない |
| `groupId`（マイルストン） | 属する `milestoneGroups` の `id`。存在しない ID は不可 |
| `name` | 1文字以上。空白だけは不可 |
| `date` / `start` / `end` | `YYYY-MM-DD`。実在する日。`end` はその日を含む。`end` は `start` 以降の日付にする。同じ日なら1日のタスクになる |
| `assigneeId` | メンバー JSON の `id`。割り当てなしは `null`。UUID である必要はない。スケジュール側ではメンバーの実在を検査しない |
| `status` | ステータス一覧の項目の `id`。1文字以上。既定の一覧は `not-started`、`in-progress`、`done`。スケジュール側では一覧の実在を検査しない。一覧に無い `id` は、画面で `id` をそのまま出し、色は中立にし、イナズマ線と期限超過は管理外と同じ（今日のまま、赤くしない）。「完了以外」には残る |
| `progress` | 0 以上 100 以下の整数 |
| `confidence` | タスクとマイルストンの確度。`tentative`（未確定）か `committed`（確定）。日付を合意したかどうかで、着手や進捗とは独立 |
| `predecessors` | 先行タスクの `id`。重複しない。自分自身は指定できない。存在しない ID は不可。循環も不可。後続は各タスクの `predecessors` から導く |
| `milestoneId` | 対応するマイルストンの `id`。未設定は `null`。存在しない ID は不可 |
| `tags` | 任意。説明用の文字列の配列。各要素は1文字以上。前後の空白だけは不可。同一タスク内で、空白を除いた文字列が重複したら拒否する。大文字小文字は区別する。0件のときはプロパティを書かない |
| `note` | 任意。1文字以上。空文字や空白だけはプロパティ自体を書かない |

カテゴリ名は1つのスケジュールの中で重複できない。グループ名は同じカテゴリの中で重複できない。別のカテゴリに同じグループ名があってもよい。名前は表示であり、対応づけは `id` で行う。並び替え用のフィールドはない。配列の順が画面の並びになる。

### 以前の schemaVersion

開けるのは schemaVersion 3、4、5、6、7、8 である。

- schemaVersion 1 の終了日は、その日を含まない書き方（最終日の翌日）だった。読み込むと終了日を1日戻して schemaVersion 2 にする（[src/model/scheduleMigrate.ts](../src/model/scheduleMigrate.ts)）。そのあと schemaVersion 2 として拒否するので、結果として開けない
- schemaVersion 2 は、担当が名前（`assignee`）の形式なので拒否する。メッセージは、`assigneeId` と `confidence` を使う schemaVersion 8 へ更新するよう求める
- schemaVersion 3 は開ける。確度が無いタスクは `committed` として読み、schemaVersion 4 にしたうえで、次と同じく schemaVersion 8 にする。既に `confidence` があるタスクはその値のまま検証する
- schemaVersion 4 は開ける。カテゴリとグループに `id` が無いので、名前から決まる UUID を付けて schemaVersion 5 にし、続けて schemaVersion 8 にする。同じファイルを開き直しても、その ID は変わらない。タスクやマイルストンの ID とぶつかったときだけ、別の ID にする
- schemaVersion 5 は開ける。マイルストンが1件以上あるときは、名前「マイルストン」の `milestoneGroups` を1つ足し、全部のマイルストンにその `groupId` を付けて schemaVersion 8 にする。そのグループの ID は名前から決まり、カテゴリ、グループ、タスク、マイルストンの ID とぶつかったときだけ別にする。マイルストンが0件なら `milestoneGroups` は空のままである
- schemaVersion 6 は開ける。タグは無いまま schemaVersion 7 にし、続けて schemaVersion 8 にする
- schemaVersion 7 は開ける。`status` の値は変えず、schemaVersion 8 にする
- 未保存の比較元は、3〜7 を 8 にしたあとの保存形式である。ディスク上の文字列とそのまま比べない。開いただけでは未保存にならない。保存すると schemaVersion 8 になる
- マイルストンに `confidence` が無い 3、4、5 は、そのマイルストンを `committed` として読む。既にある値はそのまま残す。schemaVersion 5 の読み込みでは、そのあと 8 に上げる

## 設定ファイル（workspace、schemaVersion 1）

正本は [workspace.schema.json](workspace.schema.json)。スケジュール JSON への相対パスを必須で書き、メンバー JSON、ステータス一覧 JSON、カレンダー JSON への相対パスは省略できる。設定ファイルから見た相対パスだけを書く。絶対パス、空、ディレクトリは拒否する。`..` を含む相対パスは許可する。

```json
{
  "schemaVersion": 1,
  "schedule": "plan.json",
  "members": "team.members.json",
  "statuses": "team.statuses.json",
  "calendar": "jp-2026.calendar.json"
}
```

アプリが書き出す既定のファイル名は `workspace.json` である。別名でも、中身がこの形なら開ける。

## メンバー JSON（schemaVersion 1）

正本は [members.schema.json](members.schema.json)。意味規則は [src/model/membersSemantics.ts](../src/model/membersSemantics.ts) にある。

```json
{
  "schemaVersion": 1,
  "members": [
    { "id": "tanaka", "name": "田中" }
  ]
}
```

- `schemaVersion` は `1`
- `id` と `name` は1文字以上。空白だけは不可
- `id` は配列内で重複できない。`name` は重複してよい。画面では、同じ表示名が複数あるときだけ ID を添える
- 先頭の UTF-8 BOM は取り込み時に取り除く

## ステータス一覧 JSON（schemaVersion 2）

正本は [statuses.schema.json](statuses.schema.json)。意味規則は [src/model/validateStatuses.ts](../src/model/validateStatuses.ts) にある。タスクの `status` が書く `id` の意味、色、扱いを、チームで共有する一覧に置く。スケジュール JSON には含めない。schemaVersion 1 は取り込み時に 2 へ移す。移し方は [src/model/statusesMigrate.ts](../src/model/statusesMigrate.ts) と同じである。

### schemaVersion 1 から 2 への移し方

項目ごとに `closed` を `role` に置き換える。表示名は見ない。

- `id` が `not-started` なら未着手（`not-started`）
- `id` が `in-progress` なら着手済み（`started`）
- `id` が `done` なら完了（`done`）
- 上記以外で `closed` が true なら完了（`done`）
- 上記以外で `closed` が false なら着手済み（`started`）

管理外（`unmanaged`）は移行では付けない。利用者が項目に付ける。

読み込みと取り込みの検証では、移した結果を schemaVersion 2 として扱う。ディスク上の JSON を 2 に書き換えるのは、設定の「項目を編集…」で一覧を保存したときだけである。取り込みのたびにファイルを書き換えない。

```json
{
  "schemaVersion": 2,
  "statuses": [
    {
      "id": "review",
      "name": "確認待ち",
      "color": {
        "light": { "bg": "#FFF3C4", "border": "#B58900" },
        "dark": { "bg": "#4a4020", "border": "#d9b43a" }
      },
      "role": "started",
      "description": "作業は終わり、確認を待っている。"
    }
  ]
}
```

- `statuses` は1件以上。`id` は1文字以上で、一覧の中で重複しない。作ったあとは変えない
- `name` は画面に出す名前。空白だけは不可
- `color` は、ライトとダークのそれぞれで `bg`（バーの地）と `border`（バーの枠と、進捗の帯の色）を `#RRGGBB` で持つ。進行中専用の色は無い。進捗の帯は `border` の色で、どのステータスでも進捗率の幅で出す
- `role` は、未着手（`not-started`）、着手済み（`started`）、完了（`done`）、管理外（`unmanaged`）のいずれか一つ。イナズマ線の折れ位置と期限超過と「完了以外」に使う。同じ `role` の項目は複数あってよい
- `description` は、その `id` を選ぶ状態だけ。空白だけは不可。LLM が `id` を選ぶ手がかりにする
- `instruction` は任意。その `id` を選んだあとに LLM が守ること。空白だけのときはキーを書かない
- 組み込みの三件は `not-started`（未着手）、`in-progress`（進行中、着手済み）、`done`（完了）である。一覧を選んでいないときも、この三件で動く。初回の起動で、この三件を `standard` として取り込んで選ぶ。外したあとは自動では戻さない

期限超過、後続が先行の終了より前に始まること、今日の位置、非稼働日は、アプリが計算して描く。この一覧には含めない。

## 稼働日カレンダー JSON（schemaVersion 1）

正本は [calendar.schema.json](calendar.schema.json)。意味規則は [src/model/calendarSemantics.ts](../src/model/calendarSemantics.ts)、日の判定は [src/model/nonWorkingDay.ts](../src/model/nonWorkingDay.ts) にある。

```json
{
  "schemaVersion": 1,
  "weekends": ["sat", "sun"],
  "nonWorkingDays": [{ "date": "2026-01-01", "name": "元日" }],
  "workingDays": [{ "date": "2026-02-23", "name": "振替出勤" }]
}
```

- `schemaVersion` は `1`
- `weekends` は曜日の配列で、値は `sun`、`mon`、`tue`、`wed`、`thu`、`fri`、`sat` のいずれか。重複は不可。空配列は「曜日による休日なし」
- `nonWorkingDays` と `workingDays` の `date` は実在する `YYYY-MM-DD`。同じ配列の中で日付は重複できない。同じ日付を両方に書くこともできない
- `name` は任意。ファイルのメモであり、チャートには出さない

判定は次の順である。

1. `workingDays` にあれば稼働
2. それ以外で `nonWorkingDays` にあれば非稼働
3. それ以外で `weekends` の曜日なら非稼働
4. どれでもなければ稼働

カレンダーを取り込んでいないときは、土日だけを非稼働とする。タスクの移動と期間は暦日のままで、稼働日では計算しない。

## 保存時の出力

アプリが書くスケジュール JSON は [src/model/serialize.ts](../src/model/serialize.ts) のキー順で、2スペースのインデントである（[src/model/scheduleFile.ts](../src/model/scheduleFile.ts) の `serializeScheduleDocument`）。

キーの順は `schemaVersion`、`title`、`milestoneGroups`、`milestones`、`categories` である。マイルストングループは `id`、`name`。マイルストンは `id`、`name`、`date`、`confidence`、`groupId` の順である。カテゴリは `id`、`name`、`groups`、グループは `id`、`name`、`tasks` の順である。タスクは `id`、`name`、`start`、`end`、`assigneeId`、`status`、`progress`、`confidence`、`predecessors`、`milestoneId` の順で、タグがあるときだけ `tags` を付け、ノートがあるときだけ最後に `note` を付ける。空白だけのノートは書かない。保存時は各タグの前後の空白を除き、空は捨て、重複は先のものを残す。

未保存かどうかは、この形にした文字列と、最後に開いた・保存した・読み直したときの文字列を比べて決める。インデントやキー順だけが違うファイルは、同じ内容として扱う。

## 書き出しファイル

「書き出し」は、絞り込み・折りたたみ・系統のあとで見えている行を、単一の HTML または SVG にする。チャートはどちらも SVG で、画面の Canvas を撮ったものではない。生成は [src/model/exportHtml.ts](../src/model/exportHtml.ts) と [src/model/exportView.ts](../src/model/exportView.ts) で行う。

入るものは、見えている行の名前、タスクバー、カテゴリとグループの親バー、前後の線、イナズマ線、非稼働日、マイルストン、使っている絞り込みの一覧である。用紙へのページ割りはしない。ズームの粒度（1日あたりの幅）は画面と同じで、期間は見えている行と書き出すマイルストンから決め直す。

書き出すマイルストンは次のとおりである。

- マイルストンの絞り込みが「なし」のときは載せない
- 特定のマイルストンで絞っているときは、その1件だけ
- それ以外は、見えている行が参照しているものと、見えている行の期間に入るもの
- 帯の線で隠したグループのマイルストンは載せない。期間の端にも使わない。超過の判定には、隠したグループのマイルストンも使う

提案するファイル名は、タイトルから使えない文字を除いた本体に `.html` または `.svg` を付ける。タイトルが空、または Windows の予約名だけなら `schedule` を使う。

## アプリデータ

デスクトップ版は、Tauri が用意するアプリデータ用のディレクトリ（app data ディレクトリ）を使う。identifier は `io.github.shkobayashi.schedule-viewer` である。以前の `com.collabcentral.schedule-viewer` にデータがあるときは、新しい identifier のディレクトリがまだ無ければ、初回起動時に丸ごと移す。

| OS | 場所 |
| --- | --- |
| Linux | `$XDG_DATA_HOME/io.github.shkobayashi.schedule-viewer`。未設定なら `~/.local/share/io.github.shkobayashi.schedule-viewer` |
| macOS | `~/Library/Application Support/io.github.shkobayashi.schedule-viewer` |
| Windows | `%APPDATA%\io.github.shkobayashi.schedule-viewer`（GitHub Releases の NSIS 版）。Microsoft Store の MSIX 版はパッケージ内に閉じる場合があり、NSIS 版と分かれることがある |

中のファイルは次のとおりである。

| パス | 内容 | 上限 |
| --- | --- | --- |
| `settings.json` | `selectedMembersCatalogId`、`selectedStatusesCatalogId`、`calendarLabel`。どれも無くてよい | — |
| `members/<catalogId>.json` | 取り込んだメンバー JSON の本文 | 2MB |
| `statuses/<catalogId>.json` | 取り込んだステータス一覧 JSON の本文 | 2MB |
| `calendar.json` | 取り込んだカレンダー JSON の本文 | 2MB |
| `schedule-recovery/<ハッシュ>.json` | 未保存の控え。パスごとに1ファイル。`path`、`baselineJson`、`documentJson` | 10MB |
| `schedule-filters/<ハッシュ>.json` | パスごとの絞り込みと折りたたみ。`version`（1）、`path`、絞り込みの各値、検索欄の対象（`name` または `note`）、帯の線をオフにしたマイルストングループの id、折りたたんだカテゴリ id の配列、折りたたんだグループ id の配列。配列が無い古いファイルは、折りたたみなしとして読む | 64KB |
| `open-windows.json` | 開いていたウィンドウの順、`focusedLabel`、各ウィンドウの `label` と `path` またはサンプル。設定ファイルで開いたウィンドウは任意の `workspacePath` を含む | — |
| `recent-files.json` | `schedules` と `workspaces` の二つの配列。それぞれ最近開いたスケジュールと設定ファイルの絶対パス。新しいものが先頭、各最大 5 件。旧形式の単一配列は `schedules` だけとして読む | 64KB |

控えの `path` は開いているスケジュールの絶対パスである。`baselineJson` は最後に開いた・保存した・読み直したときの内容、`documentJson` は画面の内容で、この2つはどちらも上の保存形式の文字列である。絞り込みの `path` も同じ絶対パスである。ハッシュは控えと同じ。初期値のときは絞り込みのファイルを置かない。サンプル（パスが無い）では控えも絞り込みも作らない。同じパスを複数のウィンドウで開いているとき、控えと絞り込みを書くのはそのパスを開いているウィンドウのうち前面のものだけである。`open-windows.json` は、ほかのウィンドウが残っているときに1枚閉じると、そのウィンドウだけ外す。最後の1枚を閉じるときと、アプリの終了時は、開いていた記録を残す。古い `last-schedule.json` と `schedule-recovery.json` は、初回起動時に上の形へ移してから消す。読めなかった古い控えは消さず、次回の起動で移し直す。ブラウザ版は控えもウィンドウ一覧も作らない。

ブラウザ版は localStorage を使う。キーは次のとおりである。

| キー | 内容 |
| --- | --- |
| `schedule-viewer/members/catalogs` | カタログ ID から本文への対応 |
| `schedule-viewer/members/selected` | 使用中のカタログ ID |
| `schedule-viewer/members/sample-seeded` | サンプルのメンバーを入れたかどうかの記録 |
| `schedule-viewer/statuses/catalogs` | ステータス一覧のカタログ ID から本文への対応 |
| `schedule-viewer/statuses/selected` | 使用中のステータス一覧のカタログ ID |
| `schedule-viewer/statuses/builtin-seeded` | 組み込みの三件を入れたかどうかの記録 |
| `schedule-viewer/calendar/body` | カレンダー JSON の本文 |
| `schedule-viewer/calendar/label` | カレンダーの表示名 |
| `schedule-viewer/display-scale` | 表示サイズ。`auto`、`0.5`、`0.75`、`1`、`1.25`、`1.5`、`2` のいずれか |
| `schedule-viewer/color-scheme` | 配色。`light` または `dark`。システム設定に合わせるときはキーを消す |
| `schedule-viewer/sidebar-width` | 左一覧の基準幅。表示倍率 1 のときの px。既定の 190 のときはキーを消す |
| `schedule-viewer/auto-update` | 自動更新。`on` のときだけ起動時に確認する。オフのときはキーを消す |
| `schedule-viewer/excel-export-columns` | Excel 書き出しの左の列。担当、開始、終了、ステータス、先行、進捗、ノートのオンオフ。名前は常に含む |

表示サイズ、配色、左一覧の幅、自動更新のオンオフはデスクトップ版でも localStorage に置く。メンバー、ステータス一覧、カレンダーは、デスクトップ版ではアプリデータだけに置く。

## 検証のしかた

アプリは読み込み前に `validateSchedule`、`validateMembers`、`validateStatuses`、`validateCalendar` を通す。失敗した内容は開かず、エラーは日本語で、場所はカテゴリ、グループ、タスクの名前で示す。

開発時の確認は次のとおりである。

- `npm run check:schedule` は、引数なしなら `src/sample/schedule.ts` のサンプルを検証する。JSON のパスを渡すとそのファイルを検証する
- `npm run check:calendar` は、引数なしなら [examples/jp-2026.calendar.json](../examples/jp-2026.calendar.json) を検証する
- `npm run check:members` は、引数なしなら [examples/playground.members.json](../examples/playground.members.json) を検証する
- `npm run check:statuses` は、引数なしなら [examples/playground.statuses.json](../examples/playground.statuses.json) を検証する
- 置いたスキルでは、各スキルフォルダで `node scripts/validate-schedule.mjs <file>`、`node scripts/validate-calendar.mjs <file>`、`node scripts/validate-members.mjs <file>` を使う

[examples/review.statuses.json](../examples/review.statuses.json) と [examples/review.schedule.json](../examples/review.schedule.json) は、ステータスの見え方を手で確かめる組である。一覧は既定の三件に「確認待ち」（`review`、着手済み）と、扱いが完了の「中止」（`dropped`）を足してある。スケジュールは、超過の枠、帯の有無、完了の非超過、一覧に無い `id`（`shelved`）、イナズマ線の位置を、今日が 2026-10-23 から 2026-11-01 のあいだに見られるように日付を置いてある。引数なしの `check:statuses` の対象は変えない。

[examples/lightning/workspace.json](../examples/lightning/workspace.json) は、四つの扱いと一覧に無い `id` の折れと赤を、同じ日付で見比べる組である。`schedule.json` と `statuses.json` を指す。一覧は確認用に、確認待ち（着手済み）、中止（完了）、管理外を足してある。スケジュールの開始前は 2026-11-04 から 2026-11-18、期間中は 2026-10-06 から 2026-11-06、終了後は 2026-10-01 から 2026-10-16 である。

今日が 2026-10-23 から 2026-11-01 のあいだなら、折れ先は扱いと期間で決まる。未着手は、開始前が今日、期間中が開始日、終了後が終了日である。着手済みは、開始前が開始日、期間中が今日、終了後が終了日である。確認待ちも同じ位置へ折れる。完了は、開始前と期間中が終了日、終了後が今日である。管理外と一覧に無い `shelved` は、どの期間でも今日である。終了後の着手済みは、進捗 20 と 80 で折れ先が同じである。

枠が赤くなるのは、終了後の未着手と着手済みだけである。完了と中止と管理外と `shelved` は赤くならない。「完了以外」では完了と中止が消え、管理外と `shelved` は残る。終了が 2026-10-25 の行は、今日がその日のときだけ終了列で止まり、その日は赤くならない。

`examples/playground.schedule.json` は手で開く例であり、引数なしの `check:schedule` では検証しない。内容は `src/sample/playgroundSchedule.ts` から `tsx scripts/write-playground-schedule.ts` で書き出す。

階層の手動確認用は [examples/hierarchy/](../examples/hierarchy/) に置く。2段は [levels-2.schedule.json](../examples/hierarchy/levels-2.schedule.json)（帯の上に「まとまり / タスク」、まとまり行に地と帯）。3段は [levels-3.schedule.json](../examples/hierarchy/levels-3.schedule.json)（`categories` のまま、見た目は従来のカテゴリとグループ）。5段は [levels-5.schedule.json](../examples/hierarchy/levels-5.schedule.json)（帯の上に五つの定義名、固定行は近い2行）。各ファイルは `npm run check:schedule -- examples/hierarchy/<file>` で検証する。
