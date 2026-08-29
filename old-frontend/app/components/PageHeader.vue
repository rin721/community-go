<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow?: string
  title: string
  description?: string | null
  icon?: string
}>(), {
  description: undefined,
  eyebrow: undefined,
  icon: undefined
})
</script>

<template>
  <header v-aoi-reveal="'rise'" class="page-header">
    <div v-if="icon" class="page-header__icon" aria-hidden="true">
      <AoiIcon :name="icon" :size="22" decorative />
    </div>
    <div class="page-header__copy">
      <p v-if="eyebrow" class="page-header__eyebrow">{{ eyebrow }}</p>
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="description" class="page-header__description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin: 0 0 18px;
}

.page-header__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: var(--aoi-radius-sm);
  background:
    radial-gradient(circle at 36% 30%, color-mix(in srgb, var(--aoi-active-color) 18%, transparent), transparent 58%),
    color-mix(in srgb, var(--aoi-accent-10) 78%, transparent);
  color: var(--aoi-accent-60);
  flex: 0 0 auto;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--aoi-active-color) 10%, transparent);
}

.page-header__copy {
  min-width: 0;
  flex: 1;
}

.page-header__eyebrow {
  margin: 0 0 4px;
  color: var(--aoi-active-color);
  font-size: 12px;
  font-weight: 800;
}

.page-header__title {
  margin: 0;
  color: var(--aoi-text);
  font-size: 28px;
  line-height: 1.2;
}

.page-header__description {
  max-width: 720px;
  margin: 8px 0 0;
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.page-header__actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 639px) {
  .page-header {
    gap: 10px;
  }

  .page-header__title {
    font-size: 22px;
  }

  .page-header__actions {
    display: none;
  }
}
</style>
