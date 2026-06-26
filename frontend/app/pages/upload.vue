<script setup lang="ts">
import type {
  AoiApiErrorPayload,
  CommunitySubmissionItem,
  CommunitySubmissionVisibility
} from "~/types/api"
import type { UploadDraftValidation } from "~/types/upload"
import {
  findCategoryInTree,
  formatCategoryPath,
  getCategoryLeafNodes
} from "~~/shared/utils/categories"

type UploadStatusIntent = "danger" | "success"

const api = useAoiApi()
const authSession = useAuthSessionStore()
const drafts = useUploadDraftStore()
const library = useLibraryStore()
const { locale, t } = useI18n()
const tagInput = ref("")
const submissionAuthorName = ref("")
const submissionError = ref<string | null>(null)
const submissionReceipt = ref<CommunitySubmissionItem | null>(null)
const submissions = ref<CommunitySubmissionItem[]>([])
const submissionsError = ref<string | null>(null)
const submissionsLoaded = ref(false)
const submissionsPending = ref(false)
const submitting = ref(false)

const { data: categories, error: categoriesError, pending: categoriesPending, refresh: refreshCategories } = useAsyncData(
  "upload-categories",
  () => api.listCategories(),
  { default: () => [] }
)

const activeDraft = computed(() => drafts.activeDraft)
const dateLocale = computed(() => {
  if (locale.value === "ja") {
    return "ja-JP"
  }
  if (locale.value === "en") {
    return "en-US"
  }
  return "zh-CN"
})
const validation = computed<UploadDraftValidation>(() => activeDraft.value
  ? drafts.validateDraft(activeDraft.value)
  : { missing: ["upload.validation.createDraft"], ready: false, warnings: [] })
const categoryOptions = computed(() => categories.value
  .flatMap((category) => category.slug === "home" ? [] : [category])
  .flatMap((category) => getCategoryLeafNodes([category]))
  .map((category) => ({ label: formatCategoryPath(category), value: category.slug })))
const visibilityOptions = computed(() => [
  { label: t("upload.visibility.public"), value: "public" },
  { label: t("upload.visibility.unlisted"), value: "unlisted" },
  { label: t("upload.visibility.private"), value: "private" }
])
const statusLabel = computed(() => draftStatusLabel(activeDraft.value?.status))
const selectedCategoryName = computed(() => {
  const slug = activeDraft.value?.categorySlug
  const category = slug ? findCategoryInTree(categories.value, slug) : null

  return category ? formatCategoryPath(category) : t("upload.categoryUnselected")
})
const lastSavedLabel = computed(() => activeDraft.value
  ? formatDate(activeDraft.value.updatedAt)
  : t("upload.emptyValue"))
const communityAccountActive = computed(() => authSession.authenticated)
const submissionAuthorField = computed({
  get: () => communityAccountActive.value
    ? authSession.session?.account.displayName || authSession.session?.account.handle || t("upload.fields.accountAuthor")
    : submissionAuthorName.value,
  set: (value: string) => {
    if (!communityAccountActive.value) {
      submissionAuthorName.value = value
    }
  }
})
const canSubmit = computed(() => Boolean(
  activeDraft.value?.source &&
  validation.value.ready &&
  (communityAccountActive.value || submissionAuthorName.value.trim()) &&
  !submitting.value
))
const submitStatusMessage = computed(() => {
  if (submissionError.value) {
    return submissionError.value
  }
  if (submissionReceipt.value) {
    return t("upload.submission.success", { id: submissionReceipt.value.id })
  }
  return ""
})
const submitStatusIntent = computed<UploadStatusIntent>(() => submissionError.value ? "danger" : "success")
const isDraftsLoading = computed(() => !drafts.hydrated)
const isSubmissionsLoading = computed(() => submissionsPending.value && !submissionsLoaded.value)
const isSourceSyncing = computed(() => categoriesPending.value || submissionsPending.value || isDraftsLoading.value)
const sourceLabel = computed(() => {
  if (isSourceSyncing.value) {
    return t("upload.sourceStatus.syncing")
  }
  if (categoriesError.value || submissionsError.value) {
    return t("upload.sourceStatus.error")
  }
  return t("upload.sourceStatus.ready", {
    categories: formatCount(categoryOptions.value.length),
    submissions: formatCount(submissions.value.length)
  })
})
const uploadStats = computed(() => [
  {
    description: t("upload.stats.draftsDescription"),
    icon: "files",
    label: t("upload.stats.drafts"),
    value: formatCount(drafts.draftCount)
  },
  {
    description: t("upload.stats.readyDescription"),
    icon: "badge-check",
    label: t("upload.stats.ready"),
    value: formatCount(drafts.readyCount)
  },
  {
    description: t("upload.stats.submittedDescription"),
    icon: "send",
    label: t("upload.stats.submitted"),
    value: formatCount(drafts.submittedCount)
  },
  {
    description: t("upload.stats.remoteDescription"),
    icon: "sparkles",
    label: t("upload.stats.remote"),
    value: formatCount(submissions.value.length)
  }
])
const submissionSummary = computed(() => submissionsError.value
  ? submissionsError.value
  : t("upload.submissions.description", {
      count: formatCount(submissions.value.length)
    }))
const categoryStatusMessage = computed(() => categoriesError.value ? t("upload.categoryLoadError") : "")

const draftTitle = computed({
  get: () => activeDraft.value?.title || "",
  set: (value: string) => drafts.updateActiveDraft({ title: value })
})
const draftDescription = computed({
  get: () => activeDraft.value?.description || "",
  set: (value: string) => drafts.updateActiveDraft({ description: value })
})
const draftCategory = computed({
  get: () => activeDraft.value?.categorySlug || "design",
  set: (value: string) => drafts.updateActiveDraft({ categorySlug: value })
})
const draftVisibility = computed({
  get: () => activeDraft.value?.visibility || "public",
  set: (value: string) => {
    if (value === "public" || value === "unlisted" || value === "private") {
      drafts.updateActiveDraft({ visibility: value })
    }
  }
})
const allowComments = computed({
  get: () => activeDraft.value?.allowComments ?? true,
  set: (value: boolean) => drafts.updateActiveDraft({ allowComments: value })
})
const sensitive = computed({
  get: () => activeDraft.value?.sensitive ?? false,
  set: (value: boolean) => drafts.updateActiveDraft({ sensitive: value })
})

watch(() => drafts.hydrated, (hydrated) => {
  if (hydrated && !drafts.activeDraft) {
    drafts.createDraft()
  }
}, { immediate: true })

onMounted(() => {
  submissionAuthorName.value = submissionAuthorName.value || t("upload.defaultAuthor")
  void refreshSessionAndSubmissions()
})

function onFileSelected(files: File[]) {
  const file = files[0]

  if (!file) {
    return
  }

  drafts.setActiveSource({
    name: file.name,
    size: file.size,
    type: file.type || "video/*"
  })
}

function addTag(event?: KeyboardEvent) {
  event?.preventDefault()

  const tag = tagInput.value.trim().replace(/^#/, "")

  if (!tag || !activeDraft.value) {
    return
  }

  drafts.updateActiveDraft({
    tags: [...activeDraft.value.tags, tag]
  })
  tagInput.value = ""
}

async function refreshSessionAndSubmissions() {
  if (!authSession.hydrated) {
    await authSession.refreshSession({ silent: true })
  }
  await refreshSubmissions()
}

function removeTag(tag: string) {
  if (!activeDraft.value) {
    return
  }

  drafts.updateActiveDraft({
    tags: activeDraft.value.tags.filter((item) => item !== tag)
  })
}

async function submitActiveDraft() {
  const draft = activeDraft.value
  const source = draft?.source

  if (!draft || !source || !canSubmit.value) {
    return
  }

  submitting.value = true
  submissionError.value = null

  try {
    const submission = {
      allowComments: draft.allowComments,
      categorySlug: draft.categorySlug,
      description: draft.description,
      sensitive: draft.sensitive,
      sourceName: source.name,
      sourceSize: source.size,
      sourceType: source.type || "video/*",
      tags: draft.tags,
      title: draft.title,
      visibility: draft.visibility as CommunitySubmissionVisibility
    }
    const item = communityAccountActive.value
      ? await api.createCommunityAccountSubmission(submission)
      : await api.createCommunitySubmission({
          ...submission,
          authorName: submissionAuthorName.value.trim(),
          clientId: ensureCommunityClientId()
        })
    submissionReceipt.value = item
    drafts.updateDraft(draft.id, {
      status: "submitted",
      submittedAt: item.createdAt,
      submissionId: item.id
    })
    await refreshSubmissions()
  } catch (error) {
    submissionReceipt.value = null
    submissionError.value = apiErrorMessage(error)
  } finally {
    submitting.value = false
  }
}

async function refreshSubmissions() {
  if (!import.meta.client) {
    return
  }

  submissionsPending.value = true
  submissionsError.value = null
  try {
    const payload = communityAccountActive.value
      ? await api.getCommunityAccountSubmissions(12)
      : await api.getCommunitySubmissions(ensureCommunityClientId(), 12)
    submissions.value = payload.items.items
  } catch (error) {
    submissions.value = []
    submissionsError.value = apiErrorMessage(error)
  } finally {
    submissionsPending.value = false
    submissionsLoaded.value = true
  }
}

async function refreshUploadData() {
  await Promise.all([
    refreshCategories(),
    refreshSessionAndSubmissions()
  ])
}

function deleteActiveDraft() {
  if (activeDraft.value) {
    drafts.deleteDraft(activeDraft.value.id)
  }

  if (drafts.hydrated && !drafts.activeDraft) {
    drafts.createDraft()
  }
}

function formatBytes(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(dateLocale.value, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  })
}

function formatCount(value: number) {
  return new Intl.NumberFormat(dateLocale.value, {
    maximumFractionDigits: 1,
    notation: value >= 1000 ? "compact" : "standard"
  }).format(value)
}

function draftStatusLabel(status?: string) {
  if (status === "submitted") {
    return t("upload.status.submitted")
  }
  return status ? t("upload.status.draft") : t("upload.status.none")
}

function submissionStatusLabel(status: string) {
  if (status === "pending_review") {
    return t("upload.submissions.pendingReview")
  }

  return status
}

function visibilityLabelFor(value: string) {
  if (value === "public") {
    return t("upload.visibility.public")
  }
  if (value === "unlisted") {
    return t("upload.visibility.unlisted")
  }
  return t("upload.visibility.private")
}

function ensureCommunityClientId() {
  if (import.meta.client && !library.hydrated) {
    library.restore()
  }

  return library.ensureClientId()
}

function apiErrorMessage(error: unknown) {
  const apiError = error as Partial<AoiApiErrorPayload>

  return apiError.message || t("upload.submission.error")
}

function selectDraft(id: string) {
  drafts.selectDraft(id)
}

useHead(() => ({
  title: t("upload.headTitle")
}))
</script>

<template>
  <div class="aoi-page upload-page">
    <section v-aoi-reveal="'rise'" class="upload-hero" :aria-label="t('upload.title')">
      <PageHeader
        icon="upload"
        :eyebrow="t('upload.eyebrow')"
        :title="t('upload.title')"
        :description="t('upload.description')"
      >
        <template #actions>
          <AoiButton
            tone="accent"
            variant="tonal"
            icon="file-plus-2"
            :disabled="!drafts.hydrated"
            @click="drafts.createDraft()"
          >
            {{ t('upload.newDraft') }}
          </AoiButton>
          <AoiButton
            tone="neutral"
            variant="outlined"
            icon="refresh-cw"
            :loading="isSourceSyncing"
            @click="refreshUploadData"
          >
            {{ t('upload.refresh') }}
          </AoiButton>
        </template>
      </PageHeader>

      <div class="upload-hero__meta">
        <p class="upload-hero__source">
          <AoiIcon name="sparkles" :size="14" decorative />
          {{ sourceLabel }}
        </p>
      </div>

      <div class="upload-hero__mobile-actions">
        <AoiButton
          tone="accent"
          variant="tonal"
          icon="file-plus-2"
          :disabled="!drafts.hydrated"
          @click="drafts.createDraft()"
        >
          {{ t('upload.newDraft') }}
        </AoiButton>
        <AoiButton
          tone="neutral"
          variant="outlined"
          icon="refresh-cw"
          :loading="isSourceSyncing"
          @click="refreshUploadData"
        >
          {{ t('upload.refresh') }}
        </AoiButton>
      </div>
    </section>

    <AoiStatGrid
      v-if="drafts.hydrated"
      class="upload-page__stats"
      :items="uploadStats"
      :columns="4"
      reveal="fade"
    />

    <section
      v-if="isDraftsLoading"
      class="upload-loading"
      :aria-label="t('upload.loadingTitle')"
      aria-live="polite"
    >
      <span class="upload-loading__sr">
        {{ t("upload.loadingTitle") }}. {{ t("upload.loadingDescription") }}
      </span>
      <div class="upload-loading__header" aria-hidden="true">
        <span class="upload-loading__line upload-loading__line--title" />
        <span class="upload-loading__line" />
      </div>
      <div class="upload-loading__columns" aria-hidden="true">
        <span class="upload-loading__panel" />
        <span class="upload-loading__panel upload-loading__panel--side" />
      </div>
    </section>

    <div v-else class="upload-workspace">
      <main class="upload-workspace__main">
        <PageState
          v-if="!activeDraft"
          icon="file-plus-2"
          :title="t('upload.empty.title')"
          :description="t('upload.empty.description')"
          action-icon="file-plus-2"
          :action-label="t('upload.newDraft')"
          @action="drafts.createDraft()"
        />

        <template v-else>
          <AoiSurface
            as="section"
            class="upload-panel"
            surface="panel"
            padding="lg"
            :reveal="{ variant: 'rise', index: 0 }"
          >
            <div class="upload-panel__title">
              <h2>{{ t('upload.source.title') }}</h2>
              <span>{{ statusLabel }}</span>
            </div>

            <UploadDropZone
              :source="activeDraft.source"
              :format-bytes="formatBytes"
              :empty-title="t('upload.source.emptyTitle')"
              :empty-description="t('upload.source.emptyDescription')"
              :choose-label="t('upload.source.choose')"
              :replace-label="t('upload.source.replace')"
              @change="onFileSelected"
            />
          </AoiSurface>

          <AoiSurface
            as="section"
            class="upload-panel"
            surface="panel"
            padding="lg"
            :reveal="{ variant: 'rise', index: 1 }"
          >
            <div class="upload-panel__title">
              <h2>{{ t('upload.basic.title') }}</h2>
              <span>{{ t('upload.lastSaved', { value: lastSavedLabel }) }}</span>
            </div>

            <AoiStatusMessage
              v-if="categoryStatusMessage"
              intent="danger"
              icon="cloud-alert"
            >
              {{ categoryStatusMessage }}
            </AoiStatusMessage>

            <div class="upload-form-grid">
              <AoiTextField
                v-model="draftTitle"
                :label="t('upload.fields.title')"
                appearance="outlined"
                :placeholder="t('upload.fields.titlePlaceholder')"
                :supporting-text="t('upload.fields.titleHelp')"
              />
              <AoiTextField
                v-model="submissionAuthorField"
                :label="t('upload.fields.author')"
                appearance="outlined"
                :placeholder="t('upload.fields.authorPlaceholder')"
                :supporting-text="communityAccountActive ? t('upload.fields.accountAuthorHelp') : t('upload.fields.authorHelp')"
                :disabled="communityAccountActive"
              />
            </div>

            <div class="upload-form-grid">
              <AoiSelect
                v-model="draftCategory"
                :label="t('upload.fields.category')"
                appearance="outlined"
                :disabled="categoriesPending || categoryOptions.length === 0"
                :options="categoryOptions"
              />
              <AoiSelect
                v-model="draftVisibility"
                :label="t('upload.fields.visibility')"
                appearance="outlined"
                :options="visibilityOptions"
              />
            </div>

            <AoiTextField
              v-model="draftDescription"
              :label="t('upload.fields.description')"
              appearance="outlined"
              :placeholder="t('upload.fields.descriptionPlaceholder')"
              :supporting-text="t('upload.fields.descriptionHelp')"
              multiline
              :rows="5"
              :max-length="600"
            />

            <div class="upload-form-grid upload-form-grid--checks">
              <div class="upload-checks">
                <AoiCheckbox v-model="allowComments" :label="t('upload.fields.allowComments')" />
                <AoiCheckbox v-model="sensitive" :label="t('upload.fields.sensitive')" />
              </div>
            </div>

            <div class="upload-tags">
              <div class="upload-tags__input">
                <AoiTextField
                  v-model="tagInput"
                  :label="t('upload.fields.tags')"
                  appearance="outlined"
                  :placeholder="t('upload.fields.tagsPlaceholder')"
                  :supporting-text="t('upload.fields.tagsHelp')"
                  @enter="addTag"
                />
                <AoiButton tone="accent" variant="outlined" icon="plus" @click="addTag()">
                  {{ t('upload.addTag') }}
                </AoiButton>
              </div>
              <div v-if="activeDraft.tags.length" class="upload-tags__list" :aria-label="t('upload.tagsAriaLabel')">
                <AoiChip
                  v-for="tag in activeDraft.tags"
                  :key="tag"
                  :label="`# ${tag}`"
                  removable
                  :remove-label="t('upload.removeTag', { tag })"
                  @remove="removeTag(tag)"
                />
              </div>
            </div>
          </AoiSurface>

          <AoiActionBar reveal="fade" :label="t('upload.actionBarLabel')">
            <AoiButton
              tone="accent"
              variant="filled"
              icon="send"
              :loading="submitting"
              :disabled="!canSubmit"
              @click="submitActiveDraft"
            >
              {{ t('upload.submit') }}
            </AoiButton>
            <AoiButton icon="trash-2" @click="deleteActiveDraft">
              {{ t('upload.deleteDraft') }}
            </AoiButton>
          </AoiActionBar>

          <AoiStatusMessage
            v-if="submitStatusMessage"
            :intent="submitStatusIntent"
            :icon="submissionError ? 'circle-alert' : 'circle-check'"
          >
            {{ submitStatusMessage }}
          </AoiStatusMessage>
        </template>
      </main>

      <aside class="upload-workspace__side">
        <AoiSurface
          as="section"
          class="upload-panel"
          surface="panel"
          padding="lg"
          :reveal="{ variant: 'slide-left', index: 0 }"
        >
          <div class="upload-panel__title">
            <h2>{{ t('upload.drafts.title') }}</h2>
            <span>{{ drafts.draftCount }}</span>
          </div>

          <UploadDraftList
            :drafts="drafts.draftList"
            :active-id="activeDraft?.id"
            @select="selectDraft"
          />
        </AoiSurface>

        <AoiSurface
          as="section"
          class="upload-panel"
          surface="panel"
          padding="lg"
          :reveal="{ variant: 'slide-left', index: 1 }"
        >
          <div class="upload-panel__title">
            <h2>{{ t('upload.review.title') }}</h2>
            <span>{{ validation.ready ? t('upload.review.readyShort') : t('upload.review.incompleteShort') }}</span>
          </div>

          <UploadReviewCard
            :title="activeDraft?.title"
            :description="activeDraft?.description"
            :category-name="selectedCategoryName"
            :visibility="draftVisibility"
            :status-label="statusLabel"
            :validation="validation"
          />
        </AoiSurface>

        <AoiSurface
          as="section"
          class="upload-panel"
          surface="panel"
          padding="lg"
          :reveal="{ variant: 'slide-left', index: 2 }"
        >
          <div class="upload-panel__title">
            <h2>{{ t('upload.submissions.title') }}</h2>
            <span>{{ submissionsPending ? t('upload.submissions.loading') : formatCount(submissions.length) }}</span>
          </div>

          <p class="upload-panel__description">
            {{ submissionSummary }}
          </p>

          <div class="upload-panel__actions">
            <AoiButton
              tone="accent"
              variant="outlined"
              size="sm"
              icon="refresh-cw"
              :loading="submissionsPending"
              @click="refreshSubmissions"
            >
              {{ t('upload.submissions.refresh') }}
            </AoiButton>
          </div>

          <div v-if="isSubmissionsLoading" class="upload-submission-loading" aria-hidden="true">
            <span v-for="item in 3" :key="item" class="upload-submission-loading__card" />
          </div>

          <PageState
            v-else-if="submissionsError"
            icon="cloud-alert"
            :title="t('upload.submissions.errorTitle')"
            :description="t('upload.submissions.errorDescription')"
            action-icon="refresh-cw"
            :action-label="t('upload.submissions.refresh')"
            @action="refreshSubmissions"
          />

          <div v-else-if="submissions.length" class="upload-submission-list" role="list">
            <article
              v-for="item in submissions"
              :key="item.id"
              class="upload-submission-list__item"
              role="listitem"
            >
              <div class="upload-submission-list__heading">
                <strong>{{ item.title }}</strong>
                <span>{{ submissionStatusLabel(item.status) }}</span>
              </div>
              <p>{{ item.description || t('upload.review.emptyDescription') }}</p>
              <dl class="upload-submission-list__meta">
                <div>
                  <dt>{{ t('upload.review.category') }}</dt>
                  <dd>{{ item.category?.name || item.categorySlug }}</dd>
                </div>
                <div>
                  <dt>{{ t('upload.review.visibility') }}</dt>
                  <dd>{{ visibilityLabelFor(item.visibility) }}</dd>
                </div>
                <div>
                  <dt>{{ t('upload.submissions.fileSize') }}</dt>
                  <dd>{{ formatBytes(item.sourceSize) }}</dd>
                </div>
                <div>
                  <dt>{{ t('upload.submissions.createdAt') }}</dt>
                  <dd>{{ formatDate(item.createdAt) }}</dd>
                </div>
              </dl>
              <div v-if="item.tags.length" class="upload-submission-list__tags" :aria-label="t('upload.tagsAriaLabel')">
                <span v-for="tag in item.tags" :key="tag"># {{ tag }}</span>
              </div>
            </article>
          </div>
          <p v-else class="upload-empty-note">
            {{ t('upload.submissions.empty') }}
          </p>
        </AoiSurface>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.upload-page {
  display: grid;
  gap: 18px;
}

.upload-hero {
  position: relative;
  display: grid;
  min-width: 0;
  gap: 14px;
  overflow: visible;
  border: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.upload-hero :deep(.page-header) {
  margin: 0;
}

.upload-hero :deep(.page-header__description) {
  max-width: 780px;
  text-wrap: pretty;
}

.upload-hero__meta,
.upload-hero__mobile-actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
}

.upload-hero__source {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--aoi-surface-border);
  border-radius: var(--aoi-radius-round);
  background: color-mix(in srgb, var(--aoi-surface-solid) 76%, transparent);
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 760;
  line-height: 1.5;
  margin: 0;
  overflow-wrap: anywhere;
  padding: 6px 10px;
}

.upload-hero__mobile-actions {
  display: none;
}

.upload-page__stats {
  min-width: 0;
}

.upload-loading {
  position: relative;
  display: grid;
  gap: 16px;
  overflow: hidden;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-surface);
  box-shadow: var(--aoi-shadow-sm);
  padding: 18px;
}

.upload-loading__sr {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.upload-loading__header {
  display: grid;
  gap: 10px;
}

.upload-loading__line,
.upload-loading__panel,
.upload-submission-loading__card {
  background: linear-gradient(110deg, var(--aoi-accent-10), var(--aoi-surface-muted), var(--aoi-accent-10));
  background-size: 200% 100%;
  animation: upload-loading-shimmer 1.2s var(--aoi-ease-out) infinite;
}

.upload-loading__line {
  display: block;
  width: min(100%, 640px);
  height: 10px;
  border-radius: var(--aoi-radius-round);
}

.upload-loading__line--title {
  width: min(52%, 320px);
  height: 18px;
}

.upload-loading__columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
}

.upload-loading__panel {
  min-height: 360px;
  border-radius: var(--aoi-radius-sm);
}

.upload-loading__panel--side {
  min-height: 260px;
}

.upload-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
  align-items: start;
}

.upload-workspace__main,
.upload-workspace__side {
  display: grid;
  min-width: 0;
  gap: 14px;
}

.upload-panel {
  display: grid;
  min-width: 0;
  gap: 14px;
}

.upload-panel__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.upload-panel__title h2 {
  margin: 0;
  font-size: 16px;
}

.upload-panel__title span {
  color: var(--aoi-text-muted);
  overflow-wrap: anywhere;
  text-align: end;
}

.upload-panel__description {
  margin: -4px 0 0;
  color: var(--aoi-text-muted);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.upload-panel__actions {
  display: flex;
  justify-content: flex-start;
}

.upload-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 260px);
  gap: 12px;
}

.upload-form-grid--checks {
  grid-template-columns: 1fr;
}

.upload-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
}

.upload-tags {
  display: grid;
  gap: 10px;
}

.upload-tags__input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
}

.upload-tags__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.upload-submission-list {
  display: grid;
  gap: 10px;
}

.upload-submission-list__item {
  display: grid;
  min-width: 0;
  gap: 10px;
  border: 1px solid var(--aoi-surface-border);
  border-radius: var(--aoi-radius-card);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-accent-10) 44%, transparent), transparent 58%),
    var(--aoi-card-bg);
  padding: 12px;
  transition:
    border-color var(--aoi-motion-fast) var(--aoi-ease-out),
    transform var(--aoi-motion-fast) var(--aoi-ease-out);
}

.upload-submission-list__item:hover,
.upload-submission-list__item:focus-within {
  border-color: var(--aoi-surface-border-hover);
  transform: translate3d(0, -1px, 0);
}

.upload-submission-list__heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
}

.upload-submission-list__heading span,
.upload-submission-list__tags span {
  border: 1px solid var(--aoi-surface-border);
  border-radius: var(--aoi-radius-round);
  background: color-mix(in srgb, var(--aoi-surface-solid) 76%, transparent);
  color: var(--aoi-accent-60);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.5;
  padding: 4px 8px;
}

.upload-submission-list__item strong,
.upload-submission-list__item p,
.upload-submission-list__meta,
.upload-submission-list__meta dt,
.upload-submission-list__meta dd,
.upload-empty-note {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.upload-submission-list__item strong {
  font-size: 14px;
  line-height: 1.45;
}

.upload-submission-list__item p,
.upload-submission-list__meta dt,
.upload-empty-note {
  color: var(--aoi-text-muted);
}

.upload-submission-list__item p {
  line-height: 1.6;
}

.upload-submission-list__meta {
  display: grid;
  gap: 8px;
}

.upload-submission-list__meta div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
}

.upload-submission-list__meta dd {
  color: var(--aoi-text);
  font-weight: 750;
}

.upload-submission-list__tags,
.upload-submission-loading {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px;
}

.upload-submission-loading {
  display: grid;
}

.upload-submission-loading__card {
  min-height: 92px;
  border-radius: var(--aoi-radius-card);
}

.upload-empty-note {
  line-height: 1.7;
}

@media (max-width: 960px) {
  .upload-loading__columns,
  .upload-workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .upload-hero__meta,
  .upload-hero__mobile-actions {
    display: grid;
  }

  .upload-form-grid,
  .upload-tags__input,
  .upload-submission-list__heading {
    grid-template-columns: 1fr;
  }

  .upload-tags__input :deep(.aoi-button),
  .upload-hero__mobile-actions :deep(.aoi-button) {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .upload-loading__line,
  .upload-loading__panel,
  .upload-submission-loading__card {
    animation: none;
  }

  .upload-submission-list__item {
    transition: none;
  }

  .upload-submission-list__item:hover,
  .upload-submission-list__item:focus-within {
    transform: none;
  }
}

@keyframes upload-loading-shimmer {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -80% 0;
  }
}
</style>
