---
title: Aoi Docs
description: プロジェクトシステム、協作ルール、Aoi wrapper コンポーネントライブラリの公開静的ドキュメント入口。
order: 1
category: docs
navigation:
  icon: book-open
---

# Aoi Docs

ここは `aoi-web` の長期ドキュメント入口です。プロジェクトシステムでは Nuxt アプリ、リポジトリ境界、状態、API、i18n、検証フローを説明します。コンポーネントライブラリでは `app/components/aoi/` のすべての Aoi wrapper を扱います。

## 入口

- [プロジェクト概要](/docs/project/overview) はアプリの目的、技術スタック、現在の Community API / mock 境界を説明します。
- [リポジトリ境界](/docs/project/repository) は長期コードを置く場所と生成物の扱いを説明します。
- [コンポーネント概要](/docs/components/overview) は wrapper の原則と分類を説明します。
- [Actions](/docs/components/actions) はボタン、リンク、コマンド型ナビゲーションを扱います。
- [Forms](/docs/components/forms) は入力、選択、アップロード、エディタを扱います。

## ドキュメント規約

すべての言語で同じ slug を使います。デフォルト言語は `zh-CN` で、i18n は `no_prefix` 戦略です。言語を切り替えても URL は変わらず、現在の locale に対応する Markdown collection を問い合わせます。

::docs-callout{title="静的レンダリング優先" intent="info" icon="sparkles"}
`/docs` は Nuxt Content で Markdown から描画し、route rules でプリレンダリングします。mock API を追加せず、バックエンド Community の本番契約境界も変えません。
::

## 執筆モデル

Markdown は説明、例、リンクを担当します。コンポーネント API、イベント、スロット、demo 入口は構造化メタデータから生成し、言語ごとに同じ表を重複管理しないようにします。
