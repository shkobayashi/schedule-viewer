# 開発ガイド

開発者向けの手順である。画面の挙動は [外部仕様](external-spec.md) に、JSON の形は [データ仕様](data-format.md) と `docs/*.schema.json` に定める。

## 必要なバージョン

開発中の起動と配布用ビルドは、同じ Node.js と Rust を使う。

- **Node.js**: 24（`.nvmrc`。`package.json` の `engines` は `>=24 <25`）
- **Rust**: 1.98.1（`rust-toolchain.toml`）
- Tauri identifier: `com.collabcentral.schedule-viewer`

`npm run dev` は Node.js だけで動く。`npm run tauri dev` と `npm run tauri build` には、Rust と、下の各 OS の追加パッケージも必要である。

Node.js はバージョンマネージャで入れる。Linux と macOS は [nvm](https://github.com/nvm-sh/nvm)（v0.40.7）を使う。Windows は別プログラムの [nvm-windows](https://github.com/coreybutler/nvm-windows) を使う。コマンド名はどちらも `nvm` である。`.nvmrc` の中身は `24` である。Linux と macOS の nvm は、リポジトリ直下の `nvm install` がこのファイルを読む。nvm-windows は `.nvmrc` を読まないので、バージョン `24` を引数で指定する。

Rust は [rustup](https://rustup.rs/) で入れる。このリポジトリに入ると `rust-toolchain.toml` の 1.98.1 がダウンロードされる。

## 開発環境

### Ubuntu

Ubuntu 22.04 以降。WSL2 の Ubuntu もこの手順で入れる。

先に Tauri がリンクするシステムパッケージを入れる。この中の `curl` は、続く nvm と rustup の取得にも使う。

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  xdg-utils
```

nvm を入れる。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
```

新しいターミナルを開く。リポジトリ直下で Node.js 24 を入れ、バージョンを確認する。

```bash
cd /path/to/schedule-viewer
nvm install
node -v
```

`node -v` が `v24` で始まればよい。

rustup を入れる。選択肢が出たら `1`（default）を選ぶ。

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

インストール直後の同じターミナルで続けるときは、次で cargo を PATH に載せる。新しいターミナルを開けば、rustup が追記したシェル設定で有効になる。

```bash
. "$HOME/.cargo/env"
```

リポジトリ直下で確認する。初回は 1.98.1 の取得に時間がかかる。

```bash
rustc --version
```

`rustc 1.98.1` と出ればよい。

### macOS

macOS Catalina (10.15) 以降。Command Line Tools を入れる。デスクトップアプリのビルドに Xcode 本体は不要である。

```bash
xcode-select --install
```

nvm を入れる。macOS には `curl` が入っている。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
```

新しいターミナルを開く。リポジトリ直下で Node.js 24 を入れ、バージョンを確認する。

```bash
cd /path/to/schedule-viewer
nvm install
node -v
```

`node -v` が `v24` で始まればよい。

rustup を入れる。選択肢が出たら `1`（default）を選ぶ。

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

インストール直後の同じターミナルで続けるときは、次で cargo を PATH に載せる。新しいターミナルを開けば、rustup が追記したシェル設定で有効になる。

```bash
. "$HOME/.cargo/env"
```

リポジトリ直下で確認する。初回は 1.98.1 の取得に時間がかかる。

```bash
rustc --version
```

`rustc 1.98.1` と出ればよい。

### Windows

Windows 10（バージョン 1803 以降）または Windows 11。

1. [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) を入れ、インストール時に「Desktop development with C++」を選ぶ。Tauri は Rust のクレートを MSVC でリンクする。
2. WebView2 は Windows 10（1803 以降）と Windows 11 に入っている。入っていない場合は Evergreen Bootstrapper を入れる。
3. 別経路で入れた Node.js がある場合は、先にアンインストールする。PATH が nvm-windows と衝突する。
4. [nvm-windows の最新リリース](https://github.com/coreybutler/nvm-windows/releases) から `nvm-setup.exe` を実行する。管理者の PowerShell を新しく開き、Node.js 24 を入れる。`node -v` が `v24` で始まればよい。

```powershell
nvm install 24
nvm use 24
node -v
```

5. [rustup](https://rustup.rs/) の `rustup-init.exe` を実行する。default host は、通常の PC では `x86_64-pc-windows-msvc`、ARM の Windows では `aarch64-pc-windows-msvc` にする。新しい PowerShell を開き、リポジトリ直下で確認する。初回は 1.98.1 の取得に時間がかかる。`rustc 1.98.1` と出ればよい。

```powershell
rustc --version
```

## リポジトリでの起動

[開発環境](#開発環境) の手順が終わってから、リポジトリ直下で依存を入れる。

```bash
npm install
```

`npm run tauri dev` で `Cannot find native binding` / `@tauri-apps/cli-darwin-arm64` と出る場合は、Linux の DevContainer など別 OS で作った `node_modules` を macOS で使っていることが多い。リポジトリ直下で `node_modules` を消してから、**macOS 上で** 入れ直す。

```bash
rm -rf node_modules
npm install
```

それでも直らないときは、次を試す。

```bash
npm install @tauri-apps/cli-darwin-arm64@2.11.5
```

（Apple Silicon 以外の Mac では `cli-darwin-x64` に読み替える。）

フロントのみ（ブラウザで Konva 確認）。ポートは 5173 である。

```bash
npm run dev
```

デスクトップアプリ（ウィンドウ起動はホスト OS 上で行う）。こちらはポート 1420 を使うので、上のブラウザ版と同時に起動できる。

```bash
npm run tauri dev
```

## DevContainer

DevContainer で開発する場合は、コンテナ内の Node.js 24 と Rust 1.98.1 を使う。VS Code / Cursor で「Reopen in Container」を選ぶ。コンテナ内でも `npm run tauri build` で Linux 向けパッケージは作れる。ウィンドウを開いての動作確認は、ディスプレイがあるホスト OS 側で行う。

## npm スクリプト

| スクリプト | 内容 |
| --- | --- |
| `npm run dev` | 検証器を生成してから Vite でフロントを起動する（ポート 5173）。`tauri dev` から呼ばれたときはポート 1420 |
| `npm run build` | 検証器の生成、`tsc`、Vite の本番ビルド |
| `npm run preview` | 本番ビルドのプレビュー |
| `npm run tauri` | Tauri CLI を呼ぶ。後ろに `dev` や `build` を付けて使う |
| `npm test` | 検証器を生成してから Vitest を1回実行する |
| `npm run lint` | ESLint |
| `npm run check:schedule` | 引数なしなら `src/sample/schedule.ts` のサンプルを検証する。JSON のパスを渡すとそのファイルを検証する。`examples/playground.schedule.json` は引数なしでは見ない |
| `npm run check:calendar` | 引数なしなら `examples/jp-2026.calendar.json` を検証する |
| `npm run check:members` | 引数なしなら `examples/playground.members.json` を検証する |
| `npm run build:validate-skill` | `write-schedule`、`write-calendar`、`write-members` に同梱する検証スクリプトと、スキーマのコピーを作り直す |
| `npm run version:check` | バージョン番号が5ファイルで揃っていることを確認する |
| `npm run version:bump` | バージョンを上げる。`minor` または `patch` を引数にする |
| `postinstall` | `@tauri-apps/cli` のその OS 向けバイナリがあることを確認する |

## ブランチと CI

ブランチ運用は `develop`（開発）と `main`（リリース）の二本立てである。`feature-*` などは `develop` から切り、マージ先も `develop` である。

| トリガー | ワークフロー | 内容 |
| --- | --- | --- |
| `develop` 向けの pull request | CI（`.github/workflows/ci.yml`） | 変更パスに応じてフロントと Rust を分ける |
| `main` への push | Release（`.github/workflows/release.yml`） | Ubuntu (deb) と Windows (NSIS) をビルドし GitHub Release へ公開 |

`develop` への push だけでは CI は動かない。CI が動くのは `develop` 向けの pull request のときだけである。

CI は変更されたパスでジョブを分ける。ビルドの入力を足したら、ここと `.github/workflows/ci.yml` の対象パスにも足す。Rust の版の正本は `rust-toolchain.toml` で、ワークフローには版番号を書かない。`dtolnay/rust-toolchain` は `toolchain` の入力が必須で、このファイルを自分では読まない。CI と Release は `channel` と `components` を読んでその入力へ渡す。読み取りステップは `shell: bash` にする。Release の Windows ランナーの既定シェルは PowerShell で、bash のまま書くと構文エラーになる。Release は配布物のビルドと公開だけで、検査は繰り返さない。`main` へ載せる前の `version:check` は手元で行う。

- `src-tauri/` または `rust-toolchain.toml` が変わると Rust ジョブ（Clippy と `cargo test --locked`）が動く
- `index.html`、`src/`、`scripts/`、スキーマ、`examples/`、パッケージ定義、フロントの設定、`.cursor/skills/write-schedule/`、`.cursor/skills/write-calendar/`、`.cursor/skills/write-members/` が変わるとフロントジョブが動く。中身は `version:check`、`build`、`lint`、`test`、`check:schedule`、`check:calendar`、`check:members`、`build:validate-skill`、スキル同梱物と `src/model/generated/` の差分検査である
- ワークフロー定義が変わると、両方のジョブが動く
- `docs/*.md` や `README.md` だけの変更では、どちらのジョブも動かない

## リリースとバージョン

### ダウンロード

メンバー向けの配布物は [GitHub Releases](https://github.com/shkobayashi/schedule-viewer/releases) から取得する。

- **Ubuntu 22.04 以降 (amd64)**: `schedule-viewer_X.Y.Z_amd64.deb` をダウンロードし、`sudo apt install ./schedule-viewer_X.Y.Z_amd64.deb`
- **Windows (x64)**: `schedule-viewer_X.Y.Z_x64-setup.exe` を実行

macOS 用の自動ビルドはまだない。必要なときは下の「配布用ビルド」でローカルビルドする。

### `main` に載せる前のバージョン上げ

`develop` を `main` にマージする直前に、リポジトリ直下でバージョンを1回だけ上げる。

- 前回リリース以降に feature が入っている: `npm run version:bump -- minor`
- fix だけのとき: `npm run version:bump -- patch`

`npm run version:check` で `package.json` / `package-lock.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml` / `src-tauri/Cargo.lock` の番号が揃っていることを確認してから、そのコミットを `develop` に入れて `main` にマージする。`main` へ push されると `vX.Y.Z` タグ付きの Release が作られる。同じバージョンのタグが既にある場合は、先にバージョンを上げてから再度マージする。

変更の要約は、そのバージョン上げのコミットで [CHANGELOG.md](../CHANGELOG.md) に書く。

## アプリアイコン

ランチャー用の原画は `src-tauri/icons/icon.svg`（1024px）である。Mac、Windows、Ubuntu は同じ絵を使う。地は画面のインディゴ（`#4C5FD5`）の角丸で、キャンバスの端までは塗らない。白い横棒はガントの一行、その上を横切る短いコーラル（`#E2542A`）は今日の線である。文字と目盛りは入れない。光は左上からだけにして、面に薄いハイライトを乗せる。

絵を変えたときは、リポジトリ直下で次を実行する。

```bash
npm run tauri icon src-tauri/icons/icon.svg
rm -rf src-tauri/icons/android src-tauri/icons/ios
```

このコマンドが、`src-tauri/tauri.conf.json` の `bundle.icon` にある PNG と `icon.icns`、`icon.ico`、Windows 用の Square ロゴを原画から作り直す。`android` と `ios` も同時にできる。配布はデスクトップだけなので、その二つのディレクトリは削除する。macOS 26 の Icon Composer 用レイヤーは、三つの OS でこの一枚が使えることを確認してから別に足す。

## 配布用ビルド

パッケージは、動かしたい OS の上で作る。Mac 用は Mac、Windows 用は Windows、Ubuntu 用は Ubuntu でビルドする。できたファイルの CPU は、ビルドしたマシンと同じになる。一般的な PC は x86_64、Apple Silicon の Mac は arm64 である。

[開発環境](#開発環境) で、ビルドする OS の Node.js、Rust、追加パッケージを入れてから、リポジトリ直下で次を実行する。

```bash
npm install
npm run tauri build
```

成果物は `src-tauri/target/release/bundle/` に出る。ファイル名に入るバージョンは [`npm run version:check`](#main-に載せる前のバージョン上げ) で揃えている番号である。初回は依存のコンパイルで時間がかかる。

### Ubuntu

Ubuntu 22.04 以降。システムパッケージは [Ubuntu の開発環境](#ubuntu) で入れてある。

`npm run tauri build` のあと、deb を入れて起動する。x86_64 の例:

```bash
sudo apt install ./src-tauri/target/release/bundle/deb/schedule-viewer_X.Y.Z_amd64.deb
schedule-viewer
```

arm64 でビルドしたときは `schedule-viewer_X.Y.Z_arm64.deb` になる。DevContainer を Apple Silicon 上の Linux で使っている場合は arm64 向けになる。配布先の Ubuntu が x86_64 なら、そのマシンでビルドする。

インストールせずに起動する AppImage もできる。x86_64 では `x86_64`、arm64 では `aarch64` がファイル名に入る。

```bash
chmod +x src-tauri/target/release/bundle/appimage/schedule-viewer_X.Y.Z_x86_64.AppImage
./src-tauri/target/release/bundle/appimage/schedule-viewer_X.Y.Z_x86_64.AppImage
```

同じビルドで RPM も `bundle/rpm/` にできる。Ubuntu では deb を使う。

### macOS

macOS Catalina (10.15) 以降。Command Line Tools、Node.js、Rust は [macOS の開発環境](#macos) で入れてある。

`npm run tauri build` のあと、ビルドした Mac で起動する:

```bash
open src-tauri/target/release/bundle/macos/schedule-viewer.app
```

ほかの Mac に渡すときは、ディスクイメージを開いて Applications に入れる。

- Apple Silicon: `src-tauri/target/release/bundle/dmg/schedule-viewer_X.Y.Z_aarch64.dmg`
- Intel: `src-tauri/target/release/bundle/dmg/schedule-viewer_X.Y.Z_x64.dmg`

別の Mac へ渡すには、Apple の署名と公証が必要になる。ビルドした Mac 上の `.app` はそのまま開ける。

### Windows

Windows 10（バージョン 1803 以降）または Windows 11。C++ Build Tools、WebView2、Node.js、Rust は [Windows の開発環境](#windows) で入れてある。

`npm run tauri build` のあと、できたインストーラを実行し、スタートメニューの schedule-viewer から起動する。x86_64 の例:

- `src-tauri\target\release\bundle\nsis\schedule-viewer_X.Y.Z_x64-setup.exe`
- `src-tauri\target\release\bundle\msi\schedule-viewer_X.Y.Z_x64_en-US.msi`

ARM の Windows では `x64` の部分が `arm64` になる。インストーラを使わず、ビルドした PC でそのまま試す場合:

```powershell
.\src-tauri\target\release\schedule-viewer.exe
```

別の PC でインストーラを開くと、署名がないため SmartScreen の確認が出ることがある。MSI の作成で `failed to run light.exe` と出たときは、Windows のオプション機能で VBSCRIPT を有効にする。

## スキーマを変えるとき

スケジュール JSON の形を変えるときは [.cursor/skills/update-schedule-schema/SKILL.md](../.cursor/skills/update-schedule-schema/SKILL.md) に従う。スキーマの正本、型、意味規則（スキーマでは表せない検証）、サンプル、`write-schedule` スキルを同じ変更で揃える。

カレンダー JSON を変えるときも、`docs/calendar.schema.json`、アプリの検証、`.cursor/skills/write-calendar/` を揃える。メンバー JSON も同様に `docs/members.schema.json`、アプリの検証、`.cursor/skills/write-members/` を揃える。

検証器は `scripts/compile-validators.mjs` がスキーマから `src/model/generated/` へ生成する。`npm run dev`、`npm run build`、`npm test` は先にこれを実行する。スキルに同梱する検証スクリプトは `npm run build:validate-skill` で作り直す。CI のフロントジョブは、生成後の `src/model/generated/` とスキル同梱物がコミット済みの内容と一致することを `git diff --exit-code` で見る。

## ドキュメントの更新ルール

挙動や手順を変えたら、対応する文書を同じ変更に含める。

| 変えたもの | 直す文書 |
| --- | --- |
| 画面の操作や見た目 | [外部仕様](external-spec.md) と [操作マニュアル](user-manual.md) |
| スケジュール、メンバー、カレンダーの JSON | [データ仕様](data-format.md) と、対応するスキル（`write-schedule`、`write-members`、`write-calendar`） |
| Tauri コマンド、状態の持ち方、ディレクトリ構成 | [内部仕様](internal-spec.md) |
| 自動テストや手動で確かめる手順 | [テスト仕様](test-spec.md) |
| 開発環境、起動、CI、リリース | この文書 |
| リリースに載せる変更 | [CHANGELOG.md](../CHANGELOG.md) |

計画と経緯は [PLANNING.md](PLANNING.md) に残す。画面の挙動の説明は外部仕様に書き、PLANNING には繰り返さない。
