<script setup lang="ts">
import type { AoiHsbColor, AoiRgbaColor } from "~/utils/aoiColor"
import {
  aoiHsbToRgba,
  aoiHslToRgba,
  aoiRgbaToCss,
  aoiRgbaToHex,
  aoiRgbaToHsb,
  aoiRgbaToHsl,
  clampAoiColorValue,
  normalizeAoiRgbaColor,
  parseAoiHexColor
} from "~/utils/aoiColor"

type ColorMode = "rgb" | "hsl" | "hsb"
type ChannelKey = "r" | "g" | "rgbB" | "h" | "s" | "l" | "brightness"

interface ChannelField {
  key: ChannelKey
  label: string
  max: number
  min: number
  value: number
}

const props = withDefaults(defineProps<{
  modelValue: AoiRgbaColor
  label: string
  defaultMode?: ColorMode
  disabled?: boolean
  resetLabel?: string
  resetValue?: AoiRgbaColor | null
}>(), {
  defaultMode: "hsl",
  disabled: false,
  resetLabel: undefined,
  resetValue: null
})

const emit = defineEmits<{
  change: [value: AoiRgbaColor]
  "update:modelValue": [value: AoiRgbaColor]
}>()

const { t } = useI18n()

const colorMode = ref<ColorMode>(props.defaultMode)
const hexDraft = ref("")
const hexFocused = ref(false)
const hueMemory = ref(0)
const panelRef = ref<HTMLElement | null>(null)
const isPanelDragging = ref(false)

const modeItems: Array<{ value: ColorMode, label: string }> = [
  { value: "rgb", label: "RGB" },
  { value: "hsl", label: "HSL" },
  { value: "hsb", label: "HSB" }
]

const currentColor = computed(() => normalizeAoiRgbaColor(props.modelValue))
const currentHsb = computed<AoiHsbColor>(() => {
  const hsb = aoiRgbaToHsb(currentColor.value)

  return {
    ...hsb,
    h: hsb.s > 0 && hsb.b > 0 ? hsb.h : hueMemory.value
  }
})
const hueColor = computed(() => aoiRgbaToCss(aoiHsbToRgba({ h: currentHsb.value.h, s: 100, b: 100 }, 1)))
const opaquePreview = computed(() => aoiRgbaToCss({ ...currentColor.value, a: 1 }))
const alphaPreview = computed(() => aoiRgbaToCss(currentColor.value))
const alphaPercent = computed(() => Math.round(currentColor.value.a * 100))
const fieldPosition = computed(() => ({
  left: `${clampAoiColorValue(currentHsb.value.s, 0, 100)}%`,
  top: `${100 - clampAoiColorValue(currentHsb.value.b, 0, 100)}%`
}))
const hexValue = computed(() => aoiRgbaToHex(currentColor.value, currentColor.value.a < 1))
const hasReset = computed(() => Boolean(props.resetValue))
const channelFields = computed<ChannelField[]>(() => {
  const color = currentColor.value

  if (colorMode.value === "rgb") {
    return [
      { key: "r", label: "R", min: 0, max: 255, value: color.r },
      { key: "g", label: "G", min: 0, max: 255, value: color.g },
      { key: "rgbB", label: "B", min: 0, max: 255, value: color.b }
    ]
  }

  if (colorMode.value === "hsl") {
    const hsl = aoiRgbaToHsl(color)

    return [
      { key: "h", label: "H", min: 0, max: 360, value: hsl.s > 0 ? hsl.h : hueMemory.value },
      { key: "s", label: "S", min: 0, max: 100, value: hsl.s },
      { key: "l", label: "L", min: 0, max: 100, value: hsl.l }
    ]
  }

  return [
    { key: "h", label: "H", min: 0, max: 360, value: currentHsb.value.h },
    { key: "s", label: "S", min: 0, max: 100, value: currentHsb.value.s },
    { key: "brightness", label: "B", min: 0, max: 100, value: currentHsb.value.b }
  ]
})

watch(currentColor, (color) => {
  const hsb = aoiRgbaToHsb(color)

  if (hsb.s > 0 && hsb.b > 0) {
    hueMemory.value = hsb.h
  }

  if (!hexFocused.value) {
    hexDraft.value = hexValue.value
  }
}, { immediate: true })

function emitColor(value: AoiRgbaColor, commit = false) {
  const next = normalizeAoiRgbaColor(value)

  emit("update:modelValue", next)

  if (commit) {
    emit("change", next)
  }
}

function selectMode(value: ColorMode) {
  colorMode.value = value
}

function updatePanelFromPointer(event: PointerEvent, commit = false) {
  if (props.disabled || !panelRef.value) {
    return
  }

  const rect = panelRef.value.getBoundingClientRect()
  const saturation = clampAoiColorValue((event.clientX - rect.left) / rect.width * 100, 0, 100)
  const brightness = clampAoiColorValue((1 - (event.clientY - rect.top) / rect.height) * 100, 0, 100)

  emitColor(aoiHsbToRgba({
    h: currentHsb.value.h,
    s: saturation,
    b: brightness
  }, currentColor.value.a), commit)
}

function onPanelPointerDown(event: PointerEvent) {
  if (props.disabled) {
    return
  }

  isPanelDragging.value = true

  const target = event.currentTarget as HTMLElement

  target.setPointerCapture(event.pointerId)
  updatePanelFromPointer(event)
}

function onPanelPointerMove(event: PointerEvent) {
  if (!isPanelDragging.value) {
    return
  }

  updatePanelFromPointer(event)
}

function onPanelPointerEnd(event: PointerEvent) {
  if (!isPanelDragging.value) {
    return
  }

  isPanelDragging.value = false

  const target = event.currentTarget as HTMLElement

  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }

  updatePanelFromPointer(event, true)
}

function onPanelKeydown(event: KeyboardEvent) {
  if (props.disabled || !["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key)) {
    return
  }

  event.preventDefault()

  const step = event.shiftKey ? 5 : 1
  const next = { ...currentHsb.value }

  if (event.key === "ArrowLeft") {
    next.s = clampAoiColorValue(next.s - step, 0, 100)
  } else if (event.key === "ArrowRight") {
    next.s = clampAoiColorValue(next.s + step, 0, 100)
  } else if (event.key === "ArrowDown") {
    next.b = clampAoiColorValue(next.b - step, 0, 100)
  } else {
    next.b = clampAoiColorValue(next.b + step, 0, 100)
  }

  emitColor(aoiHsbToRgba(next, currentColor.value.a), true)
}

function updateHue(event: Event, commit = false) {
  const hue = clampAoiColorValue(Number((event.target as HTMLInputElement).value), 0, 360)

  hueMemory.value = hue
  emitColor(aoiHsbToRgba({ ...currentHsb.value, h: hue }, currentColor.value.a), commit)
}

function updateAlpha(event: Event, commit = false) {
  const alpha = clampAoiColorValue(Number((event.target as HTMLInputElement).value), 0, 100) / 100

  emitColor({ ...currentColor.value, a: alpha }, commit)
}

function updateChannel(field: ChannelField, event: Event, commit = false) {
  const value = clampAoiColorValue(Number((event.target as HTMLInputElement).value), field.min, field.max)
  const color = currentColor.value

  if (colorMode.value === "rgb") {
    emitColor({
      r: field.key === "r" ? value : color.r,
      g: field.key === "g" ? value : color.g,
      b: field.key === "rgbB" ? value : color.b,
      a: color.a
    }, commit)
    return
  }

  if (colorMode.value === "hsl") {
    const hsl = aoiRgbaToHsl(color)
    const next = {
      h: field.key === "h" ? value : hsl.s > 0 ? hsl.h : hueMemory.value,
      s: field.key === "s" ? value : hsl.s,
      l: field.key === "l" ? value : hsl.l
    }

    hueMemory.value = next.h
    emitColor(aoiHslToRgba(next, color.a), commit)
    return
  }

  const next = {
    h: field.key === "h" ? value : currentHsb.value.h,
    s: field.key === "s" ? value : currentHsb.value.s,
    b: field.key === "brightness" ? value : currentHsb.value.b
  }

  hueMemory.value = next.h
  emitColor(aoiHsbToRgba(next, color.a), commit)
}

function onHexFocus() {
  hexFocused.value = true
  hexDraft.value = hexValue.value
}

function onHexInput(event: Event) {
  const target = event.target as HTMLInputElement

  hexDraft.value = target.value.toUpperCase()
  target.value = hexDraft.value

  const parsed = parseAoiHexColor(hexDraft.value, currentColor.value.a)

  if (parsed) {
    emitColor(parsed)
  }
}

function onHexBlur(event: FocusEvent) {
  const parsed = parseAoiHexColor(hexDraft.value, currentColor.value.a)
  const target = event.target as HTMLInputElement

  hexFocused.value = false

  if (parsed) {
    emitColor(parsed, true)
  }

  hexDraft.value = hexValue.value
  target.value = hexDraft.value
}

function onHexKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    const target = event.target as HTMLInputElement

    target.blur()
  }
}

function resetColor() {
  if (!props.resetValue) {
    return
  }

  emitColor(props.resetValue, true)
}

function fieldValue(value: number) {
  return String(Math.round(value))
}
</script>

<template>
  <section
    class="aoi-color-palette"
    :class="{ 'aoi-color-palette--disabled': disabled }"
    :aria-disabled="disabled || undefined"
  >
    <header class="aoi-color-palette__header">
      <span class="aoi-color-palette__title">
        <AoiIcon name="palette" :size="18" decorative />
        {{ label }}
      </span>
      <button
        v-if="hasReset"
        class="aoi-color-palette__reset"
        type="button"
        :disabled="disabled || undefined"
        @click="resetColor"
      >
        <AoiRipple />
        <AoiIcon name="rotate-ccw" :size="16" decorative />
        {{ resetLabel || t("components.colorPalette.reset") }}
      </button>
    </header>

    <div
      ref="panelRef"
      class="aoi-color-palette__field"
      :style="{ '--aoi-palette-hue-color': hueColor }"
      :aria-label="t('components.colorPalette.field')"
      :tabindex="disabled ? undefined : 0"
      role="group"
      @keydown="onPanelKeydown"
      @pointercancel="onPanelPointerEnd"
      @pointerdown="onPanelPointerDown"
      @pointermove="onPanelPointerMove"
      @pointerup="onPanelPointerEnd"
    >
      <span
        class="aoi-color-palette__field-thumb"
        :style="{
          backgroundColor: alphaPreview,
          left: fieldPosition.left,
          top: fieldPosition.top
        }"
      />
    </div>

    <label class="aoi-color-palette__range-row">
      <span class="aoi-color-palette__range-label">{{ t("components.colorPalette.hue") }}</span>
      <input
        class="aoi-color-palette__range aoi-color-palette__range--hue"
        :value="Math.round(currentHsb.h)"
        :disabled="disabled || undefined"
        max="360"
        min="0"
        type="range"
        @change="updateHue($event, true)"
        @input="updateHue"
      >
    </label>

    <label class="aoi-color-palette__range-row">
      <span class="aoi-color-palette__range-label">{{ t("components.colorPalette.alpha") }}</span>
      <input
        class="aoi-color-palette__range"
        :style="{
          '--aoi-palette-range-bg': `linear-gradient(90deg, rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0), ${opaquePreview})`
        }"
        :value="alphaPercent"
        :disabled="disabled || undefined"
        max="100"
        min="0"
        type="range"
        @change="updateAlpha($event, true)"
        @input="updateAlpha"
      >
    </label>

    <div
      class="aoi-color-palette__modes"
      role="tablist"
      :aria-label="t('components.colorPalette.mode')"
    >
      <button
        v-for="item in modeItems"
        :key="item.value"
        class="aoi-color-palette__mode"
        :class="{ 'aoi-color-palette__mode--active': item.value === colorMode }"
        type="button"
        role="tab"
        :aria-selected="item.value === colorMode"
        :disabled="disabled || undefined"
        @click="selectMode(item.value)"
      >
        <AoiRipple />
        {{ item.label }}
      </button>
    </div>

    <div class="aoi-color-palette__channels">
      <label
        v-for="field in channelFields"
        :key="`${colorMode}-${field.key}`"
        class="aoi-color-palette__channel"
      >
        <span class="aoi-sr-only">{{ field.label }}</span>
        <input
          :aria-label="field.label"
          :disabled="disabled || undefined"
          :max="field.max"
          :min="field.min"
          :value="fieldValue(field.value)"
          inputmode="numeric"
          type="number"
          @change="updateChannel(field, $event, true)"
          @input="updateChannel(field, $event)"
        >
      </label>
    </div>

    <div class="aoi-color-palette__hex-row">
      <span
        class="aoi-color-palette__swatch"
        :style="{ backgroundColor: alphaPreview }"
        aria-hidden="true"
      />
      <label class="aoi-color-palette__hex">
        <span class="aoi-sr-only">{{ t("components.colorPalette.hex") }}</span>
        <input
          :aria-label="t('components.colorPalette.hex')"
          :disabled="disabled || undefined"
          :value="hexDraft"
          autocomplete="off"
          inputmode="text"
          spellcheck="false"
          @blur="onHexBlur"
          @focus="onHexFocus"
          @input="onHexInput"
          @keydown="onHexKeydown"
        >
      </label>
    </div>
  </section>
</template>

<style scoped>
.aoi-color-palette {
  display: grid;
  width: min(100%, 376px);
  gap: 12px;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-surface-solid);
  box-shadow: var(--aoi-shadow-sm);
  color: var(--aoi-text);
  padding: 14px;
}

.aoi-color-palette__header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.aoi-color-palette__title,
.aoi-color-palette__reset {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.aoi-color-palette__title {
  color: var(--aoi-sakura-50);
  font-weight: 820;
}

.aoi-color-palette__reset {
  position: relative;
  overflow: clip;
  min-height: 32px;
  border: 0;
  border-radius: var(--aoi-radius-control);
  background: transparent;
  color: var(--aoi-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 760;
  padding: 0 8px;
  transition:
    background var(--aoi-motion-fast) var(--aoi-ease-out),
    color var(--aoi-motion-fast) var(--aoi-ease-out);
}

.aoi-color-palette__reset:hover {
  background: var(--aoi-state-hover);
  color: var(--aoi-accent-60);
}

.aoi-color-palette__field {
  position: relative;
  min-height: 228px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, black 28%, var(--aoi-border));
  border-radius: var(--aoi-radius-card);
  aspect-ratio: 1.22 / 1;
  background:
    linear-gradient(0deg, black, transparent),
    linear-gradient(90deg, white, var(--aoi-palette-hue-color));
  cursor: crosshair;
  touch-action: none;
}

.aoi-color-palette__field:focus-visible,
.aoi-color-palette__range:focus-visible,
.aoi-color-palette__mode:focus-visible,
.aoi-color-palette__channel input:focus-visible,
.aoi-color-palette__hex input:focus-visible,
.aoi-color-palette__reset:focus-visible {
  outline: 3px solid var(--aoi-focus);
  outline-offset: 2px;
}

.aoi-color-palette__field-thumb {
  position: absolute;
  width: 22px;
  height: 22px;
  border: 4px solid #fff;
  border-radius: var(--aoi-radius-round);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, .26),
    0 0 0 1px rgba(0, 0, 0, .16);
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.aoi-color-palette__range-row {
  display: grid;
  gap: 6px;
}

.aoi-color-palette__range-label {
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 760;
}

.aoi-color-palette__range {
  width: 100%;
  height: 18px;
  margin: 0;
  appearance: none;
  border-radius: var(--aoi-radius-round);
  background: var(--aoi-palette-range-bg, var(--aoi-accent-20));
  cursor: pointer;
}

.aoi-color-palette__range--hue {
  --aoi-palette-range-bg: linear-gradient(90deg, red, #ff0, lime, cyan, blue, magenta, red);
}

.aoi-color-palette__range::-webkit-slider-thumb {
  width: 22px;
  height: 22px;
  appearance: none;
  border: 4px solid #fff;
  border-radius: var(--aoi-radius-round);
  background: var(--aoi-accent-60);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, .22),
    0 0 0 1px rgba(0, 0, 0, .14);
}

.aoi-color-palette__range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border: 4px solid #fff;
  border-radius: var(--aoi-radius-round);
  background: var(--aoi-accent-60);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, .22),
    0 0 0 1px rgba(0, 0, 0, .14);
}

.aoi-color-palette__modes,
.aoi-color-palette__channels,
.aoi-color-palette__hex-row {
  display: grid;
  gap: 8px;
}

.aoi-color-palette__modes {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-control);
  background: var(--aoi-control-bg);
}

.aoi-color-palette__mode {
  position: relative;
  overflow: clip;
  min-width: 0;
  min-height: 38px;
  border: 0;
  background: transparent;
  color: var(--aoi-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  transition:
    background var(--aoi-motion-fast) var(--aoi-ease-out),
    box-shadow var(--aoi-motion-fast) var(--aoi-ease-out),
    color var(--aoi-motion-fast) var(--aoi-ease-out);
}

.aoi-color-palette__mode--active {
  background: var(--aoi-sakura-50);
  box-shadow: var(--aoi-shadow-sm);
  color: #fff;
}

.aoi-color-palette__channels {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.aoi-color-palette__channel input,
.aoi-color-palette__hex input {
  width: 100%;
  min-width: 0;
  min-height: 40px;
  border: 1px solid transparent;
  border-radius: var(--aoi-radius-field);
  background: var(--aoi-control-bg);
  color: var(--aoi-text);
  font: inherit;
  padding: 0 12px;
}

.aoi-color-palette__channel input {
  text-align: left;
}

.aoi-color-palette__hex-row {
  grid-template-columns: minmax(96px, .42fr) minmax(0, 1fr);
  align-items: center;
}

.aoi-color-palette__swatch {
  min-width: 0;
  height: 42px;
  border: 1px solid color-mix(in srgb, black 12%, var(--aoi-border));
  border-radius: var(--aoi-radius-field);
  background-image:
    linear-gradient(45deg, rgba(0, 0, 0, .08) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(0, 0, 0, .08) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, .08) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, .08) 75%);
  background-position: 0 0, 0 6px, 6px -6px, -6px 0;
  background-size: 12px 12px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .42);
}

.aoi-color-palette__hex input {
  text-transform: uppercase;
}

.aoi-color-palette--disabled {
  opacity: .62;
}

.aoi-color-palette--disabled .aoi-color-palette__field,
.aoi-color-palette--disabled .aoi-color-palette__range,
.aoi-color-palette--disabled .aoi-color-palette__mode,
.aoi-color-palette--disabled .aoi-color-palette__reset {
  cursor: not-allowed;
}

.aoi-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 520px) {
  .aoi-color-palette {
    width: 100%;
    padding: 12px;
  }

  .aoi-color-palette__field {
    min-height: 190px;
  }

  .aoi-color-palette__hex-row {
    grid-template-columns: 1fr;
  }
}
</style>
