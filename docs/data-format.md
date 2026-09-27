# データ仕様

スケジュール、メンバー、稼働日カレンダーの JSON と、アプリが自分で書くファイルの形を定める。フィールドの正本は各 JSON Schema である。ID の重複や前後関係の循環のように、スキーマでは表せない規則は `src/model/` の検証コードで確かめる。この文書では、これを意味規則と呼ぶ。画面での見え方は [外部仕様](external-spec.md) を参照する。

スキーマファイルは `scripts/` と CI がパスを直接参照している。場所は変えない。

## ファイルの一覧

| ファイル | 誰が書くか | どこに置くか |
| --- | --- | --- |
| スケジュール JSON | LLM のスキル、またはアプリの「保存」「別名保存」 | 利用者が選んだパス。アプリはパスをスケジュールの中に書かない |
| メンバー JSON | 利用者が用意し、設定の「メンバー」から取り込む | 取り込み後はアプリデータ。スケジュール JSON には含めない |
| 稼働日カレンダー JSON | 利用者が用意し、設定の「稼働日」から取り込む | 取り込み後はアプリデータに1件。スケジュール JSON には含めない |
| HTML / SVG | アプリの「書き出し」 | 利用者が選んだパス、またはブラウザのダウンロード |
| アプリデータ | アプリだけ | 下の「アプリデータ」 |

画面の絞り込み、折りたたみ、ズーム、系統、選択、取り消し履歴は、どの JSON にも書かない。

## スケジュール JSON（schemaVersion 3）

正本は [schedule.schema.json](schedule.schema.json)。追加の意味規則は [src/model/scheduleSemantics.ts](../src/model/scheduleSemantics.ts) にある。

ルートは `schemaVersion`、`title`、`milestones`、`categories` だけを持つ。知らないプロパティは拒否する。

```json
{
  "schemaVersion": 3,
  "title": "プロジェクト名",
  "milestones": [{ "id": "<uuid>", "name": "要件確定", "date": "2026-04-01" }],
  "categories": [{
    "name": "カテゴリ",
    "groups": [{
      "name": "グループ",
      "tasks": [{
        "id": "<uuid>",
        "name": "タスク",
        "start": "2026-04-01",
        "end": "2026-04-03",
        "assigneeId": null,
        "status": "not-started",
        "progress": 0,
        "predecessors": [],
        "milestoneId": null
      }]
    }]
  }]
}
```

| フィールド | 内容 |
| --- | --- |
| `schemaVersion` | `3` 固定 |
| `title` | 1文字以上。空白だけは不可 |
| `milestones` | マイルストンの配列。空でもよい |
| `categories` | 1件以上。中の `groups` も1件以上。`tasks` は空でもよい |
| `id` | タスクとマイルストンの UUID。1つのスケジュールの中で重複しない。タスクの ID はマイルストンの ID とも重複しない |
| `name` | 1文字以上。空白だけは不可 |
| `date` / `start` / `end` | `YYYY-MM-DD`。実在する日。`end` はその日を含む。`end` は `start` 以降の日付にする。同じ日なら1日のタスクになる |
| `assigneeId` | メンバー JSON の `id`。割り当てなしは `null`。UUID である必要はない。スケジュール側ではメンバーの実在を検査しない |
| `status` | `not-started`、`in-progress`、`done` のいずれか |
| `progress` | 0 以上 100 以下の整数 |
| `predecessors` | 先行タスクの `id`。重複しない。自分自身は指定できない。存在しない ID は不可。循環も不可。後続は各タスクの `predecessors` から導く |
| `milestoneId` | 対応するマイルストンの `id`。未設定は `null`。存在しない ID は不可 |
| `note` | 任意。1文字以上。空文字や空白だけはプロパティ自体を書かない |

カテゴリ名は1つのスケジュールの中で重複できない。グループ名は同じカテゴリの中で重複できない。別のカテゴリに同じグループ名があってもよい。並び替え用のフィールドはない。配列の順が画面の並びになる。

### 以前の schemaVersion

開けるのは schemaVersion 3 だけである。

- schemaVersion 1 の終了日は、その日を含まない書き方（最終日の翌日）だった。読み込むと終了日を1日戻して schemaVersion 2 にする（[src/model/scheduleMigrate.ts](../src/model/scheduleMigrate.ts)）。そのあと schemaVersion 2 として拒否するので、結果として開けない
- schemaVersion 2 は、担当が名前（`assignee`）の形式なので拒否する。メッセージは、`assigneeId` を使う schemaVersion 3 へ更新するよう求める

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

キーの順は `schemaVersion`、`title`、`milestones`、`categories` である。タスクは `id`、`name`、`start`、`end`、`assigneeId`、`status`、`progress`、`predecessors`、`milestoneId` の順で、ノートがあるときだけ最後に `note` を付ける。空白だけのノートは書かない。

未保存かどうかは、この形にした文字列と、最後に開いた・保存した・読み直したときの文字列を比べて決める。インデントやキー順だけが違うファイルは、同じ内容として扱う。

## 書き出しファイル

「書き出し」は、絞り込み・折りたたみ・系統のあとで見えている行を、単一の HTML または SVG にする。チャートはどちらも SVG で、画面の Canvas を撮ったものではない。生成は [src/model/exportHtml.ts](../src/model/exportHtml.ts) と [src/model/exportView.ts](../src/model/exportView.ts) で行う。

入るものは、見えている行の名前、タスクバー、カテゴリとグループの親バー、前後の線、イナズマ線、非稼働日、マイルストン、使っている絞り込みの一覧である。用紙へのページ割りはしない。ズームの粒度（1日あたりの幅）は画面と同じで、期間は見えている行と書き出すマイルストンから決め直す。

書き出すマイルストンは次のとおりである。

- マイルストンの絞り込みが「なし」のときは載せない
- 特定のマイルストンで絞っているときは、その1件だけ
- それ以外は、見えている行が参照しているものと、見えている行の期間に入るもの

提案するファイル名は、タイトルから使えない文字を除いた本体に `.html` または `.svg` を付ける。タイトルが空、または Windows の予約名だけなら `schedule` を使う。

## アプリデータ

デスクトップ版は、Tauri が用意するアプリデータ用のディレクトリ（app data ディレクトリ）を使う。identifier は `com.collabcentral.schedule-viewer` である。

| OS | 場所 |
| --- | --- |
| Linux | `$XDG_DATA_HOME/com.collabcentral.schedule-viewer`。未設定なら `~/.local/share/com.collabcentral.schedule-viewer` |
| macOS | `~/Library/Application Support/com.collabcentral.schedule-viewer` |
| Windows | `%APPDATA%\com.collabcentral.schedule-viewer` |

中のファイルは次のとおりである。

| パス | 内容 | 上限 |
| --- | --- | --- |
| `settings.json` | `selectedMembersCatalogId` と `calendarLabel`。どちらも無くてよい | — |
| `members/<catalogId>.json` | 取り込んだメンバー JSON の本文 | 2MB |
| `calendar.json` | 取り込んだカレンダー JSON の本文 | 2MB |
| `schedule-recovery.json` | 未保存の控え。`path`、`baselineJson`、`documentJson` | 10MB |

控えの `path` は開いているスケジュールの絶対パスである。`baselineJson` は最後に開いた・保存した・読み直したときの内容、`documentJson` は画面の内容で、この2つはどちらも上の保存形式の文字列である。サンプル（パスが無い）では控えを作らない。ブラウザ版は控えを作らない。

ブラウザ版は localStorage を使う。キーは次のとおりである。

| キー | 内容 |
| --- | --- |
| `schedule-viewer/members/catalogs` | カタログ ID から本文への対応 |
| `schedule-viewer/members/selected` | 使用中のカタログ ID |
| `schedule-viewer/members/sample-seeded` | サンプルのメンバーを入れたかどうかの記録 |
| `schedule-viewer/calendar/body` | カレンダー JSON の本文 |
| `schedule-viewer/calendar/label` | カレンダーの表示名 |
| `schedule-viewer/display-scale` | 表示サイズ。`0.5`、`0.75`、`1`、`1.25`、`1.5`、`2` のいずれか。自動のときはキーを消す |
| `schedule-viewer/color-scheme` | 配色。`light` または `dark`。システム設定に合わせるときはキーを消す |
| `schedule-viewer/sidebar-width` | 左一覧の基準幅。表示倍率 1 のときの px。既定の 190 のときはキーを消す |

表示サイズ、配色、左一覧の幅はデスクトップ版でも localStorage に置く。メンバーとカレンダーは、デスクトップ版ではアプリデータだけに置く。

## 検証のしかた

アプリは読み込み前に `validateSchedule`、`validateMembers`、`validateCalendar` を通す。失敗した内容は開かず、エラーは日本語で、場所はカテゴリ、グループ、タスクの名前で示す。

開発時の確認は次のとおりである。

- `npm run check:schedule` は、引数なしなら `src/sample/schedule.ts` のサンプルを検証する。JSON のパスを渡すとそのファイルを検証する
- `npm run check:calendar` は、引数なしなら [examples/jp-2026.calendar.json](../examples/jp-2026.calendar.json) を検証する
- `npm run check:members` は、引数なしなら [examples/playground.members.json](../examples/playground.members.json) を検証する
- 他のリポジトリへコピーしたスキルでは、同梱の `node .cursor/skills/write-schedule/scripts/validate-schedule.mjs <file>`、`node .cursor/skills/write-calendar/scripts/validate-calendar.mjs <file>`、`node .cursor/skills/write-members/scripts/validate-members.mjs <file>` を使う

`examples/playground.schedule.json` は手で開く例であり、引数なしの `check:schedule` では検証しない。
