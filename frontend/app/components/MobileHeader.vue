<script setup lang="ts">
const { t } = useI18n()
const { mobilePrimaryItems, secondaryItems } = useAoiNavigation()

const searchItem = computed(() => mobilePrimaryItems.value.find((item) => item.to === "/search"))
const loginItem = computed(() => secondaryItems.value.find((item) => item.to === "/login"))
</script>

<template>
  <header class="mobile-header">
    <AoiLink class="mobile-header__brand" to="/">
      {{ t("app.name") }}
    </AoiLink>

    <div class="mobile-header__actions">
      <AoiIconButton
        v-if="searchItem"
        :active="searchItem.active"
        :icon="searchItem.icon"
        :label="searchItem.label"
        :to="searchItem.to"
      />
      <AoiIconButton
        v-if="loginItem"
        :active="loginItem.active"
        :icon="loginItem.icon"
        :label="loginItem.label"
        :to="loginItem.to"
      />
    </div>
  </header>
</template>

<style scoped>
.mobile-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: var(--aoi-z-nav);
  display: none;
  height: var(--aoi-mobile-nav-height);
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--aoi-border);
  background: var(--aoi-nav-bg);
  backdrop-filter: blur(var(--aoi-nav-surface-blur));
  padding: 0 var(--aoi-mobile-header-padding-inline);
}

.mobile-header__brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  color: var(--aoi-accent-60);
  font-family: Montserrat, Inter, "Noto Sans SC", system-ui, sans-serif;
  font-size: var(--aoi-mobile-header-brand-size);
  font-weight: 820;
  line-height: 1;
}

.mobile-header__brand:focus-visible {
  border-radius: var(--aoi-radius-control);
}

.mobile-header__actions {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--aoi-bottom-nav-item-gap);
}

@media (max-width: 639px) {
  .mobile-header {
    display: flex;
  }
}
</style>
