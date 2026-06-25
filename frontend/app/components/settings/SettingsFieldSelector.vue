<script setup lang="ts">
import type { AoiSettingsProfileField } from "~/lib/aoiSettingsProfiles"

interface SettingsFieldGroup {
  fields: AoiSettingsProfileField[]
  name: string
}

const props = defineProps<{
  groups: SettingsFieldGroup[]
  modelValue: string[]
  summary: string
}>()

const emit = defineEmits<{
  clear: []
  selectAll: []
  "update:modelValue": [value: string[]]
}>()

function toggleField(key: string, selected: boolean) {
  const fields = new Set(props.modelValue)

  if (selected) {
    fields.add(key)
  } else {
    fields.delete(key)
  }

  emit("update:modelValue", Array.from(fields))
}

function fieldLabel(field: AoiSettingsProfileField) {
  const depth = field.depth === "all" ? "全部" : "基础"

  return `${field.label} · ${depth} · ${field.path}`
}
</script>

<template>
  <div class="settings-field-selector">
    <div class="settings-field-selector__toolbar">
      <div>
        <strong>字段选择器</strong>
        <span>{{ props.modelValue.length }} 项 · {{ props.summary }}</span>
      </div>
      <AoiActionBar size="sm" align="end">
        <AoiButton size="sm" icon="list-checks" @click="emit('selectAll')">
          全选
        </AoiButton>
        <AoiButton size="sm" icon="eraser" @click="emit('clear')">
          清空
        </AoiButton>
      </AoiActionBar>
    </div>

    <div v-aoi-scroll-native class="settings-field-selector__grid">
      <section
        v-for="group in props.groups"
        :key="group.name"
        class="settings-field-selector__group"
      >
        <h3>{{ group.name }}</h3>
        <AoiCheckbox
          v-for="field in group.fields"
          :key="field.key"
          :model-value="props.modelValue.includes(field.key)"
          :label="fieldLabel(field)"
          @update:model-value="(value) => toggleField(field.key, value)"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-field-selector {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.settings-field-selector__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--aoi-grid-gap-compact);
  align-items: center;
  justify-content: space-between;
}

.settings-field-selector__toolbar > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.settings-field-selector__toolbar span {
  color: var(--aoi-text-muted);
  line-height: 1.6;
}

.settings-field-selector__grid {
  display: grid;
  max-height: 300px;
  gap: var(--aoi-grid-gap-compact);
  overflow: auto;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-card-bg);
  padding: var(--aoi-card-padding);
}

.settings-field-selector__group {
  display: grid;
  gap: 6px;
}

.settings-field-selector__group h3 {
  margin: 0;
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 800;
}
</style>
