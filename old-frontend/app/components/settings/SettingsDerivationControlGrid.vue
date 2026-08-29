<script setup lang="ts">
import {
  AOI_SETTING_DERIVATION_STRENGTH_RANGE
} from "~/utils/aoiSettingDerivation"

export interface SettingsDerivationControlItem {
  description: string
  disabled?: boolean
  key: string
  label: string
  title: string
  value: number
}

const props = withDefaults(defineProps<{
  controls: SettingsDerivationControlItem[]
  suffix?: string
}>(), {
  suffix: "%"
})

const emit = defineEmits<{
  update: [key: string, value: number]
}>()
</script>

<template>
  <div class="settings-derivation-control-grid">
    <SettingsRow
      v-for="control in props.controls"
      :key="control.key"
      :title="control.title"
      :description="control.description"
    >
      <div class="settings-derivation-control">
        <AoiSlider
          class="settings-derivation-control__slider"
          :model-value="control.value"
          :label="control.label"
          :min="AOI_SETTING_DERIVATION_STRENGTH_RANGE.min"
          :max="AOI_SETTING_DERIVATION_STRENGTH_RANGE.max"
          :step="AOI_SETTING_DERIVATION_STRENGTH_RANGE.step"
          :disabled="control.disabled"
          @update:model-value="(value) => emit('update', control.key, value)"
        />
        <span class="settings-derivation-control__value">
          {{ control.value }}{{ props.suffix }}
        </span>
      </div>
    </SettingsRow>
  </div>
</template>

<style scoped>
.settings-derivation-control-grid {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.settings-derivation-control {
  display: grid;
  width: min(calc(var(--aoi-settings-card-min-width) * 1.88), 100%);
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--aoi-grid-gap-compact);
  align-items: end;
}

.settings-derivation-control__slider {
  min-width: 0;
}

.settings-derivation-control__value {
  min-width: 48px;
  padding-bottom: 6px;
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 720;
  text-align: right;
}

@media (max-width: 760px) {
  .settings-derivation-control {
    grid-template-columns: 1fr;
  }

  .settings-derivation-control__value {
    padding-bottom: 0;
    text-align: left;
  }
}
</style>
