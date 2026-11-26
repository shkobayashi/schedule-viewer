---
name: schedule-talk
description: >-
  Starts schedule-viewer work when the user asks to consult or change a schedule,
  asks a question about the open plan, gives a broad instruction, or points at
  rows by appearance. Chooses MCP, read-screen, or write-schedule. Read
  references/point-by-appearance.md when the user points by color or look;
  references/screen-judgment.md for window choice, screen updates, connections,
  and picking status, colorId, or assignee from descriptions. Not for bare JSON
  file creation with the app closed unless that is the whole request (use
  write-schedule directly). Distinct from write-members and write-calendar.
---

# schedule-talk

schedule-viewer のスケジュールを、人と同じ画面を見ながら相談したり変えたりするときの入口です。判断の手順はこのスキルの reference に置きます。

## 手段の選び方

- デスクトップ版が起動していて MCP が使えるなら MCP を使います
- MCP が使えないなら read-screen スキルの `--screen` コマンドを使います
- アプリが起動していなければ write-schedule でファイルを作ります

MCP と read-screen は、このスキルから使います。名前を指定して read-screen や write-schedule だけを先に開く書き方にはしません。ファイルを作る依頼だけのときは、write-schedule が先に開くことがあります。

## reference

| ファイル | 読むとき |
| --- | --- |
| [references/point-by-appearance.md](references/point-by-appearance.md) | 人が色や見た目で行・札・マイルストンを指すとき |
| [references/screen-judgment.md](references/screen-judgment.md) | どのウィンドウを読むか、画面の未保存更新、繋がり、ステータス・色・担当を説明から選ぶとき |
| [references/consultation-flow.md](references/consultation-flow.md) | 相談の流れ、説明部品の使い分け、計画を変えたあとの説明、途中でやめるとき、決めたあとに試しの計画を入れるとき |
