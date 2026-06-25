<script setup lang="ts">
const props = withDefaults(defineProps<{
  authorName: string
  disabled?: boolean
  hint?: string
  maxAuthorLength?: number
  maxBodyLength?: number
  submitLabel?: string
  submitting?: boolean
}>(), {
  disabled: false,
  hint: "本地评论只保存在当前浏览器。",
  maxAuthorLength: 24,
  maxBodyLength: 500,
  submitLabel: "发布评论",
  submitting: false
})

const emit = defineEmits<{
  submit: [body: string]
  "update:authorName": [value: string]
}>()

const body = ref("")

const localAuthorName = computed({
  get: () => props.authorName,
  set: (value) => emit("update:authorName", value)
})

const trimmedBody = computed(() => body.value.trim())
const bodyLength = computed(() => body.value.length)
const isBodyTooLong = computed(() => bodyLength.value > props.maxBodyLength)
const canSubmit = computed(() => {
  return !props.disabled
    && !props.submitting
    && localAuthorName.value.trim().length > 0
    && trimmedBody.value.length > 0
    && !isBodyTooLong.value
})

function submitComment() {
  if (!canSubmit.value) {
    return
  }

  emit("submit", trimmedBody.value)
  body.value = ""
}
</script>

<template>
  <AoiSurface
    as="form"
    class="comment-composer"
    surface="card"
    padding="md"
    reveal="rise"
    @submit.prevent="submitComment"
  >
    <div class="comment-composer__fields">
      <AoiTextField
        v-model="localAuthorName"
        appearance="outlined"
        label="显示名称"
        :disabled="disabled || submitting"
        :max-length="maxAuthorLength"
      />
      <AoiTextField
        v-model="body"
        appearance="outlined"
        label="写下你的想法"
        placeholder="保持友善，也欢迎补充观看笔记。"
        :disabled="disabled || submitting"
        :max-length="maxBodyLength"
        :supporting-text="`${bodyLength}/${maxBodyLength}`"
        :error-text="isBodyTooLong ? '评论内容过长' : undefined"
        multiline
        :rows="4"
      />
    </div>

    <AoiActionBar class="comment-composer__actions" align="between">
      <span class="comment-composer__hint">
        {{ hint }}
      </span>
      <AoiButton tone="accent" variant="filled"
        type="submit"
        icon="send"
        :disabled="!canSubmit"
      >
        {{ submitLabel }}
      </AoiButton>
    </AoiActionBar>
  </AoiSurface>
</template>

<style scoped>
.comment-composer {
  display: grid;
  gap: 12px;
}

.comment-composer__fields {
  display: grid;
  gap: 12px;
}

.comment-composer__hint {
  color: var(--aoi-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 620px) {
  .comment-composer__actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
