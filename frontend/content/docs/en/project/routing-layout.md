---
title: Nuxt Routing and Layout
description: Page routing, navigation entries, layout shells, and the static docs route.
order: 30
category: project
navigation:
  icon: route
---

# Nuxt Routing and Layout

The app uses Nuxt file-based routing. Public routes live in `app/pages/`, and larger areas such as settings split into multiple pages while sharing shell components for navigation and headings.

## Main Navigation

`useAoiNavigation()` returns the desktop rail and mobile bottom navigation. The desktop rail can carry additional entries, including `/docs`; the mobile bottom nav keeps only home, categories, following, and search.

Text links, card links, tag links, and navigation links use `AoiLink`. Button-style navigation uses `AoiButton` or `AoiIconButton` with `to` / `href`, delegated through `AoiLink`.

## Docs Route

`app/pages/docs/[[...slug]].vue` handles `/docs` and `/docs/**`. It chooses a Nuxt Content collection from the active locale, and falls back to the Chinese collection when a localized document is missing.

```ts
const collectionByLocale = {
  "zh-CN": "docsZhCn",
  en: "docsEn",
  ja: "docsJa"
}
```

## Static Rendering

`nuxt.config.ts` sets `prerender: true` for `/docs` and `/docs/**`. The docs page also collects navigation paths on the server and calls `prerenderRoutes()` so dynamic Markdown slugs are discovered during static builds.
