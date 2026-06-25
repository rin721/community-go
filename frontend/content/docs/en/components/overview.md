---
title: Component Overview
description: Aoi wrappers are the stable boundary between business UI and Material Web, player, danmaku, and rich interaction features.
order: 100
category: components
navigation:
  icon: blocks
---

# Component Overview

Aoi wrappers under `app/components/aoi/` are the default UI surface for business pages. They normalize tokens, sizing, intent, links, focus, SSR safety, and accessibility so pages do not depend directly on lower-level implementations.

## Categories

- [Actions](/docs/components/actions): buttons, links, icon buttons, action bars, and media overlay buttons.
- [Forms](/docs/components/forms): inputs, selection, switches, uploads, color controls, and rich text editing.
- [Layout & Content](/docs/components/layout-content): Surface, Section, Grid, LazyMount, Scroll, Skeleton, and content display.
- [Feedback](/docs/components/feedback): progress, status messages, and loading feedback.
- [Overlays](/docs/components/overlays): Dialog, Menu, Lightbox, and player context menus.
- [Media Player](/docs/components/media-player): player layout, controls, timeline, queue, and video components.
- [Danmaku, Motion & Rich Text](/docs/components/danmaku-motion-rich-text): danmaku, scroll scenes, Reveal, RichText, and editors.

## Usage Rule

Business pages should not use `md-*` Material Web elements directly. Use `AoiLink` for normal links, `AoiButton` for commands, and `AoiIconButton` for icon actions. When a capability is missing, extend the wrapper rather than bypassing it locally.

::docs-callout{title="Developer workbench" intent="tip" icon="flask-conical"}
`/settings/components` remains the interactive workbench for visual states. `/docs` is the long-lived source for explanations, API tables, and examples.
::
