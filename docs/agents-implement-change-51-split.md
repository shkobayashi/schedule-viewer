# implement-change 旧 51 → 51–54 分割（全文保持）

連結すると D0 直前の旧 51 と同一（2581 文字）。

## 新 51（原則 6）

51. 説明半透明（`explain_overlay`）の吹き出し配置とスクロールは `explainOverlayLayout.ts` で決める。マイルストン帯の絞り込みは `explainView.ts` の `resolveExplanationMilestoneBand` で決め、`useSchedule` の `visibleMilestoneGroupIds` と `milestonesForBandLayout` に載せる。星の印と帯の行の印の穴は `milestoneDiamondRectInBand` と `milestoneBandBlockRectInBand` の戻り値だけを使う。試しの計画の星の日付変更は `buildExplanationTrialMilestoneLayouts` とマイルストン帯の試し Layer で描き、`patterns` の `milestoneChanges` を `applyExplanationPatternToDocument` で `applyMilestoneEdit` と同じ更新に含める。マイルストン帯の試し Layer は半透明ベールのうしろ（上）に載せ、ひし形の `RegularPolygon` は `MilestoneMark` と同じ向きにする。星と帯の行の吹き出しはマイルストン帯の DOM ホストに出す。日付ヘッダーの吹き出しは日付ヘッダーの矩形の外へ出さない。

## 新 52（原則 1+6）

52. 読み取りの印と `milestoneChanges` の文を変えるときは、`MCP_VIEW_IN_READ_TOOLS`、`read-screen/SKILL.md`、`mcp_stdio.rs` の照合句を同じ連続した文字列で揃える。タスク棒、日付列、マイルストン菱形の抜きと、TaskBar・期間ハンドル・リンク用アンカーは、描画側が呼ぶ `taskBarLayout.ts` の関数の戻り値だけを使い、同じ式を説明用に別途書かない。試しの計画（`patterns`）の棒と印の穴も同じ戻り値だけを使い、状態は `explainOverlayPatterns.ts` で文書の外に置く。

## 新 53（原則 4+8）

53. 選んだパターンを計画へ入れるのは `apply_explanation_pattern` で、`applyExplanationPatternToDocument` が `afterTaskId` の直後へ試しタスクを挿し、`changes` を適用する。成功は `replaceScheduleDocument` 経由で未保存・取り消し1段・説明の消去になる。`consultation-flow.md` では、入れる手順を先に消す順に書かない。試しの計画が画面に残っているあいだに `apply_explanation_pattern` を呼ぶ。先に消すと拒否される。MCP と read-screen には判断の例を写さない。

## 新 54（原則 5+6+1）

54. 試しの新しいタスクは `buildDisplayVisibleRowsWithExplanationTrials` で文書の `visibleRows` にだけ画面用の行を挿し、保存・差分・並べ替えの挿入位置・範囲選択の id 列・書き出しは文書行のままにする。画面用の行を渡すのは、左の一覧の描画、チャート、最大スクロール、固定見出し、印、吹き出し、依存の線、MCP 読み取りの `view.visible.rows`、タスクを画面へ寄せるスクロールである。左一覧の並べ替えは `reorderBaseRows`（文書）のまま比べ、ポインタの Y だけ `reorderPointerContentYForDocumentRows` で試し行分を引く。チャートと左一覧と MCP 読み取りの `view.visible.rows` は挿入後の行を使い、PNG 取得の直前だけ文書行に戻してから撮り、直後に画面行へ戻す（`prepare` から `finalize` まで同じ `try` / `finally`）。試しの左行は操作不可とし、重ねラベルは使わない。試しの計画の日付変更棒、新しい試しタスクの棒と印の穴では、`taskBarRectInBody` と `taskBarAnchorInBody` に本物の `liveAnchors` を渡さない。PNG 用 Konva では試しの棒 Layer も隠す。読み取りの `view.visible.rows` では試し行だけ `trial: true` を載せる。印の任意 `color` は `explanationMarkColor.ts` で検証と正規化し、前後の空白は trim せず拒否する。色付き印の穴矩形は、描画が `taskBarRectInBody` 等へ渡すのと同じ引数で戻り値と一致することをテストする。穴の位置は変えず Konva と DOM の枠の色と下敷きだけを変える。色付きの未割当行は、左の未割当線と下敷きの `box-shadow` を両方残す。左の一覧の示す行は DOM の枠線と `z-index` のみで y を計算しない。`useTimelineView` の `dateToX` は内容の x から `scrollX` を引いたチャート表示座標である。スクロール量を求めるときは日付や棒の左端を内容座標に直してから `scrollX` を計算する。印の棒位置と MCP の `visible` は `Timeline` が持つ `liveAnchors`（ドラッグ中のプレビューを含む）を ref で `App` と MCP 読み取りへ渡す。計画が表示文言を解析しないと書いたときは、札と名前と場所をブロックのフィールドにし、コピー用の全文は今の文字列のままにする。schedule-talk の reference（`consultation-flow.md` など）を足すときは、`docs/development.md` の MSIX 必須一覧と `packaging/msix/build-msix.ps1` の `$requiredSkillFiles` を同じ変更で揃える

## 旧 52–54 → 新 55–57

| 旧番号 | 新番号 |
| --- | --- |
| 52 | 55 |
| 53 | 56 |
| 54 | 57 |
