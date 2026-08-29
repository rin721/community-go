<script setup lang="ts">
import type { AoiDanmakuMode } from "~/types/danmaku"
import { AOI_DANMAKU_COLORS } from "~/utils/aoiDanmaku"

const props = withDefaults(defineProps<{
  count?: number
  compact?: boolean
  disabled?: boolean
  enabled?: boolean
  overlay?: boolean
  playing?: boolean
}>(), {
  count: 0,
  compact: false,
  disabled: false,
  enabled: true,
  overlay: false,
  playing: false
})

const emit = defineEmits<{
  submit: [payload: { body: string, color: string, mode: AoiDanmakuMode }]
  "toggle-enabled": []
}>()

const { t } = useI18n()
const body = ref("")
const color = ref(AOI_DANMAKU_COLORS[0]!)
const inputRef = ref<HTMLInputElement | null>(null)
const mode = ref<AoiDanmakuMode>("scroll")
const settingsOpen = ref(false)
const modeModel = computed({
  get: () => mode.value,
  set: (value: string) => {
    mode.value = value === "top" || value === "bottom" ? value : "scroll"
  }
})
const canSend = computed(() => props.enabled && !props.disabled)
const statusText = computed(() => {
  if (props.disabled) {
    return t("player.danmakuUnavailable")
  }

  return props.enabled ? t("player.danmakuOn") : t("player.danmakuOff")
})
const countText = computed(() => t("player.danmakuCount", { count: props.count }))

const modeItems = computed(() => [
  { value: "scroll", label: t("player.danmakuScroll"), icon: "move-right" },
  { value: "top", label: t("player.danmakuTop"), icon: "align-vertical-space-around" },
  { value: "bottom", label: t("player.danmakuBottom"), icon: "align-vertical-space-between" }
])

watch(body, (value) => {
  if (value.length > 80) {
    body.value = value.slice(0, 80)
  }
})

function submit() {
  const safeBody = body.value.trim().slice(0, 80)

  if (!safeBody || !canSend.value) {
    return
  }

  emit("submit", {
    body: safeBody,
    color: color.value,
    mode: mode.value
  })
  body.value = ""
}

function toggleSettings() {
  settingsOpen.value = !settingsOpen.value
}

function toggleEnabled() {
  if (!props.disabled) {
    emit("toggle-enabled")
  }
}

function selectMode(value: string) {
  modeModel.value = value
}

function focusInput() {
  inputRef.value?.focus()
}

defineExpose({
  focus: focusInput,
  toggleSettings
})
</script>

<template>
  <form
    class="aoi-danmaku-composer"
    :class="{
      'aoi-danmaku-composer--compact': compact,
      'aoi-danmaku-composer--disabled': disabled,
      'aoi-danmaku-composer--off': !enabled,
      'aoi-danmaku-composer--overlay': overlay,
      'aoi-danmaku-composer--playing': playing
    }"
    @submit.prevent="submit"
  >
    <button
      class="aoi-danmaku-composer__status"
      type="button"
      :aria-label="enabled ? t('player.hideDanmaku') : t('player.showDanmaku')"
      :aria-pressed="enabled"
      :disabled="disabled || undefined"
      @click="toggleEnabled"
    >
      <AoiRipple />
      <AoiIcon :name="enabled && !disabled ? 'message-square-text' : 'message-square-off'" :size="15" decorative />
      <span>{{ statusText }}</span>
      <small>{{ countText }}</small>
    </button>

    <label class="aoi-danmaku-composer__field">
      <span class="aoi-danmaku-composer__field-label">{{ t("player.danmaku") }}</span>
      <input
        ref="inputRef"
        v-model="body"
        :aria-label="t('player.danmakuSend')"
        autocomplete="off"
        :disabled="!canSend || undefined"
        maxlength="80"
        :placeholder="enabled ? t('player.danmakuPlaceholder') : t('player.danmakuOff')"
        type="text"
        @keydown.enter.prevent="submit"
      />
    </label>

    <button
      class="aoi-danmaku-composer__settings-button"
      type="button"
      :aria-expanded="settingsOpen"
      :aria-label="t('player.danmakuSettings')"
      :disabled="disabled || undefined"
      @click="toggleSettings"
    >
      <AoiRipple />
      <AoiIcon name="sliders-horizontal" :size="16" decorative />
    </button>

    <AoiButton tone="accent" variant="filled"
      class="aoi-danmaku-composer__submit"
      type="submit"
      icon="send"
      size="sm"
      :disabled="!canSend || !body.trim()"
    >
      <span class="aoi-danmaku-composer__submit-label">{{ t("player.danmakuSend") }}</span>
    </AoiButton>

    <div
      v-if="settingsOpen"
      class="aoi-danmaku-composer__settings"
      @click.stop
    >
      <div class="aoi-danmaku-composer__settings-group">
        <span>{{ t("player.danmakuMode") }}</span>
        <div class="aoi-danmaku-composer__mode" role="radiogroup" :aria-label="t('player.danmakuMode')">
          <button
            v-for="item in modeItems"
            :key="item.value"
            class="aoi-danmaku-composer__choice"
            :class="{ 'aoi-danmaku-composer__choice--active': item.value === modeModel }"
            type="button"
            role="radio"
            :aria-checked="item.value === modeModel"
            :disabled="disabled || undefined"
            @click="selectMode(item.value)"
          >
            <AoiRipple />
            <AoiIcon :name="item.value === modeModel ? 'check' : item.icon" :size="14" decorative />
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="aoi-danmaku-composer__settings-group">
        <span>{{ t("player.danmakuColor") }}</span>
        <div class="aoi-danmaku-composer__colors" :aria-label="t('player.danmakuColor')">
          <button
            v-for="item in AOI_DANMAKU_COLORS"
            :key="item"
            class="aoi-danmaku-composer__color"
            :class="{ 'aoi-danmaku-composer__color--active': item === color }"
            type="button"
            :aria-label="t('player.danmakuColorPick', { color: item })"
            :aria-pressed="item === color"
            :style="{ backgroundColor: item }"
            :disabled="disabled || undefined"
            @click="color = item"
          >
            <AoiRipple />
          </button>
        </div>
      </div>
    </div>
  </form>
</template>

<style scoped>
.aoi-danmaku-composer {
  container-type: inline-size;
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  border: 1px solid var(--aoi-player-border);
  border-top: 0;
  background: var(--aoi-player-surface-muted);
  color: var(--aoi-player-text);
  padding: 8px 10px;
}

.aoi-danmaku-composer__status {
  position: relative;
  overflow: clip;
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: var(--aoi-radius-field);
  background: transparent;
  color: var(--aoi-player-accent);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 760;
  padding: 0 6px;
}

.aoi-danmaku-composer__status small {
  color: var(--aoi-player-text-muted);
  font-size: 11px;
  font-weight: 620;
}

.aoi-danmaku-composer__status:hover {
  color: var(--aoi-player-accent);
}

.aoi-danmaku-composer--off .aoi-danmaku-composer__status,
.aoi-danmaku-composer--disabled .aoi-danmaku-composer__status {
  color: var(--aoi-player-text-muted);
}

.aoi-danmaku-composer__field {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--aoi-player-border);
  border-radius: var(--aoi-radius-field);
  background: var(--aoi-player-surface);
  color: var(--aoi-player-text-muted);
  font-size: 12px;
  transition:
    border-color var(--aoi-motion-fast) var(--aoi-ease-out),
    box-shadow var(--aoi-motion-fast) var(--aoi-ease-out);
}

.aoi-danmaku-composer__field:focus-within {
  border-color: var(--aoi-player-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--aoi-player-accent) 16%, transparent);
}

.aoi-danmaku-composer__field-label {
  padding-inline: 10px 7px;
  white-space: nowrap;
}

.aoi-danmaku-composer__field input {
  min-width: 0;
  height: 30px;
  border: 0;
  background: transparent;
  color: var(--aoi-player-text);
  font: inherit;
  outline: 0;
  padding: 0 10px 0 0;
}

.aoi-danmaku-composer__field input::placeholder {
  color: var(--aoi-player-text-muted);
}

.aoi-danmaku-composer__settings-button {
  position: relative;
  overflow: clip;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: var(--aoi-radius-field);
  background: transparent;
  color: var(--aoi-player-text-muted);
  cursor: pointer;
  outline: 0;
  padding: 0;
  transition: color var(--aoi-motion-fast) var(--aoi-ease-out);
}

.aoi-danmaku-composer__settings-button:hover,
.aoi-danmaku-composer__settings-button[aria-expanded="true"] {
  color: var(--aoi-player-accent);
  box-shadow: none;
}

.aoi-danmaku-composer__settings-button:focus-visible {
  outline: 1px solid color-mix(in srgb, var(--aoi-player-accent) 58%, transparent);
  outline-offset: 2px;
}

.aoi-danmaku-composer__submit {
  --md-filled-button-container-color: var(--aoi-player-accent);
  --md-filled-button-focus-container-color: var(--aoi-player-accent);
  --md-filled-button-hover-container-color: var(--aoi-player-accent);
  --md-filled-button-pressed-container-color: var(--aoi-player-accent);
  --md-filled-button-focus-state-layer-color: transparent;
  --md-filled-button-focus-state-layer-opacity: 0;
  --md-filled-button-hover-state-layer-color: transparent;
  --md-filled-button-hover-state-layer-opacity: 0;
  --md-filled-button-pressed-state-layer-color: transparent;
  --md-filled-button-pressed-state-layer-opacity: 0;
  --md-filled-button-label-text-color: #fff;
  --md-filled-button-focus-label-text-color: #fff;
  --md-filled-button-hover-label-text-color: #fff;
  --md-filled-button-pressed-label-text-color: #fff;
  --md-filled-button-icon-color: #fff;
  --md-filled-button-focus-icon-color: #fff;
  --md-filled-button-hover-icon-color: #fff;
  --md-filled-button-pressed-icon-color: #fff;
  --md-filled-button-container-height: 32px;
  --md-focus-ring-color: transparent;
  --md-ripple-hover-color: transparent;
  --md-ripple-hover-opacity: 0;
  --md-ripple-pressed-color: transparent;
  --md-ripple-pressed-opacity: 0;
  outline: 0;
}

.aoi-danmaku-composer__submit:focus-visible {
  outline: 1px solid color-mix(in srgb, var(--aoi-player-accent) 58%, transparent);
  outline-offset: 2px;
}

.aoi-danmaku-composer__settings {
  position: absolute;
  right: 10px;
  bottom: calc(100% + 8px);
  z-index: var(--aoi-z-floating);
  display: grid;
  width: min(328px, calc(100vw - 28px));
  gap: 12px;
  border: 1px solid var(--aoi-player-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-player-surface);
  box-shadow: var(--aoi-shadow-md);
  padding: 12px;
}

.aoi-danmaku-composer__settings-group {
  display: grid;
  gap: 8px;
}

.aoi-danmaku-composer__settings-group > span {
  color: var(--aoi-player-text-muted);
  font-size: 12px;
  font-weight: 760;
}

.aoi-danmaku-composer__mode,
.aoi-danmaku-composer__colors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.aoi-danmaku-composer__choice {
  position: relative;
  overflow: clip;
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--aoi-player-border);
  border-radius: var(--aoi-radius-field);
  background: var(--aoi-player-surface);
  color: var(--aoi-player-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 720;
  padding: 4px 8px;
}

.aoi-danmaku-composer__choice--active {
  border-color: var(--aoi-player-accent);
  background: transparent;
  color: var(--aoi-player-accent);
  box-shadow: none;
}

.aoi-danmaku-composer__color {
  position: relative;
  overflow: clip;
  width: 20px;
  height: 20px;
  border: 2px solid var(--aoi-player-surface);
  border-radius: var(--aoi-radius-round);
  box-shadow: 0 0 0 1px var(--aoi-player-border);
  cursor: pointer;
  padding: 0;
}

.aoi-danmaku-composer__color--active {
  box-shadow:
    0 0 0 2px var(--aoi-player-surface),
    0 0 0 4px var(--aoi-player-accent);
}

.aoi-danmaku-composer button:disabled,
.aoi-danmaku-composer input:disabled {
  cursor: not-allowed;
  opacity: .58;
}

.aoi-danmaku-composer--overlay {
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 0;
  overflow: hidden;
  border: 0;
  border-radius: var(--aoi-radius-round);
  background: rgba(255, 255, 255, .94);
  box-shadow: 0 6px 18px rgba(0, 0, 0, .12);
  color: rgba(23, 38, 43, .72);
  padding: 2px;
}

.aoi-danmaku-composer--overlay .aoi-danmaku-composer__status {
  display: none;
  min-height: 32px;
  border-radius: var(--aoi-radius-round);
  color: rgba(23, 38, 43, .66);
  padding-inline: 8px 6px;
  white-space: nowrap;
}

.aoi-danmaku-composer--overlay .aoi-danmaku-composer__status span {
  color: var(--aoi-player-accent);
}

.aoi-danmaku-composer--overlay .aoi-danmaku-composer__status small {
  color: rgba(23, 38, 43, .5);
}

.aoi-danmaku-composer--overlay .aoi-danmaku-composer__status:hover {
  color: var(--aoi-player-accent);
}

.aoi-danmaku-composer--overlay .aoi-danmaku-composer__field {
  min-height: 32px;
  border: 0;
  border-radius: var(--aoi-radius-round);
  background: transparent;
  box-shadow: none;
  color: rgba(23, 38, 43, .62);
}

.aoi-danmaku-composer--overlay .aoi-danmaku-composer__field:focus-within {
  box-shadow: none;
}

.aoi-danmaku-composer--overlay .aoi-danmaku-composer__field-label {
  color: rgba(23, 38, 43, .68);
  font-weight: 760;
}

.aoi-danmaku-composer--overlay .aoi-danmaku-composer__field input {
  height: 30px;
  color: rgba(23, 38, 43, .92);
}

.aoi-danmaku-composer--overlay .aoi-danmaku-composer__field input::placeholder {
  color: rgba(23, 38, 43, .58);
}

.aoi-danmaku-composer--overlay .aoi-danmaku-composer__settings-button {
  width: 32px;
  height: 32px;
  border-radius: var(--aoi-radius-round);
  color: rgba(23, 38, 43, .58);
}

.aoi-danmaku-composer--overlay .aoi-danmaku-composer__settings-button:hover,
.aoi-danmaku-composer--overlay .aoi-danmaku-composer__settings-button[aria-expanded="true"] {
  color: var(--aoi-player-accent);
  box-shadow: none;
}

.aoi-danmaku-composer--overlay .aoi-danmaku-composer__submit {
  width: 76px;
  min-width: 76px;
  --md-filled-button-container-height: 30px;
  --md-filled-button-container-shape: 999px;
}

.aoi-danmaku-composer--overlay .aoi-danmaku-composer__submit[disabled] {
  border: 0;
  background: color-mix(in srgb, var(--aoi-player-text-muted) 18%, white);
  color: rgba(23, 38, 43, .58);
  opacity: 1;
}

.aoi-danmaku-composer--compact {
  grid-template-columns: minmax(0, 1fr) auto auto;
}

.aoi-danmaku-composer--compact .aoi-danmaku-composer__status,
.aoi-danmaku-composer--compact .aoi-danmaku-composer__field-label {
  display: none;
}

@container (max-width: 760px) {
  .aoi-danmaku-composer {
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 6px;
  }

  .aoi-danmaku-composer__status {
    display: none;
  }

  .aoi-danmaku-composer--overlay .aoi-danmaku-composer__field-label {
    display: inline;
  }
}

@media (max-width: 520px) {
  .aoi-danmaku-composer {
    padding: 7px;
  }

  .aoi-danmaku-composer__field-label {
    display: none;
  }

  .aoi-danmaku-composer__settings-button {
    display: none;
  }

  .aoi-danmaku-composer--overlay .aoi-danmaku-composer__submit {
    width: 36px;
    min-width: 36px;
    max-width: 36px;
    --md-filled-button-leading-space: 8px;
    --md-filled-button-trailing-space: 8px;
    --md-filled-button-with-leading-icon-leading-space: 8px;
    --md-filled-button-with-leading-icon-trailing-space: 8px;
  }

  .aoi-danmaku-composer--overlay .aoi-danmaku-composer__submit-label {
    display: none;
  }
}
</style>
