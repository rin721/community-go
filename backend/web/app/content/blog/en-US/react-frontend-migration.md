---
title: React Frontend Migration Phase One
description: Notes on the first phase of moving the platform console to a unified React public site and admin workspace.
date: 2026-06-18
updatedAt: 2026-06-18
slug: react-frontend-migration
tags:
  - React
  - i18n
  - Design System
locale: en-US
draft: false
cover: /images/blog/react-frontend-migration.svg
author: Console Platform Maintainers
---

Phase one creates the React project foundation instead of deleting the legacy Nuxt admin immediately. This keeps the migration evidence-based while the build output, Go static hosting path, and `/admin` route behavior are verified.

## Phase goals

- Create the React Router Framework SPA.
- Establish the platform React component layers.
- Add i18next resources and canonical `X-Locale` forwarding.
- Validate Markdown front matter.

Each migrated admin page must also remove the matching old route, component, API call, and obsolete i18n keys in the same phase.
