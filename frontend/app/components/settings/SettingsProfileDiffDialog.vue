<script setup lang="ts">
import type { AoiSettingsProfileDiffItem } from "~/lib/aoiSettingsProfiles"

const props = withDefaults(defineProps<{
  confirmLabel?: string
  confirming?: boolean
  danger?: boolean
  description?: string
  diffs?: AoiSettingsProfileDiffItem[]
  open: boolean
  title?: string
}>(), {
  confirmLabel: "确认",
  confirming: false,
  danger: false,
  description: undefined,
  diffs: () => [],
  title: undefined
})

const emit = defineEmits<{
  cancel: []
  confirm: []
  "update:open": [value: boolean]
}>()

function close() {
  emit("update:open", false)
  emit("cancel")
}
</script>

<template>
  <AoiDialog :open="props.open" @update:open="emit('update:open', $event)">
    <template #headline>
      {{ props.title }}
    </template>

    <div class="settings-profile-diff-dialog">
      <p v-if="props.description">{{ props.description }}</p>
      <div
        v-if="props.diffs.length"
        v-aoi-scroll-native
        class="settings-profile-diff-dialog__list"
      >
        <div
          v-for="item in props.diffs"
          :key="item.field.key"
          class="settings-profile-diff-dialog__row"
          :class="{ 'settings-profile-diff-dialog__row--changed': item.changed }"
        >
          <span>{{ item.field.label }}</span>
          <code>{{ item.before }}</code>
          <AoiIcon name="arrow-right" :size="15" decorative />
          <code>{{ item.after }}</code>
        </div>
      </div>
      <p v-else class="settings-note">
        该操作不修改具体设置字段，但会改变 profile 元数据或可用性。
      </p>
    </div>

    <template #actions>
      <AoiButton
        :disabled="props.confirming"
        @click="close"
      >
        取消
      </AoiButton>
      <AoiButton
        variant="filled"
        :tone="props.danger ? 'danger' : 'accent'"
        :icon="props.danger ? 'trash-2' : 'check'"
        :loading="props.confirming"
        @click="emit('confirm')"
      >
        {{ props.confirmLabel }}
      </AoiButton>
    </template>
  </AoiDialog>
</template>

<style scoped>
.settings-profile-diff-dialog {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.settings-profile-diff-dialog p {
  margin: 0;
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.settings-profile-diff-dialog__list {
  display: grid;
  max-height: min(52vh, 420px);
  gap: 8px;
  overflow: auto;
  padding-right: 2px;
}

.settings-profile-diff-dialog__row {
  display: grid;
  grid-template-columns: minmax(96px, .8fr) minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-card-bg);
  padding: 8px;
}

.settings-profile-diff-dialog__row--changed {
  border-color: color-mix(in srgb, var(--aoi-accent-60) 28%, var(--aoi-border));
}

.settings-profile-diff-dialog__row span {
  color: var(--aoi-text-muted);
  font-weight: 760;
}

.settings-profile-diff-dialog__row code {
  overflow-wrap: anywhere;
  color: var(--aoi-text);
  font-size: 12px;
}

@media (max-width: 639px) {
  .settings-profile-diff-dialog__row {
    grid-template-columns: 1fr;
  }
}
</style>
