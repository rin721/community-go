<script setup lang="ts">
import type { AoiLightboxItem } from "~/types/lightbox"
import type { AoiRichTextChangePayload, AoiRichTextDocument } from "~/types/rich-text"

const { t } = useI18n()
const richTextMarkdown = ref(t("settings.experimental.richText.sample"))
const richTextDocument = ref<AoiRichTextDocument | null>(null)
const richTextPayload = ref<AoiRichTextChangePayload | null>(null)
const richTextPreviewTab = ref("markdown")

const lightboxItems = computed<AoiLightboxItem[]>(() => [
  {
    id: "aoi-sunflower",
    type: "image",
    src: "gradient:aoi-lightbox-sunflower",
    thumbnailSrc: "gradient:aoi-lightbox-sunflower-thumb",
    alt: t("settings.experimental.lightbox.items.sunflower.alt"),
    title: t("settings.experimental.lightbox.items.sunflower.title"),
    description: t("settings.experimental.lightbox.items.sunflower.description")
  },
  {
    id: "aoi-sakura",
    type: "image",
    src: "gradient:aoi-lightbox-sakura",
    thumbnailSrc: "gradient:aoi-lightbox-sakura-thumb",
    alt: t("settings.experimental.lightbox.items.sakura.alt"),
    title: t("settings.experimental.lightbox.items.sakura.title"),
    description: t("settings.experimental.lightbox.items.sakura.description")
  },
  {
    id: "aoi-sample-video",
    type: "video",
    src: "https://r2-store.kobayashi.eu.org/aoi/video/1e32a269-bde5-4eb6-9c7e-c35add52b482.mp4",
    posterSrc: "gradient:aoi-lightbox-video",
    thumbnailSrc: "gradient:aoi-lightbox-video-thumb",
    alt: t("settings.experimental.lightbox.items.video.alt"),
    title: t("settings.experimental.lightbox.items.video.title"),
    description: t("settings.experimental.lightbox.items.video.description")
  },
  {
    id: "aoi-night",
    type: "image",
    src: "gradient:aoi-lightbox-night",
    thumbnailSrc: "gradient:aoi-lightbox-night-thumb",
    alt: t("settings.experimental.lightbox.items.night.alt"),
    title: t("settings.experimental.lightbox.items.night.title"),
    description: t("settings.experimental.lightbox.items.night.description")
  }
])
const scrollDemoItems = computed(() => [
  {
    icon: "waves",
    title: t("settings.experimental.scrollDemo.items.smooth.title"),
    description: t("settings.experimental.scrollDemo.items.smooth.description")
  },
  {
    icon: "magnet",
    title: t("settings.experimental.scrollDemo.items.snap.title"),
    description: t("settings.experimental.scrollDemo.items.snap.description")
  },
  {
    icon: "move-vertical",
    title: t("settings.experimental.scrollDemo.items.hijack.title"),
    description: t("settings.experimental.scrollDemo.items.hijack.description")
  }
])

const richTextPreviewTabs = computed(() => [
  { value: "markdown", label: t("settings.experimental.richText.preview.markdown"), icon: "file-text" },
  { value: "text", label: t("settings.experimental.richText.preview.text"), icon: "pilcrow" },
  { value: "json", label: t("settings.experimental.richText.preview.json"), icon: "braces" }
])
const richTextPlainText = computed(() => richTextPayload.value?.text || "")
const richTextDocumentPreview = computed(() => JSON.stringify(richTextDocument.value || {}, null, 2))

function updateRichTextPayload(payload: AoiRichTextChangePayload) {
  richTextPayload.value = payload
}
</script>

<template>
  <div class="settings-page">
    <SettingsPageHeader
      :title="t('settings.experimental.title')"
      :description="t('settings.experimental.description')"
    />

    <SettingsPanel
      icon="images"
      :title="t('settings.experimental.lightbox.title')"
      :description="t('settings.experimental.lightbox.description')"
    >
      <AoiLightboxGallery :items="lightboxItems" loop />
    </SettingsPanel>

    <SettingsPanel
      icon="move-vertical"
      :title="t('settings.experimental.scrollDemo.title')"
      :description="t('settings.experimental.scrollDemo.description')"
    >
      <AoiScrollScene
        class="scroll-demo"
        :aria-label="t('settings.experimental.scrollDemo.ariaLabel')"
      >
        <AoiScrollSnapItem
          v-for="(item, index) in scrollDemoItems"
          :key="item.title"
          class="scroll-demo__panel"
          :class="`scroll-demo__panel--${index + 1}`"
          align="center"
          stop="always"
        >
          <span class="scroll-demo__icon" aria-hidden="true">
            <AoiIcon :name="item.icon" :size="24" decorative />
          </span>
          <div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
          </div>
        </AoiScrollSnapItem>
      </AoiScrollScene>
    </SettingsPanel>

    <SettingsPanel
      icon="file-pen-line"
      :title="t('settings.experimental.richText.title')"
      :description="t('settings.experimental.richText.description')"
    >
      <div class="rich-text-demo">
        <AoiRichTextEditor
          v-model="richTextMarkdown"
          v-model:document="richTextDocument"
          :label="t('settings.experimental.richText.editorLabel')"
          :placeholder="t('settings.experimental.richText.placeholder')"
          :supporting-text="t('settings.experimental.richText.supportingText')"
          :max-length="1800"
          @change="updateRichTextPayload"
        />

        <div class="rich-text-demo__preview">
          <div class="rich-text-demo__preview-header">
            <div>
              <h3>{{ t('settings.experimental.richText.preview.title') }}</h3>
              <p>
                {{ t('settings.experimental.richText.preview.meta', {
                  chars: richTextPayload?.characterCount || 0,
                  words: richTextPayload?.wordCount || 0
                }) }}
              </p>
            </div>
            <AoiTabs
              v-model="richTextPreviewTab"
              :items="richTextPreviewTabs"
              :aria-label="t('settings.experimental.richText.preview.ariaLabel')"
            />
          </div>

          <AoiCodeBlock
            v-if="richTextPreviewTab === 'markdown'"
            :code="richTextMarkdown"
          />
          <AoiCodeBlock
            v-else-if="richTextPreviewTab === 'text'"
            :code="richTextPlainText"
          />
          <AoiCodeBlock
            v-else
            :code="richTextDocumentPreview"
          />
        </div>
      </div>
    </SettingsPanel>
  </div>
</template>

<style scoped>
.scroll-demo {
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-container);
  background: color-mix(in srgb, var(--aoi-surface-muted) 72%, transparent);
  padding: 10px;
}

.scroll-demo__panel {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  color: var(--aoi-text);
  padding: clamp(18px, 4vw, 34px);
}

.scroll-demo__panel--1 {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-accent-20) 82%, white), color-mix(in srgb, var(--aoi-secondary-50) 16%, white));
}

.scroll-demo__panel--2 {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-sakura-20) 76%, white), color-mix(in srgb, var(--aoi-sun-50) 22%, white));
}

.scroll-demo__panel--3 {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-secondary-50) 18%, white), color-mix(in srgb, var(--aoi-accent-40) 18%, white));
}

:global(:root.dark) .scroll-demo__panel--1 {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-accent-60) 24%, var(--aoi-surface-solid)), color-mix(in srgb, var(--aoi-secondary-50) 24%, var(--aoi-surface-solid)));
}

:global(:root.dark) .scroll-demo__panel--2 {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-sakura-60) 22%, var(--aoi-surface-solid)), color-mix(in srgb, var(--aoi-sun-50) 18%, var(--aoi-surface-solid)));
}

:global(:root.dark) .scroll-demo__panel--3 {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-secondary-50) 24%, var(--aoi-surface-solid)), color-mix(in srgb, var(--aoi-accent-50) 20%, var(--aoi-surface-solid)));
}

.scroll-demo__icon {
  display: inline-grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: var(--aoi-radius-control);
  background: color-mix(in srgb, var(--aoi-surface-solid) 76%, transparent);
  color: var(--aoi-active-color);
}

.scroll-demo__panel h3,
.scroll-demo__panel p {
  margin: 0;
}

.scroll-demo__panel h3 {
  font-size: 18px;
}

.scroll-demo__panel p {
  margin-top: 6px;
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.rich-text-demo {
  display: grid;
  min-width: 0;
  gap: 16px;
}

.rich-text-demo__preview {
  display: grid;
  min-width: 0;
  gap: 10px;
}

.rich-text-demo__preview-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.rich-text-demo__preview-header h3,
.rich-text-demo__preview-header p {
  margin: 0;
}

.rich-text-demo__preview-header h3 {
  font-size: 15px;
}

.rich-text-demo__preview-header p {
  color: var(--aoi-text-muted);
  line-height: 1.6;
}

.rich-text-demo__output {
  min-height: 180px;
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-surface-muted);
  color: var(--aoi-text);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.6;
  margin: 0;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 760px) {
  .scroll-demo__panel {
    grid-template-columns: 1fr;
  }

  .rich-text-demo__preview-header {
    grid-template-columns: 1fr;
  }
}
</style>
