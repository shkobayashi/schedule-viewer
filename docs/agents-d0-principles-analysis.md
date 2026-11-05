# D0 原則分析（Issue #490）

AGENTS.md・implement-change・段 8 レビューに散らばっていた**具体メモ**を、失敗モードと根本原因ごとに束ね、**蒸留した原則**と**ガード**に対応づけたものである。AGENTS.md は原則を骨格にし、具体は本表と [agents-d0-inventory.md](agents-d0-inventory.md)・[implement-change](../.cursor/skills/implement-change/SKILL.md) を参照する。

## 原則一覧（蒸留）

| ID | 原則（一文） | 守る失敗モード |
| --- | --- | --- |
| **P1** | 利用者に見える真実は **external-spec とコード** にあり、変更は **同じ PR で結合された文書** まで届ける | 仕様・マニュアル・テスト表の drift |
| **P2** | **依存は下向きだけ**（UI → hooks → model；入口定義は operations）。**循環 import は 0** | 改修不能・テストの巻き込み・madge 再発 |
| **P3** | **操作入口**（☰・ショートカット・MCP・右クリック等）は表とコードが **同じ集合** | 入口の欠落・ラベル不一致 |
| **P4** | **計画どおりのスコープ**で、リファクタは挙動不変・不具合/audit/性能は別 Issue | 段 8 に機能混入・サイレント挙動変更 |
| **P5** | エージェント向け知識は **短い索引 + 正本へのリンク**。**削るときは移動先と対応表** | AGENTS/skills の黙って削除 |
| **P6** | 一度ハマった失敗は **CI・テスト・SKILL チェック** のいずれかで止める | 同種バグの再発（ポインタ・起動・MCP 文言等） |

---

## 分析表：メモの束 → 根本原因 → 原則 → ガード

| メモの束（代表） | 根本原因（なぜそのメモがあるか） | 原則 | ガード |
| --- | --- | --- | --- |
| AGENTS「先に読む文書」、スキーマ正本、ソース優先で文書を直す | エージェントがコードを広く読むとコストと誤推論が増える。正本が分散している | **P1** | AGENTS 表；implement-change 着手前 1–2 |
| 「変更したら文書も更新する」表（external-spec、manual、test-spec、development…） | 1 機能が複数チャネル（仕様・手順・テスト・CI 表）にまたがる | **P1** | 人手 + review-implementation 文書節；**Proposed D2** P-AG-02（test-spec 行の差し替えチェック） |
| import 境界 ESLint、model/hooks/components 表 | 層を破ると循環と UI ロジックの混在 | **P2** | `npm run lint` **Exists** |
| madge ベースライン、型の切り出し（M1–hooks） | 相互 import がリファクタを止める | **P2** | `check:madge-circular-baseline` CI **Exists**；P-CI-07 |
| operations に入口・hooks に実行 | 操作 ID と UI イベントの二重定義を避けつつ実行は状態側 | **P2** + **P3** | internal-spec 正本；implement-change 着手前 3 |
| operation-entries + feature-checklist 更新義務 | 入口はコードと手書き表の **二重正本** | **P3** | 人手；**Proposed D2** P-CI-06 `check-operation-entries` |
| #491 を段 8 に混ぜない、挙動不変リファクタ | レビューと bisect が不可能になる | **P4** | AGENTS 原則 4；Issue スコープ |
| 計画名指しスキル、implement-change 節、review → SKILL へ足す | 手順が口伝りになる | **P4** + **P5** | implement-change 全文 **Exists**；review-implementation |
| D0–D2、inventory、黙って削除禁止 | 短縮 PR で観点が消えた過去 | **P5** | [agents-d0-inventory.md](agents-d0-inventory.md) §1 **Exists**；D1 対応表 |
| write-* にアプリ手順を書かない | スキルが他リポジトリへコピーされる | **P5** | AGENTS スキル表 |
| personal.local、AGENTS に Learned を足さない | 個人設定が共有正本を汚す | **P5** | AGENTS「個人の学習」 |
| `tauri dev` / 1420 / --mcp 別プロセス | 開発起動経路を誤ると白画面・MCP 混同 | **P5**（環境） | [development.md](development.md)；AGENTS チェック例 |
| マージ済みブランチへ push | 履歴と CI が二重化 | **P5**（運用） | **Proposed D1** P-AG-03 |
| Konva 右クリック、pointer capture、並べ替え閾値、macOS カーソル点滅（IC 10–20, 34–37） | **ブラウザと Konva のイベント順・capture の差** | **P6** | Vitest 一部 **Exists**；test-spec 手動；**Proposed D2** review 代表項目 |
| 起動復旧 effect 依存、fileBusy vs blockDocumentEditsRef（IC 15, 19–20, 49–50） | **起動中だけ編集禁止**と **メニュー disabled** の状態が別 ref | **P6** | 関連 hooks テスト **Exists**（部分） |
| MCP / read-screen / Rust 文言一致（IC 28–29, 52 一部） | **3 箇所に同じ文字列**が無いと LLM 連携がずれる | **P6** | `check:mcp-tool-names`、Rust 定数テスト **Exists** |
| 試し行・explain 幾何（IC 52） | 画面行と文書行の **二重モデル** | **P6** | explainOverlay*.test.ts **Exists** |
| Windows パイプ / cfg / WebView スレッド（IC 16, 19, 25, 29） | **OS ごとにコンパイルされないコード**と **スレッド制約** | **P6** | `cargo clippy -D warnings`、`cargo test` **Exists** |
| マニュアル 19 図（IC 32） | 見た目変更が **GitHub Pages** に残る | **P6** | implement-change 完了条件 + 撮影スクリプト **Exists** |
| test-spec 行削除（M2 レビュー）、無関係ファイル上書き（M2） | **同 PR の diff 注意力**不足 | **P6** + **P1** | **Proposed D2** P-AG-02, P-AG-04 |
| export が import ブロックを分割（M3b） | **可読性規約**とツールの import 整理 | **P6** | **Proposed D2** ESLint または review チェック |
| jscpd 克隆（カタログ UI） | **コピペ UI** が変更コストを増やす | **P2**（構造）+ **P4** | `check:architecture-warn` **Exists**（警告） |

---

## implement-change 番号 → 原則（索引）

| 原則 | implement-change の主な節 |
| --- | --- |
| P1 | 着手前 1–2；画面 2–4, 26–27, 32；文書；テスト 1, 5–13 |
| P2 | 着手前 3；状態・モデル 1–2, 6–9 |
| P3 | 画面 3, 7–9, 26；着手前 6 |
| P4 | 着手前 4–7；段 8 スコープ（AGENTS） |
| P5 | AGENTS 全体；スキル保守；consult ルール |
| P6 | 画面 10–25, 34–54；状態 4–30；テスト 2–13 |

全文は SKILL を削らない。**D1** で SKILL 先頭に本表へのリンクを足す。

---

## old → new（原則ベース AGENTS への対応）

D0 直前の AGENTS 節は [agents-d0-inventory.md](agents-d0-inventory.md) §1 のとおり。**削除 0**。

| 旧 AGENTS の塊 | 新 AGENTS の置き場 |
| --- | --- |
| 導入段落 | 冒頭 + **P1** のリード |
| 先に読む文書 | 独立節（索引）+ 表に inventory / model-circular-import-plan 行 |
| フィールド正本・ソース優先 | **P1** 下のチェック例 |
| デスクトップ起動段落 | **P5** 下「開発環境の例」+ development リンク |
| 内部コードの境界箇条書き | **P2**・**P3**・**P4** に分解 + internal-spec / model-circular-import-plan |
| D0–D2 / 削除禁止 | **P5** + 節「段 8 文書仕上げ」 |
| 変更したら更新表 | **P1** の実装（表はそのまま） |
| Issue / 個人の学習 | そのまま（**P5** と関連） |
| スキル長段落 | **P5** + スキル索引表 |
| consult / review 段落 | **P4**・**P5**・**P6** に分散 + ルールリンク |

---

## D1 / D2（変更なし）

[agents-d0-inventory.md](agents-d0-inventory.md) §4 を参照。本分析の **Proposed D2** は review-implementation と implement-change へのチェックリスト化を指す。
