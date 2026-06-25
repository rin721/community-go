<script setup lang="ts">
import { aoiComponentDocs } from "~/data/aoiComponentDocs"
import type { AoiDanmakuItem, AoiDanmakuMode } from "~/types/danmaku"
import type { PlayerPlaybackRate } from "~/types/player"
import type { AoiRgbaColor } from "~/utils/aoiColor"

const props = defineProps<{
  name: string
}>()

const doc = computed(() => aoiComponentDocs.find((item) => item.name === props.name))
const selectedMode = ref("filled")
const selectedButtonBox = ref("docs")
const selectedSegment = ref("balanced")
const selectedTab = ref("props")
const selectedSelect = ref("orange")
const checked = ref(true)
const switched = ref(true)
const sliderValue = ref(64)
const colorInput = ref("#ff7d52")
const colorValue = ref<AoiRgbaColor>({ r: 255, g: 125, b: 82, a: 1 })
const textValue = ref("Aoi docs")
const dateValue = ref("2026-06-10")
const timeValue = ref("20:30")
const dialogOpen = ref(false)
const menuOpen = ref(false)
const lightboxOpen = ref(false)
const currentTime = ref(42)
const isPlaying = ref(false)
const muted = ref(false)
const volume = ref(72)
const rate = ref<PlayerPlaybackRate>(1)
const theater = ref(false)
const fullscreen = ref(false)
const danmakuText = ref("")

const normalizedName = computed(() => props.name)
const menuAnchorId = computed(() => `docs-menu-${props.name.toLowerCase()}`)
const buttonBoxItems = [
  { value: "docs", label: "Docs", icon: "book-open" },
  { value: "demo", label: "Demo", icon: "sparkles" },
  { value: "api", label: "API", icon: "braces" }
]
const segmentedItems = [
  { value: "soft", label: "Soft", description: "Calm", icon: "feather" },
  { value: "balanced", label: "Balanced", description: "Default", icon: "blocks" },
  { value: "vivid", label: "Vivid", description: "Bright", icon: "sparkles" }
]
const tabItems = [
  { value: "props", label: "Props", icon: "list" },
  { value: "events", label: "Events", icon: "radio" },
  { value: "slots", label: "Slots", icon: "panel-top" }
]
const selectOptions = [
  { value: "orange", label: "Sunflower orange" },
  { value: "blue", label: "Secondary blue" },
  { value: "disabled", label: "Disabled option", disabled: true }
]
const statItems = [
  { icon: "blocks", label: "Wrappers", value: "50+" },
  { icon: "shield-check", label: "Layered", value: "Aoi" },
  { icon: "sparkles", label: "Demo", value: "Live" }
]
const tagItems = [
  { icon: "hash", label: "docs", value: "docs" },
  { icon: "book-open", label: "source", to: "/docs/project/repository" },
  { icon: "sparkles", label: "aoi", value: "aoi" }
]
const danmakuItems = computed<AoiDanmakuItem[]>(() => [
  {
    authorName: "Docs",
    body: "Aoi Danmaku",
    color: "#ffffff",
    createdAt: "2026-06-10T00:00:00.000Z",
    id: "docs-danmaku-1",
    mode: "scroll",
    timeSeconds: 4
  },
  {
    authorName: "Aoi",
    body: "Layer safe",
    color: "#ffdf7e",
    createdAt: "2026-06-10T00:00:00.000Z",
    id: "docs-danmaku-2",
    mode: "top",
    timeSeconds: 8
  }
])
const lightboxItems = [
  {
    alt: "Aoi docs gradient",
    description: "Inline lightbox demo media.",
    id: "docs-gradient",
    src: "gradient:docs-lightbox",
    thumbnailSrc: "gradient:docs-lightbox-thumb",
    title: "Docs media",
    type: "image" as const
  }
]

function sendDanmaku(payload: { body: string, color: string, mode: AoiDanmakuMode }) {
  danmakuText.value = `${payload.body} (${payload.mode}, ${payload.color})`
}
</script>

<template>
  <AoiSurface class="docs-component-demo" surface="toolbar" padding="md">
    <div v-if="normalizedName === 'AoiButton'" class="docs-component-demo__row">
      <AoiButton tone="accent" variant="filled" icon="sparkles">Filled</AoiButton>
      <AoiButton variant="tonal" tone="info" icon="info">Tonal</AoiButton>
      <AoiButton variant="outlined" tone="warning" icon="triangle-alert">Outlined</AoiButton>
      <AoiButton variant="plain" tone="danger" icon="circle-alert">Plain</AoiButton>
    </div>

    <div v-else-if="normalizedName === 'AoiActionBar'" class="docs-component-demo__row">
      <AoiActionBar label="Docs action demo" size="sm" surface>
        <AoiButton tone="accent" variant="filled" size="sm" icon="save">Save</AoiButton>
        <AoiButton tone="accent" size="sm" variant="outlined" icon="copy">Copy</AoiButton>
        <AoiIconButton icon="more-horizontal" label="More actions" size="sm" />
      </AoiActionBar>
    </div>

    <div v-else-if="normalizedName === 'AoiButtonBox'" class="docs-component-demo__row">
      <AoiButtonBox v-model="selectedButtonBox" :items="buttonBoxItems" aria-label="Docs view mode" />
    </div>

    <div v-else-if="normalizedName === 'AoiIconButton'" class="docs-component-demo__row">
      <AoiIconButton icon="heart" label="Like" variant="tonal" active />
      <AoiIconButton icon="bookmark" label="Save" variant="outlined" />
      <AoiIconButton icon="share-2" label="Share" />
    </div>

    <div v-else-if="normalizedName === 'AoiLink'" class="docs-component-demo__row">
      <AoiLink to="/docs/project/overview">Internal docs link</AoiLink>
      <AoiLink href="https://nuxt.com" target="_blank" format-url />
    </div>

    <div v-else-if="normalizedName === 'AoiMediaOverlayButton'" class="docs-component-demo__media-buttons">
      <AoiMediaOverlayButton icon="play" label="Play preview" />
      <AoiMediaOverlayButton icon="captions" label="Captions" active />
      <AoiMediaOverlayButton icon="maximize" label="Fullscreen" />
    </div>

    <div v-else-if="normalizedName === 'AoiCheckbox'" class="docs-component-demo__row">
      <AoiCheckbox v-model="checked" label="Keep docs visible" />
      <AoiCheckbox disabled label="Disabled option" />
    </div>

    <div v-else-if="normalizedName === 'AoiSwitch'" class="docs-component-demo__row">
      <AoiSwitch v-model="switched" label="Enable route progress" />
    </div>

    <div v-else-if="normalizedName === 'AoiTextField'" class="docs-component-demo__grid">
      <AoiTextField v-model="textValue" label="Document title" icon="file-text" />
      <AoiTextField label="Search docs" appearance="outlined" icon="search" placeholder="components..." />
    </div>

    <div v-else-if="normalizedName === 'AoiSelect'" class="docs-component-demo__grid">
      <AoiSelect v-model="selectedSelect" label="Palette" :options="selectOptions" />
      <AoiSelect v-model="selectedSelect" label="Outlined palette" appearance="outlined" :options="selectOptions" />
    </div>

    <div v-else-if="normalizedName === 'AoiSegmentedControl'" class="docs-component-demo__block">
      <AoiSegmentedControl v-model="selectedSegment" :items="segmentedItems" :columns="3" aria-label="Density" />
    </div>

    <div v-else-if="normalizedName === 'AoiTabs'" class="docs-component-demo__block">
      <AoiTabs v-model="selectedTab" :items="tabItems" aria-label="API tabs" />
    </div>

    <div v-else-if="normalizedName === 'AoiSlider'" class="docs-component-demo__block">
      <AoiSlider v-model="sliderValue" label="Reveal strength" :min="0" :max="100" />
    </div>

    <div v-else-if="normalizedName === 'AoiChoiceCard'" class="docs-component-demo__grid">
      <AoiChoiceCard value="balanced" title="Balanced" description="Default Aoi rhythm" icon="blocks" selected />
      <AoiChoiceCard value="vivid" title="Vivid" description="Brighter interaction layer" icon="sparkles" />
    </div>

    <div v-else-if="normalizedName === 'AoiColorInput'" class="docs-component-demo__grid">
      <AoiColorInput v-model="colorInput" label="Accent color" />
      <span class="docs-component-demo__swatch" :style="{ background: colorInput }" />
    </div>

    <div v-else-if="normalizedName === 'AoiColorPalette'" class="docs-component-demo__block">
      <AoiColorPalette v-model="colorValue" label="Docs palette" />
    </div>

    <div v-else-if="normalizedName === 'AoiDateField'" class="docs-component-demo__grid">
      <AoiDateField v-model="dateValue" label="Updated date" />
      <AoiDateField v-model="dateValue" label="Outlined date" appearance="outlined" />
    </div>

    <div v-else-if="normalizedName === 'AoiTimeField'" class="docs-component-demo__grid">
      <AoiTimeField v-model="timeValue" label="Publish time" />
      <AoiTimeField v-model="timeValue" label="Outlined time" appearance="outlined" />
    </div>

    <div v-else-if="normalizedName === 'AoiFileInput'" class="docs-component-demo__row">
      <AoiFileInput accept="image/*">
        <template #default="{ open }">
          <AoiButton tone="accent" icon="image" variant="outlined" @click="open">Choose image</AoiButton>
        </template>
      </AoiFileInput>
    </div>

    <ClientOnly v-else-if="doc?.demo === 'client-heavy'">
      <AoiStatusMessage intent="info" icon="monitor" message="This component runs in the browser. The docs render its API and keep the live workbench client-only." />
    </ClientOnly>

    <div v-else-if="normalizedName === 'AoiChip'" class="docs-component-demo__row">
      <AoiChip label="selected" icon="check" selected />
      <AoiChip label="metadata" icon="tag" />
      <AoiChip label="link" icon="arrow-up-right" to="/docs" />
    </div>

    <div v-else-if="normalizedName === 'AoiCodeBlock'" class="docs-component-demo__block">
      <AoiCodeBlock code="<AoiButton variant=&quot;filled&quot; tone=&quot;accent&quot; icon=&quot;sparkles&quot;>Create</AoiButton>" label="AoiButton example" />
    </div>

    <div v-else-if="normalizedName === 'AoiContentGrid'" class="docs-component-demo__block">
      <AoiContentGrid min-width="120px" gap="compact" :mobile-columns="2">
        <AoiSurface v-for="item in ['One', 'Two', 'Three']" :key="item" padding="sm">{{ item }}</AoiSurface>
      </AoiContentGrid>
    </div>

    <div v-else-if="normalizedName === 'AoiIcon'" class="docs-component-demo__row">
      <AoiIcon name="sun" :size="28" decorative />
      <AoiIcon name="book-open" :size="28" decorative />
      <AoiIcon name="sparkles" :size="28" decorative />
    </div>

    <div v-else-if="normalizedName === 'AoiInfoCard'" class="docs-component-demo__block">
      <AoiInfoCard layout="inline" interactive to="/docs/components/actions">
        <template #media><AoiIcon name="book-open" :size="28" decorative /></template>
        <template #title>Component docs</template>
        <template #description>Cards can carry media, copy, metadata, actions, and link behavior.</template>
        <template #meta><AoiMetaPill icon="check" label="Aoi" /></template>
      </AoiInfoCard>
    </div>

    <div v-else-if="normalizedName === 'AoiLazyImage'" class="docs-component-demo__image">
      <AoiLazyImage src="gradient:docs-lazy-image" alt="Aoi gradient placeholder" />
    </div>

    <div v-else-if="normalizedName === 'AoiLazyMount'" class="docs-component-demo__block">
      <AoiLazyMount>
        <AoiStatusMessage intent="success" icon="eye" message="Mounted when the docs demo enters the viewport." />
      </AoiLazyMount>
    </div>

    <div v-else-if="normalizedName === 'AoiMetaPill'" class="docs-component-demo__row">
      <AoiMetaPill icon="clock" label="Updated" value="2026-06-10" />
      <AoiMetaPill icon="layers" label="Layer safe" />
    </div>

    <AoiReveal v-else-if="normalizedName === 'AoiReveal'" class="docs-component-demo__block" variant="rise">
      <AoiSurface padding="sm">Reveal keeps content visible before hydration.</AoiSurface>
    </AoiReveal>

    <div v-else-if="normalizedName === 'AoiScrollArea'" class="docs-component-demo__scroll">
      <AoiScrollArea aria-label="Scrollable docs sample" axis="y" :tabindex="0">
        <p v-for="item in 6" :key="item">Scrollable row {{ item }}</p>
      </AoiScrollArea>
    </div>

    <div v-else-if="normalizedName === 'AoiScrollScene' || normalizedName === 'AoiScrollSnapItem'" class="docs-component-demo__snap">
      <AoiScrollSnapItem v-for="item in ['Intro', 'Rules', 'Build']" :key="item">
        <AoiSurface padding="sm">{{ item }}</AoiSurface>
      </AoiScrollSnapItem>
    </div>

    <div v-else-if="normalizedName === 'AoiSection'" class="docs-component-demo__block">
      <AoiSection title="Docs section" description="Section headers keep copy, icons, and actions aligned." icon="book-open" />
    </div>

    <div v-else-if="normalizedName.includes('Skeleton')" class="docs-component-demo__block">
      <AoiSkeletonGroup layout="stack" :count="2">
        <AoiSkeletonText :lines="2" />
      </AoiSkeletonGroup>
    </div>

    <div v-else-if="normalizedName === 'AoiStatGrid'" class="docs-component-demo__block">
      <AoiStatGrid :items="statItems" :columns="3" />
    </div>

    <div v-else-if="normalizedName === 'AoiSurface'" class="docs-component-demo__grid">
      <AoiSurface surface="card" padding="sm">Card</AoiSurface>
      <AoiSurface surface="state" tone="success" padding="sm">State</AoiSurface>
      <AoiSurface surface="toolbar" padding="sm">Toolbar</AoiSurface>
    </div>

    <div v-else-if="normalizedName === 'AoiTagList'" class="docs-component-demo__block">
      <AoiTagList :items="tagItems" label="Docs tags" />
    </div>

    <div v-else-if="normalizedName === 'AoiProgress'" class="docs-component-demo__grid">
      <AoiProgress indeterminate />
      <AoiProgress type="circular" indeterminate />
    </div>

    <div v-else-if="normalizedName === 'AoiProgressBar'" class="docs-component-demo__block">
      <AoiProgressBar :value="72" label="Docs completion" />
    </div>

    <div v-else-if="normalizedName === 'AoiStatusMessage'" class="docs-component-demo__block">
      <AoiStatusMessage intent="success" icon="circle-check" message="Docs renderer is using Aoi feedback components." />
    </div>

    <div v-else-if="normalizedName === 'AoiDialog'" class="docs-component-demo__row">
      <AoiButton tone="accent" variant="outlined" icon="message-square" @click="dialogOpen = true">Open dialog</AoiButton>
      <AoiDialog v-model:open="dialogOpen">
        <template #headline>Docs dialog</template>
        <p>AoiDialog keeps Material Web behind the wrapper.</p>
        <template #actions>
          <AoiButton tone="accent" variant="plain" @click="dialogOpen = false">Cancel</AoiButton>
          <AoiButton tone="accent" variant="filled" icon="check" @click="dialogOpen = false">Confirm</AoiButton>
        </template>
      </AoiDialog>
    </div>

    <div v-else-if="normalizedName === 'AoiMenu'" class="docs-component-demo__row">
      <AoiButton tone="accent" :id="menuAnchorId" variant="outlined" icon="list" @click="menuOpen = !menuOpen">Open menu</AoiButton>
      <AoiMenu
        v-model:open="menuOpen"
        :anchor="menuAnchorId"
        :items="[
          { value: 'copy', label: 'Copy', icon: 'copy' },
          { value: 'inspect', label: 'Inspect', icon: 'search' }
        ]"
      />
    </div>

    <ClientOnly v-else-if="normalizedName === 'AoiLightboxGallery'">
      <div class="docs-component-demo__row">
        <AoiButton tone="accent" variant="outlined" icon="images" @click="lightboxOpen = true">Open gallery</AoiButton>
        <AoiLightboxGallery v-model:open="lightboxOpen" :items="lightboxItems" />
      </div>
    </ClientOnly>

    <div v-else-if="normalizedName === 'AoiVideoControls' || normalizedName === 'AoiVideoToolbar' || normalizedName === 'AoiVideoTimeline'" class="docs-component-demo__block">
      <AoiVideoControls
        :current-time="currentTime"
        :duration="180"
        :is-playing="isPlaying"
        :muted="muted"
        :volume-percent="volume"
        :playback-rate="rate"
        :theater-mode="theater"
        :fullscreen="fullscreen"
        @seek="currentTime = $event"
        @toggle-play="isPlaying = !isPlaying"
        @toggle-muted="muted = !muted"
        @toggle-theater="theater = !theater"
        @toggle-fullscreen="fullscreen = !fullscreen"
        @update:volume-percent="volume = $event"
        @update:playback-rate="rate = $event"
      />
    </div>

    <div v-else-if="normalizedName === 'AoiVideoQueueList' || normalizedName === 'AoiWatchLayout' || doc?.demo === 'media-heavy'" class="docs-component-demo__media">
      <AoiIcon name="play-square" :size="30" decorative />
      <span>Media-heavy component. Use the API table with lazy viewport loading rules.</span>
    </div>

    <div v-else-if="normalizedName === 'AoiDanmakuComposer'" class="docs-component-demo__block">
      <AoiDanmakuComposer @submit="sendDanmaku" />
      <AoiStatusMessage v-if="danmakuText" intent="success" :message="danmakuText" />
    </div>

    <div v-else-if="normalizedName === 'AoiDanmakuPanel'" class="docs-component-demo__block">
      <AoiDanmakuPanel :items="danmakuItems" :current-time="6" @seek="currentTime = $event" />
    </div>

    <div v-else-if="normalizedName === 'AoiDanmakuLayer'" class="docs-component-demo__danmaku">
      <AoiDanmakuLayer :items="danmakuItems" :current-time="6" playing />
    </div>

    <div v-else class="docs-component-demo__generic">
      <AoiIcon :name="doc ? 'blocks' : 'badge-help'" :size="22" decorative />
      <span>{{ doc?.description || "Aoi component demo" }}</span>
    </div>
  </AoiSurface>
</template>

<style scoped>
.docs-component-demo {
  overflow: hidden;
}

.docs-component-demo__row,
.docs-component-demo__grid,
.docs-component-demo__block,
.docs-component-demo__media-buttons,
.docs-component-demo__generic,
.docs-component-demo__media {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.docs-component-demo__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.docs-component-demo__block {
  display: grid;
  align-items: stretch;
}

.docs-component-demo__media-buttons {
  min-height: 120px;
  justify-content: center;
  border-radius: var(--aoi-radius-card);
  background:
    linear-gradient(180deg, rgba(0, 0, 0, .05), rgba(0, 0, 0, .58)),
    linear-gradient(135deg, var(--aoi-accent-20), var(--aoi-secondary-50));
}

.docs-component-demo__media,
.docs-component-demo__generic {
  border: 1px dashed var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-surface);
  color: var(--aoi-text-muted);
  line-height: 1.6;
  padding: 14px;
}

.docs-component-demo__swatch {
  display: inline-block;
  width: 48px;
  height: 48px;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  box-shadow: var(--aoi-shadow-sm);
}

.docs-component-demo__image {
  overflow: hidden;
  width: min(320px, 100%);
  aspect-ratio: 16 / 9;
  border-radius: var(--aoi-radius-card);
}

.docs-component-demo__scroll {
  max-height: 180px;
}

.docs-component-demo__scroll p {
  margin: 0;
  border-bottom: 1px solid var(--aoi-border);
  padding: 10px 0;
}

.docs-component-demo__snap {
  display: grid;
  grid-auto-columns: minmax(160px, 1fr);
  grid-auto-flow: column;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
}

.docs-component-demo__danmaku {
  position: relative;
  min-height: 150px;
  overflow: hidden;
  border-radius: var(--aoi-radius-card);
  background: linear-gradient(135deg, var(--aoi-accent-40), var(--aoi-secondary-50));
}
</style>
