---
title: Aoi Docs
description: Public static documentation for the project system, collaboration rules, and Aoi wrapper component library.
order: 1
category: docs
navigation:
  icon: book-open
---

# Aoi Docs

This is the long-lived documentation entry for `aoi-web`. The project system pages explain the Nuxt app, repository boundaries, state, API, i18n, and validation workflow. The component library pages cover every Aoi wrapper under `app/components/aoi/`.

## Fast Paths

- [Project overview](/docs/project/overview) explains the app goals, stack, and current Community API / mock boundary.
- [Repository boundaries](/docs/project/repository) explains where long-lived code belongs and which folders are generated.
- [Component overview](/docs/components/overview) explains the wrapper rules and categories.
- [Actions components](/docs/components/actions) covers buttons, links, and command navigation.
- [Forms components](/docs/components/forms) covers inputs, selections, uploads, and editors.

## Documentation Rules

All locales keep the same slugs. The default locale is `zh-CN`, and the app uses the i18n `no_prefix` strategy, so switching language keeps the route stable while the page queries a different Markdown collection.

::docs-callout{title="Static first" intent="info" icon="sparkles"}
`/docs` is rendered from Markdown by Nuxt Content and prerendered through route rules. It does not add mock APIs or change the backend Community production contract boundary.
::

## Authoring Model

Markdown carries narrative, examples, and links. Component APIs, events, slots, and demo entry points come from structured metadata so tables stay consistent across locales.
