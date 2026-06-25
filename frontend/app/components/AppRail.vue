<script setup lang="ts">
const { desktopPrimaryItems, secondaryItems } = useAoiNavigation()
</script>

<template>
  <nav class="app-rail" aria-label="桌面主导航">
    <div class="app-rail__group">
      <span
        v-for="item in desktopPrimaryItems"
        :key="item.to"
        class="app-rail__item"
        :class="{ 'app-rail__item--active': item.active }"
      >
        <AoiIconButton
          class="app-rail__button"
          :active="item.active"
          :aria-current="item.active ? 'page' : undefined"
          :icon="item.icon"
          :label="item.label"
          :to="item.to"
          :tone="item.active ? 'accent' : 'muted'"
          variant="plain"
        />

        <span class="app-rail__label" aria-hidden="true">{{ item.label }}</span>
      </span>
    </div>

    <div class="app-rail__group">
      <span
        v-for="item in secondaryItems"
        :key="item.to"
        class="app-rail__item"
        :class="{ 'app-rail__item--active': item.active }"
      >
        <AoiIconButton
          class="app-rail__button"
          :active="item.active"
          :aria-current="item.active ? 'page' : undefined"
          :icon="item.icon"
          :label="item.label"
          :to="item.to"
          :tone="item.active ? 'accent' : 'muted'"
          variant="plain"
        />
        <span class="app-rail__label" aria-hidden="true">{{ item.label }}</span>
      </span>
    </div>
  </nav>
</template>

<style scoped>
.app-rail {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: var(--aoi-z-nav);
  display: flex;
  width: var(--aoi-rail-width);
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  border-right: 1px solid var(--aoi-border);
  background: var(--aoi-nav-bg);
  box-shadow: 10px 0 28px rgba(19, 80, 96, 0.08);
  backdrop-filter: blur(var(--aoi-nav-surface-blur));
  padding: var(--aoi-nav-rail-padding-block) 0;
}

.app-rail__group {
  display: flex;
  flex-direction: column;
  gap: var(--aoi-nav-group-gap);
}

.app-rail__item {
  position: relative;
  display: grid;
  width: var(--aoi-nav-action-size);
  height: var(--aoi-nav-action-size);
  place-items: center;
  border-radius: var(--aoi-radius-nav-indicator);
  color: var(--aoi-icon);
  transform: translate3d(0, 0, 0);
  transition: color var(--aoi-action-motion-fast) var(--aoi-ease-out);
}

.app-rail__item::after {
  position: absolute;
  top: 50%;
  right: calc((var(--aoi-nav-action-size) - var(--aoi-rail-width)) / 2);
  display: block;
  width: 3px;
  height: 18px;
  border-radius: var(--aoi-radius-round) 0 0 var(--aoi-radius-round);
  background: var(--aoi-active-color);
  content: "";
  opacity: 0;
  pointer-events: none;
  transform: translate3d(0, -50%, 0) scale(1, 1);
  transform-origin: center;
  transition:
    opacity var(--aoi-action-motion-fast) var(--aoi-ease-out),
    transform var(--aoi-action-motion-base) var(--aoi-ease-out);
}

.app-rail__item:hover,
.app-rail__item:focus-within {
  color: var(--aoi-text);
}

.app-rail__item:active {
  color: var(--aoi-nav-active-color);
}

.app-rail__item--active {
  color: var(--aoi-nav-active-color);
}

.app-rail__item--active::after {
  opacity: 1;
}

.app-rail__item--active:active::after {
  transform: translate3d(0, -50%, 0) scale(1, .625);
}

.app-rail__button {
  width: var(--aoi-nav-action-size);
  height: var(--aoi-nav-action-size);
}

.app-rail__button {
  color: inherit;
}

.app-rail__item :deep(.app-rail__button.aoi-icon-button) {
  --aoi-icon-action-size: var(--aoi-nav-action-size);
  --md-icon-button-icon-size: var(--aoi-nav-icon-size);
  --md-icon-button-state-layer-size: var(--aoi-nav-action-size);
  border-radius: var(--aoi-radius-nav-indicator);
}

.app-rail__label {
  position: absolute;
  left: calc(100% + var(--aoi-nav-group-gap));
  top: 50%;
  z-index: var(--aoi-z-floating);
  display: inline-flex;
  min-height: calc(var(--aoi-control-height-sm) - 4px);
  align-items: center;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-control);
  background: var(--aoi-surface-solid);
  box-shadow: var(--aoi-shadow-sm);
  color: var(--aoi-text);
  font-size: .78rem;
  font-weight: 760;
  line-height: 1;
  opacity: 0;
  padding: 0 var(--aoi-nav-group-gap);
  pointer-events: none;
  transform: translate3d(calc(var(--aoi-nav-group-gap) * -.6), -50%, 0) scale(.96);
  transform-origin: left center;
  transition:
    opacity var(--aoi-action-motion-base) var(--aoi-ease-out),
    transform var(--aoi-action-motion-base) var(--aoi-ease-out);
  white-space: nowrap;
}

.app-rail__item:hover .app-rail__label,
.app-rail__item:focus-within .app-rail__label {
  opacity: 1;
  transform: translate3d(0, -50%, 0) scale(1);
}

@media (max-width: 639px) {
  .app-rail {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {

  .app-rail__item,
  .app-rail__label {
    transition-duration: 1ms;
  }

  .app-rail__item {
    will-change: auto;
  }
}
</style>
