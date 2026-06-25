<script setup lang="ts">
import type { AoiSettingsProfile } from "~/lib/aoiSettingsProfiles"

const props = withDefaults(defineProps<{
  activeId?: string
  activeProfileId?: string
  emptyText?: string
  label: string
  profiles: AoiSettingsProfile[]
}>(), {
  activeId: undefined,
  activeProfileId: undefined,
  emptyText: undefined
})

const emit = defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <aside class="settings-profile-list" :aria-label="props.label">
    <button
      v-for="profile in props.profiles"
      :key="profile.id"
      class="settings-profile-list__row"
      :class="{ 'settings-profile-list__row--active': props.activeId === profile.id }"
      type="button"
      @click="emit('select', profile.id)"
    >
      <span>
        <strong>{{ profile.name }}</strong>
        <small>{{ profile.id }}</small>
      </span>
      <AoiIcon
        v-if="props.activeProfileId === profile.id"
        name="check-circle-2"
        :size="17"
        decorative
      />
    </button>
    <p v-if="props.profiles.length === 0 && props.emptyText" class="settings-note">
      {{ props.emptyText }}
    </p>
  </aside>
</template>

<style scoped>
.settings-profile-list {
  display: grid;
  gap: 8px;
}

.settings-profile-list__row {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-card-bg);
  color: var(--aoi-text);
  cursor: pointer;
  font: inherit;
  padding: 10px;
  text-align: start;
  transition:
    border-color var(--aoi-motion-fast) var(--aoi-ease-out),
    background-color var(--aoi-motion-fast) var(--aoi-ease-out);
}

.settings-profile-list__row:hover,
.settings-profile-list__row--active {
  border-color: var(--aoi-state-border-active);
  background: var(--aoi-state-active);
}

.settings-profile-list__row:focus-visible {
  outline: var(--aoi-focus-ring-width) solid var(--aoi-focus);
  outline-offset: var(--aoi-focus-ring-offset);
}

.settings-profile-list__row span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.settings-profile-list__row strong,
.settings-profile-list__row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-profile-list__row small {
  color: var(--aoi-text-muted);
  font-size: 12px;
}
</style>
