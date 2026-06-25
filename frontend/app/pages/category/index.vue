<script setup lang="ts">
import type { CategoryTreeNode } from "~/types/api"
import { getCategorySelfAndDescendants } from "~~/shared/utils/categories"

const api = useAoiApi()

const { data, pending, error, refresh } = useAsyncData("category-index", async () => {
  const [categories, videos] = await Promise.all([
    api.listCategories(),
    api.listVideos({ category: "home" })
  ])

  return { categories, videos: videos.items }
}, {
  default: () => ({ categories: [], videos: [] })
})

function countFor(category: CategoryTreeNode) {
  const slug = category.slug

  if (slug === "home") {
    return data.value.videos.length
  }

  const slugs = getCategorySelfAndDescendants(data.value.categories, slug).map((item) => item.slug)

  return data.value.videos.filter((video) => video.categories.some((item) => slugs.includes(item.slug))).length
}

useHead({
  title: "Categories - Aoi"
})
</script>

<template>
  <div class="aoi-page">
    <PageHeader
      icon="layout-grid"
      title="分类"
      description="按内容类型浏览 Aoi 社区的 mock feed。"
    />

    <PageState
      v-if="!pending && error"
      icon="circle-alert"
      title="分类加载失败"
      description="Mock API 返回异常，请重试。"
      action-icon="refresh-cw"
      action-label="重试"
      @action="refresh()"
    />

    <AoiSection v-else-if="!pending" :reveal="false">
      <AoiReveal
        v-for="(category, index) in data.categories"
        :key="category.id"
        :index="index"
      >
        <section class="category-tree-group">
          <CategoryCard
            :category="category"
            :count="countFor(category)"
          />

          <AoiContentGrid
            v-if="category.children.length"
            min-width="220px"
            gap="compact"
            :mobile-columns="1"
          >
            <CategoryCard
              v-for="child in category.children"
              :key="child.id"
              :category="child"
              :count="countFor(child)"
            />
          </AoiContentGrid>
        </section>
      </AoiReveal>
    </AoiSection>
  </div>
</template>

<style scoped>
.category-tree-group {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}
</style>
