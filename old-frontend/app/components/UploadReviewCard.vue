<script setup lang="ts">
import type { UploadDraftVisibility, UploadDraftValidation } from "~/types/upload"

const props = defineProps<{
  categoryName: string
  description?: string
  statusLabel: string
  title?: string
  validation: UploadDraftValidation
  visibility: UploadDraftVisibility | string
}>()

const { t } = useI18n()

const visibilityLabel = computed(() => {
  if (props.visibility === "public") {
    return t("upload.visibility.public")
  }

  if (props.visibility === "unlisted") {
    return t("upload.visibility.unlisted")
  }

  return t("upload.visibility.private")
})

function validationText(value: string) {
  return value.startsWith("upload.") ? t(value) : value
}
</script>

<template>
  <div class="upload-review-card">
    <div class="upload-review-card__cover">
      <AoiIcon name="play" :size="30" decorative />
    </div>
    <h3>{{ props.title || t('upload.review.untitled') }}</h3>
    <p>{{ props.description || t('upload.review.emptyDescription') }}</p>

    <dl class="upload-review-card__meta">
      <div>
        <dt>{{ t('upload.review.category') }}</dt>
        <dd>{{ props.categoryName }}</dd>
      </div>
      <div>
        <dt>{{ t('upload.review.visibility') }}</dt>
        <dd>{{ visibilityLabel }}</dd>
      </div>
      <div>
        <dt>{{ t('upload.review.status') }}</dt>
        <dd>{{ props.statusLabel }}</dd>
      </div>
    </dl>

    <div class="upload-review-card__checklist">
      <p v-if="props.validation.missing.length === 0" class="upload-review-card__ok">
        {{ t('upload.review.ready') }}
      </p>
      <p v-for="item in props.validation.missing" v-else :key="item">
        <AoiIcon name="circle-alert" :size="15" decorative />
        {{ validationText(item) }}
      </p>
      <p v-for="item in props.validation.warnings" :key="item">
        <AoiIcon name="info" :size="15" decorative />
        {{ validationText(item) }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.upload-review-card {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.upload-review-card__cover {
  display: grid;
  aspect-ratio: 16 / 9;
  place-items: center;
  border-radius: var(--aoi-radius-card);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.22), transparent 45%),
    linear-gradient(135deg, var(--aoi-accent-40), #5b8def 48%, var(--aoi-sakura-50));
  color: #ffffff;
}

.upload-review-card h3,
.upload-review-card p,
.upload-review-card__meta,
.upload-review-card__meta dt,
.upload-review-card__meta dd {
  margin: 0;
}

.upload-review-card h3 {
  overflow-wrap: anywhere;
  font-size: 18px;
  line-height: 1.35;
}

.upload-review-card p,
.upload-review-card__meta dt,
.upload-review-card__checklist p {
  color: var(--aoi-text-muted);
}

.upload-review-card p {
  overflow-wrap: anywhere;
  line-height: 1.7;
}

.upload-review-card__meta,
.upload-review-card__meta div,
.upload-review-card__checklist {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.upload-review-card__meta div {
  grid-template-columns: 72px minmax(0, 1fr);
  border-top: 1px solid var(--aoi-border);
  padding-top: 8px;
}

.upload-review-card__meta dd {
  overflow-wrap: anywhere;
  color: var(--aoi-text);
  font-weight: 750;
}

.upload-review-card__checklist {
  border-top: 1px solid var(--aoi-border);
  padding-top: 10px;
}

.upload-review-card__checklist p {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.6;
}

.upload-review-card__ok {
  color: var(--aoi-accent-60) !important;
  font-weight: 750;
}
</style>
