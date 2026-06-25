<script setup lang="ts">
import type { CommentSortMode, LocalComment } from "~/types/comments"

const props = withDefaults(defineProps<{
  comments: LocalComment[]
  hydrated?: boolean
  sortMode?: CommentSortMode
}>(), {
  hydrated: false,
  sortMode: "newest"
})

const emit = defineEmits<{
  delete: [commentId: string]
  edit: [commentId: string, body: string]
  "update:sortMode": [value: CommentSortMode]
}>()

const sortValue = computed({
  get: () => props.sortMode,
  set: (value) => emit("update:sortMode", value as CommentSortMode)
})

const sortOptions = [
  { label: "最新优先", value: "newest" },
  { label: "最早优先", value: "oldest" }
]
</script>

<template>
  <section class="comment-thread" aria-labelledby="comment-thread-title">
    <AoiSection
      as="div"
      title="讨论区"
      :description="`${comments.length} 条本地评论`"
      title-id="comment-thread-title"
      :reveal="false"
    >
      <template #actions>
        <AoiSelect
          v-model="sortValue"
          class="comment-thread__sort"
          label="排序"
          appearance="outlined"
          :options="sortOptions"
          :disabled="!hydrated || comments.length < 2"
        />
      </template>
    </AoiSection>

    <PageState
      v-if="hydrated && comments.length === 0"
      icon="message-circle"
      title="还没有本地评论"
      description="写下第一条讨论，刷新页面后也会保存在当前浏览器。"
    />

    <AoiContentGrid v-else-if="hydrated" min-width="100%" gap="compact" :mobile-columns="1">
      <AoiReveal
        v-for="(comment, index) in comments"
        :key="comment.id"
        class="comment-thread__item"
        :index="index"
        variant="rise"
      >
        <CommentItem
          :comment="comment"
          @delete="emit('delete', $event)"
          @edit="(commentId, body) => emit('edit', commentId, body)"
        />
      </AoiReveal>
    </AoiContentGrid>
  </section>
</template>

<style scoped>
.comment-thread {
  display: grid;
  gap: 12px;
}

.comment-thread__sort {
  width: min(180px, 100%);
}

.comment-thread__item {
  min-width: 0;
}

@media (max-width: 620px) {
  .comment-thread__sort {
    width: 100%;
  }
}
</style>
