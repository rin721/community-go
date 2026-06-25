<script setup lang="ts">
import {
  AOI_BUILD_DEFAULT_CONFIG_PATHS,
  normalizeAoiBuildDefaultAppSettings
} from "~/lib/aoiBuildDefaultSerialization"
import {
  AOI_DEFAULT_BUILD_PROFILE_ID,
  AOI_RUNTIME_PROFILE_STORAGE_KEY,
  applyAoiSettingsProfileValues,
  createAoiSettingsProfile,
  createAoiSettingsProfileDiff,
  getAoiSettingsProfileFields,
  isAoiSettingsProfileId,
  normalizeAoiSettingsProfile,
  normalizeAoiSettingsProfileFieldKeys,
  slugifyAoiSettingsProfileId,
  summarizeAoiSettingsProfileFields
} from "~/lib/aoiSettingsProfiles"
import type {
  AoiBuildProfileManifest,
  AoiSettingsProfile,
  AoiSettingsProfileDiffItem,
  AoiSettingsProfileField,
  AoiSettingsProfileScope
} from "~/lib/aoiSettingsProfiles"

type DeveloperTab = "assets" | "build" | "runtime"

interface DeveloperProfilesResponse {
  manifest: AoiBuildProfileManifest
  ok: boolean
  originalProfiles?: AoiSettingsProfile[]
  paths: typeof AOI_BUILD_DEFAULT_CONFIG_PATHS
  profiles: AoiSettingsProfile[]
  updatedAt: string
}

interface PendingConfirm {
  confirmLabel: string
  description: string
  diffs: AoiSettingsProfileDiffItem[]
  danger?: boolean
  run: () => Promise<void> | void
  title: string
}

const { t } = useI18n()
const settings = useAppSettingsStore()
const isDevBuild = import.meta.dev

const activeTab = ref<DeveloperTab>("build")
const busyAction = ref("")
const confirming = ref(false)
const errorMessage = ref("")
const statusMessage = ref("")
const lastUpdatedAt = ref("")

const buildManifest = ref<AoiBuildProfileManifest>({
  activeProfileId: AOI_DEFAULT_BUILD_PROFILE_ID,
  profiles: []
})
const buildPaths = ref<typeof AOI_BUILD_DEFAULT_CONFIG_PATHS>(AOI_BUILD_DEFAULT_CONFIG_PATHS)
const buildProfiles = ref<AoiSettingsProfile[]>([])
const originalBuildProfiles = ref<AoiSettingsProfile[]>([])
const selectedBuildId = ref("")
const buildSelectedFields = ref(getAoiSettingsProfileFields("build").map((field) => field.key))
const buildMetaName = ref("")
const buildMetaDescription = ref("")
const buildDraftId = ref("")
const buildDraftName = ref("")
const buildDraftDescription = ref("")

const runtimeProfiles = ref<AoiSettingsProfile[]>([])
const selectedRuntimeId = ref("")
const runtimeSelectedFields = ref(getAoiSettingsProfileFields("runtime").map((field) => field.key))
const runtimeMetaName = ref("")
const runtimeMetaDescription = ref("")
const runtimeDraftId = ref("")
const runtimeDraftName = ref("")
const runtimeDraftDescription = ref("")

const confirmOpen = ref(false)
const pendingConfirm = shallowRef<PendingConfirm | null>(null)

const tabs = computed(() => [
  { value: "build", label: "构建预设", icon: "package-check" },
  { value: "runtime", label: "运行时档案", icon: "layers-3" },
  { value: "assets", label: "公共资产", icon: "folder-cog" }
])
const profileFieldPageOrder = [
  "appearance",
  "player",
  "danmaku",
  "preference",
  "language",
  "experimental",
  "shortcut-key",
  "about",
  "acknowledgement",
  "advanced",
  "developer"
]
const profileFieldPageLabels: Record<string, string> = {
  acknowledgement: "鸣谢",
  advanced: "高级",
  appearance: "外观",
  danmaku: "弹幕",
  developer: "开发者",
  experimental: "实验",
  language: "语言",
  player: "播放器",
  preference: "偏好",
  "shortcut-key": "快捷键",
  about: "关于"
}
const runtimeModeLabel = computed(() => isDevBuild ? "本地开发" : "生产构建")
const selectedBuildProfile = computed(() => buildProfiles.value.find((profile) => profile.id === selectedBuildId.value) || buildProfiles.value[0] || null)
const selectedBuildSummary = computed(() => buildManifest.value.profiles.find((profile) => profile.id === selectedBuildProfile.value?.id))
const selectedOriginalBuildProfile = computed(() => originalBuildProfiles.value.find((profile) => profile.id === selectedBuildProfile.value?.id) || null)
const selectedRuntimeProfile = computed(() => runtimeProfiles.value.find((profile) => profile.id === selectedRuntimeId.value) || runtimeProfiles.value[0] || null)
const canDeleteSelectedBuild = computed(() => {
  const profile = selectedBuildProfile.value

  return Boolean(profile && profile.id !== AOI_DEFAULT_BUILD_PROFILE_ID && selectedBuildSummary.value?.builtin !== true)
})
const currentBuildSettings = computed(() => normalizeAoiBuildDefaultAppSettings(settings))
const buildFieldSummary = computed(() => summarizeAoiSettingsProfileFields(buildSelectedFields.value, "build") || "未选择字段")
const runtimeFieldSummary = computed(() => summarizeAoiSettingsProfileFields(runtimeSelectedFields.value, "runtime") || "未选择字段")
const statusItems = computed(() => [
  { label: "运行模式", value: runtimeModeLabel.value },
  { label: "Active profile", value: buildManifest.value.activeProfileId || AOI_DEFAULT_BUILD_PROFILE_ID },
  { label: "Facade", value: buildPaths.value.active },
  { label: "Original facade", value: buildPaths.value.original },
  { label: "Manifest", value: buildPaths.value.manifest },
  { label: "Profiles", value: buildPaths.value.profilesDir },
  { label: "Originals", value: buildPaths.value.originalsDir }
])
const buildWritePreviewProfile = computed(() => {
  const profile = selectedBuildProfile.value

  if (!profile) {
    return null
  }

  const preview = createAoiSettingsProfile({
    description: buildMetaDescription.value || profile.description,
    fields: buildSelectedFields.value,
    id: profile.id,
    name: buildMetaName.value || profile.name,
    scope: "build",
    settings: currentBuildSettings.value
  })

  preview.createdAt = profile.createdAt
  return preview
})
const buildPreviewJson = computed(() => buildWritePreviewProfile.value ? serializeProfile(buildWritePreviewProfile.value) : "")
const runtimePreviewJson = computed(() => selectedRuntimeProfile.value ? serializeProfile(selectedRuntimeProfile.value) : "")
const selectedBuildChangedFields = computed(() => {
  const profile = selectedBuildProfile.value
  const preview = buildWritePreviewProfile.value

  if (!profile || !preview) {
    return []
  }

  return createAoiSettingsProfileDiff(profile.settings, preview.settings, preview.fields, "build").filter((item) => item.changed)
})
const selectedRuntimeApplyDiffs = computed(() => {
  const profile = selectedRuntimeProfile.value

  if (!profile) {
    return []
  }

  return createAoiSettingsProfileDiff(settings, profile.settings, profile.fields, "runtime").filter((item) => item.changed)
})

useHead(() => ({
  title: `${t("settings.developer.title")} - Aoi`
}))

watch(selectedBuildProfile, (profile) => {
  if (!profile) {
    return
  }

  buildSelectedFields.value = [...profile.fields]
  buildMetaName.value = profile.name
  buildMetaDescription.value = profile.description
}, { immediate: true })

watch(selectedRuntimeProfile, (profile) => {
  if (!profile) {
    return
  }

  runtimeSelectedFields.value = [...profile.fields]
  runtimeMetaName.value = profile.name
  runtimeMetaDescription.value = profile.description
}, { immediate: true })

onMounted(async () => {
  loadRuntimeProfiles()
})

watch(() => [settings.hydrated, settings.developerModeEnabled] as const, ([hydrated, enabled]) => {
  if (hydrated && enabled && !buildProfiles.value.length && busyAction.value !== "loadBuild") {
    void loadBuildProfiles(false)
  }
}, { immediate: true })

function serializeProfile(profile: AoiSettingsProfile) {
  return `${JSON.stringify(profile, null, 2)}\n`
}

function setStatus(message: string) {
  statusMessage.value = message
  errorMessage.value = ""
}

function setError(message: string) {
  errorMessage.value = message
  statusMessage.value = ""
}

function errorText(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "statusMessage" in error && typeof error.statusMessage === "string") {
    return `${fallback}：${error.statusMessage}`
  }

  return fallback
}

function normalizeFetchedProfiles(value: unknown, scope: AoiSettingsProfileScope) {
  const values = Array.isArray(value) ? value : []

  return values
    .map((profile) => normalizeAoiSettingsProfile(profile, scope))
    .filter((profile): profile is AoiSettingsProfile => Boolean(profile))
}

function updateBuildState(response: DeveloperProfilesResponse) {
  buildManifest.value = response.manifest
  buildPaths.value = response.paths
  buildProfiles.value = normalizeFetchedProfiles(response.profiles, "build")
  originalBuildProfiles.value = normalizeFetchedProfiles(response.originalProfiles, "build")
  lastUpdatedAt.value = new Date(response.updatedAt).toLocaleString()

  if (!buildProfiles.value.some((profile) => profile.id === selectedBuildId.value)) {
    selectedBuildId.value = buildProfiles.value.find((profile) => profile.id === response.manifest.activeProfileId)?.id
      || buildProfiles.value[0]?.id
      || ""
  }
}

async function loadBuildProfiles(showStatus = true) {
  busyAction.value = "loadBuild"

  try {
    const response = await $fetch<DeveloperProfilesResponse>("/api/developer/profiles", {
      method: "POST",
      body: { action: "listBuild" }
    })

    updateBuildState(response)

    if (showStatus) {
      setStatus("构建预设已刷新。")
    }
  } catch (error) {
    setError(errorText(error, "读取构建预设失败"))
  } finally {
    busyAction.value = ""
  }
}

async function requestBuildProfiles(action: string, body: Record<string, unknown>, message: string) {
  busyAction.value = action

  try {
    const response = await $fetch<DeveloperProfilesResponse>("/api/developer/profiles", {
      method: "POST",
      body: { action, ...body }
    })

    updateBuildState(response)
    setStatus(message)
    return true
  } catch (error) {
    setError(errorText(error, "构建预设操作失败"))
    return false
  } finally {
    busyAction.value = ""
  }
}

function loadRuntimeProfiles() {
  if (!import.meta.client) {
    return
  }

  try {
    const raw = window.localStorage.getItem(AOI_RUNTIME_PROFILE_STORAGE_KEY)
    runtimeProfiles.value = normalizeFetchedProfiles(raw ? JSON.parse(raw) : [], "runtime")
  } catch {
    runtimeProfiles.value = []
  }

  if (!runtimeProfiles.value.some((profile) => profile.id === selectedRuntimeId.value)) {
    selectedRuntimeId.value = runtimeProfiles.value[0]?.id || ""
  }
}

function saveRuntimeProfiles(message = "运行时档案已保存。") {
  if (!import.meta.client) {
    return
  }

  try {
    window.localStorage.setItem(AOI_RUNTIME_PROFILE_STORAGE_KEY, JSON.stringify(runtimeProfiles.value))
    setStatus(message)
  } catch {
    setError("运行时档案保存失败，浏览器本地存储可能不可用。")
  }
}

function uniqueProfileId(base: string, existingIds: string[]) {
  const fallback = `profile-${Date.now().toString(36)}`
  const root = slugifyAoiSettingsProfileId(base, fallback)
  let candidate = root
  let index = 2

  while (existingIds.includes(candidate)) {
    const suffix = `-${index}`
    candidate = `${root.slice(0, Math.max(2, 48 - suffix.length))}${suffix}`
    index += 1
  }

  return candidate
}

function ensureFields(fieldKeys: string[], scope: AoiSettingsProfileScope) {
  const fields = normalizeAoiSettingsProfileFieldKeys(fieldKeys, scope, { fallbackToAll: false })

  if (!fields.length) {
    setError("请至少选择一个配置字段。")
    return []
  }

  return fields
}

function groupedFields(scope: AoiSettingsProfileScope) {
  const groups = new Map<string, {
    fields: AoiSettingsProfileField[]
    order: number
  }>()

  getAoiSettingsProfileFields(scope).forEach((field) => {
    const name = profileFieldPageLabels[field.pageId] || field.group
    const group = groups.get(name) || {
      fields: [],
      order: profileFieldPageOrder.indexOf(field.pageId)
    }

    group.fields.push(field)
    groups.set(name, group)
  })

  return Array.from(groups.entries())
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([name, group]) => ({ name, fields: group.fields }))
}

function toggleField(scope: AoiSettingsProfileScope, key: string, value: boolean) {
  const target = scope === "build" ? buildSelectedFields : runtimeSelectedFields
  const fields = new Set(target.value)

  if (value) {
    fields.add(key)
  } else {
    fields.delete(key)
  }

  target.value = Array.from(fields)
}

function selectAllFields(scope: AoiSettingsProfileScope) {
  const target = scope === "build" ? buildSelectedFields : runtimeSelectedFields

  target.value = getAoiSettingsProfileFields(scope).map((field) => field.key)
}

function clearFields(scope: AoiSettingsProfileScope) {
  const target = scope === "build" ? buildSelectedFields : runtimeSelectedFields

  target.value = []
}

function openConfirm(input: PendingConfirm) {
  pendingConfirm.value = input
  confirmOpen.value = true
}

async function runPendingConfirm() {
  if (!pendingConfirm.value) {
    return
  }

  confirming.value = true

  try {
    await pendingConfirm.value.run()
    confirmOpen.value = false
  } finally {
    confirming.value = false
  }
}

async function writeTextToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return
  } catch {
    // Fall back for local embedded browsers that do not grant Clipboard API access.
  }

  const textarea = document.createElement("textarea")

  textarea.value = value
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.inset = "0 auto auto 0"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()

  try {
    if (!document.execCommand("copy")) {
      throw new Error("copy failed")
    }
  } finally {
    document.body.removeChild(textarea)
  }
}

async function copyJson(value: string) {
  if (!value) {
    setError("当前没有可复制的配置。")
    return
  }

  busyAction.value = "copy"

  try {
    await writeTextToClipboard(value)
    setStatus("配置 JSON 已复制。")
  } catch {
    setError("复制失败，请直接选择预览内容。")
  } finally {
    busyAction.value = ""
  }
}

function downloadJson(filename: string, value: string) {
  if (!value) {
    setError("当前没有可下载的配置。")
    return
  }

  busyAction.value = "download"

  try {
    const blob = new Blob([value], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
    setStatus("配置 JSON 已下载。")
  } catch {
    setError("下载失败，请改用复制。")
  } finally {
    busyAction.value = ""
  }
}

function createBuildProfileFromCurrent() {
  const fields = ensureFields(buildSelectedFields.value, "build")

  if (!fields.length) {
    return
  }

  const id = uniqueProfileId(buildDraftId.value || buildDraftName.value || "build-profile", buildProfiles.value.map((profile) => profile.id))
  const profile = createAoiSettingsProfile({
    description: buildDraftDescription.value,
    fields,
    id,
    name: buildDraftName.value || id,
    scope: "build",
    settings: currentBuildSettings.value
  })

  openConfirm({
    confirmLabel: "创建",
    description: `将从当前应用设置创建构建预设 ${profile.name}。`,
    diffs: createAoiSettingsProfileDiff({}, profile.settings, profile.fields, "build"),
    run: async () => {
      const ok = await requestBuildProfiles("createBuild", {
        description: profile.description,
        fields: profile.fields,
        id: profile.id,
        name: profile.name,
        settings: currentBuildSettings.value
      }, "构建预设已创建。")

      if (ok) {
        selectedBuildId.value = profile.id
        buildDraftId.value = ""
        buildDraftName.value = ""
        buildDraftDescription.value = ""
      }
    },
    title: "创建构建预设"
  })
}

function copySelectedBuildProfile() {
  const source = selectedBuildProfile.value

  if (!source) {
    setError("请先选择一个构建预设。")
    return
  }

  const id = uniqueProfileId(buildDraftId.value || `${source.id}-copy`, buildProfiles.value.map((profile) => profile.id))
  const name = buildDraftName.value || `${source.name} Copy`
  const description = buildDraftDescription.value || source.description

  openConfirm({
    confirmLabel: "复制",
    description: `复制 ${source.name} 为 ${name}。复制会同时创建该档 original 备份。`,
    diffs: createAoiSettingsProfileDiff({}, source.settings, source.fields, "build"),
    run: async () => {
      const ok = await requestBuildProfiles("copyBuild", {
        description,
        id,
        name,
        sourceId: source.id
      }, "构建预设已复制。")

      if (ok) {
        selectedBuildId.value = id
        buildDraftId.value = ""
        buildDraftName.value = ""
        buildDraftDescription.value = ""
      }
    },
    title: "复制构建预设"
  })
}

async function updateSelectedBuildMeta() {
  const profile = selectedBuildProfile.value

  if (!profile) {
    setError("请先选择一个构建预设。")
    return
  }

  await requestBuildProfiles("updateBuildMeta", {
    description: buildMetaDescription.value,
    id: profile.id,
    name: buildMetaName.value
  }, "构建预设信息已更新。")
}

function writeSelectedBuildFromCurrent() {
  const profile = selectedBuildProfile.value
  const preview = buildWritePreviewProfile.value
  const fields = ensureFields(buildSelectedFields.value, "build")

  if (!profile || !preview || !fields.length) {
    setError("请先选择一个构建预设。")
    return
  }

  openConfirm({
    confirmLabel: "写入",
    description: `将当前应用设置写入 ${profile.name}，只保存已勾选字段。original 备份不会被修改。`,
    diffs: createAoiSettingsProfileDiff(profile.settings, preview.settings, fields, "build"),
    run: async () => {
      await requestBuildProfiles("writeBuild", {
        fields,
        id: profile.id,
        settings: currentBuildSettings.value
      }, "当前设置已写入构建预设。")
    },
    title: "写入当前设置"
  })
}

function restoreSelectedBuildOriginal() {
  const profile = selectedBuildProfile.value
  const original = selectedOriginalBuildProfile.value

  if (!profile || !original) {
    setError("没有找到该构建预设的 original 备份。")
    return
  }

  openConfirm({
    confirmLabel: "恢复",
    description: `将 ${profile.name} 恢复为该档 original 备份。`,
    diffs: createAoiSettingsProfileDiff(profile.settings, original.settings, original.fields, "build"),
    run: async () => {
      await requestBuildProfiles("restoreBuild", { id: profile.id }, "构建预设已从 original 备份恢复。")
    },
    title: "恢复 original 备份"
  })
}

function setSelectedBuildActive() {
  const profile = selectedBuildProfile.value

  if (!profile) {
    setError("请先选择一个构建预设。")
    return
  }

  openConfirm({
    confirmLabel: "设为 active",
    description: `构建 facade 将使用 ${profile.name} 作为默认应用设置来源。`,
    diffs: [],
    run: async () => {
      await requestBuildProfiles("setActiveBuild", { id: profile.id }, "Active 构建预设已切换。")
    },
    title: "切换 active profile"
  })
}

function deleteSelectedBuildProfile() {
  const profile = selectedBuildProfile.value

  if (!profile || !canDeleteSelectedBuild.value) {
    setError("默认或内置构建预设不能删除。")
    return
  }

  openConfirm({
    confirmLabel: "删除",
    danger: true,
    description: `删除 ${profile.name}，并同步删除该档 original 备份。`,
    diffs: [],
    run: async () => {
      await requestBuildProfiles("deleteBuild", { id: profile.id }, "构建预设已删除。")
    },
    title: "删除构建预设"
  })
}

function createRuntimeProfileFromCurrent() {
  const fields = ensureFields(runtimeSelectedFields.value, "runtime")

  if (!fields.length) {
    return
  }

  const id = uniqueProfileId(runtimeDraftId.value || runtimeDraftName.value || "runtime-profile", runtimeProfiles.value.map((profile) => profile.id))
  const profile = createAoiSettingsProfile({
    description: runtimeDraftDescription.value,
    fields,
    id,
    name: runtimeDraftName.value || id,
    scope: "runtime",
    settings
  })

  openConfirm({
    confirmLabel: "创建",
    description: `将从当前应用设置创建运行时档案 ${profile.name}。背景只保存引用信息，不保存图片字节。`,
    diffs: createAoiSettingsProfileDiff({}, profile.settings, profile.fields, "runtime"),
    run: () => {
      runtimeProfiles.value = [...runtimeProfiles.value, profile]
      selectedRuntimeId.value = profile.id
      runtimeDraftId.value = ""
      runtimeDraftName.value = ""
      runtimeDraftDescription.value = ""
      saveRuntimeProfiles("运行时档案已创建。")
    },
    title: "创建运行时档案"
  })
}

function copySelectedRuntimeProfile() {
  const source = selectedRuntimeProfile.value

  if (!source) {
    setError("请先选择一个运行时档案。")
    return
  }

  const now = new Date().toISOString()
  const id = uniqueProfileId(runtimeDraftId.value || `${source.id}-copy`, runtimeProfiles.value.map((profile) => profile.id))
  const profile: AoiSettingsProfile = {
    ...source,
    createdAt: now,
    description: runtimeDraftDescription.value || source.description,
    id,
    name: runtimeDraftName.value || `${source.name} Copy`,
    updatedAt: now
  }

  runtimeProfiles.value = [...runtimeProfiles.value, profile]
  selectedRuntimeId.value = profile.id
  runtimeDraftId.value = ""
  runtimeDraftName.value = ""
  runtimeDraftDescription.value = ""
  saveRuntimeProfiles("运行时档案已复制。")
}

function updateSelectedRuntimeMeta() {
  const profile = selectedRuntimeProfile.value

  if (!profile) {
    setError("请先选择一个运行时档案。")
    return
  }

  runtimeProfiles.value = runtimeProfiles.value.map((item) => item.id === profile.id
    ? {
        ...item,
        description: runtimeMetaDescription.value.trim(),
        name: runtimeMetaName.value.trim() || item.name,
        updatedAt: new Date().toISOString()
      }
    : item)
  saveRuntimeProfiles("运行时档案信息已更新。")
}

function updateSelectedRuntimeFromCurrent() {
  const profile = selectedRuntimeProfile.value
  const fields = ensureFields(runtimeSelectedFields.value, "runtime")

  if (!profile || !fields.length) {
    setError("请先选择一个运行时档案。")
    return
  }

  const next = createAoiSettingsProfile({
    description: runtimeMetaDescription.value || profile.description,
    fields,
    id: profile.id,
    name: runtimeMetaName.value || profile.name,
    scope: "runtime",
    settings
  })

  next.createdAt = profile.createdAt
  openConfirm({
    confirmLabel: "更新",
    description: `用当前应用设置更新 ${profile.name}，只保存已勾选字段。`,
    diffs: createAoiSettingsProfileDiff(profile.settings, next.settings, fields, "runtime"),
    run: () => {
      runtimeProfiles.value = runtimeProfiles.value.map((item) => item.id === profile.id ? next : item)
      saveRuntimeProfiles("运行时档案已从当前设置更新。")
    },
    title: "更新运行时档案"
  })
}

function applySelectedRuntimeProfile() {
  const profile = selectedRuntimeProfile.value

  if (!profile) {
    setError("请先选择一个运行时档案。")
    return
  }

  openConfirm({
    confirmLabel: "应用",
    description: `将 ${profile.name} 应用到当前浏览器设置。应用不会写入源码。`,
    diffs: createAoiSettingsProfileDiff(settings, profile.settings, profile.fields, "runtime"),
    run: async () => {
      const hasBackgroundReference = profile.fields.includes("backgroundImageId") && Boolean(profile.settings.backgroundImageId)

      applyAoiSettingsProfileValues(settings as unknown as Record<string, unknown>, profile)
      settings.persist()

      if (profile.fields.some((field) => field.startsWith("background"))) {
        await settings.restoreBackgroundObjectUrl()
      }

      setStatus(hasBackgroundReference && !settings.backgroundImageId
        ? "运行时档案已应用；背景引用在本机缺少图片字节，已恢复默认背景。"
        : "运行时档案已应用。")
    },
    title: "应用运行时档案"
  })
}

function deleteSelectedRuntimeProfile() {
  const profile = selectedRuntimeProfile.value

  if (!profile) {
    setError("请先选择一个运行时档案。")
    return
  }

  openConfirm({
    confirmLabel: "删除",
    danger: true,
    description: `删除浏览器本地运行时档案 ${profile.name}。`,
    diffs: [],
    run: () => {
      runtimeProfiles.value = runtimeProfiles.value.filter((item) => item.id !== profile.id)
      selectedRuntimeId.value = runtimeProfiles.value[0]?.id || ""
      saveRuntimeProfiles("运行时档案已删除。")
    },
    title: "删除运行时档案"
  })
}

async function importRuntimeProfiles(files: File[]) {
  if (!files.length) {
    return
  }

  busyAction.value = "importRuntime"

  try {
    let importedCount = 0
    const existingIds = runtimeProfiles.value.map((profile) => profile.id)
    const importedProfiles: AoiSettingsProfile[] = []

    for (const file of files) {
      const raw = JSON.parse(await file.text())
      const values = Array.isArray(raw) ? raw : [raw]

      values.forEach((value) => {
        const normalized = normalizeAoiSettingsProfile(value, "runtime")

        if (!normalized) {
          return
        }

        const id = uniqueProfileId(normalized.id, [...existingIds, ...importedProfiles.map((profile) => profile.id)])
        const now = new Date().toISOString()

        importedProfiles.push({
          ...normalized,
          id,
          updatedAt: now
        })
        importedCount += 1
      })
    }

    runtimeProfiles.value = [...runtimeProfiles.value, ...importedProfiles]
    selectedRuntimeId.value = importedProfiles[0]?.id || selectedRuntimeId.value
    saveRuntimeProfiles(`已导入 ${importedCount} 个运行时档案。`)
  } catch {
    setError("导入失败，请确认文件是 Aoi 运行时档案 JSON。")
  } finally {
    busyAction.value = ""
  }
}

function disableDeveloperMode() {
  settings.setDeveloperModeEnabled(false)
  navigateTo("/settings/about")
}
</script>

<template>
  <div class="settings-page">
    <PageState
      v-if="!settings.developerModeEnabled"
      icon="lock-keyhole"
      :title="t('settings.developer.locked.title')"
      :description="t('settings.developer.locked.description')"
      action-icon="sparkles"
      :action-label="t('settings.developer.locked.action')"
      @action="navigateTo('/settings/about')"
    />

    <template v-else>
      <SettingsPageHeader
        :title="t('settings.developer.title')"
        description="管理构建前默认配置和浏览器本地运行时档案。所有 profile 都使用固定字段 allowlist，并在写入或应用前预览差异。"
      />

      <SettingsPanel
        icon="terminal"
        title="多配置状态"
        description="构建预设写入源码 JSON；运行时档案只存浏览器本地。生产构建不会开放写入 API。"
      >
        <template #actions>
          <AoiButton tone="accent"
            variant="outlined"
            size="sm"
            icon="refresh-cw"
            :disabled="Boolean(busyAction)"
            :loading="busyAction === 'loadBuild'"
            @click="() => loadBuildProfiles()"
          >
            刷新
          </AoiButton>
          <AoiButton
            size="sm"
            icon="power"
            :disabled="Boolean(busyAction)"
            @click="disableDeveloperMode"
          >
            关闭开发者模式
          </AoiButton>
        </template>

        <AoiStatGrid :items="statusItems" />
        <p v-if="lastUpdatedAt" class="settings-note">
          最近刷新/写入：{{ lastUpdatedAt }}
        </p>
        <AoiStatusMessage v-if="statusMessage" intent="success" :message="statusMessage" />
        <AoiStatusMessage v-if="errorMessage" intent="danger" :message="errorMessage" />
      </SettingsPanel>

      <AoiTabs
        v-model="activeTab"
        class="settings-developer-tabs"
        v-aoi-scroll-native
        :items="tabs"
        aria-label="开发者配置管理"
      />

      <SettingsPanel
        v-if="activeTab === 'build'"
        icon="package-check"
        title="构建预设 profiles"
        description="一档一 JSON 文件，active 档会被兼容 facade 读取为构建默认应用设置；每档都有独立 original 备份。"
      >
        <div class="settings-developer-layout">
          <SettingsProfileList
            :profiles="buildProfiles"
            :active-id="selectedBuildId"
            :active-profile-id="buildManifest.activeProfileId"
            label="构建预设列表"
            @select="selectedBuildId = $event"
          />

          <div class="settings-developer-workspace">
            <div class="settings-developer-form-grid">
              <AoiTextField
                v-model="buildMetaName"
                label="当前预设名称"
                appearance="outlined"
              />
              <AoiTextField
                v-model="buildMetaDescription"
                label="当前预设说明"
                appearance="outlined"
              />
            </div>

            <div class="settings-developer-actions">
              <AoiButton tone="accent"
                variant="outlined"
                icon="save"
                :disabled="!selectedBuildProfile || Boolean(busyAction)"
                @click="updateSelectedBuildMeta"
              >
                保存名称
              </AoiButton>
              <AoiButton tone="accent" variant="filled"
                icon="file-input"
                :disabled="!isDevBuild || !selectedBuildProfile || Boolean(busyAction)"
                :loading="busyAction === 'writeBuild'"
                @click="writeSelectedBuildFromCurrent"
              >
                从当前设置写入
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                icon="rotate-ccw"
                :disabled="!isDevBuild || !selectedBuildProfile || Boolean(busyAction)"
                @click="restoreSelectedBuildOriginal"
              >
                恢复 original
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                icon="badge-check"
                :disabled="!isDevBuild || !selectedBuildProfile || buildManifest.activeProfileId === selectedBuildProfile.id || Boolean(busyAction)"
                @click="setSelectedBuildActive"
              >
                设为 active
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                icon="trash-2"
                :disabled="!isDevBuild || !canDeleteSelectedBuild || Boolean(busyAction)"
                @click="deleteSelectedBuildProfile"
              >
                删除
              </AoiButton>
            </div>

            <SettingsFieldSelector
              v-model="buildSelectedFields"
              :groups="groupedFields('build')"
              :summary="buildFieldSummary"
              @select-all="selectAllFields('build')"
              @clear="clearFields('build')"
            />

            <div class="settings-developer-form-grid">
              <AoiTextField
                v-model="buildDraftId"
                label="新档 ID（slug，可留空）"
                appearance="outlined"
              />
              <AoiTextField
                v-model="buildDraftName"
                label="新档名称"
                appearance="outlined"
              />
              <AoiTextField
                v-model="buildDraftDescription"
                label="新档说明"
                appearance="outlined"
              />
            </div>

            <div class="settings-developer-actions">
              <AoiButton tone="accent" variant="filled"
                icon="plus"
                :disabled="!isDevBuild || Boolean(busyAction)"
                @click="createBuildProfileFromCurrent"
              >
                新建
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                icon="copy-plus"
                :disabled="!isDevBuild || !selectedBuildProfile || Boolean(busyAction)"
                @click="copySelectedBuildProfile"
              >
                复制当前档
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                icon="copy"
                :disabled="!buildPreviewJson || Boolean(busyAction)"
                @click="copyJson(buildPreviewJson)"
              >
                复制预览
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                icon="download"
                :disabled="!buildPreviewJson || Boolean(busyAction)"
                @click="downloadJson(`${selectedBuildProfile?.id || 'build-profile'}.json`, buildPreviewJson)"
              >
                下载预览
              </AoiButton>
            </div>

            <SettingsJsonPreview
              :code="buildPreviewJson"
              fallback="未选择构建预设"
              :note="`当前字段写入预览中有 ${selectedBuildChangedFields.length} 项会变化。写入只覆盖 active profile JSON，不会修改 original 备份。`"
            />
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel
        v-else-if="activeTab === 'runtime'"
        icon="layers-3"
        title="运行时档案 profiles"
        description="运行时档案只保存在当前浏览器 localStorage，可导入导出。背景只保存引用字段，不保存图片字节。"
      >
        <div class="settings-developer-layout">
          <SettingsProfileList
            :profiles="runtimeProfiles"
            :active-id="selectedRuntimeId"
            label="运行时档案列表"
            empty-text="还没有运行时档案，可以从当前设置创建第一档。"
            @select="selectedRuntimeId = $event"
          />

          <div class="settings-developer-workspace">
            <div class="settings-developer-form-grid">
              <AoiTextField
                v-model="runtimeMetaName"
                label="当前档案名称"
                appearance="outlined"
              />
              <AoiTextField
                v-model="runtimeMetaDescription"
                label="当前档案说明"
                appearance="outlined"
              />
            </div>

            <div class="settings-developer-actions">
              <AoiButton tone="accent"
                variant="outlined"
                icon="save"
                :disabled="!selectedRuntimeProfile || Boolean(busyAction)"
                @click="updateSelectedRuntimeMeta"
              >
                保存名称
              </AoiButton>
              <AoiButton tone="accent" variant="filled"
                icon="play"
                :disabled="!selectedRuntimeProfile || Boolean(busyAction)"
                @click="applySelectedRuntimeProfile"
              >
                预览后应用
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                icon="file-input"
                :disabled="!selectedRuntimeProfile || Boolean(busyAction)"
                @click="updateSelectedRuntimeFromCurrent"
              >
                从当前设置更新
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                icon="trash-2"
                :disabled="!selectedRuntimeProfile || Boolean(busyAction)"
                @click="deleteSelectedRuntimeProfile"
              >
                删除
              </AoiButton>
            </div>

            <SettingsFieldSelector
              v-model="runtimeSelectedFields"
              :groups="groupedFields('runtime')"
              :summary="runtimeFieldSummary"
              @select-all="selectAllFields('runtime')"
              @clear="clearFields('runtime')"
            />

            <div class="settings-developer-form-grid">
              <AoiTextField
                v-model="runtimeDraftId"
                label="新档 ID（slug，可留空）"
                appearance="outlined"
              />
              <AoiTextField
                v-model="runtimeDraftName"
                label="新档名称"
                appearance="outlined"
              />
              <AoiTextField
                v-model="runtimeDraftDescription"
                label="新档说明"
                appearance="outlined"
              />
            </div>

            <div class="settings-developer-actions">
              <AoiButton tone="accent" variant="filled"
                icon="plus"
                :disabled="Boolean(busyAction)"
                @click="createRuntimeProfileFromCurrent"
              >
                新建
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                icon="copy-plus"
                :disabled="!selectedRuntimeProfile || Boolean(busyAction)"
                @click="copySelectedRuntimeProfile"
              >
                复制当前档
              </AoiButton>
              <AoiFileInput
                accept=".json,application/json"
                :disabled="Boolean(busyAction)"
                @change="importRuntimeProfiles"
              >
                <template #default="{ open }">
                  <AoiButton tone="accent"
                    variant="outlined"
                    icon="upload"
                    :disabled="Boolean(busyAction)"
                    :loading="busyAction === 'importRuntime'"
                    @click="open"
                  >
                    导入
                  </AoiButton>
                </template>
              </AoiFileInput>
              <AoiButton tone="accent"
                variant="outlined"
                icon="download"
                :disabled="!runtimePreviewJson || Boolean(busyAction)"
                @click="downloadJson(`${selectedRuntimeProfile?.id || 'runtime-profile'}.json`, runtimePreviewJson)"
              >
                导出
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                icon="copy"
                :disabled="!runtimePreviewJson || Boolean(busyAction)"
                @click="copyJson(runtimePreviewJson)"
              >
                复制 JSON
              </AoiButton>
            </div>

            <SettingsJsonPreview
              :code="runtimePreviewJson"
              fallback="未选择运行时档案"
              :note="`应用当前档案会有 ${selectedRuntimeApplyDiffs.length} 项变化。若背景引用缺少 IndexedDB 图片字节，会提示并恢复默认背景。`"
            />
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel
        v-else
        icon="folder-cog"
        :title="t('settings.developer.assets.title')"
        :description="t('settings.developer.assets.description')"
      >
        <SettingsAssetManager :writable="isDevBuild" />
      </SettingsPanel>

      <SettingsProfileDiffDialog
        v-model:open="confirmOpen"
        :title="pendingConfirm?.title"
        :description="pendingConfirm?.description"
        :diffs="pendingConfirm?.diffs || []"
        :danger="pendingConfirm?.danger"
        :confirm-label="pendingConfirm?.confirmLabel || '确认'"
        :confirming="confirming"
        @confirm="runPendingConfirm"
      />
    </template>
  </div>
</template>

<style scoped>
.settings-developer-tabs {
  max-width: 100%;
  overflow-x: auto;
}

.settings-developer-layout {
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
  gap: var(--aoi-grid-gap);
  align-items: start;
}

.settings-developer-workspace {
  display: grid;
  min-width: 0;
  gap: var(--aoi-grid-gap-compact);
}

.settings-developer-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--aoi-grid-gap-compact);
}

.settings-developer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 820px) {
  .settings-developer-layout {
    grid-template-columns: 1fr;
  }
}
</style>
