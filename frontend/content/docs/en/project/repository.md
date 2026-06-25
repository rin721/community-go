---
title: Repository Boundaries
description: Responsibilities for app, shared, server/api/mock, i18n, design, and generated directories.
order: 20
category: project
navigation:
  icon: folder-tree
---

# Repository Boundaries

The repository is split by frontend app code, shared contracts, mock services, and long-lived design rules. New code should land in the closest matching boundary.

## App Code

`app/` contains the Nuxt frontend: pages, components, composables, stores, plugins, styles, and local types. Business pages should prefer Nuxt auto imports and local composables instead of new global utilities.

`app/components/aoi/` is the boundary between Material Web and the Aoi design system. Business components and pages should not use `md-*` elements directly; add or extend an Aoi wrapper first.

## Shared Contracts

`shared/` holds DTOs, fixtures, and contract types reused by the app and mock server. When a shared contract exists, do not rebuild response shapes ad hoc inside pages.

## Mock API

`server/api/mock/` supports the current frontend prototype. Keep mock responses close to future API contracts, but do not turn this folder into a production backend.

## Localization and Design

`i18n/locales/` maintains user-facing copy for `zh-CN`, `en`, and `ja`. Shared copy changes should update all three files.

The aggregate repository root `AGENTS.md` stores long-term rules, with `frontend/` constraints applying only during frontend work. Short-lived notes and one-off plans should not become scattered rule files again.

## Generated Directories

Do not edit `.nuxt/`, `.output/`, `node_modules/`, or other generated and dependency directories. Dependency changes should come from intentional pnpm commands and include the matching lockfile update.
