---
title: コンポーネント概要
description: Aoi wrapper は業務 UI と Material Web、プレイヤー、弾幕、リッチなインタラクション機能の安定境界です。
order: 100
category: components
navigation:
  icon: blocks
---

# コンポーネント概要

`app/components/aoi/` の Aoi wrapper は業務ページの標準 UI 面です。token、サイズ、intent、リンク、focus、SSR safety、アクセシビリティを揃え、ページが低レベル実装に直接依存しないようにします。

## 分類

- [Actions](/docs/components/actions): ボタン、リンク、アイコンボタン、action bar、media overlay button。
- [Forms](/docs/components/forms): 入力、選択、switch、upload、color control、rich text editing。
- [Layout & Content](/docs/components/layout-content): Surface、Section、Grid、LazyMount、Scroll、Skeleton、content display。
- [Feedback](/docs/components/feedback): progress、status message、loading feedback。
- [Overlays](/docs/components/overlays): Dialog、Menu、Lightbox、player context menu。
- [Media Player](/docs/components/media-player): player layout、controls、timeline、queue、video components。
- [Danmaku, Motion & Rich Text](/docs/components/danmaku-motion-rich-text): 弾幕、scroll scene、Reveal、RichText、editor。

## 使用ルール

業務ページでは `md-*` Material Web 要素を直接使いません。通常リンクは `AoiLink`、コマンドは `AoiButton`、アイコン操作は `AoiIconButton` を使います。足りない機能がある場合は、局所的に回避するのではなく wrapper を拡張します。

::docs-callout{title="開発ワークベンチ" intent="tip" icon="flask-conical"}
`/settings/components` は視覚状態を試すためのインタラクティブなワークベンチです。`/docs` は説明、API 表、例を長期的に管理する入口です。
::
