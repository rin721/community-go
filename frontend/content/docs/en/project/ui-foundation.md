---
title: UI, Tokens, Motion, and Layers
description: Aoi UI tokens, responsive rules, motion expectations, layers, and accessibility constraints.
order: 40
category: project
navigation:
  icon: palette
---

# UI, Tokens, Motion, and Layers

Aoi UI is built from local wrappers, CSS tokens, and shared layout rules. Business pages should use existing Aoi components instead of coupling directly to Material Web internals.

## Tokens

Colors, radius, shadows, sizes, layers, and states live in `app/assets/css/tokens.css` and `app/assets/css/main.css`. New visual rules should reuse variables before introducing isolated values.

## Wrapper Rules

Material Web imports are centralized in `app/plugins/material-web.client.ts`. Aoi wrappers normalize size, intent, focus, loading, link behavior, and accessible labels.

```vue
<AoiButton icon="upload" intent="primary">
  Publish
</AoiButton>
```

## Motion

Interaction motion should respect `prefers-reduced-motion` and should never be the only way to communicate state. Scroll, Reveal, Skeleton, danmaku, and player controls all need understandable low-motion behavior.

## Layers

Dialogs, menus, floating surfaces, navigation, and loading layers are coordinated by local layer rules. Prefer `AoiDialog`, `AoiMenu`, `AoiLightboxGallery`, or player overlay components before adding custom floating UI.
