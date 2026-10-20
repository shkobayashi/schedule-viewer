---
name: cut-release
description: >-
  Changes schedule-viewer release workflow, version bump scripts, and release
  documentation. Use for stable and beta GitHub Releases, release/X.Y.Z
  branches, version:check / version:bump behavior, updater endpoint URLs, and
  updater-X channel releases. Not for app UI or settings dialog fields.
---

# cut-release（schedule-viewer のリリースと CI）

安定版とベータ版の GitHub Release、版番号の付け外し、Release ワークフローの検査、メジャーごとの自動更新配信（`updater-X`）を変える。設定ダイアログの画面と設定項目はこのスキルの対象外である。

## 着手前

1. [AGENTS.md](../../../AGENTS.md) の表で [docs/development.md](../../../docs/development.md) を読み、触る箇所を絞る
2. 版番号の純粋関数は [src/model/releaseVersion.ts](../../../src/model/releaseVersion.ts) が正本である。スクリプトはここを import する
3. 挙動の正本は [.github/workflows/release.yml](../../../.github/workflows/release.yml) と上の TypeScript である

## 版番号

1. 許容する版は `X.Y.Z` と `X.Y.Z-beta.N` だけである。`X` `Y` `Z` と `N` は、1 桁なら `0` を許す。2 桁以上で先頭の `0` は付けない。`N` は 1 以上である
2. [scripts/bump-version.ts](../../../scripts/bump-version.ts) と [scripts/check-version-sync.ts](../../../scripts/check-version-sync.ts) を、純粋関数と揃える
3. `major`、`minor`、`patch` は安定版のときだけ上げる。`beta` と `stable` を足す
4. 書き換える 5 ファイルは `package.json`、`package-lock.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`、`src-tauri/Cargo.lock` の schedule-viewer 版である。`tauri.conf.json` の `plugins.updater.endpoints` は 1 件だけとし、[src/model/releaseVersion.ts](../../../src/model/releaseVersion.ts) の `updaterEndpointForVersion` でメジャーに合わせて書く

## ワークフロー

1. [.github/workflows/release.yml](../../../.github/workflows/release.yml) のきっかけは `main` と `release/**` である
2. 環境 `release` の承認より前に検査ジョブを置く。失敗した push は Release を作らない
3. [scripts/check-release-push.ts](../../../scripts/check-release-push.ts) が版、ブランチ、タグを読み、純粋関数で判定する。検査ジョブの checkout はタグを取得する。取得しないと、別コミットのタグを「タグが無い」と見て承認まで進む。版の形を確かめてから、タグ名はシェルを通さず git の引数に渡す
4. 安定版は CHANGELOG から本文を組み立てる。ベータは [scripts/release-body-beta.md](../../../scripts/release-body-beta.md) だけを使う
5. Pre-release でも `latest.json` と `SHA256SUMS` はその Release に添付する。GitHub の Latest は、より大きいメジャーの安定版が無いときだけ付ける。同じメジャー用の自動更新配信は Pre-release の `updater-X` に `latest.json` だけを載せる。安定版の `checksums` が [scripts/publish-updater-channel.ts](../../../scripts/publish-updater-channel.ts) で更新する
6. `gh release create` で `vX.Y.Z` と `updater-X` を新規作るときは `--target` にワークフローの `GITHUB_SHA` を渡す。無いときは失敗させる。再実行の `release edit` ではタグは動かさない
7. Latest は資産を載せ、`updater-X` を更新したあと、[scripts/finalize-stable-github-release-latest.ts](../../../scripts/finalize-stable-github-release-latest.ts) で付ける。ビルド前の [scripts/prepare-stable-github-release.ts](../../../scripts/prepare-stable-github-release.ts) では、より大きいメジャーがあるときだけ Latest を外す
8. 既存の `updater-X` で `latest.json` の `version` が読めないときは、[scripts/publish-updater-channel.ts](../../../scripts/publish-updater-channel.ts) を失敗させ、上書きしない。安定版一覧は `gh api --paginate` で集める
9. Microsoft Store 用 MSIX は [.github/workflows/msix-store.yml](../../../.github/workflows/msix-store.yml) の `workflow_dispatch` だけである。`release.yml` に MSIX ジョブを足さない。公開後の `msstore publish` は別の手順である。このワークフロー全体の `permissions` は `contents: read` にする。実行ファイルだけ出すビルドは `tauri build --no-bundle` を使う。`--bundles none` は受け付けない。Store 用 MSIX は WebView2 を同梱せず、マニフェストの `PackageDependency` にも書かない

## 文書

[AGENTS.md](../../../AGENTS.md) の「変更したら文書も更新する」に従う。リリース手順は [docs/development.md](../../../docs/development.md)。配布の方針は [docs/PLANNING.md](../../../docs/PLANNING.md)。入手先は [README.md](../../../README.md) と [docs/user-manual.md](../../../docs/user-manual.md)。動作環境は [docs/external-spec.md](../../../docs/external-spec.md)。CI の説明は [docs/test-spec.md](../../../docs/test-spec.md)。Release 本文の組み立ては [docs/internal-spec.md](../../../docs/internal-spec.md)

自動更新の版比較は semver である。Ubuntu の deb の版比較は Debian の規則である。文書では、この 2 つを 1 つの「進む」にまとめない。デスクトップ版は入っている版のメジャー用 `updater-X` の `latest.json` を見る。同じメジャーのより新しい安定版だけ入れる。ベータを入れたあとも同じメジャーの `updater-X` を見る。判定上、接尾辞を外した安定版はベータより新しいが、Ubuntu では `dpkg` がダウングレードとして拒否する。手で `apt install` するときも、先にベータの deb を外す

## 確認

1. [src/model/releaseVersion.test.ts](../../../src/model/releaseVersion.test.ts) に判定と bump を足す
2. `npm run build`、`npm run lint`、`npm test` を通す
3. GitHub 上の Pre-release と Windows の上書きは、最初のベータを出したときに手で見る

## 完了条件

- 計画した安定版とベータの分岐がワークフローと版番号スクリプトに入っている
- 対応する文書が同じ変更に含まれている
- `npm run build`、`npm run lint`、`npm test` が通っている
