<script setup lang="ts">
import type { CommentSortMode, CommentView } from "~/types/comments"

const props = withDefaults(defineProps<{
  actionError?: string
  comments: CommentView[]
  deletingCommentId?: string
  description?: string
  emptyDescription?: string
  emptyTitle?: string
  hydrated?: boolean
  sortLabel?: string
  sortMode?: CommentSortMode
  title?: string
  updatingCommentId?: string
}>(), {
  actionError: undefined,
  description: undefined,
  deletingCommentId: "",
  emptyDescription: undefined,
  emptyTitle: undefined,
  hydrated: false,
  sortLabel: undefined,
  sortMode: "newest",
  title: undefined,
  updatingCommentId: ""
})

const emit = defineEmits<{
  delete: [comment: CommentView]
  update: [comment: CommentView, body: string]
  "update:sortMode": [value: CommentSortMode]
}>()

const { t } = useI18n()
const sortValue = computed({
  get: () => props.sortMode,
  set: (value) => emit("update:sortMode", value as CommentSortMode)
})

const titleText = computed(() => props.title || t("comments.thread.title"))
const emptyTitleText = computed(() => props.emptyTitle || t("comments.thread.emptyTitle"))
const emptyDescriptionText = computed(() => props.emptyDescription || t("comments.thread.emptyDescription"))
const sortLabelText = computed(() => props.sortLabel || t("comments.thread.sort"))
const sortOptions = computed(() => [
  { label: t("comments.thread.newest"), value: "newest" },
  { label: t("comments.thread.oldest"), value: "oldest" }
])
const sectionDescription = computed(() => props.description || t("comments.thread.description", { count: props.comments.length }))
</script>

<template>
  <section class="comment-thread" aria-labelledby="comment-thread-title">
    <AoiSection
      as="div"
      :title="titleText"
      :description="sectionDescription"
      title-id="comment-thread-title"
      :reveal="false"
    >
      <template #actions>
        <AoiSelect
          v-model="sortValue"
          class="comment-thread__sort"
          :label="sortLabelText"
          appearance="outlined"
          :options="sortOptions"
          :disabled="!hydrated || comments.length < 2"
        />
      </template>
    </AoiSection>

    <AoiStatusMessage
      v-if="actionError"
      intent="danger"
      :message="actionError"
    />

    <PageState
      v-if="hydrated && comments.length === 0"
      icon="message-circle"
      :title="emptyTitleText"
      :description="emptyDescriptionText"
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
          :can-manage="Boolean(comment.ownedByCurrentClient)"
          :deleting="deletingCommentId === comment.id"
          :updating="updatingCommentId === comment.id"
          @delete="emit('delete', $event)"
          @update="(comment, body) => emit('update', comment, body)"
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
