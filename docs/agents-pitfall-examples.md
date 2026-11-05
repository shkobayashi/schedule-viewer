# エージェント向け事故例（サンプル索引）

[AGENTS.md](../AGENTS.md) の **8 原則** ごとに、過去に起きた型を **例** として束ねる。全文は [.cursor/skills/implement-change/SKILL.md](../.cursor/skills/implement-change/SKILL.md)（番号付き。**削らない**）。旧 51 の分割は [agents-implement-change-51-split.md](agents-implement-change-51-split.md)。

落とし穴 ID とガード（Exists / Proposed D1/D2）: [agents-d0-inventory.md](agents-d0-inventory.md) §3。

## implement-change 番号 → 原則（索引）

| 原則 | 画面と操作 | 状態・モデル・Tauri | 文書 | テスト | 着手前 |
| --- | --- | --- | --- | --- | --- |
| 1 | 2–4, 26, 32, **52**（旧 51 内） | 2–3, 28 | 全体 | 13 | — |
| 2 | 5, 47–49 | 8–9, 14–15, 26–30 | — | 5–12 | 1–2, 4–7 |
| 3 | — | 1–2, 6 | — | 1 | 3 |
| 4 | 3, 7–9, 26–27, 31, **53**, **56** | — | 段落の主語 | — | 6 |
| 5 | 10–11, 14–16, 19–22, 24, 30, 34–36, 42, 46, 50, **54**, **55** | 4, 11–13, 18–24 | — | 2 | — |
| 6 | 12–13, 17–18, 23, 25, 28–29, 33, 37–41, 43–45, 48, 54, **51**, **52** | 7, 10, 13 | — | 4 | — |
| 7 | 5, 32 | 3 | — | 1–13 | — |
| 8 | **53**（consultation-flow） | 17, 28–29 | — | 13 | 5, 7 |

**51–57:** 旧 51 を **51–54** に分割。旧 **52–54** は **55–57**（対応表は 51-split 文書）。

---

## 原則 1 — 同じ事実の写し

**サンプル:** 入口表と `operation-entries`、19 図と `capture:manual-screenshots`、`JSON_SKILL_NAMES` と MSIX 同梱、MCP ツール名と Rust、read-screen 照合句（画面 **52**）、版番号 5 ファイル（cut-release）。

**implement-change:** 画面 2–4, 26, 32；状態 28；文書；テスト 13；完了条件。

---

## 原則 2 — 文書と計画の名指し

**サンプル:** 計画の手動条件を代表 1 件で済ませない、フィクスチャが誤計算でも通る、write-* で ID を推測しない。

**implement-change:** 着手前 1–2, 4–7；テスト 5–12；consult / write-* スキル。

---

## 原則 3 — 依存と循環

**サンプル:** model に UI ロジック、循環解消で葉モジュールへ型を出す（`documentSnapshot.ts` 等）、Konva Layer の増やし方（状態 6）。

**implement-change:** 着手前 3；状態 1–2, 6。**ガード:** lint、madge baseline（P-CI-03）。

---

## 原則 4 — 操作の入口

**サンプル:** 文末の動詞が新入口に掛かる、macOS メニューから二重ダイアログ（27）、全入口で入力確定（56 / 旧 53）。

**implement-change:** 画面 3, 7–9, 31；文書の主語。**Proposed:** P-CI-06。

---

## 原則 5 — 「今の操作」の持ち主

**サンプル:** Konva `click` と右ボタン（10）、pointer capture（11, 15–16）、`pointerup` 確定（20）、IME（24）、起動復旧と `fileBusy`（19）、世代番号（状態 4）、試し行と文書行（**54**）。

**implement-change:** 画面 10–22, 24, 30, 34–36, 42, 46, 50, 54–55；状態 4, 11–24 等。

---

## 原則 6 — 幾何とトークン

**サンプル:** `--s` / palette / fontStack（12–13）、`menuShiftForRect`（17）、layout 戻り値の二重記述禁止（**51–52**）、`dateToX` と `scrollX`（**54**）、強調行を描画前に（38）。

**implement-change:** 画面 12–13, 17–18, 23, 25, 28–29, 33, 37–41, 43–45, 48, 51–54, 57；状態 7, 10, 13。

---

## 原則 7 — テストと手動

**サンプル:** jsdom の `offsetParent`、Konva/Tauri は手動、計画語とテスト名の対応表、誤計算でも通る入力の禁止（テスト 9）。

**implement-change:** テスト 1–13；review-implementation「テスト網羅性」。**Proposed:** P-AG-02。

---

## 原則 8 — スキルと再発防止

**サンプル:** レビューその場で直さず SKILL へ、write-* にアプリ手順を書かない、短縮は inventory 対応、**53** の consultation-flow 順、MSIX reference 同梱（**54** 末尾）。

**implement-change:** 完了条件；review-implementation。**ガード:** P-AG-01（プロセス）。

---

## 新しい例の足し方

1. 該当する原則を 1 つ選ぶ（複数にまたがる場合は本索引表に番号を足す）。
2. 再発防止の**手順**は implement-change「8 原則と条項」のとおり、**最も近い既存条項の直後**へ追記する（末尾だけ「58.」にしない）。短いサンプルは本ファイルへ。
3. [agents-d0-inventory.md](agents-d0-inventory.md) の pitfall 表に ID が要るときだけ §3 へ追記。
