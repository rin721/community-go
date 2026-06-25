<script setup lang="ts">
import type { Collections } from "@nuxt/content"
import { aoiComponentDocs } from "~/data/aoiComponentDocs"
import type { AoiDocsCollection, AoiDocsLocale } from "~/types/docs"
import type { DocsNavigationItem } from "~/components/docs/DocsNavTree.vue"

type DocsPage = Collections[AoiDocsCollection]
type TocLink = {
  children?: TocLink[]
  depth?: number
  id: string
  text: string
}
type SearchSection = {
  content: string
  id: string
  level: number
  title: string
  titles: string[]
}

const collectionByLocale: Record<AoiDocsLocale, AoiDocsCollection> = {
  "zh-CN": "docsZhCn",
  en: "docsEn",
  ja: "docsJa"
}

const route = useRoute()
const { locale, t } = useI18n()
const appSettings = useAppSettingsStore()
const searchQuery = ref("")
const mobileNavOpen = ref(false)

const docsLocale = computed<AoiDocsLocale>(() => {
  const preferredLocale = appSettings.hydrated ? appSettings.locale : locale.value

  return preferredLocale === "en" || preferredLocale === "ja" ? preferredLocale : "zh-CN"
})
const activeCollection = computed(() => collectionByLocale[docsLocale.value])
const slugPath = computed(() => {
  const slug = route.params.slug
  const parts = Array.isArray(slug) ? slug : slug ? [String(slug)] : []

  return parts.filter(Boolean).join("/")
})
const docsPath = computed(() => slugPath.value ? `/docs/${slugPath.value}` : "/docs")
const pageDataKey = computed(() => `docs-page-${activeCollection.value}-${docsPath.value}`)
const navigationDataKey = computed(() => `docs-navigation-${activeCollection.value}`)
const searchSectionsDataKey = computed(() => `docs-search-sections-${activeCollection.value}`)

const { data: page } = await useAsyncData(
  pageDataKey,
  async () => {
    const content = await queryCollection(activeCollection.value).path(docsPath.value).first()

    if (content || activeCollection.value === "docsZhCn") {
      return content
    }

    return queryCollection("docsZhCn").path(docsPath.value).first()
  },
  { watch: [activeCollection, docsPath] }
)

const { data: navigation } = await useAsyncData(
  navigationDataKey,
  () => queryCollectionNavigation(activeCollection.value, ["description", "category", "order"])
    .where("draft", "<>", true),
  { watch: [activeCollection] }
)

const { data: searchSections } = await useAsyncData(
  searchSectionsDataKey,
  () => queryCollectionSearchSections(activeCollection.value, {
    ignoredTags: ["code", "pre"],
    minHeading: "h2",
    maxHeading: "h3"
  }),
  { watch: [activeCollection] }
)

const flatNav = computed(() => flattenNav((navigation.value || []) as DocsNavigationItem[]))
const docsNavigation = computed(() => (navigation.value || []) as DocsNavigationItem[])
const activeIndex = computed(() => flatNav.value.findIndex((item) => item.path === docsPath.value))
const previousPage = computed(() => activeIndex.value > 0 ? flatNav.value[activeIndex.value - 1] : undefined)
const nextPage = computed(() => activeIndex.value >= 0 ? flatNav.value[activeIndex.value + 1] : undefined)
const tocLinks = computed(() => {
  const body = (page.value as DocsPage | null | undefined)?.body as { toc?: { links?: TocLink[] } } | undefined

  return body?.toc?.links || []
})
const filteredSearch = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return []
  }

  return ((searchSections.value || []) as SearchSection[])
    .filter((item) => `${item.title} ${item.titles.join(" ")} ${item.content}`.toLowerCase().includes(query))
    .slice(0, 8)
})
const docsStats = computed(() => [
  { icon: "book-open", label: t("docs.stats.pages"), value: flatNav.value.length || "-" },
  { icon: "blocks", label: t("docs.stats.components"), value: aoiComponentDocs.length },
  { icon: "languages", label: t("docs.stats.locales"), value: "3" }
])

if (import.meta.server) {
  prerenderRoutes(flatNav.value.map((item) => item.path).filter((path): path is string => Boolean(path)))
}

useHead(() => ({
  title: page.value?.title ? `${page.value.title} - Aoi Docs` : "Aoi Docs"
}))

function flattenNav(items: DocsNavigationItem[]): DocsNavigationItem[] {
  return items.flatMap((item) => [
    ...(item.path ? [item] : []),
    ...flattenNav(item.children || [])
  ])
}

function searchHref(item: SearchSection) {
  if (item.id.startsWith("/")) {
    return item.id
  }

  return `${docsPath.value}#${item.id}`
}
</script>

<template>
  <div class="aoi-page docs-page">
    <header class="docs-page__hero">
      <div class="docs-page__hero-copy">
        <p class="docs-page__eyebrow">{{ t("docs.eyebrow") }}</p>
        <h1>{{ page?.title || t("docs.title") }}</h1>
        <p>{{ page?.description || t("docs.description") }}</p>
        <div class="docs-page__hero-actions">
          <AoiButton tone="accent" variant="filled" icon="book-open" to="/docs/project/overview">{{ t("docs.actions.project") }}</AoiButton>
          <AoiButton tone="accent" variant="outlined" icon="blocks" to="/docs/components/overview">{{ t("docs.actions.components") }}</AoiButton>
        </div>
      </div>
      <AoiStatGrid :items="docsStats" :columns="3" />
    </header>

    <div class="docs-page__mobile-tools">
      <AoiButton tone="accent" variant="outlined" icon="panel-left-open" @click="mobileNavOpen = true">
        {{ t("docs.nav.open") }}
      </AoiButton>
      <AoiTextField
        v-model="searchQuery"
        appearance="outlined"
        icon="search"
        :label="t('docs.search.label')"
        :placeholder="t('docs.search.placeholder')"
      />
    </div>

    <div class="docs-page__shell">
      <aside class="docs-page__sidebar" :aria-label="t('docs.nav.label')">
        <div class="docs-page__search">
          <AoiTextField
            v-model="searchQuery"
            appearance="outlined"
            icon="search"
            :label="t('docs.search.label')"
            :placeholder="t('docs.search.placeholder')"
          />
          <div v-if="filteredSearch.length" class="docs-page__search-results">
            <AoiLink
              v-for="item in filteredSearch"
              :key="item.id"
              class="docs-page__search-result"
              :to="searchHref(item)"
            >
              <strong>{{ item.title }}</strong>
              <span>{{ item.content }}</span>
            </AoiLink>
          </div>
        </div>
        <DocsNavTree :items="docsNavigation" :active-path="docsPath" />
      </aside>

      <main class="docs-page__content">
        <ContentRenderer
          v-if="page"
          :value="page"
          class="docs-prose"
          prose
        />
        <PageState
          v-else
          icon="file-question"
          :title="t('docs.notFound.title')"
          :description="t('docs.notFound.description')"
          action-icon="book-open"
          :action-label="t('docs.notFound.action')"
          @action="navigateTo('/docs')"
        />

        <nav v-if="previousPage || nextPage" class="docs-page__pager" :aria-label="t('docs.pager.label')">
          <AoiLink v-if="previousPage" class="docs-page__pager-link" :to="previousPage.path">
            <AoiIcon name="arrow-left" :size="16" decorative />
            <span>
              <small>{{ t("docs.pager.previous") }}</small>
              {{ previousPage.title }}
            </span>
          </AoiLink>
          <span v-else />
          <AoiLink v-if="nextPage" class="docs-page__pager-link docs-page__pager-link--next" :to="nextPage.path">
            <span>
              <small>{{ t("docs.pager.next") }}</small>
              {{ nextPage.title }}
            </span>
            <AoiIcon name="arrow-right" :size="16" decorative />
          </AoiLink>
        </nav>
      </main>

      <aside class="docs-page__toc" :aria-label="t('docs.toc.label')">
        <strong>{{ t("docs.toc.label") }}</strong>
        <AoiButton
          v-for="item in tocLinks"
          :key="item.id"
          class="docs-page__toc-link"
          :to="`${docsPath}#${item.id}`"
          :aria-label="item.text"
          variant="plain"
          tone="muted"
          size="sm"
        >
          <span>{{ item.text }}</span>
        </AoiButton>
      </aside>
    </div>

    <AoiDialog v-model:open="mobileNavOpen">
      <template #headline>
        {{ t("docs.nav.label") }}
      </template>
      <DocsNavTree :items="docsNavigation" :active-path="docsPath" />
      <template #actions>
        <AoiButton tone="accent" variant="plain" @click="mobileNavOpen = false">{{ t("docs.nav.close") }}</AoiButton>
      </template>
    </AoiDialog>
  </div>
</template>

<style scoped>
.docs-page {
  display: grid;
  gap: 20px;
}

.docs-page__hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, .56fr);
  gap: 18px;
  align-items: end;
  border-bottom: 1px solid var(--aoi-border);
  padding-bottom: 18px;
}

.docs-page__hero-copy,
.docs-page__hero-actions,
.docs-page__mobile-tools,
.docs-page__search,
.docs-page__search-results {
  display: grid;
  gap: 12px;
}

.docs-page__hero-actions {
  display: flex;
  flex-wrap: wrap;
}

.docs-page__eyebrow,
.docs-page__hero h1,
.docs-page__hero p {
  margin: 0;
}

.docs-page__eyebrow {
  color: var(--aoi-active-color) !important;
  font-size: 12px;
  font-weight: 840;
  text-transform: uppercase;
}

.docs-page__hero h1 {
  color: var(--aoi-text);
  font-size: clamp(30px, 5vw, 54px);
  letter-spacing: 0;
  line-height: 1;
}

.docs-page__hero p {
  max-width: 760px;
  color: var(--aoi-text-muted);
  line-height: 1.75;
}

.docs-page__shell {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr) minmax(180px, 220px);
  gap: 22px;
  align-items: start;
}

.docs-page__sidebar,
.docs-page__toc {
  position: sticky;
  top: var(--aoi-settings-sticky-top);
  display: grid;
  max-height: calc(100vh - 36px);
  gap: 14px;
  overflow: auto;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-container);
  background: var(--aoi-panel-bg);
  box-shadow: var(--aoi-shadow-sm);
  padding: 12px;
}

.docs-page__content {
  min-width: 0;
}

.docs-page__mobile-tools {
  display: none;
}

.docs-page__search-result {
  display: grid;
  width: 100%;
  gap: 3px;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-surface-solid);
  color: var(--aoi-text);
  padding: 9px;
}

.docs-page__search-result span {
  display: -webkit-box;
  overflow: hidden;
  color: var(--aoi-text-muted);
  font-size: 12px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.docs-page__toc strong {
  color: var(--aoi-text);
}

.docs-page__toc-link {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  border-radius: var(--aoi-radius-control);
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 720;
  line-height: 1.45;
  overflow: hidden;
}

.docs-page__toc-link :deep(.aoi-button) {
  --md-text-button-container-height: auto;
  --md-text-button-container-shape: var(--aoi-radius-control);
  --md-text-button-leading-space: 8px;
  --md-text-button-trailing-space: 8px;
  justify-content: flex-start;
  width: 100%;
  min-height: 32px;
  border-radius: var(--aoi-radius-control);
  color: inherit;
  line-height: 1.45;
  text-align: left;
}

.docs-page__toc-link :deep(.aoi-button span) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.docs-page__toc-link:hover,
.docs-page__toc-link:focus-visible {
  color: var(--aoi-text);
}

.docs-page__pager {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 22px;
  border-top: 1px solid var(--aoi-border);
  padding-top: 18px;
}

.docs-page__pager-link {
  display: flex;
  width: 100%;
  min-height: 72px;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-card-bg);
  color: var(--aoi-text);
  padding: 12px;
}

.docs-page__pager-link--next {
  justify-content: flex-end;
  text-align: right;
}

.docs-page__pager-link span {
  display: grid;
  gap: 3px;
}

.docs-page__pager-link small {
  color: var(--aoi-text-muted);
  font-size: 12px;
}

:deep(.docs-prose) {
  min-width: 0;
  color: var(--aoi-text);
  line-height: 1.8;
}

:deep(.docs-prose h1),
:deep(.docs-prose h2),
:deep(.docs-prose h3),
:deep(.docs-prose h4) {
  color: var(--aoi-text);
  letter-spacing: 0;
  line-height: 1.25;
  scroll-margin-top: var(--aoi-settings-anchor-offset);
}

:deep(.docs-prose h1) {
  display: none;
}

:deep(.docs-prose h2) {
  margin: 30px 0 12px;
  font-size: 24px;
}

:deep(.docs-prose h3) {
  margin: 24px 0 10px;
  font-size: 18px;
}

:deep(.docs-prose p),
:deep(.docs-prose ul),
:deep(.docs-prose ol) {
  color: var(--aoi-text-muted);
}

:deep(.docs-prose code:not(pre code)) {
  border-radius: var(--aoi-radius-xs);
  background: var(--aoi-accent-10);
  color: var(--aoi-active-color);
  font-size: .92em;
  padding: 2px 5px;
}

:deep(.docs-prose table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

:deep(.docs-prose th),
:deep(.docs-prose td) {
  border: 1px solid var(--aoi-border);
  padding: 9px 10px;
  text-align: left;
  vertical-align: top;
}

:deep(.docs-prose th) {
  background: var(--aoi-surface-muted);
  color: var(--aoi-text);
}

@media (max-width: 1120px) {
  .docs-page__shell {
    grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  }

  .docs-page__toc {
    display: none;
  }
}

@media (max-width: 760px) {
  .docs-page__hero,
  .docs-page__shell {
    grid-template-columns: 1fr;
  }

  .docs-page__sidebar {
    display: none;
  }

  .docs-page__mobile-tools {
    display: grid;
  }

  .docs-page__pager {
    grid-template-columns: 1fr;
  }
}
</style>
