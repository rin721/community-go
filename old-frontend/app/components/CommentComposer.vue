<script setup lang="ts">
const props = withDefaults(defineProps<{
  authorName: string
  authorLabel?: string
  bodyLabel?: string
  bodyPlaceholder?: string
  bodyTooLongText?: string
  disabled?: boolean
  errorText?: string
  hint?: string
  authorReadonly?: boolean
  maxAuthorLength?: number
  maxBodyLength?: number
  submitRevision?: number
  submitLabel?: string
  submitting?: boolean
}>(), {
  authorLabel: undefined,
  bodyLabel: undefined,
  bodyPlaceholder: undefined,
  bodyTooLongText: undefined,
  disabled: false,
  errorText: undefined,
  hint: undefined,
  authorReadonly: false,
  maxAuthorLength: 24,
  maxBodyLength: 500,
  submitRevision: 0,
  submitLabel: undefined,
  submitting: false
})

const emit = defineEmits<{
  submit: [body: string]
  "update:authorName": [value: string]
}>()

const { t } = useI18n()
const body = ref("")

const localAuthorName = computed({
  get: () => props.authorName,
  set: (value) => emit("update:authorName", value)
})

const trimmedBody = computed(() => body.value.trim())
const bodyLength = computed(() => body.value.length)
const isBodyTooLong = computed(() => bodyLength.value > props.maxBodyLength)
const authorLabelText = computed(() => props.authorLabel || t("comments.composer.authorLabel"))
const bodyLabelText = computed(() => props.bodyLabel || t("comments.composer.bodyLabel"))
const bodyPlaceholderText = computed(() => props.bodyPlaceholder || t("comments.composer.bodyPlaceholder"))
const bodyTooLongText = computed(() => props.bodyTooLongText || t("comments.composer.bodyTooLong"))
const hintText = computed(() => props.hint || t("comments.composer.hint"))
const submitLabelText = computed(() => props.submitLabel || t("comments.composer.submit"))
const canSubmit = computed(() => {
  return !props.disabled
    && !props.submitting
    && localAuthorName.value.trim().length > 0
    && trimmedBody.value.length > 0
    && !isBodyTooLong.value
})

watch(() => props.submitRevision, () => {
  body.value = ""
})

function submitComment() {
  if (!canSubmit.value) {
    return
  }

  emit("submit", trimmedBody.value)
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
        :label="authorLabelText"
        :disabled="disabled || submitting"
        :readonly="authorReadonly"
        :max-length="maxAuthorLength"
      />
      <AoiTextField
        v-model="body"
        appearance="outlined"
        :label="bodyLabelText"
        :placeholder="bodyPlaceholderText"
        :disabled="disabled || submitting"
        :max-length="maxBodyLength"
        :supporting-text="`${bodyLength}/${maxBodyLength}`"
        :error-text="isBodyTooLong ? bodyTooLongText : undefined"
        multiline
        :rows="4"
      />
    </div>

    <AoiActionBar class="comment-composer__actions" align="between">
      <span class="comment-composer__hint">
        {{ hintText }}
      </span>
      <AoiButton tone="accent" variant="filled"
        type="submit"
        icon="send"
        :disabled="!canSubmit"
        :loading="submitting"
      >
        {{ submitLabelText }}
      </AoiButton>
    </AoiActionBar>

    <p v-if="errorText" class="comment-composer__error" role="alert">
      {{ errorText }}
    </p>
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

.comment-composer__error {
  margin: 0;
  color: var(--aoi-danger);
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
