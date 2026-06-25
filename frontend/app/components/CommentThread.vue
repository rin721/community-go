<script setup lang="ts">
import type { CommentSortMode, CommentView, LocalComment } from "~/types/comments"

type ThreadComment = CommentView | LocalComment

const props = withDefaults(defineProps<{
  comments: ThreadComment[]
  description?: string
  emptyDescription?: string
  emptyTitle?: string
  hydrated?: boolean
  sortLabel?: string
  sortMode?: CommentSortMode
  title?: string
}>(), {
  description: undefined,
  emptyDescription: "写下第一条讨论，刷新页面后也会保存在当前浏览器。",
  emptyTitle: "还没有评论",
  hydrated: false,
  sortLabel: "排序",
  sortMode: "newest",
  title: "讨论区"
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

const commentItems = computed(() => props.comments.map(toCommentView))
const sectionDescription = computed(() => props.description || `${props.comments.length} 条评论`)

function toCommentView(comment: ThreadComment): CommentView {
  if ("source" in comment && "editable" in comment && "status" in comment) {
    return comment
  }

  return {
    ...comment,
    editable: true,
    source: "local",
    status: "visible"
  }
}
</script>

<template>
  <section class="comment-thread" aria-labelledby="comment-thread-title">
    <AoiSection
      as="div"
      :title="title"
      :description="sectionDescription"
      title-id="comment-thread-title"
      :reveal="false"
    >
      <template #actions>
        <AoiSelect
          v-model="sortValue"
          class="comment-thread__sort"
          :label="sortLabel"
          appearance="outlined"
          :options="sortOptions"
          :disabled="!hydrated || comments.length < 2"
        />
      </template>
    </AoiSection>

    <PageState
      v-if="hydrated && comments.length === 0"
      icon="message-circle"
      :title="emptyTitle"
      :description="emptyDescription"
    />

    <AoiContentGrid v-else-if="hydrated" min-width="100%" gap="compact" :mobile-columns="1">
      <AoiReveal
        v-for="(comment, index) in commentItems"
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
