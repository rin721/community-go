<script setup lang="ts">
import type { CategoryTreeNode } from "~/types/api"
import { getCategorySelfAndDescendants } from "~~/shared/utils/categories"

const { t } = useI18n()
const api = useAoiApi()
const route = useRoute()
const slug = computed(() => String(route.params.slug || "home"))

const { data, error, pending, refresh } = useAsyncData(() => `category-${slug.value}`, async () => {
  const [category, videos] = await Promise.all([
    api.getCategory(slug.value),
    api.listVideos({ category: slug.value })
  ])

  return {
    category,
    videos: videos.items
  }
}, {
  default: () => ({
    category: null,
    videos: []
  }),
  watch: [slug]
})

useHead(() => ({
  title: data.value.category ? `${data.value.category.name} - Aoi` : "Category - Aoi"
}))

function countFor(category: CategoryTreeNode) {
  if (!data.value.category) {
    return 0
  }

  const slugs = getCategorySelfAndDescendants([data.value.category], category.slug).map((item) => item.slug)

  return data.value.videos.filter((video) => video.categories.some((item) => slugs.includes(item.slug))).length
}
</script>

<template>
  <div class="aoi-page">
    <PageState
      v-if="!pending && error"
      icon="circle-alert"
      title="分类加载失败"
      description="Mock API 返回异常，请重试。"
      action-icon="refresh-cw"
      action-label="重试"
      @action="refresh()"
    />

    <PageState
      v-else-if="!pending && !data.category"
      icon="folder-x"
      title="分类不存在"
      :description="`没有找到「${slug}」这个分类。`"
      action-icon="layout-grid"
      action-label="返回分类"
      @action="navigateTo('/category')"
    />

    <template v-else-if="!pending && data.category">
      <PageHeader
        icon="folder-open"
        eyebrow="Category"
        :title="data.category.name"
        :description="data.category.description"
      >
        <template #actions>
          <AoiButton tone="accent" variant="tonal" icon="layout-grid" to="/category">全部分类</AoiButton>
        </template>
      </PageHeader>

      <AoiSection
        v-if="data.category.children.length"
        :title="t('category.childrenTitle')"
        :description="t('category.childrenDescription')"
        title-id="category-children-title"
        :level="3"
        :reveal="false"
      >
        <AoiContentGrid min-width="220px" gap="compact" :mobile-columns="1">
          <AoiReveal
            v-for="(child, index) in data.category.children"
            :key="child.id"
            :index="index"
          >
            <CategoryCard
              :category="child"
              :count="countFor(child)"
            />
          </AoiReveal>
        </AoiContentGrid>
      </AoiSection>

      <PageState
        v-if="data.videos.length === 0"
        icon="inbox"
        title="这个分类暂时没有内容"
        description="稍后可以从真实 Go API 拉取更多内容。"
      />
      <AoiSection v-else :reveal="false">
        <VideoGrid :videos="data.videos" />
      </AoiSection>
    </template>
  </div>
</template>
