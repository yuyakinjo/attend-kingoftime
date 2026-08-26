# Getting Started

※ まだ改良中です

Raycast に「King of Time 打刻」コマンドを出すまでのセットアップ／アップデートは、同梱の `setup-local` スキルにすべて任せています。clone もスキルがやるので、まずはプラグインを入れるだけで OK です。

## 1. プラグインを追加

Claude Code で実行する。

```
/plugin marketplace add yuyakinjo/attend-kingoftime
/plugin install attend-kingoftime
```

## 2. スキルを実行

Claude Code に以下のように頼む。

```
claude /setup-local
```

初回セットアップかアップデートかはスキル側が自動で判断し、clone・依存インストール・ビルド・Raycast への登録まで案内してくれる。

Done!
Please see your raycast.
