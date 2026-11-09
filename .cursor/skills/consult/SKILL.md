---
name: consult
description: 仕様や方向の相談を、このセッションのあいだ広い視野で扱う。実装の依頼には使わない。
disable-model-invocation: true
---

# 相談

相談モードを開始する。始まりと終わりは [.cursor/rules/consult.mdc](../../rules/consult.mdc) に従う。

返事を書く前に、本文 [references/session.md](references/session.md) を読む。相談が続くあいだは、毎ターンこの本文を読む。会話の履歴に本文が残っていても、読み直す。`/consult` で開いたこのスキルは、そのメッセージに付くだけで次のターンには残らない。続きのターンでは、短いルールに従って本文を読み直す。

順は本文の「返答の順」、例とたとえは「例とたとえ」、仕様と設計の姿勢は「仕様と設計の相談」に従う。
