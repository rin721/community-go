<script setup lang="ts">
import { CharacterCount, Placeholder } from "@tiptap/extensions"
import Highlight from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import { ListKit } from "@tiptap/extension-list"
import { Markdown } from "@tiptap/markdown"
import StarterKit from "@tiptap/starter-kit"
import { TableKit } from "@tiptap/extension-table"
import TextAlign from "@tiptap/extension-text-align"
import { Color, TextStyle } from "@tiptap/extension-text-style"
import Underline from "@tiptap/extension-underline"
import { EditorContent, useEditor } from "@tiptap/vue-3"
import type { Editor, JSONContent } from "@tiptap/core"
import type { AoiRichTextChangePayload, AoiRichTextDocument } from "~/types/rich-text"

type AoiRichTextToolbar = "document" | "none"
type BlockOption = "paragraph" | "heading-1" | "heading-2" | "heading-3" | "heading-4" | "code-block"
type AlignOption = "left" | "center" | "right" | "justify"

interface ToolbarAction {
  key: string
  icon: string
  label: string
  active?: () => boolean
  disabled?: () => boolean
  run: () => void
}

const props = withDefaults(defineProps<{
  modelValue?: string
  document?: AoiRichTextDocument | null
  label?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  maxLength?: number
  errorText?: string
  supportingText?: string
  toolbar?: AoiRichTextToolbar
}>(), {
  modelValue: "",
  document: null,
  label: undefined,
  placeholder: "Write with Markdown or rich text tools",
  disabled: false,
  readonly: false,
  maxLength: undefined,
  errorText: undefined,
  supportingText: undefined,
  toolbar: "document"
})

const emit = defineEmits<{
  "update:modelValue": [value: string]
  "update:document": [value: AoiRichTextDocument]
  change: [payload: AoiRichTextChangePayload]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const instance = getCurrentInstance()
const editorId = `aoi-rich-text-editor-${instance?.uid ?? "field"}`
const statusMessage = ref("")
const editorStateTick = ref(0)
const characterCount = ref(0)
const wordCount = ref(0)
let applyingExternalUpdate = false
let lastMarkdownValue = ""
let lastDocumentValue = ""

const blockOptions: { value: BlockOption, label: string }[] = [
  { value: "paragraph", label: "P" },
  { value: "heading-1", label: "H1" },
  { value: "heading-2", label: "H2" },
  { value: "heading-3", label: "H3" },
  { value: "heading-4", label: "H4" },
  { value: "code-block", label: "{}" }
]

const alignOptions: { value: AlignOption, label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "justify", label: "Justify" }
]

const textColors = [
  { label: "Accent", value: "#ff7d52" },
  { label: "Sakura", value: "#dc4f86" },
  { label: "Blue", value: "#5b8def" },
  { label: "Text", value: "var(--aoi-text)" }
]

const highlightColors = [
  { label: "Sun", value: "#ffe0a8" },
  { label: "Sakura", value: "#ffd6e6" },
  { label: "Cyan", value: "#d7f8fb" },
  { label: "Soft", value: "#fff2ee" }
]

const isEditable = computed(() => !props.disabled && !props.readonly)
const overLimit = computed(() => typeof props.maxLength === "number" && characterCount.value > props.maxLength)
const resolvedErrorText = computed(() => props.errorText || (overLimit.value ? `Character limit exceeded: ${characterCount.value}/${props.maxLength}` : undefined))
const resolvedSupportingText = computed(() => {
  if (resolvedErrorText.value) {
    return resolvedErrorText.value
  }

  const countText = typeof props.maxLength === "number"
    ? `${characterCount.value}/${props.maxLength}`
    : `${characterCount.value} chars`

  return props.supportingText ? `${props.supportingText} · ${countText}` : countText
})

const editor = useEditor({
  content: props.document || props.modelValue,
  contentType: props.document ? "json" : "markdown",
  editable: isEditable.value,
  editorProps: {
    attributes: {
      "aria-describedby": `${editorId}-supporting`,
      "aria-label": props.label || "Rich text editor"
    }
  },
  extensions: [
    StarterKit.configure({
      bulletList: false,
      listItem: false,
      listKeymap: false,
      link: false,
      orderedList: false,
      underline: false
    }),
    ListKit.configure({
      taskItem: {
        nested: true
      }
    }),
    Link.configure({
      autolink: true,
      defaultProtocol: "https",
      HTMLAttributes: {
        rel: "noopener noreferrer nofollow",
        target: "_blank"
      },
      isAllowedUri: (url) => isSafeLinkUrl(url),
      linkOnPaste: true,
      openOnClick: false,
      protocols: ["http", "https"]
    }),
    Image.configure({
      allowBase64: false,
      HTMLAttributes: {
        class: "aoi-rich-text-editor__image"
      }
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true
    }),
    TextAlign.configure({
      types: ["heading", "paragraph"]
    }),
    TableKit.configure({
      table: {
        HTMLAttributes: {
          class: "aoi-rich-text-editor__table"
        },
        resizable: true
      }
    }),
    CharacterCount.configure({
      autoTrim: false,
      limit: null
    }),
    Placeholder.configure({
      includeChildren: true,
      placeholder: props.placeholder,
      showOnlyCurrent: false
    }),
    Markdown.configure({
      indentation: {
        size: 2,
        style: "space"
      },
      markedOptions: {
        gfm: true
      }
    })
  ],
  injectCSS: false,
  onBlur: ({ event }) => {
    emit("blur", event)
  },
  onCreate: ({ editor }) => {
    touchEditorState()
    emitCurrentChange(editor)
  },
  onFocus: ({ event }) => {
    emit("focus", event)
  },
  onSelectionUpdate: () => {
    touchEditorState()
  },
  onTransaction: () => {
    touchEditorState()
  },
  onUpdate: ({ editor }) => {
    if (!applyingExternalUpdate) {
      emitCurrentChange(editor)
    }
  }
})

const historyActions = computed<ToolbarAction[]>(() => [
  {
    key: "undo",
    icon: "undo-2",
    label: "Undo",
    disabled: () => !Boolean(editor.value?.can().undo()),
    run: () => editor.value?.chain().focus().undo().run()
  },
  {
    key: "redo",
    icon: "redo-2",
    label: "Redo",
    disabled: () => !Boolean(editor.value?.can().redo()),
    run: () => editor.value?.chain().focus().redo().run()
  }
])

const inlineActions = computed<ToolbarAction[]>(() => [
  {
    key: "bold",
    icon: "bold",
    label: "Bold",
    active: () => isActive("bold"),
    run: () => editor.value?.chain().focus().toggleBold().run()
  },
  {
    key: "italic",
    icon: "italic",
    label: "Italic",
    active: () => isActive("italic"),
    run: () => editor.value?.chain().focus().toggleItalic().run()
  },
  {
    key: "strike",
    icon: "strikethrough",
    label: "Strikethrough",
    active: () => isActive("strike"),
    run: () => editor.value?.chain().focus().toggleStrike().run()
  },
  {
    key: "underline",
    icon: "underline",
    label: "Underline",
    active: () => isActive("underline"),
    run: () => editor.value?.chain().focus().toggleUnderline().run()
  },
  {
    key: "code",
    icon: "code",
    label: "Inline code",
    active: () => isActive("code"),
    run: () => editor.value?.chain().focus().toggleCode().run()
  }
])

const blockActions = computed<ToolbarAction[]>(() => [
  {
    key: "blockquote",
    icon: "quote",
    label: "Blockquote",
    active: () => isActive("blockquote"),
    run: () => editor.value?.chain().focus().toggleBlockquote().run()
  },
  {
    key: "hr",
    icon: "minus",
    label: "Divider",
    run: () => editor.value?.chain().focus().setHorizontalRule().run()
  }
])

const listActions = computed<ToolbarAction[]>(() => [
  {
    key: "bullet-list",
    icon: "list",
    label: "Bullet list",
    active: () => isActive("bulletList"),
    run: () => editor.value?.chain().focus().toggleBulletList().run()
  },
  {
    key: "ordered-list",
    icon: "list-ordered",
    label: "Ordered list",
    active: () => isActive("orderedList"),
    run: () => editor.value?.chain().focus().toggleOrderedList().run()
  },
  {
    key: "task-list",
    icon: "list-checks",
    label: "Task list",
    active: () => isActive("taskList"),
    run: () => editor.value?.chain().focus().toggleTaskList().run()
  }
])

const insertActions = computed<ToolbarAction[]>(() => [
  {
    key: "link",
    icon: "link",
    label: "Link",
    active: () => isActive("link"),
    run: setLink
  },
  {
    key: "image",
    icon: "image-plus",
    label: "Image URL",
    run: insertImage
  },
  {
    key: "table",
    icon: "table",
    label: "Insert table",
    active: () => isActive("table"),
    run: () => editor.value?.chain().focus().insertTable({ cols: 3, rows: 3, withHeaderRow: true }).run()
  }
])

const tableActions = computed<ToolbarAction[]>(() => [
  {
    key: "row-plus",
    icon: "rows-3",
    label: "Add row",
    disabled: () => !isActive("table"),
    run: () => editor.value?.chain().focus().addRowAfter().run()
  },
  {
    key: "column-plus",
    icon: "columns-3",
    label: "Add column",
    disabled: () => !isActive("table"),
    run: () => editor.value?.chain().focus().addColumnAfter().run()
  },
  {
    key: "row-delete",
    icon: "minus",
    label: "Delete row",
    disabled: () => !isActive("table"),
    run: () => editor.value?.chain().focus().deleteRow().run()
  },
  {
    key: "column-delete",
    icon: "panel-right-close",
    label: "Delete column",
    disabled: () => !isActive("table"),
    run: () => editor.value?.chain().focus().deleteColumn().run()
  },
  {
    key: "table-delete",
    icon: "trash-2",
    label: "Delete table",
    disabled: () => !isActive("table"),
    run: () => editor.value?.chain().focus().deleteTable().run()
  }
])

watch(isEditable, (editable) => {
  editor.value?.setEditable(editable)
})

watch(() => props.modelValue, (value) => {
  const activeEditor = editor.value

  if (!activeEditor || value === lastMarkdownValue || props.document) {
    return
  }

  applyingExternalUpdate = true
  activeEditor.commands.setContent(value || "", {
    contentType: "markdown",
    emitUpdate: false
  })
  applyingExternalUpdate = false
  emitCurrentChange(activeEditor)
})

watch(() => props.document, (value) => {
  const activeEditor = editor.value

  if (!activeEditor || !value) {
    return
  }

  const nextDocumentValue = JSON.stringify(value)

  if (nextDocumentValue === lastDocumentValue) {
    return
  }

  applyingExternalUpdate = true
  activeEditor.commands.setContent(value, {
    contentType: "json",
    emitUpdate: false
  })
  applyingExternalUpdate = false
  emitCurrentChange(activeEditor)
})

function touchEditorState() {
  editorStateTick.value += 1
}

function isActive(name: string, attrs?: Record<string, unknown>) {
  editorStateTick.value
  return Boolean(editor.value?.isActive(name, attrs))
}

function currentBlockValue(): BlockOption {
  editorStateTick.value

  if (isActive("heading", { level: 1 })) {
    return "heading-1"
  }

  if (isActive("heading", { level: 2 })) {
    return "heading-2"
  }

  if (isActive("heading", { level: 3 })) {
    return "heading-3"
  }

  if (isActive("heading", { level: 4 })) {
    return "heading-4"
  }

  if (isActive("codeBlock")) {
    return "code-block"
  }

  return "paragraph"
}

function currentAlignValue(): AlignOption {
  editorStateTick.value

  if (isActive("paragraph", { textAlign: "center" }) || isActive("heading", { textAlign: "center" })) {
    return "center"
  }

  if (isActive("paragraph", { textAlign: "right" }) || isActive("heading", { textAlign: "right" })) {
    return "right"
  }

  if (isActive("paragraph", { textAlign: "justify" }) || isActive("heading", { textAlign: "justify" })) {
    return "justify"
  }

  return "left"
}

function setBlock(value: BlockOption) {
  const activeEditor = editor.value

  if (!activeEditor || !isEditable.value) {
    return
  }

  const chain = activeEditor.chain().focus()

  if (value === "paragraph") {
    chain.setParagraph().run()
    return
  }

  if (value === "code-block") {
    chain.toggleCodeBlock().run()
    return
  }

  const level = Number(value.replace("heading-", "")) as 1 | 2 | 3 | 4
  chain.setHeading({ level }).run()
}

function setAlign(value: AlignOption) {
  editor.value?.chain().focus().setTextAlign(value).run()
}

function setTextColor(color: string) {
  editor.value?.chain().focus().setColor(color).run()
}

function setHighlight(color: string) {
  editor.value?.chain().focus().toggleHighlight({ color }).run()
}

function clearFormatting() {
  editor.value?.chain().focus().unsetAllMarks().clearNodes().unsetColor().unsetHighlight().run()
}

function setLink() {
  const activeEditor = editor.value

  if (!activeEditor || !isEditable.value) {
    return
  }

  const currentHref = String(activeEditor.getAttributes("link").href || "")
  const value = window.prompt("Link URL", currentHref || "https://")

  if (value === null) {
    return
  }

  const href = value.trim()

  if (!href) {
    activeEditor.chain().focus().extendMarkRange("link").unsetLink().run()
    return
  }

  if (!isSafeLinkUrl(href)) {
    statusMessage.value = "Link URL must use http, https, /, or #."
    return
  }

  activeEditor.chain().focus().extendMarkRange("link").setLink({ href }).run()
  statusMessage.value = ""
}

function insertImage() {
  const activeEditor = editor.value

  if (!activeEditor || !isEditable.value) {
    return
  }

  const src = window.prompt("Image URL", "https://")

  if (src === null) {
    return
  }

  const imageUrl = src.trim()

  if (!isSafeImageUrl(imageUrl)) {
    statusMessage.value = "Image URL must use http, https, or a site path starting with /."
    return
  }

  const alt = window.prompt("Image alt text", "") ?? ""

  activeEditor.chain().focus().setImage({ alt: alt.trim(), src: imageUrl }).run()
  statusMessage.value = ""
}

function emitCurrentChange(activeEditor: Editor) {
  const sanitized = sanitizeDocument(activeEditor.getJSON())

  if (sanitized.changed) {
    activeEditor.commands.setContent(sanitized.document, {
      contentType: "json",
      emitUpdate: false
    })
  }

  characterCount.value = activeEditor.storage.characterCount.characters()
  wordCount.value = activeEditor.storage.characterCount.words()

  const payload: AoiRichTextChangePayload = {
    characterCount: characterCount.value,
    document: sanitized.document,
    html: activeEditor.getHTML(),
    markdown: activeEditor.getMarkdown(),
    overLimit: overLimit.value,
    text: activeEditor.getText(),
    wordCount: wordCount.value
  }

  lastMarkdownValue = payload.markdown
  lastDocumentValue = JSON.stringify(payload.document)
  emit("update:modelValue", payload.markdown)
  emit("update:document", payload.document)
  emit("change", payload)
}

function sanitizeDocument(document: JSONContent) {
  const sanitizedNode = sanitizeNode(document)
  const sanitizedDocument = sanitizedNode?.type === "doc" && sanitizedNode.content?.length
    ? sanitizedNode
    : emptyDocument()
  const changed = JSON.stringify(document) !== JSON.stringify(sanitizedDocument)

  return {
    changed,
    document: sanitizedDocument
  }
}

function sanitizeNode(node: JSONContent): JSONContent | null {
  if (node.type === "image" && !isSafeImageUrl(String(node.attrs?.src || ""))) {
    return null
  }

  const nextNode: JSONContent = { ...node }

  if (Array.isArray(node.marks)) {
    nextNode.marks = node.marks.filter((mark) => {
      if (mark.type !== "link") {
        return true
      }

      return isSafeLinkUrl(String(mark.attrs?.href || ""))
    })
  }

  if (Array.isArray(node.content)) {
    const nextContent = node.content
      .map((child) => sanitizeNode(child))
      .filter((child): child is JSONContent => Boolean(child))

    nextNode.content = nextContent.length ? nextContent : undefined
  }

  return nextNode
}

function emptyDocument(): AoiRichTextDocument {
  return {
    content: [
      {
        type: "paragraph"
      }
    ],
    type: "doc"
  }
}

function isSafeLinkUrl(value: string | undefined) {
  const url = value?.trim()

  if (!url || url.startsWith("//")) {
    return false
  }

  if (url.startsWith("/") || url.startsWith("#")) {
    return true
  }

  if (/^(javascript|data|vbscript):/i.test(url)) {
    return false
  }

  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
  } catch {
    return false
  }
}

function isSafeImageUrl(value: string | undefined) {
  const url = value?.trim()

  if (!url || url.startsWith("//")) {
    return false
  }

  if (url.startsWith("/")) {
    return true
  }

  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
  } catch {
    return false
  }
}
</script>

<template>
  <section
    class="aoi-rich-text-editor"
    :class="{
      'aoi-rich-text-editor--disabled': disabled,
      'aoi-rich-text-editor--readonly': readonly,
      'aoi-rich-text-editor--error': Boolean(resolvedErrorText)
    }"
    :aria-invalid="Boolean(resolvedErrorText) || undefined"
  >
    <div v-if="label" class="aoi-rich-text-editor__label">
      {{ label }}
    </div>

    <div v-if="toolbar === 'document'" class="aoi-rich-text-editor__toolbar" aria-label="Rich text tools">
      <div class="aoi-rich-text-editor__group">
        <AoiIconButton
          v-for="action in historyActions"
          :key="action.key"
          :icon="action.icon"
          :label="action.label"
          size="sm"
          :disabled="disabled || readonly || action.disabled?.()"
          @click="action.run"
        />
      </div>

      <div class="aoi-rich-text-editor__group">
        <label class="aoi-rich-text-editor__select-label">
          <span>Block</span>
          <select
            class="aoi-rich-text-editor__select"
            :value="currentBlockValue()"
            :disabled="disabled || readonly"
            aria-label="Block style"
            @change="setBlock(($event.target as HTMLSelectElement).value as BlockOption)"
          >
            <option v-for="option in blockOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <AoiIconButton
          v-for="action in blockActions"
          :key="action.key"
          :icon="action.icon"
          :label="action.label"
          :active="action.active?.()"
          :variant="action.active?.() ? 'tonal' : 'plain'"
          size="sm"
          :disabled="disabled || readonly || action.disabled?.()"
          @click="action.run"
        />
      </div>

      <div class="aoi-rich-text-editor__group">
        <AoiIconButton
          v-for="action in inlineActions"
          :key="action.key"
          :icon="action.icon"
          :label="action.label"
          :active="action.active?.()"
          :variant="action.active?.() ? 'tonal' : 'plain'"
          size="sm"
          :disabled="disabled || readonly || action.disabled?.()"
          @click="action.run"
        />
        <AoiIconButton
          icon="remove-formatting"
          label="Clear formatting"
          size="sm"
          :disabled="disabled || readonly"
          @click="clearFormatting"
        />
      </div>

      <div class="aoi-rich-text-editor__group">
        <AoiIconButton
          v-for="action in listActions"
          :key="action.key"
          :icon="action.icon"
          :label="action.label"
          :active="action.active?.()"
          :variant="action.active?.() ? 'tonal' : 'plain'"
          size="sm"
          :disabled="disabled || readonly || action.disabled?.()"
          @click="action.run"
        />
      </div>

      <div class="aoi-rich-text-editor__group">
        <label class="aoi-rich-text-editor__select-label">
          <span>Align</span>
          <select
            class="aoi-rich-text-editor__select"
            :value="currentAlignValue()"
            :disabled="disabled || readonly"
            aria-label="Text alignment"
            @change="setAlign(($event.target as HTMLSelectElement).value as AlignOption)"
          >
            <option v-for="option in alignOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <div class="aoi-rich-text-editor__group">
        <button
          v-for="color in textColors"
          :key="color.value"
          class="aoi-rich-text-editor__swatch"
          type="button"
          :aria-label="`Set text color ${color.label}`"
          :title="`Text color ${color.label}`"
          :disabled="disabled || readonly"
          :style="{ '--aoi-rich-text-swatch': color.value }"
          @click="setTextColor(color.value)"
        />
        <AoiIconButton
          icon="paintbrush-vertical"
          label="Remove text color"
          size="sm"
          :disabled="disabled || readonly"
          @click="editor?.chain().focus().unsetColor().run()"
        />
      </div>

      <div class="aoi-rich-text-editor__group">
        <button
          v-for="color in highlightColors"
          :key="color.value"
          class="aoi-rich-text-editor__swatch aoi-rich-text-editor__swatch--highlight"
          type="button"
          :aria-label="`Set highlight ${color.label}`"
          :title="`Highlight ${color.label}`"
          :disabled="disabled || readonly"
          :style="{ '--aoi-rich-text-swatch': color.value }"
          @click="setHighlight(color.value)"
        />
        <AoiIconButton
          icon="eraser"
          label="Remove highlight"
          size="sm"
          :disabled="disabled || readonly"
          @click="editor?.chain().focus().unsetHighlight().run()"
        />
      </div>

      <div class="aoi-rich-text-editor__group">
        <AoiIconButton
          v-for="action in insertActions"
          :key="action.key"
          :icon="action.icon"
          :label="action.label"
          :active="action.active?.()"
          :variant="action.active?.() ? 'tonal' : 'plain'"
          size="sm"
          :disabled="disabled || readonly || action.disabled?.()"
          @click="action.run"
        />
      </div>

      <div class="aoi-rich-text-editor__group">
        <AoiIconButton
          v-for="action in tableActions"
          :key="action.key"
          :icon="action.icon"
          :label="action.label"
          size="sm"
          :disabled="disabled || readonly || action.disabled?.()"
          @click="action.run"
        />
      </div>
    </div>

    <div class="aoi-rich-text-editor__surface" @click="editor?.chain().focus().run()">
      <EditorContent :editor="editor" class="aoi-rich-text-editor__content" />
    </div>

    <div
      :id="`${editorId}-supporting`"
      class="aoi-rich-text-editor__supporting"
      :class="{ 'aoi-rich-text-editor__supporting--error': Boolean(resolvedErrorText) }"
    >
      <span>{{ resolvedSupportingText }}</span>
      <span v-if="wordCount">{{ wordCount }} words</span>
      <span v-if="statusMessage">{{ statusMessage }}</span>
    </div>
  </section>
</template>

<style scoped>
.aoi-rich-text-editor {
  display: grid;
  min-width: 0;
  gap: 8px;
  color: var(--aoi-text);
}

.aoi-rich-text-editor__label {
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 760;
}

.aoi-rich-text-editor__toolbar {
  display: flex;
  max-width: 100%;
  min-width: 0;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-field);
  background: var(--aoi-control-bg);
  padding: 6px;
  scrollbar-width: thin;
}

.aoi-rich-text-editor__group {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  min-height: var(--aoi-control-height-sm);
  border-right: 1px solid var(--aoi-border);
  padding-right: 6px;
}

.aoi-rich-text-editor__group:last-child {
  border-right: 0;
  padding-right: 0;
}

.aoi-rich-text-editor__select-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--aoi-text-muted);
  font-size: 11px;
  font-weight: 760;
}

.aoi-rich-text-editor__select {
  min-width: 64px;
  height: var(--aoi-control-height-sm);
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-control);
  background: var(--aoi-surface-solid);
  color: var(--aoi-text);
  font: inherit;
  font-size: 12px;
  font-weight: 760;
  padding: 0 8px;
}

.aoi-rich-text-editor__swatch {
  display: inline-grid;
  width: var(--aoi-control-height-sm);
  height: var(--aoi-control-height-sm);
  place-items: center;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-control);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, .42), transparent 50%),
    var(--aoi-rich-text-swatch);
  cursor: pointer;
}

.aoi-rich-text-editor__swatch::after {
  width: 14px;
  height: 3px;
  border-radius: var(--aoi-radius-round);
  background: currentColor;
  content: "";
}

.aoi-rich-text-editor__swatch--highlight::after {
  width: 16px;
  height: 12px;
  border: 1px solid color-mix(in srgb, currentColor 24%, transparent);
  background: rgba(255, 255, 255, .5);
}

.aoi-rich-text-editor__swatch:hover:not(:disabled) {
  border-color: var(--aoi-state-border-active);
}

.aoi-rich-text-editor__swatch:disabled {
  cursor: not-allowed;
  opacity: .52;
}

.aoi-rich-text-editor__surface {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-field);
  background: var(--aoi-surface-solid);
  transition:
    border-color var(--aoi-motion-fast) var(--aoi-ease-out),
    box-shadow var(--aoi-motion-fast) var(--aoi-ease-out);
}

.aoi-rich-text-editor__surface:focus-within {
  border-color: var(--aoi-state-border-active);
  box-shadow: 0 0 0 3px var(--aoi-focus);
}

.aoi-rich-text-editor--error .aoi-rich-text-editor__surface {
  border-color: color-mix(in srgb, var(--aoi-danger) 56%, var(--aoi-border));
}

.aoi-rich-text-editor--disabled,
.aoi-rich-text-editor--readonly {
  opacity: .72;
}

.aoi-rich-text-editor__content {
  min-width: 0;
}

.aoi-rich-text-editor__content :deep(.ProseMirror) {
  min-height: 220px;
  outline: none;
  padding: 14px;
  line-height: 1.75;
  word-break: break-word;
}

.aoi-rich-text-editor__content :deep(.ProseMirror > *:first-child) {
  margin-top: 0;
}

.aoi-rich-text-editor__content :deep(.ProseMirror > *:last-child) {
  margin-bottom: 0;
}

.aoi-rich-text-editor__content :deep(.ProseMirror p.is-editor-empty:first-child::before),
.aoi-rich-text-editor__content :deep(.ProseMirror .is-empty::before) {
  float: left;
  height: 0;
  color: var(--aoi-text-muted);
  content: attr(data-placeholder);
  pointer-events: none;
}

.aoi-rich-text-editor__content :deep(.ProseMirror h1),
.aoi-rich-text-editor__content :deep(.ProseMirror h2),
.aoi-rich-text-editor__content :deep(.ProseMirror h3),
.aoi-rich-text-editor__content :deep(.ProseMirror h4) {
  margin: 1em 0 .45em;
  line-height: 1.25;
}

.aoi-rich-text-editor__content :deep(.ProseMirror h1) {
  font-size: 1.65rem;
}

.aoi-rich-text-editor__content :deep(.ProseMirror h2) {
  font-size: 1.38rem;
}

.aoi-rich-text-editor__content :deep(.ProseMirror h3) {
  font-size: 1.18rem;
}

.aoi-rich-text-editor__content :deep(.ProseMirror h4) {
  font-size: 1rem;
}

.aoi-rich-text-editor__content :deep(.ProseMirror blockquote) {
  margin: 1em 0;
  border-left: 3px solid var(--aoi-accent-50);
  color: var(--aoi-text-muted);
  padding-left: 12px;
}

.aoi-rich-text-editor__content :deep(.ProseMirror pre) {
  overflow-x: auto;
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-surface-muted);
  padding: 12px;
}

.aoi-rich-text-editor__content :deep(.ProseMirror code) {
  border-radius: var(--aoi-radius-xs);
  background: var(--aoi-surface-muted);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: .92em;
  padding: .12em .28em;
}

.aoi-rich-text-editor__content :deep(.ProseMirror pre code) {
  background: transparent;
  padding: 0;
}

.aoi-rich-text-editor__content :deep(.ProseMirror a) {
  color: var(--aoi-accent-60);
  font-weight: 720;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.aoi-rich-text-editor__content :deep(.ProseMirror img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1em 0;
  border-radius: var(--aoi-radius-card);
}

.aoi-rich-text-editor__content :deep(.ProseMirror-selectednode) {
  outline: 3px solid var(--aoi-focus);
}

.aoi-rich-text-editor__content :deep(.ProseMirror ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 0;
}

.aoi-rich-text-editor__content :deep(.ProseMirror ul[data-type="taskList"] li) {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}

.aoi-rich-text-editor__content :deep(.ProseMirror table) {
  width: 100%;
  min-width: 520px;
  border-collapse: collapse;
}

.aoi-rich-text-editor__content :deep(.tableWrapper) {
  overflow-x: auto;
  margin: 1em 0;
}

.aoi-rich-text-editor__content :deep(.ProseMirror th),
.aoi-rich-text-editor__content :deep(.ProseMirror td) {
  min-width: 80px;
  border: 1px solid var(--aoi-border);
  padding: 8px;
  vertical-align: top;
}

.aoi-rich-text-editor__content :deep(.ProseMirror th) {
  background: var(--aoi-surface-muted);
  font-weight: 800;
}

.aoi-rich-text-editor__supporting {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px 10px;
  color: var(--aoi-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.aoi-rich-text-editor__supporting--error {
  color: var(--aoi-danger);
  font-weight: 720;
}

@media (max-width: 639px) {
  .aoi-rich-text-editor__toolbar {
    align-items: stretch;
  }

  .aoi-rich-text-editor__select-label span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  .aoi-rich-text-editor__content :deep(.ProseMirror) {
    min-height: 180px;
    padding: 12px;
  }
}
</style>
