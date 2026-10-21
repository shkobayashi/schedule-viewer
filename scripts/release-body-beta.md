## 動作確認用の Pre-release

この版は、Windows、Ubuntu、または macOS（Apple Silicon）での実機確認用です。GitHub の Latest や自動更新の配信には載りません。インストーラはこの Release のページから取得してください。

Ubuntu でベータの deb を入れたあとに安定版へ移すときは、先にベータの deb を外してから安定版を入れてください。

macOS では `schedule-viewer_*_aarch64.dmg` を開き、schedule-viewer をアプリケーションフォルダへ入れてから起動する。dmg の中の .app からは起動しない。初回は Gatekeeper が止めることがある。システム設定の「プライバシーとセキュリティ」に「このまま開く」があればそれを選ぶ。無く、壊れていると出るときは `xattr -dr com.apple.quarantine /Applications/schedule-viewer.app` を実行してから開く。Gatekeeper 自体は切らない。
