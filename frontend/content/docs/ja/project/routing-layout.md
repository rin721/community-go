---
title: Nuxt ルーティングとレイアウト
description: ページルート、ナビゲーション、レイアウトシェル、静的 docs ルートの関係。
order: 30
category: project
navigation:
  icon: route
---

# Nuxt ルーティングとレイアウト

アプリは Nuxt のファイルベースルーティングを使います。公開ページは `app/pages/` にあり、設定のような大きな領域は複数ページに分け、共通シェルでナビゲーションと見出しを揃えます。

## メインナビゲーション

`useAoiNavigation()` はデスクトップ rail とモバイル下部ナビゲーションを返します。デスクトップ rail には `/docs` を含む追加入口を置けます。モバイル下部はホーム、カテゴリ、フォロー、検索だけにします。

テキストリンク、カードリンク、タグリンク、ナビゲーションリンクは `AoiLink` を使います。ボタン型ナビゲーションは `AoiButton` または `AoiIconButton` の `to` / `href` を使い、内部で `AoiLink` に委譲します。

## Docs ルート

`app/pages/docs/[[...slug]].vue` が `/docs` と `/docs/**` を扱います。現在の locale から Nuxt Content collection を選び、ローカライズ済み文書がない場合は中国語 collection にフォールバックします。

```ts
const collectionByLocale = {
  "zh-CN": "docsZhCn",
  en: "docsEn",
  ja: "docsJa"
}
```

## 静的レンダリング

`nuxt.config.ts` は `/docs` と `/docs/**` に `prerender: true` を設定します。docs ページはサーバー側でナビゲーションパスを集め、`prerenderRoutes()` を呼び出して Markdown slug を静的ビルドに含めます。
