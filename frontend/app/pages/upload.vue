<script setup lang="ts">
import {
  findCategoryInTree,
  formatCategoryPath,
  getCategoryLeafNodes
} from "~~/shared/utils/categories"

const api = useAoiApi()
const drafts = useUploadDraftStore()
const tagInput = ref("")

const { data: categories, pending: categoriesPending } = useAsyncData(
  "upload-categories",
  () => api.listCategories(),
  { default: () => [] }
)

const activeDraft = computed(() => drafts.activeDraft)
const validation = computed(() => activeDraft.value
  ? drafts.validateDraft(activeDraft.value)
  : { missing: ["创建一个草稿"], ready: false, warnings: [] })
const categoryOptions = computed(() => categories.value
  .flatMap((category) => category.slug === "home" ? [] : [category])
  .flatMap((category) => getCategoryLeafNodes([category]))
  .map((category) => ({ label: formatCategoryPath(category), value: category.slug })))
const visibilityOptions = [
  { label: "公开", value: "public" },
  { label: "不公开链接", value: "unlisted" },
  { label: "私密草稿", value: "private" }
]
const statusLabel = computed(() => {
  if (!activeDraft.value) {
    return "无草稿"
  }

  return activeDraft.value.status === "queued-local" ? "已本地排队" : "草稿自动保存"
})
const selectedCategoryName = computed(() => {
  const slug = activeDraft.value?.categorySlug
  const category = slug ? findCategoryInTree(categories.value, slug) : null

  return category ? formatCategoryPath(category) : "未选择"
})
const lastSavedLabel = computed(() => {
  if (!activeDraft.value) {
    return "暂无"
  }

  return new Date(activeDraft.value.updatedAt).toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  })
})

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

function selectDraft(id: string) {
  drafts.selectDraft(id)
}

useHead({
  title: "Upload - Aoi"
})
</script>

<template>
  <div class="aoi-page">
    <PageHeader
      icon="upload"
      title="投稿工作台"
      description="当前只保存浏览器本地草稿，帮助前端先跑通创作信息流；真实上传、审核和转码留给未来 Go 后端。"
    >
      <template #actions>
        <AoiButton tone="accent"
          variant="tonal"
          icon="file-plus-2"
          :disabled="!drafts.hydrated"
          @click="drafts.createDraft()"
        >
          新建草稿
        </AoiButton>
      </template>
    </PageHeader>

    <div v-if="drafts.hydrated" class="upload-workspace">
      <main class="upload-workspace__main">
        <PageState
          v-if="!activeDraft"
          icon="file-plus-2"
          title="还没有投稿草稿"
          description="创建一个本地草稿后，可以先整理标题、分区、标签和可见性。"
          action-icon="file-plus-2"
          action-label="新建草稿"
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
              <h2>视频源</h2>
              <span>{{ statusLabel }}</span>
            </div>

            <UploadDropZone
              :source="activeDraft.source"
              :format-bytes="formatBytes"
              empty-title="选择一个视频文件"
              empty-description="这里只读取文件名、大小和 MIME 类型，不上传文件内容。"
              choose-label="选择文件"
              replace-label="替换文件"
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
              <h2>基础信息</h2>
              <span>自动保存 · {{ lastSavedLabel }}</span>
            </div>

            <div class="upload-form-grid">
              <AoiTextField
                v-model="draftTitle"
                label="标题"
                appearance="outlined"
                placeholder="输入视频标题"
                supporting-text="至少 4 个字符"
              />
              <AoiSelect
                v-model="draftCategory"
                label="分区"
                appearance="outlined"
                :disabled="categoriesPending"
                :options="categoryOptions"
              />
            </div>

            <AoiTextField
              v-model="draftDescription"
              label="简介"
              appearance="outlined"
              placeholder="写一点这支视频的内容、亮点和适合谁看"
              supporting-text="本阶段只保存为本地草稿"
              multiline
              :rows="5"
              :max-length="600"
            />

            <div class="upload-form-grid">
              <AoiSelect
                v-model="draftVisibility"
                label="可见性"
                appearance="outlined"
                :options="visibilityOptions"
              />
              <div class="upload-checks">
                <AoiCheckbox v-model="allowComments" label="允许评论" />
                <AoiCheckbox v-model="sensitive" label="含敏感内容标记" />
              </div>
            </div>

            <div class="upload-tags">
              <div class="upload-tags__input">
                <AoiTextField
                  v-model="tagInput"
                  label="标签"
                  appearance="outlined"
                  placeholder="输入后按 Enter"
                  supporting-text="最多保存 8 个标签"
                  @enter="addTag"
                />
                <AoiButton tone="accent" variant="outlined" icon="plus" @click="addTag()">添加</AoiButton>
              </div>
              <div v-if="activeDraft.tags.length" class="upload-tags__list" aria-label="草稿标签">
                <AoiChip
                  v-for="tag in activeDraft.tags"
                  :key="tag"
                  :label="`# ${tag}`"
                  removable
                  :remove-label="`移除标签 ${tag}`"
                  @remove="removeTag(tag)"
                />
              </div>
            </div>
          </AoiSurface>

          <AoiActionBar reveal="fade" label="投稿草稿操作">
            <AoiButton tone="accent"
              variant="filled"
              icon="send"
              :disabled="!validation.ready"
              @click="drafts.queueActiveDraft()"
            >
              本地排队预览
            </AoiButton>
            <AoiButton icon="trash-2" @click="deleteActiveDraft">
              删除当前草稿
            </AoiButton>
          </AoiActionBar>
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
            <h2>草稿</h2>
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
            <h2>发布预检</h2>
            <span>{{ validation.ready ? "可排队" : "未完成" }}</span>
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
}

.upload-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 260px);
  gap: 12px;
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
