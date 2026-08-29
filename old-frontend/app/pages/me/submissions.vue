<script setup lang="ts">
import type { CommunitySubmissionItem } from "~/types/api"

const api = useAoiApi()
const { t } = useI18n()

const submissionsList = ref<CommunitySubmissionItem[] | null>(null)
const submissionsError = ref<string | null>(null)
const submissionsPending = ref(false)

async function loadSubmissions() {
  submissionsPending.value = true
  submissionsError.value = null
  try {
    const payload = await api.getCommunityAccountSubmissions()
    submissionsList.value = payload.items?.items || []
  } catch {
    submissionsError.value = t("me.loadError")
  } finally {
    submissionsPending.value = false
  }
}

const deletingId = ref<string | null>(null)
async function deleteSubmission(id: string) {
  if (deletingId.value) return
  deletingId.value = id
  try {
    await api.deleteAccountSubmission(id)
    if (submissionsList.value) {
      submissionsList.value = submissionsList.value.filter(s => s.id !== id)
    }
  } catch (err) {
    alert("删除投稿失败，请稍后重试。")
  } finally {
    deletingId.value = null
  }
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function statusIntent(status: string): "success" | "warning" | "danger" | "info" {
  if (status === "published") return "success"
  if (status === "approved") return "info"
  if (status === "rejected") return "danger"
  return "warning"
}

function statusText(status: string): string {
  if (status === "published") return "已发布"
  if (status === "approved") return "已通过 (转码中)"
  if (status === "rejected") return "被驳回"
  return "审核中"
}

onMounted(() => {
  void loadSubmissions()
})
</script>

<template>
  <div class="me-submissions-subpage">
    <!-- Loading -->
    <AoiReveal v-if="submissionsPending" variant="pop" duration="400">
      <div class="me-submissions-grid">
        <AoiSurface
          v-for="i in 3"
          :key="i"
          surface="card"
          padding="md"
          class="me-sub-card"
          style="display: flex; flex-direction: column; gap: 12px;"
        >
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <AoiSkeleton width="180px" height="20px" radius="4px" />
              <AoiSkeleton width="80px" height="14px" radius="4px" />
            </div>
            <AoiSkeleton width="80%" height="14px" radius="4px" />
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <AoiSkeleton width="140px" height="14px" radius="4px" />
            <AoiSkeleton width="220px" height="14px" radius="4px" />
          </div>
          <AoiSkeleton width="100%" height="36px" radius="6px" />
          <div style="display: flex; gap: 8px;">
            <AoiSkeleton width="90px" height="32px" radius="6px" />
            <AoiSkeleton width="90px" height="32px" radius="6px" />
          </div>
        </AoiSurface>
      </div>
    </AoiReveal>

    <!-- Error -->
    <div v-else-if="submissionsError" class="me-error-wrapper">
      <AoiStatusMessage intent="danger" icon="alert-circle">
        {{ submissionsError }}
      </AoiStatusMessage>
      <AoiButton variant="filled" tone="accent" @click="loadSubmissions">
        重新加载
      </AoiButton>
    </div>

    <!-- Content -->
    <template v-else>
      <AoiReveal v-slot="revealProps" v-if="submissionsList && submissionsList.length > 0" variant="pop" duration="400" tag="div" class="me-submissions-grid">
        <AoiSurface
          v-for="sub in submissionsList"
          :key="sub.id"
          surface="card"
          padding="md"
          class="me-sub-card"
        >
          <div class="me-sub-card__header">
            <div class="me-sub-card__title-row">
              <h3 class="me-sub-card__title">{{ sub.title }}</h3>
              <span class="me-sub-card__date">{{ formatDate(sub.createdAt) }}</span>
            </div>
            <p class="me-sub-card__desc">{{ sub.description || "无简介" }}</p>
          </div>

          <div class="me-sub-card__meta">
            <div class="me-meta-item">
              <span class="me-meta-label">分区</span>
              <span class="me-meta-val">{{ sub.categorySlug }}</span>
            </div>
            <div class="me-meta-item">
              <span class="me-meta-label">源文件</span>
              <span class="me-meta-val me-sub-card__file">{{ sub.sourceName }} ({{ formatBytes(sub.sourceSize) }})</span>
            </div>
          </div>

          <div class="me-sub-card__status">
            <AoiStatusMessage
              :intent="statusIntent(sub.status)"
              icon="info"
              class="me-sub-status-msg"
            >
              <div class="me-status-body">
                <strong>{{ statusText(sub.status) }}</strong>
                <span v-if="sub.status === 'rejected' && sub.reviewNote" class="me-reject-note">
                  原因: {{ sub.reviewNote }}
                </span>
              </div>
            </AoiStatusMessage>
          </div>

          <div class="me-sub-card__actions">
            <AoiButton
              v-if="sub.status === 'published' && sub.publishedVideoId"
              variant="outlined"
              tone="accent"
              icon="play"
              size="sm"
              @click="navigateTo(`/video/${sub.publishedVideoId}`)"
            >
              播放视频
            </AoiButton>
            <AoiButton
              variant="outlined"
              tone="danger"
              icon="trash-2"
              size="sm"
              :disabled="deletingId === sub.id"
              @click="deleteSubmission(sub.id)"
            >
              {{ deletingId === sub.id ? "正在删除..." : "删除投稿" }}
            </AoiButton>
          </div>
        </AoiSurface>
      </AoiReveal>

      <!-- Empty State -->
      <AoiSurface v-else surface="panel" padding="lg">
        <PageState
          icon="video"
          title="暂无投稿"
          description="您还没有发布过任何视频投稿，现在就可以上传您的第一个视频作品。"
          action-icon="upload"
          action-label="前往投稿"
          @action="navigateTo('/upload')"
        />
      </AoiSurface>
    </template>
  </div>
</template>

<style scoped>
.me-submissions-subpage {
  display: grid;
  gap: 16px;
}
.me-submissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--aoi-grid-gap);
}
.me-sub-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.me-sub-card__title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}
.me-sub-card__title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}
.me-sub-card__date {
  font-size: 0.8rem;
  color: var(--aoi-text-muted);
}
.me-sub-card__desc {
  font-size: 0.9rem;
  color: var(--aoi-text-muted);
  margin: 4px 0 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.me-sub-card__meta {
  display: grid;
  gap: 4px;
  background: var(--aoi-surface-muted);
  padding: 8px 12px;
  border-radius: var(--aoi-radius-xs);
}
.me-meta-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}
.me-meta-label {
  color: var(--aoi-text-muted);
}
.me-meta-val {
  font-weight: 600;
  color: var(--aoi-text);
}
.me-sub-card__file {
  font-family: monospace;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.me-sub-card__status {
  margin-top: auto;
}
.me-sub-status-msg {
  padding: var(--aoi-row-padding) !important;
}
.me-status-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.me-reject-note {
  font-size: 0.75rem;
  opacity: 0.9;
}
.me-sub-card__actions {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--aoi-border);
  padding-top: 8px;
  gap: 8px;
}
.me-loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 0;
}
.me-loading-text {
  font-size: 0.9rem;
  color: var(--aoi-text-muted);
}
.me-error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 0;
}
</style>
