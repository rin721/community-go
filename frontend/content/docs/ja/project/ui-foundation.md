---
title: UI、Token、Motion、Layer
description: Aoi UI の token、レスポンシブ、motion、layer、アクセシビリティ制約。
order: 40
category: project
navigation:
  icon: palette
---

# UI、Token、Motion、Layer

Aoi UI はローカル wrapper、CSS token、共有レイアウトルールを土台にしています。業務ページは既存の Aoi コンポーネントを使い、Material Web の内部実装に直接結合しないようにします。

## Token

色、角丸、影、サイズ、layer、状態変数は `app/assets/css/tokens.css` と `app/assets/css/main.css` にあります。新しい視覚ルールは孤立した値を追加する前に変数を再利用します。

## Wrapper ルール

Material Web の import は `app/plugins/material-web.client.ts` に集約します。Aoi wrapper はサイズ、intent、focus、loading、リンク挙動、アクセシブルラベルを統一します。

```vue
<AoiButton icon="upload" intent="primary">
  公開
</AoiButton>
```

## Motion

インタラクション motion は `prefers-reduced-motion` を尊重し、状態伝達を motion だけに頼らないようにします。Scroll、Reveal、Skeleton、弾幕、プレイヤー操作は低 motion でも理解できる必要があります。

## Layer

Dialog、Menu、浮遊面、navigation、loading layer はローカル layer ルールで調整します。新しい浮遊 UI を作る前に `AoiDialog`、`AoiMenu`、`AoiLightboxGallery`、プレイヤー overlay を優先します。
