<script setup lang="ts">
import type { CommentView } from "~/types/comments"

const authSession = useAuthSessionStore()

const props = withDefaults(defineProps<{
  canManage?: boolean
  comment: CommentView
  deleting?: boolean
  updating?: boolean
}>(), {
  canManage: false,
  deleting: false,
  updating: false
})

const emit = defineEmits<{
  delete: [comment: CommentView]
  update: [comment: CommentView, body: string]
}>()

const isEdited = computed(() => props.comment.updatedAt !== props.comment.createdAt)
const avatarUrl = computed(() => {
  if (props.comment.ownedByCurrentClient && authSession.profileAvatarUrl) {
    return authSession.profileAvatarUrl
  }
  const name = props.comment.authorName
  const mockAvatars: Record<string, string> = {
    "Rin721": "https://api.dicebear.com/7.x/adventurer/svg?seed=rin721",
    "Aoi Curator": "https://api.dicebear.com/7.x/adventurer/svg?seed=aoi-curator",
    "Color Note": "https://api.dicebear.com/7.x/adventurer/svg?seed=color-note",
    "Layout Notes": "https://api.dicebear.com/7.x/adventurer/svg?seed=layout-notes",
    "Aoi Lab": "https://api.dicebear.com/7.x/adventurer/svg?seed=aoi-lab",
    "Aoi Motion": "https://api.dicebear.com/7.x/adventurer/svg?seed=aoi-motion"
  }
  return mockAvatars[name] || null
})
const { locale, t } = useI18n()
const editing = ref(false)
const draftBody = ref(props.comment.body)
const trimmedDraftBody = computed(() => draftBody.value.trim())
const draftBodyLength = computed(() => draftBody.value.length)
const draftTooLong = computed(() => draftBodyLength.value > 500)
const canSave = computed(() => {
  return props.canManage
    && !props.updating
    && !props.deleting
    && trimmedDraftBody.value.length > 0
    && !draftTooLong.value
    && trimmedDraftBody.value !== props.comment.body
})

watch(() => props.comment.body, (body) => {
  if (!editing.value) {
    draftBody.value = body
  }
})

function formatTime(value: string) {
  return new Date(value).toLocaleString(locale.value, {
    dateStyle: "medium",
    timeStyle: "short"
  })
}

function startEditing() {
  if (!props.canManage || props.deleting || props.updating) {
    return
  }
  draftBody.value = props.comment.body
  editing.value = true
}

function cancelEditing() {
  draftBody.value = props.comment.body
  editing.value = false
}

function saveEditing() {
  if (!canSave.value) {
    return
  }
  emit("update", props.comment, trimmedDraftBody.value)
  editing.value = false
}

function deleteComment() {
  if (!props.canManage || props.deleting || props.updating) {
    return
  }
  emit("delete", props.comment)
}
</script>

<template>
  <AoiSurface as="article" class="comment-item" surface="card" padding="md">
    <div class="comment-item__avatar-wrapper">
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="comment.authorName"
        class="comment-item__avatar comment-item__avatar--img"
      />
      <div v-else class="comment-item__avatar" aria-hidden="true">
        {{ comment.authorName.slice(0, 1).toUpperCase() }}
      </div>
    </div>

    <div class="comment-item__content">
      <header class="comment-item__header">
        <div>
          <strong>{{ comment.authorName }}</strong>
          <span>{{ formatTime(comment.createdAt) }}</span>
          <small v-if="isEdited">{{ t("comments.item.edited") }}</small>
        </div>
        <div v-if="canManage" class="comment-item__actions">
          <AoiIconButton
            v-if="!editing"
            icon="pencil"
            :label="t('comments.item.editLabel')"
            size="sm"
            variant="plain"
            :disabled="updating || deleting"
            :loading="updating"
            @click="startEditing"
          />
          <AoiIconButton
            v-if="!editing"
            icon="trash-2"
            :label="t('comments.item.deleteLabel')"
            size="sm"
            variant="plain"
            :disabled="updating || deleting"
            :loading="deleting"
            @click="deleteComment"
          />
        </div>
      </header>

      <form v-if="editing" class="comment-item__editor" @submit.prevent="saveEditing">
        <AoiTextField
          v-model="draftBody"
          appearance="outlined"
          :label="t('comments.item.editBodyLabel')"
          :max-length="500"
          :supporting-text="`${draftBodyLength}/500`"
          :error-text="draftTooLong ? t('comments.item.bodyTooLong') : undefined"
          :disabled="updating || deleting"
          multiline
          :rows="3"
        />
        <AoiActionBar align="end" class="comment-item__editor-actions">
          <AoiButton
            size="sm"
            variant="plain"
            :disabled="updating"
            @click="cancelEditing"
          >
            {{ t("comments.item.cancel") }}
          </AoiButton>
          <AoiButton
            size="sm"
            tone="accent"
            variant="filled"
            type="submit"
            icon="check"
            :disabled="!canSave"
            :loading="updating"
          >
            {{ t("comments.item.save") }}
          </AoiButton>
        </AoiActionBar>
      </form>
      <p v-else class="comment-item__body">{{ comment.body }}</p>
    </div>
  </AoiSurface>
</template>

<style scoped>
.comment-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 12px;
}

.comment-item__avatar-wrapper {
  display: block;
  width: 38px;
  height: 38px;
}

.comment-item__avatar {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-accent-10);
  color: var(--aoi-accent-60);
  font-weight: 800;
}

.comment-item__avatar--img {
  object-fit: cover;
  border-radius: var(--aoi-radius-round);
}

.comment-item__content {
  display: grid;
  min-width: 0;
  gap: 10px;
}

.comment-item__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.comment-item__header div:first-child {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}

.comment-item__header strong {
  color: var(--aoi-text);
}

.comment-item__header span,
.comment-item__header small {
  color: var(--aoi-text-muted);
  font-size: 12px;
}

.comment-item__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
}

.comment-item__body {
  margin: 0;
  color: var(--aoi-text);
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-item__editor {
  display: grid;
  gap: 10px;
}

.comment-item__editor-actions {
  min-width: 0;
}

@media (max-width: 620px) {
  .comment-item {
    grid-template-columns: 1fr;
  }

  .comment-item__header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .comment-item__actions {
    justify-content: flex-start;
  }

}
</style>
