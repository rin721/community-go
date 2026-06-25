<script setup lang="ts">
import type {
  AoiDeveloperAssetActionResponse,
  AoiDeveloperAssetEntry,
  AoiDeveloperAssetListResponse,
  AoiDeveloperAssetReadTextResponse,
  AoiDeveloperAssetRoot,
  AoiDeveloperAssetRootId,
  AoiDeveloperAssetUploadResponse
} from "~~/shared/types/developer-assets"

type AssetDialogKind = "chmod" | "copy" | "createDirectory" | "createFile" | "delete" | "move" | "rename"
type AssetViewMode = "grid" | "list"
type AssetSortKey = "kind" | "modified" | "name" | "size"
type AssetSortDirection = "asc" | "desc"
type AssetMenuAction = "chmod" | "copy" | "copyPublicUrl" | "delete" | "download" | "loadText" | "move" | "open" | "rename"
type AssetWorkspaceTab = "browser" | "editor" | "preview"
type ExplorerRowKind = "directory" | "file" | "root"

interface AssetDialogState {
  confirmLabel: string
  danger: boolean
  description: string
  kind: AssetDialogKind
  open: boolean
  title: string
}

interface ExplorerRow {
  current: boolean
  depth: number
  entry?: AoiDeveloperAssetEntry
  expanded: boolean
  id: string
  kind: ExplorerRowKind
  label: string
  loading: boolean
  path: string
  rootId: AoiDeveloperAssetRootId
  selected: boolean
}

interface AssetActionMenuItem {
  disabled: boolean
  icon: string
  label: string
  value: AssetMenuAction
}

const props = withDefaults(defineProps<{
  writable?: boolean
}>(), {
  writable: false
})

const { t } = useI18n()

const fallbackRoots: AoiDeveloperAssetRoot[] = [
  { id: "public", label: "public", relativePath: "public", publicBaseUrl: "/" },
  { id: "app-assets", label: "app/assets", relativePath: "app/assets" },
  { id: "i18n-locales", label: "i18n/locales", relativePath: "i18n/locales" }
]

const rootId = ref<AoiDeveloperAssetRootId>("public")
const roots = ref<AoiDeveloperAssetRoot[]>(fallbackRoots)
const currentPath = ref("")
const entries = ref<AoiDeveloperAssetEntry[]>([])
const selectedPath = ref("")
const query = ref("")
const busyAction = ref("")
const statusMessage = ref("")
const errorMessage = ref("")
const warningMessage = ref("")
const lastUpdatedAt = ref("")
const editorContent = ref("")
const loadedTextPath = ref("")
const pendingUploadFiles = shallowRef<File[]>([])
const uploadOverwriteOpen = ref(false)
const viewMode = ref<AssetViewMode>("list")
const activeWorkspaceTab = ref<AssetWorkspaceTab>("browser")
const sortKey = ref<AssetSortKey>("name")
const sortDirection = ref<AssetSortDirection>("asc")
const expandedDirectoryKeys = ref<string[]>([])
const loadingDirectoryKeys = ref<string[]>([])
const directoryCache = shallowRef<Record<string, AoiDeveloperAssetEntry[]>>({})
const actionMenuOpen = ref(false)
const actionMenuRef = ref<HTMLElement | null>(null)
const actionMenuPosition = ref({
  x: 0,
  y: 0
})
const actionMenuMeasuredSize = ref({
  height: 328,
  width: 196
})

const dialog = reactive<AssetDialogState>({
  confirmLabel: "",
  danger: false,
  description: "",
  kind: "createFile",
  open: false,
  title: ""
})
const dialogName = ref("")
const dialogDestination = ref("")
const dialogMode = ref("")
const dialogOverwrite = ref(false)

const rootModel = computed({
  get: () => rootId.value,
  set: (value: string) => {
    if (isRootId(value)) {
      void loadAssets("", value)
    }
  }
})
const sortModel = computed({
  get: () => `${sortKey.value}:${sortDirection.value}`,
  set: (value: string) => {
    const [nextKey, nextDirection] = value.split(":")

    if (isSortKey(nextKey) && isSortDirection(nextDirection)) {
      sortKey.value = nextKey
      sortDirection.value = nextDirection
    }
  }
})
const workspaceTabModel = computed({
  get: () => activeWorkspaceTab.value,
  set: (value: string) => {
    if (isWorkspaceTab(value)) {
      activeWorkspaceTab.value = value
    }
  }
})
const rootOptions = computed(() => roots.value.map((root) => ({
  label: `${root.label} (${root.relativePath})`,
  value: root.id
})))
const sortOptions = computed(() => [
  { label: t("settings.developer.assets.sort.nameAsc"), value: "name:asc" },
  { label: t("settings.developer.assets.sort.nameDesc"), value: "name:desc" },
  { label: t("settings.developer.assets.sort.modifiedDesc"), value: "modified:desc" },
  { label: t("settings.developer.assets.sort.modifiedAsc"), value: "modified:asc" },
  { label: t("settings.developer.assets.sort.sizeDesc"), value: "size:desc" },
  { label: t("settings.developer.assets.sort.sizeAsc"), value: "size:asc" },
  { label: t("settings.developer.assets.sort.kindAsc"), value: "kind:asc" }
])
const workspaceTabs = computed(() => [
  { value: "browser", label: t("settings.developer.assets.workspace.browser"), icon: "folder-open" },
  { value: "preview", label: t("settings.developer.assets.workspace.preview"), icon: "eye" },
  { value: "editor", label: t("settings.developer.assets.workspace.editor"), icon: "code-2" }
])
const currentRoot = computed(() => roots.value.find((root) => root.id === rootId.value) || roots.value[0]!)
const selectedEntry = computed(() => {
  const currentEntry = entries.value.find((entry) => entry.path === selectedPath.value)

  if (currentEntry) {
    return currentEntry
  }

  return Object.values(directoryCache.value)
    .flat()
    .find((entry) => entry.rootId === rootId.value && entry.path === selectedPath.value) || null
})
const selectedPreviewUrl = computed(() => {
  const entry = selectedEntry.value

  if (!entry || entry.kind !== "file") {
    return ""
  }

  return entry.publicUrl || createDownloadUrl(entry)
})
const normalizedQuery = computed(() => query.value.trim().toLowerCase())
const filteredEntries = computed(() => {
  const sourceEntries = normalizedQuery.value
    ? entries.value.filter((entry) => {
      const haystack = `${entry.name} ${entry.path} ${entry.extension}`.toLowerCase()

      return haystack.includes(normalizedQuery.value)
    })
    : entries.value

  return sortEntries(sourceEntries, sortKey.value, sortDirection.value)
})
const explorerRows = computed<ExplorerRow[]>(() => {
  const rows: ExplorerRow[] = []

  roots.value.forEach((root) => {
    const rootExpanded = isDirectoryExpanded(root.id, "")
    const rootKey = directoryKey(root.id, "")

    rows.push({
      current: root.id === rootId.value && currentPath.value === "",
      depth: 0,
      expanded: rootExpanded,
      id: rootKey,
      kind: "root",
      label: root.label,
      loading: isDirectoryLoading(root.id, ""),
      path: "",
      rootId: root.id,
      selected: root.id === rootId.value && !selectedPath.value
    })

    if (rootExpanded) {
      appendExplorerRows(rows, root.id, "", 1)
    }
  })

  return rows
})
const breadcrumbs = computed(() => {
  const crumbs = [{
    label: currentRoot.value.label,
    path: ""
  }]
  let path = ""

  currentPath.value.split("/").filter(Boolean).forEach((segment) => {
    path = path ? `${path}/${segment}` : segment
    crumbs.push({
      label: segment,
      path
    })
  })

  return crumbs
})
const currentPathLabel = computed(() => {
  return currentPath.value ? `${currentRoot.value.relativePath}/${currentPath.value}` : currentRoot.value.relativePath
})
const selectedPathLabel = computed(() => {
  const entry = selectedEntry.value

  if (!entry) {
    return currentPathLabel.value
  }

  return `${currentRoot.value.relativePath}/${entry.path}`
})
const statItems = computed(() => {
  const entry = selectedEntry.value

  if (!entry) {
    return [
      { label: t("settings.developer.assets.stats.root"), value: currentRoot.value.relativePath },
      { label: t("settings.developer.assets.stats.path"), value: currentPath.value || "/" },
      { label: t("settings.developer.assets.stats.items"), value: String(entries.value.length) }
    ]
  }

  return [
    { label: t("settings.developer.assets.stats.type"), value: t(`settings.developer.assets.kinds.${entry.kind}`) },
    { label: t("settings.developer.assets.stats.size"), value: entry.kind === "directory" ? "-" : formatBytes(entry.size) },
    { label: t("settings.developer.assets.stats.mode"), value: entry.modeText || "-" },
    { label: t("settings.developer.assets.stats.modified"), value: formatDate(entry.modifiedAt) }
  ]
})
const actionMenuStyle = computed(() => {
  if (!import.meta.client) {
    return {}
  }

  const width = actionMenuMeasuredSize.value.width
  const height = actionMenuMeasuredSize.value.height
  const left = Math.max(8, Math.min(actionMenuPosition.value.x, window.innerWidth - width - 8))
  const top = Math.max(8, Math.min(actionMenuPosition.value.y, window.innerHeight - height - 8))

  return {
    left: `${left}px`,
    top: `${top}px`
  }
})
const actionMenuItems = computed<AssetActionMenuItem[]>(() => {
  const entry = selectedEntry.value
  const disabled = !entry || Boolean(busyAction.value)

  return [
    {
      disabled: disabled || entry?.kind !== "directory",
      icon: "folder-open",
      label: t("settings.developer.assets.actions.open"),
      value: "open"
    },
    {
      disabled: disabled || entry?.kind !== "file",
      icon: "download",
      label: t("settings.developer.assets.actions.download"),
      value: "download"
    },
    {
      disabled: disabled || !entry?.textEditable,
      icon: "file-text",
      label: t("settings.developer.assets.actions.loadText"),
      value: "loadText"
    },
    {
      disabled,
      icon: "pencil",
      label: t("settings.developer.assets.actions.rename"),
      value: "rename"
    },
    {
      disabled,
      icon: "copy",
      label: t("settings.developer.assets.actions.copy"),
      value: "copy"
    },
    {
      disabled,
      icon: "move",
      label: t("settings.developer.assets.actions.move"),
      value: "move"
    },
    {
      disabled,
      icon: "shield",
      label: t("settings.developer.assets.actions.chmod"),
      value: "chmod"
    },
    {
      disabled: disabled || !entry?.publicUrl,
      icon: "link",
      label: t("settings.developer.assets.actions.copyPublicUrl"),
      value: "copyPublicUrl"
    },
    {
      disabled,
      icon: "trash-2",
      label: t("settings.developer.assets.actions.delete"),
      value: "delete"
    }
  ]
})

watch(() => props.writable, (value) => {
  if (value && !entries.value.length) {
    void loadAssets(currentPath.value)
  }
}, { immediate: true })

watch(actionMenuOpen, (value) => {
  if (value) {
    void measureActionMenu()
  }
})

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown, true)
  document.addEventListener("keydown", onDocumentKeydown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, true)
  document.removeEventListener("keydown", onDocumentKeydown, true)
})

function isRootId(value: string): value is AoiDeveloperAssetRootId {
  return value === "public" || value === "app-assets" || value === "i18n-locales"
}

function isSortKey(value: string | undefined): value is AssetSortKey {
  return value === "kind" || value === "modified" || value === "name" || value === "size"
}

function isSortDirection(value: string | undefined): value is AssetSortDirection {
  return value === "asc" || value === "desc"
}

function isWorkspaceTab(value: string): value is AssetWorkspaceTab {
  return value === "browser" || value === "editor" || value === "preview"
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
  if (error && typeof error === "object") {
    const fetchError = error as {
      statusCode?: number
      statusMessage?: string
    }

    if (fetchError.statusMessage) {
      return `${fallback}: ${fetchError.statusMessage}`
    }
  }

  return fallback
}

function updateAssetState(response: AoiDeveloperAssetListResponse | AoiDeveloperAssetActionResponse) {
  roots.value = response.roots.length ? response.roots : fallbackRoots
  rootId.value = response.root.id
  currentPath.value = response.currentPath
  entries.value = response.entries
  warningMessage.value = response.warning || ""
  lastUpdatedAt.value = new Date(response.updatedAt).toLocaleString()
  setCachedDirectory(response.root.id, response.currentPath, response.entries)
  expandPath(response.root.id, response.currentPath)

  const actionResponse = response as AoiDeveloperAssetActionResponse

  if (actionResponse.entry) {
    selectedPath.value = actionResponse.entry.path
  } else if (!entries.value.some((entry) => entry.path === selectedPath.value)) {
    selectedPath.value = ""
  }
}

async function requestAssets<T extends AoiDeveloperAssetListResponse>(
  action: string,
  body: Record<string, unknown> = {},
  message = ""
) {
  if (!props.writable) {
    return null
  }

  busyAction.value = action

  try {
    const response = await $fetch<T>("/api/developer/assets", {
      method: "POST",
      body: {
        action,
        rootId: rootId.value,
        ...body
      }
    })

    updateAssetState(response)

    if (message) {
      setStatus(message)
    }

    return response
  } catch (error) {
    setError(errorText(error, t("settings.developer.assets.errors.action")))
    return null
  } finally {
    busyAction.value = ""
  }
}

async function fetchAssetList(targetRootId: AoiDeveloperAssetRootId, path: string) {
  return await $fetch<AoiDeveloperAssetListResponse>("/api/developer/assets", {
    method: "POST",
    body: {
      action: "list",
      path,
      rootId: targetRootId
    }
  })
}

async function loadAssets(
  path = currentPath.value,
  targetRootId = rootId.value,
  message = "",
  nextSelectedPath = ""
) {
  if (!props.writable) {
    return null
  }

  busyAction.value = "list"
  clearEditor()
  activeWorkspaceTab.value = "browser"

  try {
    const response = await fetchAssetList(targetRootId, path)

    updateAssetState(response)

    if (nextSelectedPath && response.entries.some((entry) => entry.path === nextSelectedPath)) {
      selectedPath.value = nextSelectedPath
    }

    if (message) {
      setStatus(message)
    }

    return response
  } catch (error) {
    setError(errorText(error, t("settings.developer.assets.errors.action")))
    return null
  } finally {
    busyAction.value = ""
  }
}

async function loadCachedDirectory(targetRootId: AoiDeveloperAssetRootId, path: string, force = false) {
  if (!props.writable) {
    return
  }

  const key = directoryKey(targetRootId, path)

  if (!force && directoryCache.value[key]) {
    return
  }

  if (loadingDirectoryKeys.value.includes(key)) {
    return
  }

  loadingDirectoryKeys.value = [...loadingDirectoryKeys.value, key]

  try {
    const response = await fetchAssetList(targetRootId, path)

    roots.value = response.roots.length ? response.roots : fallbackRoots
    setCachedDirectory(response.root.id, response.currentPath, response.entries)

    if (response.warning) {
      warningMessage.value = response.warning
    }
  } catch (error) {
    setError(errorText(error, t("settings.developer.assets.errors.action")))
  } finally {
    loadingDirectoryKeys.value = loadingDirectoryKeys.value.filter((item) => item !== key)
  }
}

function selectEntry(entry: AoiDeveloperAssetEntry) {
  selectedPath.value = entry.path
  clearEditor()
}

function activateEntry(entry: AoiDeveloperAssetEntry) {
  if (entry.kind === "directory") {
    openDirectory(entry)
    return
  }

  selectEntry(entry)
  void activateSelectedFile(entry)
}

function openDirectory(entry: AoiDeveloperAssetEntry) {
  if (entry.kind !== "directory") {
    selectEntry(entry)
    return
  }

  selectedPath.value = ""
  activeWorkspaceTab.value = "browser"
  expandPath(entry.rootId, entry.path)
  void loadAssets(entry.path, entry.rootId)
}

async function openExplorerFile(row: ExplorerRow) {
  if (!row.entry) {
    return null
  }

  const parent = parentAssetPath(row.path)
  const response = await loadAssets(parent, row.rootId, "", row.path)

  if (response) {
    const entry = response.entries.find((item) => item.path === row.path) || row.entry

    selectedPath.value = row.path
    return entry
  }

  return null
}

function clearEditor() {
  editorContent.value = ""
  loadedTextPath.value = ""
}

async function activateSelectedFile(entry: AoiDeveloperAssetEntry) {
  if (entry.textEditable) {
    await readSelectedText()
    return
  }

  activeWorkspaceTab.value = "preview"
}

async function readSelectedText() {
  const entry = selectedEntry.value

  if (!entry?.textEditable) {
    return
  }

  const response = await requestAssets<AoiDeveloperAssetReadTextResponse>("readText", {
    path: entry.path
  })

  if (response) {
    editorContent.value = response.content
    loadedTextPath.value = response.entry.path
    selectedPath.value = response.entry.path
    activeWorkspaceTab.value = "editor"
    setStatus(t("settings.developer.assets.messages.textLoaded"))
  }
}

async function saveSelectedText() {
  const entry = selectedEntry.value

  if (!entry || entry.path !== loadedTextPath.value) {
    return
  }

  const response = await requestAssets<AoiDeveloperAssetActionResponse>("writeText", {
    content: editorContent.value,
    path: entry.path
  }, t("settings.developer.assets.messages.textSaved"))

  if (response?.entry) {
    loadedTextPath.value = response.entry.path
  }
}

function openCreateFileDialog() {
  openDialog({
    confirmLabel: t("settings.developer.assets.actions.create"),
    description: t("settings.developer.assets.dialogs.createFileDescription"),
    kind: "createFile",
    title: t("settings.developer.assets.dialogs.createFileTitle")
  })
  dialogName.value = "untitled.txt"
}

function openCreateDirectoryDialog() {
  openDialog({
    confirmLabel: t("settings.developer.assets.actions.create"),
    description: t("settings.developer.assets.dialogs.createDirectoryDescription"),
    kind: "createDirectory",
    title: t("settings.developer.assets.dialogs.createDirectoryTitle")
  })
  dialogName.value = "new-folder"
}

function openRenameDialog() {
  const entry = selectedEntry.value

  if (!entry) {
    return
  }

  openDialog({
    confirmLabel: t("settings.developer.assets.actions.rename"),
    description: t("settings.developer.assets.dialogs.renameDescription", { name: entry.name }),
    kind: "rename",
    title: t("settings.developer.assets.dialogs.renameTitle")
  })
  dialogName.value = entry.name
}

function openCopyDialog() {
  const entry = selectedEntry.value

  if (!entry) {
    return
  }

  openDialog({
    confirmLabel: t("settings.developer.assets.actions.copy"),
    description: t("settings.developer.assets.dialogs.copyDescription", { name: entry.name }),
    kind: "copy",
    title: t("settings.developer.assets.dialogs.copyTitle")
  })
  dialogDestination.value = defaultCopyPath(entry)
}

function openMoveDialog() {
  const entry = selectedEntry.value

  if (!entry) {
    return
  }

  openDialog({
    confirmLabel: t("settings.developer.assets.actions.move"),
    description: t("settings.developer.assets.dialogs.moveDescription", { name: entry.name }),
    kind: "move",
    title: t("settings.developer.assets.dialogs.moveTitle")
  })
  dialogDestination.value = entry.path
}

function openChmodDialog() {
  const entry = selectedEntry.value

  if (!entry) {
    return
  }

  openDialog({
    confirmLabel: t("settings.developer.assets.actions.chmod"),
    description: t("settings.developer.assets.dialogs.chmodDescription", { name: entry.name }),
    kind: "chmod",
    title: t("settings.developer.assets.dialogs.chmodTitle")
  })
  dialogMode.value = entry.modeText || "755"
}

function openDeleteDialog() {
  const entry = selectedEntry.value

  if (!entry) {
    return
  }

  openDialog({
    confirmLabel: t("settings.developer.assets.actions.delete"),
    danger: true,
    description: t("settings.developer.assets.dialogs.deleteDescription", { name: entry.name }),
    kind: "delete",
    title: t("settings.developer.assets.dialogs.deleteTitle")
  })
}

function openDialog(input: Omit<AssetDialogState, "danger" | "open"> & { danger?: boolean }) {
  dialog.kind = input.kind
  dialog.title = input.title
  dialog.description = input.description
  dialog.confirmLabel = input.confirmLabel
  dialog.danger = input.danger === true
  dialog.open = true
  dialogName.value = ""
  dialogDestination.value = ""
  dialogMode.value = ""
  dialogOverwrite.value = false
}

async function confirmDialog() {
  const entry = selectedEntry.value

  switch (dialog.kind) {
    case "chmod":
      if (entry) {
        await requestAssets<AoiDeveloperAssetActionResponse>("chmod", {
          mode: dialogMode.value,
          path: entry.path
        }, t("settings.developer.assets.messages.chmodded"))
      }
      break
    case "copy":
      if (entry) {
        await requestAssets<AoiDeveloperAssetActionResponse>("copy", {
          destinationPath: dialogDestination.value,
          overwrite: dialogOverwrite.value,
          path: entry.path
        }, t("settings.developer.assets.messages.copied"))
      }
      break
    case "createDirectory":
      await requestAssets<AoiDeveloperAssetActionResponse>("createDirectory", {
        name: dialogName.value,
        overwrite: dialogOverwrite.value,
        path: currentPath.value
      }, t("settings.developer.assets.messages.createdDirectory"))
      break
    case "createFile":
      await requestAssets<AoiDeveloperAssetActionResponse>("createFile", {
        name: dialogName.value,
        overwrite: dialogOverwrite.value,
        path: currentPath.value
      }, t("settings.developer.assets.messages.createdFile"))
      break
    case "delete":
      if (entry) {
        await requestAssets<AoiDeveloperAssetActionResponse>("delete", {
          path: entry.path
        }, t("settings.developer.assets.messages.deleted"))
        clearEditor()
      }
      break
    case "move":
      if (entry) {
        await requestAssets<AoiDeveloperAssetActionResponse>("move", {
          destinationPath: dialogDestination.value,
          overwrite: dialogOverwrite.value,
          path: entry.path
        }, t("settings.developer.assets.messages.moved"))
        clearEditor()
      }
      break
    case "rename":
      if (entry) {
        await requestAssets<AoiDeveloperAssetActionResponse>("rename", {
          name: dialogName.value,
          overwrite: dialogOverwrite.value,
          path: entry.path
        }, t("settings.developer.assets.messages.renamed"))
        clearEditor()
      }
      break
  }

  if (!errorMessage.value) {
    dialog.open = false
  }
}

async function uploadFiles(files: File[], overwrite = false) {
  if (!files.length || !props.writable) {
    return
  }

  busyAction.value = "upload"
  const form = new FormData()

  form.append("rootId", rootId.value)
  form.append("path", currentPath.value)
  form.append("overwrite", overwrite ? "true" : "false")

  files.forEach((file) => {
    form.append("files", file, file.name)
  })

  try {
    const response = await $fetch<AoiDeveloperAssetUploadResponse>("/api/developer/assets/upload", {
      method: "POST",
      body: form
    })

    pendingUploadFiles.value = []
    uploadOverwriteOpen.value = false
    updateAssetState(response)
    setStatus(t("settings.developer.assets.messages.uploaded", { count: response.uploaded.length }))
  } catch (error) {
    const fetchError = error as { statusCode?: number }

    if (!overwrite && fetchError.statusCode === 409) {
      pendingUploadFiles.value = files
      uploadOverwriteOpen.value = true
      setError("")
    } else {
      setError(errorText(error, t("settings.developer.assets.errors.upload")))
    }
  } finally {
    busyAction.value = ""
  }
}

function confirmUploadOverwrite() {
  void uploadFiles(pendingUploadFiles.value, true)
}

function downloadSelected() {
  const entry = selectedEntry.value

  if (!entry || entry.kind !== "file" || !import.meta.client) {
    return
  }

  const link = document.createElement("a")

  link.href = createDownloadUrl(entry)
  link.download = entry.name
  link.click()
}

async function copyPublicUrl() {
  const url = selectedEntry.value?.publicUrl

  if (!url || !import.meta.client) {
    return
  }

  try {
    await navigator.clipboard.writeText(url)
    setStatus(t("settings.developer.assets.messages.publicUrlCopied"))
  } catch {
    setError(t("settings.developer.assets.errors.copyUrl"))
  }
}

function handleActionMenuSelect(value: string) {
  const action = value as AssetMenuAction

  closeActionMenu()

  switch (action) {
    case "chmod":
      openChmodDialog()
      break
    case "copy":
      openCopyDialog()
      break
    case "copyPublicUrl":
      void copyPublicUrl()
      break
    case "delete":
      openDeleteDialog()
      break
    case "download":
      downloadSelected()
      break
    case "loadText":
      void readSelectedText()
      break
    case "move":
      openMoveDialog()
      break
    case "open":
      if (selectedEntry.value) {
        openDirectory(selectedEntry.value)
      }
      break
    case "rename":
      openRenameDialog()
      break
  }
}

async function measureActionMenu() {
  await nextTick()

  if (!actionMenuRef.value) {
    return
  }

  const rect = actionMenuRef.value.getBoundingClientRect()

  actionMenuMeasuredSize.value = {
    height: Math.max(240, rect.height),
    width: Math.max(180, rect.width)
  }
}

function closeActionMenu() {
  actionMenuOpen.value = false
}

function openActionMenuAt(x: number, y: number) {
  actionMenuPosition.value = { x, y }
  actionMenuOpen.value = true
  void measureActionMenu()
}

function openSelectionMenu(event: MouseEvent) {
  if (!selectedEntry.value) {
    return
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()

  openActionMenuAt(rect.left, rect.bottom + 6)
}

function openEntryMenu(entry: AoiDeveloperAssetEntry, event: MouseEvent) {
  selectEntry(entry)
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()

  openActionMenuAt(rect.left, rect.bottom + 6)
}

function openEntryContextMenu(entry: AoiDeveloperAssetEntry, event: MouseEvent) {
  selectEntry(entry)
  openActionMenuAt(event.clientX, event.clientY)
}

async function openExplorerContextMenu(row: ExplorerRow, event: MouseEvent) {
  if (!row.entry) {
    return
  }

  const x = event.clientX
  const y = event.clientY

  await openExplorerFile(row)
  openActionMenuAt(x, y)
}

function selectActionMenuItem(item: AssetActionMenuItem) {
  if (item.disabled) {
    return
  }

  handleActionMenuSelect(item.value)
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!actionMenuOpen.value || actionMenuRef.value?.contains(event.target as Node)) {
    return
  }

  closeActionMenu()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (!actionMenuOpen.value || event.key !== "Escape") {
    return
  }

  event.preventDefault()
  closeActionMenu()
}

function createDownloadUrl(entry: AoiDeveloperAssetEntry) {
  const params = new URLSearchParams({
    path: entry.path,
    rootId: entry.rootId
  })

  return `/api/developer/assets/download?${params.toString()}`
}

function defaultCopyPath(entry: AoiDeveloperAssetEntry) {
  const parent = parentAssetPath(entry.path)
  const dotIndex = entry.kind === "file" ? entry.name.lastIndexOf(".") : -1
  const name = dotIndex > 0 ? `${entry.name.slice(0, dotIndex)}-copy${entry.name.slice(dotIndex)}` : `${entry.name}-copy`

  return parent ? `${parent}/${name}` : name
}

function parentAssetPath(path: string) {
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""
}

function directoryKey(targetRootId: AoiDeveloperAssetRootId, path: string) {
  return `${targetRootId}::${path || "/"}`
}

function setCachedDirectory(targetRootId: AoiDeveloperAssetRootId, path: string, cachedEntries: AoiDeveloperAssetEntry[]) {
  directoryCache.value = {
    ...directoryCache.value,
    [directoryKey(targetRootId, path)]: cachedEntries
  }
}

function cachedDirectoryEntries(targetRootId: AoiDeveloperAssetRootId, path: string) {
  return directoryCache.value[directoryKey(targetRootId, path)] || []
}

function isDirectoryExpanded(targetRootId: AoiDeveloperAssetRootId, path: string) {
  return expandedDirectoryKeys.value.includes(directoryKey(targetRootId, path))
}

function setDirectoryExpanded(targetRootId: AoiDeveloperAssetRootId, path: string, expanded: boolean) {
  const key = directoryKey(targetRootId, path)
  const next = new Set(expandedDirectoryKeys.value)

  if (expanded) {
    next.add(key)
  } else {
    next.delete(key)
  }

  expandedDirectoryKeys.value = [...next]
}

function isDirectoryLoading(targetRootId: AoiDeveloperAssetRootId, path: string) {
  return loadingDirectoryKeys.value.includes(directoryKey(targetRootId, path))
}

function expandPath(targetRootId: AoiDeveloperAssetRootId, path: string) {
  const next = new Set(expandedDirectoryKeys.value)

  next.add(directoryKey(targetRootId, ""))

  let current = ""

  path.split("/").filter(Boolean).forEach((segment) => {
    current = current ? `${current}/${segment}` : segment
    next.add(directoryKey(targetRootId, current))
  })

  expandedDirectoryKeys.value = [...next]
}

function appendExplorerRows(rows: ExplorerRow[], targetRootId: AoiDeveloperAssetRootId, path: string, depth: number) {
  const cachedEntries = sortEntries(cachedDirectoryEntries(targetRootId, path), "name", "asc")

  cachedEntries.forEach((entry) => {
    const expanded = entry.kind === "directory" && isDirectoryExpanded(targetRootId, entry.path)
    const loading = entry.kind === "directory" && isDirectoryLoading(targetRootId, entry.path)

    rows.push({
      current: targetRootId === rootId.value && entry.kind === "directory" && entry.path === currentPath.value,
      depth,
      entry,
      expanded,
      id: directoryKey(targetRootId, entry.path),
      kind: entry.kind,
      label: entry.name,
      loading,
      path: entry.path,
      rootId: targetRootId,
      selected: targetRootId === rootId.value && selectedPath.value === entry.path
    })

    if (expanded) {
      appendExplorerRows(rows, targetRootId, entry.path, depth + 1)
    }
  })
}

function toggleExplorerDirectory(row: ExplorerRow) {
  if (row.kind === "file") {
    return
  }

  const nextExpanded = !row.expanded

  setDirectoryExpanded(row.rootId, row.path, nextExpanded)

  if (nextExpanded) {
    void loadCachedDirectory(row.rootId, row.path)
  }
}

function activateExplorerRow(row: ExplorerRow) {
  if (row.kind === "root") {
    expandPath(row.rootId, "")
    void loadAssets("", row.rootId)
    return
  }

  if (row.kind === "directory") {
    expandPath(row.rootId, row.path)
    void loadAssets(row.path, row.rootId)
    return
  }

  void openExplorerFile(row)
}

async function activateExplorerRowDirect(row: ExplorerRow) {
  if (row.kind !== "file") {
    activateExplorerRow(row)
    return
  }

  const entry = await openExplorerFile(row)

  if (entry) {
    await activateSelectedFile(entry)
  }
}

function sortEntries(sourceEntries: AoiDeveloperAssetEntry[], key: AssetSortKey, direction: AssetSortDirection) {
  const multiplier = direction === "asc" ? 1 : -1

  return [...sourceEntries].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "directory" ? -1 : 1
    }

    let result = 0

    if (key === "kind") {
      result = (a.extension || a.kind).localeCompare(b.extension || b.kind)
    } else if (key === "modified") {
      result = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
    } else if (key === "size") {
      result = a.size - b.size
    } else {
      result = a.name.localeCompare(b.name)
    }

    if (result === 0) {
      return a.name.localeCompare(b.name)
    }

    return result * multiplier
  })
}

function toggleSort(key: AssetSortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc"
    return
  }

  sortKey.value = key
  sortDirection.value = key === "modified" || key === "size" ? "desc" : "asc"
}

function sortIcon(key: AssetSortKey) {
  if (sortKey.value !== key) {
    return "arrow-up-down"
  }

  return sortDirection.value === "asc" ? "arrow-up" : "arrow-down"
}

function entryIcon(entry: AoiDeveloperAssetEntry) {
  if (entry.kind === "directory") {
    return isDirectoryExpanded(entry.rootId, entry.path) ? "folder-open" : "folder"
  }

  if (entry.previewKind === "image") {
    return "image"
  }

  if (entry.previewKind === "video") {
    return "video"
  }

  if (entry.previewKind === "audio") {
    return "music"
  }

  if (entry.previewKind === "text") {
    return "file-text"
  }

  return "file"
}

function explorerRowIcon(row: ExplorerRow) {
  if (row.kind === "root") {
    if (row.rootId === "public") {
      return "globe-2"
    }

    if (row.rootId === "i18n-locales") {
      return "languages"
    }

    return "images"
  }

  return row.entry ? entryIcon(row.entry) : "folder"
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`
  }

  const units = ["KiB", "MiB", "GiB"]
  let size = value / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}
</script>

<template>
  <PageState
    v-if="!props.writable"
    icon="folder-lock"
    :title="t('settings.developer.assets.unavailable.title')"
    :description="t('settings.developer.assets.unavailable.description')"
  />

  <div v-else class="settings-asset-manager">
    <AoiSurface surface="toolbar" padding="sm" class="settings-asset-manager__command">
      <div class="settings-asset-manager__command-main">
        <AoiSelect
          v-model="rootModel"
          class="settings-asset-manager__root"
          appearance="outlined"
          :label="t('settings.developer.assets.rootLabel')"
          :options="rootOptions"
        />
        <AoiTextField
          v-model="query"
          class="settings-asset-manager__search"
          icon="search"
          appearance="outlined"
          type="search"
          :label="t('settings.developer.assets.searchLabel')"
        />
        <div class="settings-asset-manager__command-actions">
          <AoiButton tone="accent"
            variant="outlined"
            icon="refresh-cw"
            :loading="busyAction === 'list'"
            :disabled="Boolean(busyAction)"
            @click="() => loadAssets(currentPath, rootId, t('settings.developer.assets.messages.refreshed'))"
          >
            {{ t("settings.developer.assets.actions.refresh") }}
          </AoiButton>
          <AoiButton tone="accent" variant="filled"
            icon="file-plus"
            :disabled="Boolean(busyAction)"
            @click="openCreateFileDialog"
          >
            {{ t("settings.developer.assets.actions.newFile") }}
          </AoiButton>
          <AoiButton tone="accent"
            variant="outlined"
            icon="folder-plus"
            :disabled="Boolean(busyAction)"
            @click="openCreateDirectoryDialog"
          >
            {{ t("settings.developer.assets.actions.newDirectory") }}
          </AoiButton>
          <AoiFileInput
            multiple
            :disabled="Boolean(busyAction)"
            @change="(files) => uploadFiles(files)"
          >
            <template #default="{ open }">
              <AoiButton tone="accent"
                variant="outlined"
                icon="upload"
                :loading="busyAction === 'upload'"
                :disabled="Boolean(busyAction)"
                @click="open"
              >
                {{ t("settings.developer.assets.actions.upload") }}
              </AoiButton>
            </template>
          </AoiFileInput>
        </div>
      </div>

      <div class="settings-asset-manager__command-view">
        <AoiSelect
          v-model="sortModel"
          class="settings-asset-manager__sort"
          appearance="outlined"
          :label="t('settings.developer.assets.sortLabel')"
          :options="sortOptions"
        />
        <div class="settings-asset-manager__view-toggle" role="group" :aria-label="t('settings.developer.assets.viewModeLabel')">
          <AoiIconButton
            icon="list"
            size="sm"
            :active="viewMode === 'list'"
            :label="t('settings.developer.assets.views.list')"
            @click="viewMode = 'list'"
          />
          <AoiIconButton
            icon="layout-grid"
            size="sm"
            :active="viewMode === 'grid'"
            :label="t('settings.developer.assets.views.grid')"
            @click="viewMode = 'grid'"
          />
        </div>
      </div>
    </AoiSurface>

    <AoiStatusMessage v-if="statusMessage" intent="success" :message="statusMessage" />
    <AoiStatusMessage v-if="warningMessage" intent="warning" :message="warningMessage" />
    <AoiStatusMessage v-if="errorMessage" intent="danger" :message="errorMessage" />

    <div class="settings-asset-manager__shell">
      <AoiSurface surface="card" padding="none" class="settings-asset-manager__explorer">
        <div class="settings-asset-manager__pane-head">
          <span>
            <AoiIcon name="files" :size="17" decorative />
            {{ t("settings.developer.assets.explorer.title") }}
          </span>
          <small>{{ roots.length }}</small>
        </div>

        <div v-aoi-scroll-native class="settings-asset-manager__explorer-scroll" role="tree">
          <div
            v-for="row in explorerRows"
            :key="row.id"
            class="settings-asset-manager__explorer-row"
            :class="{
              'settings-asset-manager__explorer-row--current': row.current,
              'settings-asset-manager__explorer-row--selected': row.selected,
              'settings-asset-manager__explorer-row--root': row.kind === 'root'
            }"
            role="treeitem"
            :aria-expanded="row.kind === 'file' ? undefined : row.expanded"
            :style="{ '--asset-explorer-depth': row.depth }"
            @contextmenu.prevent="openExplorerContextMenu(row, $event)"
          >
            <button
              class="settings-asset-manager__explorer-toggle"
              type="button"
              :disabled="row.kind === 'file'"
              :aria-label="row.expanded ? t('settings.developer.assets.explorer.collapse') : t('settings.developer.assets.explorer.expand')"
              @click="toggleExplorerDirectory(row)"
            >
              <AoiIcon
                v-if="row.kind !== 'file'"
                :name="row.expanded ? 'chevron-down' : 'chevron-right'"
                :size="15"
                decorative
              />
            </button>
            <button
              class="settings-asset-manager__explorer-label"
              type="button"
              @click="activateExplorerRow(row)"
              @dblclick="activateExplorerRowDirect(row)"
              @keydown.enter.prevent="activateExplorerRowDirect(row)"
            >
              <AoiIcon :name="explorerRowIcon(row)" :size="16" decorative />
              <span>{{ row.label }}</span>
              <small v-if="row.loading">{{ t("settings.developer.assets.explorer.loading") }}</small>
            </button>
          </div>
        </div>
      </AoiSurface>

      <div class="settings-asset-manager__workspace">
        <div class="settings-asset-manager__content">
          <AoiSurface surface="card" padding="none" class="settings-asset-manager__workbench">
            <div class="settings-asset-manager__workbench-head">
              <div class="settings-asset-manager__path-block">
                <strong>{{ currentPathLabel }}</strong>
                <nav class="settings-asset-manager__breadcrumbs" :aria-label="t('settings.developer.assets.breadcrumbLabel')">
                  <button
                    v-for="crumb in breadcrumbs"
                    :key="crumb.path || '__root'"
                    type="button"
                    :class="{ 'settings-asset-manager__breadcrumb--active': crumb.path === currentPath }"
                    @click="loadAssets(crumb.path)"
                  >
                    {{ crumb.label }}
                  </button>
                </nav>
              </div>
              <div class="settings-asset-manager__browser-actions">
                <small>{{ t("settings.developer.assets.itemCount", { count: filteredEntries.length }) }}</small>
                <AoiButton tone="accent"
                  variant="outlined"
                  size="sm"
                  icon="more-horizontal"
                  :disabled="!selectedEntry || Boolean(busyAction)"
                  @click="openSelectionMenu"
                >
                  {{ t("settings.developer.assets.actions.more") }}
                </AoiButton>
              </div>
            </div>

            <AoiTabs
              v-model="workspaceTabModel"
              class="settings-asset-manager__workspace-tabs"
              :items="workspaceTabs"
              :aria-label="t('settings.developer.assets.workspace.label')"
            />

            <div class="settings-asset-manager__tab-panel">
              <div v-if="activeWorkspaceTab === 'browser'" class="settings-asset-manager__browser-panel">
                <div v-if="viewMode === 'list'" v-aoi-scroll-native class="settings-asset-manager__table-wrap">
                  <table class="settings-asset-manager__table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" @click="toggleSort('name')">
                            {{ t("settings.developer.assets.table.name") }}
                            <AoiIcon :name="sortIcon('name')" :size="14" decorative />
                          </button>
                        </th>
                        <th>
                          <button type="button" @click="toggleSort('kind')">
                            {{ t("settings.developer.assets.table.type") }}
                            <AoiIcon :name="sortIcon('kind')" :size="14" decorative />
                          </button>
                        </th>
                        <th>
                          <button type="button" @click="toggleSort('size')">
                            {{ t("settings.developer.assets.table.size") }}
                            <AoiIcon :name="sortIcon('size')" :size="14" decorative />
                          </button>
                        </th>
                        <th>{{ t("settings.developer.assets.table.mode") }}</th>
                        <th>
                          <button type="button" @click="toggleSort('modified')">
                            {{ t("settings.developer.assets.table.modified") }}
                            <AoiIcon :name="sortIcon('modified')" :size="14" decorative />
                          </button>
                        </th>
                        <th>{{ t("settings.developer.assets.table.actions") }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="entry in filteredEntries"
                        :key="entry.path"
                        :class="{ 'settings-asset-manager__row--selected': selectedPath === entry.path }"
                        tabindex="0"
                        @click="selectEntry(entry)"
                        @keydown.enter.prevent="activateEntry(entry)"
                        @dblclick="activateEntry(entry)"
                        @contextmenu.prevent="openEntryContextMenu(entry, $event)"
                      >
                        <td>
                          <span class="settings-asset-manager__name">
                            <AoiIcon :name="entryIcon(entry)" :size="17" decorative />
                            <span>{{ entry.name }}</span>
                          </span>
                        </td>
                        <td>{{ t(`settings.developer.assets.kinds.${entry.kind}`) }}</td>
                        <td>{{ entry.kind === "directory" ? "-" : formatBytes(entry.size) }}</td>
                        <td>{{ entry.modeText || "-" }}</td>
                        <td>{{ formatDate(entry.modifiedAt) }}</td>
                        <td>
                          <div class="settings-asset-manager__row-actions">
                            <AoiIconButton
                              v-if="entry.kind === 'directory'"
                              icon="folder-open"
                              size="sm"
                              :label="t('settings.developer.assets.actions.open')"
                              @click.stop="openDirectory(entry)"
                            />
                            <AoiIconButton
                              v-else
                              icon="download"
                              size="sm"
                              :label="t('settings.developer.assets.actions.download')"
                              @click.stop="() => { selectedPath = entry.path; downloadSelected() }"
                            />
                            <AoiIconButton
                              icon="more-horizontal"
                              size="sm"
                              :label="t('settings.developer.assets.actions.more')"
                              @click.stop="openEntryMenu(entry, $event)"
                            />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div v-else class="settings-asset-manager__grid" role="list">
                  <div
                    v-for="entry in filteredEntries"
                    :key="entry.path"
                    class="settings-asset-manager__tile"
                    :class="{ 'settings-asset-manager__tile--selected': selectedPath === entry.path }"
                    role="listitem"
                    tabindex="0"
                    @click="selectEntry(entry)"
                    @keydown.enter.prevent="activateEntry(entry)"
                    @dblclick="activateEntry(entry)"
                    @contextmenu.prevent="openEntryContextMenu(entry, $event)"
                  >
                    <div class="settings-asset-manager__tile-icon" aria-hidden="true">
                      <AoiIcon :name="entryIcon(entry)" :size="28" decorative />
                    </div>
                    <div class="settings-asset-manager__tile-copy">
                      <strong>{{ entry.name }}</strong>
                      <small>{{ entry.kind === "directory" ? t("settings.developer.assets.kinds.directory") : formatBytes(entry.size) }}</small>
                    </div>
                    <AoiIconButton
                      class="settings-asset-manager__tile-menu"
                      icon="more-horizontal"
                      size="sm"
                      :label="t('settings.developer.assets.actions.more')"
                      @click.stop="openEntryMenu(entry, $event)"
                    />
                  </div>
                </div>

                <p v-if="!filteredEntries.length" class="settings-note settings-asset-manager__empty">
                  {{ normalizedQuery ? t("settings.developer.assets.emptySearch") : t("settings.developer.assets.empty") }}
                </p>
              </div>

              <div v-else-if="activeWorkspaceTab === 'preview'" class="settings-asset-manager__preview-panel">
                <template v-if="selectedEntry?.kind === 'file'">
                  <img
                    v-if="selectedEntry.previewKind === 'image'"
                    class="settings-asset-manager__media"
                    :src="selectedPreviewUrl"
                    :alt="selectedEntry.name"
                  >
                  <video
                    v-else-if="selectedEntry.previewKind === 'video'"
                    class="settings-asset-manager__media"
                    :src="selectedPreviewUrl"
                    controls
                  />
                  <audio
                    v-else-if="selectedEntry.previewKind === 'audio'"
                    class="settings-asset-manager__audio"
                    :src="selectedPreviewUrl"
                    controls
                  />
                  <p v-else class="settings-note">
                    {{ t("settings.developer.assets.previewUnavailable") }}
                  </p>
                </template>
                <p v-else class="settings-note">
                  {{ selectedEntry ? t("settings.developer.assets.previewDirectory") : t("settings.developer.assets.noSelection") }}
                </p>
              </div>

              <div v-else class="settings-asset-manager__editor-panel">
                <div class="settings-asset-manager__editor-head">
                  <strong>
                    <AoiIcon name="code-2" :size="17" decorative />
                    {{ t("settings.developer.assets.editor.title") }}
                  </strong>
                  <div class="settings-asset-manager__button-row">
                    <AoiButton tone="accent"
                      variant="outlined"
                      size="sm"
                      icon="file-text"
                      :disabled="!selectedEntry?.textEditable || Boolean(busyAction)"
                      :loading="busyAction === 'readText'"
                      @click="readSelectedText"
                    >
                      {{ t("settings.developer.assets.actions.loadText") }}
                    </AoiButton>
                    <AoiButton tone="accent" variant="filled"
                      size="sm"
                      icon="save"
                      :disabled="!loadedTextPath || !selectedEntry || selectedEntry.path !== loadedTextPath || Boolean(busyAction)"
                      :loading="busyAction === 'writeText'"
                      @click="saveSelectedText"
                    >
                      {{ t("settings.developer.assets.actions.saveText") }}
                    </AoiButton>
                  </div>
                </div>
                <textarea
                  v-model="editorContent"
                  class="settings-asset-manager__textarea"
                  :placeholder="selectedEntry?.textEditable ? t('settings.developer.assets.editor.placeholder') : t('settings.developer.assets.editor.unavailable')"
                  :disabled="!loadedTextPath || Boolean(busyAction)"
                  spellcheck="false"
                />
              </div>
            </div>
          </AoiSurface>
        </div>

        <div class="settings-asset-manager__detail">
          <AoiSurface surface="card" padding="md" class="settings-asset-manager__detail-card">
            <div class="settings-asset-manager__pane-head settings-asset-manager__pane-head--plain">
              <span>
                <AoiIcon name="panel-right" :size="17" decorative />
                {{ t("settings.developer.assets.detail.title") }}
              </span>
            </div>
            <p class="settings-note settings-asset-manager__selected-path">
              {{ selectedEntry ? selectedPathLabel : t("settings.developer.assets.noSelection") }}
            </p>
            <AoiStatGrid :items="statItems" :columns="2" />
            <div class="settings-asset-manager__button-row">
              <AoiButton tone="accent"
                variant="outlined"
                size="sm"
                icon="download"
                :disabled="!selectedEntry || selectedEntry.kind !== 'file' || Boolean(busyAction)"
                @click="downloadSelected"
              >
                {{ t("settings.developer.assets.actions.download") }}
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                size="sm"
                icon="pencil"
                :disabled="!selectedEntry || Boolean(busyAction)"
                @click="openRenameDialog"
              >
                {{ t("settings.developer.assets.actions.rename") }}
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                size="sm"
                icon="copy"
                :disabled="!selectedEntry || Boolean(busyAction)"
                @click="openCopyDialog"
              >
                {{ t("settings.developer.assets.actions.copy") }}
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                size="sm"
                icon="move"
                :disabled="!selectedEntry || Boolean(busyAction)"
                @click="openMoveDialog"
              >
                {{ t("settings.developer.assets.actions.move") }}
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                size="sm"
                icon="shield"
                :disabled="!selectedEntry || Boolean(busyAction)"
                @click="openChmodDialog"
              >
                {{ t("settings.developer.assets.actions.chmod") }}
              </AoiButton>
              <AoiButton tone="accent"
                variant="outlined"
                size="sm"
                icon="trash-2"
                :disabled="!selectedEntry || Boolean(busyAction)"
                @click="openDeleteDialog"
              >
                {{ t("settings.developer.assets.actions.delete") }}
              </AoiButton>
              <AoiButton
                v-if="selectedEntry?.publicUrl"
                size="sm"
                icon="link"
                :disabled="Boolean(busyAction)"
                @click="copyPublicUrl"
              >
                {{ t("settings.developer.assets.actions.copyPublicUrl") }}
              </AoiButton>
            </div>
          </AoiSurface>

        </div>
      </div>
    </div>

    <p v-if="lastUpdatedAt" class="settings-note">
      {{ t("settings.developer.assets.lastUpdated", { time: lastUpdatedAt }) }}
    </p>

    <Teleport to="body">
      <div
        v-if="actionMenuOpen"
        ref="actionMenuRef"
        class="settings-asset-manager-menu"
        :style="actionMenuStyle"
        role="menu"
        :aria-label="t('settings.developer.assets.actions.more')"
        @click.stop
        @contextmenu.prevent.stop
      >
        <button
          v-for="item in actionMenuItems"
          :key="item.value"
          class="settings-asset-manager-menu__item"
          type="button"
          role="menuitem"
          :aria-disabled="item.disabled || undefined"
          :disabled="item.disabled || undefined"
          @click="selectActionMenuItem(item)"
        >
          <span class="settings-asset-manager-menu__icon">
            <AoiIcon :name="item.icon" :size="15" decorative />
          </span>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </Teleport>

    <AoiDialog :open="dialog.open" @update:open="dialog.open = $event">
      <template #headline>
        {{ dialog.title }}
      </template>

      <div class="settings-asset-manager__dialog">
        <p class="settings-note">{{ dialog.description }}</p>
        <AoiTextField
          v-if="dialog.kind === 'createFile' || dialog.kind === 'createDirectory' || dialog.kind === 'rename'"
          v-model="dialogName"
          appearance="outlined"
          :label="t('settings.developer.assets.dialogs.nameLabel')"
          @enter="confirmDialog"
        />
        <AoiTextField
          v-if="dialog.kind === 'copy' || dialog.kind === 'move'"
          v-model="dialogDestination"
          appearance="outlined"
          :label="t('settings.developer.assets.dialogs.destinationLabel')"
          @enter="confirmDialog"
        />
        <AoiTextField
          v-if="dialog.kind === 'chmod'"
          v-model="dialogMode"
          appearance="outlined"
          :label="t('settings.developer.assets.dialogs.modeLabel')"
          supporting-text="644 / 755 / 7777"
          @enter="confirmDialog"
        />
        <AoiCheckbox
          v-if="dialog.kind !== 'chmod' && dialog.kind !== 'delete'"
          v-model="dialogOverwrite"
          :label="t('settings.developer.assets.dialogs.overwriteLabel')"
        />
      </div>

      <template #actions>
        <AoiButton :disabled="Boolean(busyAction)" @click="dialog.open = false">
          {{ t("settings.developer.assets.actions.cancel") }}
        </AoiButton>
        <AoiButton
          variant="filled"
          :tone="dialog.danger ? 'danger' : 'accent'"
          :icon="dialog.danger ? 'trash-2' : 'check'"
          :loading="Boolean(busyAction)"
          @click="confirmDialog"
        >
          {{ dialog.confirmLabel }}
        </AoiButton>
      </template>
    </AoiDialog>

    <AoiDialog :open="uploadOverwriteOpen" @update:open="uploadOverwriteOpen = $event">
      <template #headline>
        {{ t("settings.developer.assets.dialogs.uploadOverwriteTitle") }}
      </template>

      <p class="settings-note">
        {{ t("settings.developer.assets.dialogs.uploadOverwriteDescription") }}
      </p>

      <template #actions>
        <AoiButton :disabled="Boolean(busyAction)" @click="uploadOverwriteOpen = false">
          {{ t("settings.developer.assets.actions.cancel") }}
        </AoiButton>
        <AoiButton tone="accent" variant="filled" icon="upload" :loading="busyAction === 'upload'" @click="confirmUploadOverwrite">
          {{ t("settings.developer.assets.actions.overwriteUpload") }}
        </AoiButton>
      </template>
    </AoiDialog>
  </div>
</template>

<style scoped>
.settings-asset-manager {
  display: grid;
  gap: var(--aoi-grid-gap);
}

.settings-asset-manager__command,
.settings-asset-manager__detail-card,
.settings-asset-manager__preview-panel,
.settings-asset-manager__editor-panel,
.settings-asset-manager__dialog {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.settings-asset-manager__command-main {
  display: grid;
  grid-template-columns: minmax(190px, .7fr) minmax(220px, 1fr) minmax(0, auto);
  gap: 10px;
  align-items: center;
}

.settings-asset-manager__command-actions,
.settings-asset-manager__command-view,
.settings-asset-manager__view-toggle,
.settings-asset-manager__breadcrumbs,
.settings-asset-manager__button-row,
.settings-asset-manager__row-actions,
.settings-asset-manager__browser-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.settings-asset-manager__command-actions {
  justify-content: end;
}

.settings-asset-manager__command-view {
  justify-content: space-between;
}

.settings-asset-manager__root,
.settings-asset-manager__search,
.settings-asset-manager__sort {
  min-width: 0;
}

.settings-asset-manager__sort {
  width: min(100%, 260px);
}

.settings-asset-manager__shell {
  display: grid;
  grid-template-columns: minmax(230px, 280px) minmax(0, 1fr);
  gap: var(--aoi-grid-gap);
  align-items: start;
}

.settings-asset-manager__explorer,
.settings-asset-manager__workbench {
  overflow: hidden;
}

.settings-asset-manager__pane-head,
.settings-asset-manager__workbench-head {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--aoi-border);
  padding: 0 12px;
}

.settings-asset-manager__pane-head--plain {
  min-height: auto;
  border-bottom: 0;
  padding: 0;
}

.settings-asset-manager__pane-head span,
.settings-asset-manager__editor-head strong {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: var(--aoi-text);
  font-weight: 820;
}

.settings-asset-manager__pane-head small,
.settings-asset-manager__browser-actions small {
  color: var(--aoi-text-muted);
  font-size: .78rem;
  font-weight: 740;
}

.settings-asset-manager__explorer-scroll {
  max-height: min(70vh, 740px);
  overflow: auto;
  padding: 8px;
}

.settings-asset-manager__explorer-row {
  --asset-explorer-indent: calc(var(--asset-explorer-depth) * 16px);
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  min-width: 0;
  align-items: center;
  border-radius: var(--aoi-radius-control);
  padding-left: var(--asset-explorer-indent);
}

.settings-asset-manager__explorer-row--root {
  margin-block: 2px;
}

.settings-asset-manager__explorer-row--current,
.settings-asset-manager__explorer-row--selected {
  background: var(--aoi-state-active);
}

.settings-asset-manager__explorer-toggle,
.settings-asset-manager__explorer-label {
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--aoi-text-muted);
  cursor: pointer;
  font: inherit;
}

.settings-asset-manager__explorer-toggle {
  display: inline-grid;
  width: 24px;
  height: 32px;
  place-items: center;
  padding: 0;
}

.settings-asset-manager__explorer-toggle:disabled {
  cursor: default;
}

.settings-asset-manager__explorer-label {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 7px;
  padding: 0 8px 0 2px;
  text-align: left;
}

.settings-asset-manager__explorer-label span {
  overflow: hidden;
  color: var(--aoi-text);
  font-size: .86rem;
  font-weight: 720;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-asset-manager__explorer-label small {
  color: var(--aoi-text-muted);
  font-size: .72rem;
}

.settings-asset-manager__explorer-row:hover {
  background: var(--aoi-state-hover);
}

.settings-asset-manager__explorer-toggle:focus-visible,
.settings-asset-manager__explorer-label:focus-visible,
.settings-asset-manager__breadcrumbs button:focus-visible,
.settings-asset-manager__table tr:focus-visible,
.settings-asset-manager__tile:focus-visible,
.settings-asset-manager__table th button:focus-visible,
.settings-asset-manager__textarea:focus-visible {
  outline: var(--aoi-focus-ring-width) solid var(--aoi-focus);
  outline-offset: var(--aoi-focus-ring-offset);
}

.settings-asset-manager__workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, .42fr);
  gap: var(--aoi-grid-gap);
  align-items: start;
}

.settings-asset-manager__content {
  display: grid;
  min-width: 0;
}

.settings-asset-manager__workbench-head {
  align-items: start;
  padding-block: 10px;
}

.settings-asset-manager__workspace-tabs {
  border-bottom: 1px solid var(--aoi-border);
  overflow-x: auto;
}

.settings-asset-manager__tab-panel {
  min-width: 0;
  min-height: 460px;
}

.settings-asset-manager__browser-panel {
  min-width: 0;
}

.settings-asset-manager__preview-panel,
.settings-asset-manager__editor-panel {
  min-width: 0;
  min-height: 460px;
  align-content: start;
  padding: 14px;
}

.settings-asset-manager__path-block {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.settings-asset-manager__path-block strong {
  overflow-wrap: anywhere;
  color: var(--aoi-text);
  font-weight: 820;
}

.settings-asset-manager__breadcrumbs button {
  min-height: 30px;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-control);
  background: var(--aoi-card-bg);
  color: var(--aoi-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: .82rem;
  font-weight: 760;
  padding: 0 9px;
}

.settings-asset-manager__breadcrumbs button:hover,
.settings-asset-manager__breadcrumb--active {
  border-color: var(--aoi-state-border-active);
  background: var(--aoi-state-active);
  color: var(--aoi-active-color);
}

.settings-asset-manager__table-wrap {
  max-height: min(70vh, 740px);
  overflow: auto;
}

.settings-asset-manager__table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  font-size: 13px;
}

.settings-asset-manager__table th,
.settings-asset-manager__table td {
  border-bottom: 1px solid var(--aoi-border);
  padding: 9px 10px;
  text-align: left;
  vertical-align: middle;
}

.settings-asset-manager__table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--aoi-card-bg);
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 800;
}

.settings-asset-manager__table th button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: inherit;
  padding: 0;
}

.settings-asset-manager__table tr {
  cursor: pointer;
}

.settings-asset-manager__table tbody tr:hover,
.settings-asset-manager__row--selected {
  background: var(--aoi-state-hover);
}

.settings-asset-manager__name {
  display: inline-flex;
  max-width: 300px;
  align-items: center;
  gap: 8px;
  color: var(--aoi-text);
  font-weight: 760;
}

.settings-asset-manager__name span {
  overflow-wrap: anywhere;
}

.settings-asset-manager__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  padding: 12px;
}

.settings-asset-manager__tile {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 128px;
  grid-template-rows: auto 1fr;
  gap: 10px;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-surface);
  cursor: pointer;
  padding: 12px;
  transition:
    background var(--aoi-motion-fast) var(--aoi-ease-out),
    border-color var(--aoi-motion-fast) var(--aoi-ease-out),
    transform var(--aoi-motion-fast) var(--aoi-ease-press);
}

.settings-asset-manager__tile:hover,
.settings-asset-manager__tile--selected {
  border-color: var(--aoi-state-border-active);
  background: var(--aoi-state-active);
}

.settings-asset-manager__tile:active {
  transform: scale(.99);
}

.settings-asset-manager__tile-icon {
  display: inline-grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: var(--aoi-radius-control);
  background: var(--aoi-card-bg);
  color: var(--aoi-active-color);
}

.settings-asset-manager__tile-copy {
  display: grid;
  min-width: 0;
  align-content: end;
  gap: 4px;
  padding-right: 34px;
}

.settings-asset-manager__tile-copy strong {
  overflow: hidden;
  color: var(--aoi-text);
  font-size: .9rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-asset-manager__tile-copy small {
  color: var(--aoi-text-muted);
  font-size: .78rem;
  font-weight: 680;
}

.settings-asset-manager__tile-menu {
  position: absolute;
  right: 8px;
  bottom: 8px;
}

.settings-asset-manager__empty {
  padding: 14px;
}

.settings-asset-manager__detail {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.settings-asset-manager__selected-path {
  overflow-wrap: anywhere;
}

.settings-asset-manager__media {
  width: 100%;
  max-height: min(64vh, 620px);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-bg);
  object-fit: contain;
}

.settings-asset-manager__audio {
  width: 100%;
}

.settings-asset-manager__editor-head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.settings-asset-manager__textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 460px;
  resize: vertical;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-bg);
  color: var(--aoi-text);
  font: 12px/1.6 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
  padding: 12px;
}

.settings-asset-manager-menu {
  position: fixed;
  z-index: var(--aoi-z-menu);
  display: grid;
  width: min(196px, calc(100vw - 16px));
  gap: 2px;
  border: 1px solid var(--aoi-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--aoi-surface-solid) 94%, transparent);
  box-shadow: var(--aoi-shadow-md);
  color: var(--aoi-text);
  padding: 6px;
  backdrop-filter: blur(18px);
}

.settings-asset-manager-menu__item {
  display: grid;
  min-height: 34px;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: var(--aoi-radius-control);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: .86rem;
  font-weight: 720;
  padding: 0 9px;
  text-align: left;
}

.settings-asset-manager-menu__item:hover,
.settings-asset-manager-menu__item:focus-visible {
  outline: 0;
  background: var(--aoi-state-hover);
}

.settings-asset-manager-menu__item:active {
  background: var(--aoi-state-active);
}

.settings-asset-manager-menu__item:disabled {
  color: var(--aoi-text-muted);
  cursor: default;
  opacity: .58;
}

.settings-asset-manager-menu__item:disabled:hover,
.settings-asset-manager-menu__item:disabled:focus-visible {
  background: transparent;
}

.settings-asset-manager-menu__icon {
  display: grid;
  width: 22px;
  place-items: center;
  color: var(--aoi-text-muted);
}

.settings-asset-manager-menu__item:not(:disabled):hover .settings-asset-manager-menu__icon,
.settings-asset-manager-menu__item:not(:disabled):focus-visible .settings-asset-manager-menu__icon {
  color: var(--aoi-active-color);
}

@media (prefers-reduced-motion: reduce) {
  .settings-asset-manager__tile {
    transition: none;
  }

  .settings-asset-manager__tile:active {
    transform: none;
  }
}

@media (max-width: 1500px) {
  .settings-asset-manager__workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1040px) {
  .settings-asset-manager__command-main,
  .settings-asset-manager__shell {
    grid-template-columns: 1fr;
  }

  .settings-asset-manager__command-actions {
    justify-content: start;
  }
}

@media (max-width: 640px) {
  .settings-asset-manager__workbench-head,
  .settings-asset-manager__command-view {
    align-items: start;
    flex-direction: column;
  }

  .settings-asset-manager__sort {
    width: 100%;
  }

  .settings-asset-manager__grid {
    grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  }

  .settings-asset-manager__tab-panel,
  .settings-asset-manager__preview-panel,
  .settings-asset-manager__editor-panel,
  .settings-asset-manager__textarea {
    min-height: 360px;
  }
}
</style>
