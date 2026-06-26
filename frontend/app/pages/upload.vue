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

const api = useAoiApi()
const drafts = useUploadDraftStore()
const library = useLibraryStore()
const { locale, t } = useI18n()
const tagInput = ref("")
const submissionAuthorName = ref("")
const submissionError = ref<string | null>(null)
const submissionReceipt = ref<CommunitySubmissionItem | null>(null)
const submissions = ref<CommunitySubmissionItem[]>([])
const submissionsPending = ref(false)
const submitting = ref(false)

const { data: categories, pending: categoriesPending } = useAsyncData(
  "upload-categories",
  () => api.listCategories(),
  { default: () => [] }
)

const activeDraft = computed(() => drafts.activeDraft)
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
const canSubmit = computed(() => Boolean(
  activeDraft.value?.source &&
  validation.value.ready &&
  submissionAuthorName.value.trim() &&
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
const submitStatusIntent = computed<"danger" | "success">(() => submissionError.value ? "danger" : "success")

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
  void refreshSubmissions()
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
    const item = await api.createCommunitySubmission({
      allowComments: draft.allowComments,
      authorName: submissionAuthorName.value.trim(),
      categorySlug: draft.categorySlug,
      clientId: ensureCommunityClientId(),
      description: draft.description,
      sensitive: draft.sensitive,
      sourceName: source.name,
      sourceSize: source.size,
      sourceType: source.type || "video/*",
      tags: draft.tags,
      title: draft.title,
      visibility: draft.visibility as CommunitySubmissionVisibility
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
  try {
    const payload = await api.getCommunitySubmissions(ensureCommunityClientId(), 12)
    submissions.value = payload.items.items
  } catch {
    submissions.value = []
  } finally {
    submissionsPending.value = false
  }
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
  return new Date(value).toLocaleString(locale.value, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  })
}

function draftStatusLabel(status?: string) {
  if (status === "submitted") {
    return t("upload.status.submitted")
  }
  return status ? t("upload.status.draft") : t("upload.status.none")
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

useHead({
  title: t("upload.headTitle")
})
</script>

<template>
  <div class="aoi-page">
    <PageHeader
      icon="upload"
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
      </template>
    </PageHeader>

    <div v-if="drafts.hydrated" class="upload-workspace">
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

            <div class="upload-form-grid">
              <AoiTextField
                v-model="draftTitle"
                :label="t('upload.fields.title')"
                appearance="outlined"
                :placeholder="t('upload.fields.titlePlaceholder')"
                :supporting-text="t('upload.fields.titleHelp')"
              />
              <AoiTextField
                v-model="submissionAuthorName"
                :label="t('upload.fields.author')"
                appearance="outlined"
                :placeholder="t('upload.fields.authorPlaceholder')"
                :supporting-text="t('upload.fields.authorHelp')"
              />
            </div>

            <div class="upload-form-grid">
              <AoiSelect
                v-model="draftCategory"
                :label="t('upload.fields.category')"
                appearance="outlined"
                :disabled="categoriesPending"
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
            <span>{{ submissionsPending ? t('upload.submissions.loading') : submissions.length }}</span>
          </div>

          <div v-if="submissions.length" class="upload-submission-list">
            <div
              v-for="item in submissions"
              :key="item.id"
              class="upload-submission-list__item"
            >
              <strong>{{ item.title }}</strong>
              <span>{{ item.category?.name || item.categorySlug }} · {{ t('upload.status.submitted') }}</span>
              <small>{{ formatDate(item.createdAt) }}</small>
            </div>
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
  gap: 8px;
}

.upload-submission-list__item {
  display: grid;
  gap: 3px;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  padding: 10px 12px;
}

.upload-submission-list__item strong,
.upload-submission-list__item span,
.upload-submission-list__item small,
.upload-empty-note {
  min-width: 0;
  overflow-wrap: anywhere;
}

.upload-submission-list__item strong {
  font-size: 14px;
  line-height: 1.45;
}

.upload-submission-list__item span,
.upload-submission-list__item small,
.upload-empty-note {
  color: var(--aoi-text-muted);
}

.upload-empty-note {
  margin: 0;
  line-height: 1.7;
}

@media (max-width: 960px) {
  .upload-workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .upload-form-grid,
  .upload-tags__input {
    grid-template-columns: 1fr;
  }
}
</style>
