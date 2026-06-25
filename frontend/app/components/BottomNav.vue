<script setup lang="ts">
const { mobilePrimaryItems } = useAoiNavigation()
</script>

<template>
  <nav class="bottom-nav" aria-label="移动端主导航">
    <AoiLink
      v-for="item in mobilePrimaryItems"
      :key="item.to"
      class="bottom-nav__item"
      :class="{ 'bottom-nav__item--active': item.active }"
      :to="item.to"
      :aria-current="item.active ? 'page' : undefined"
      :aria-label="item.label"
    >
      <span class="bottom-nav__icon-wrap" aria-hidden="true">
        <AoiIcon :name="item.icon" size="var(--aoi-bottom-nav-icon-size)" decorative />
      </span>
      <span class="bottom-nav__label">{{ item.label }}</span>
    </AoiLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  inset: auto 0 0;
  z-index: var(--aoi-z-nav);
  display: none;
  height: var(--aoi-mobile-nav-height);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--aoi-border);
  background: var(--aoi-nav-bg);
  backdrop-filter: blur(var(--aoi-nav-surface-blur));
  padding: var(--aoi-bottom-nav-padding);
}

.bottom-nav__item {
  display: grid;
  min-width: 0;
  place-items: center;
  border-radius: var(--aoi-radius-nav-indicator);
  color: var(--aoi-icon);
  font-size: var(--aoi-bottom-nav-label-size);
  font-weight: 700;
  gap: var(--aoi-bottom-nav-item-gap);
  line-height: 1;
  transform: translate3d(0, 0, 0);
  transition:
    background var(--aoi-motion-fast) var(--aoi-ease-out),
    color var(--aoi-motion-fast) var(--aoi-ease-out),
    transform var(--aoi-motion-fast) var(--aoi-ease-press);
  will-change: transform;
}

.bottom-nav__item:hover,
.bottom-nav__item:focus-visible {
  background: var(--aoi-nav-hover-bg);
  color: var(--aoi-text);
}

.bottom-nav__item:active {
  background: var(--aoi-nav-pressed-bg);
  color: var(--aoi-nav-active-color);
  transform: translate3d(0, 0, 0) scale(.96);
}

.bottom-nav__item--active {
  border-radius: var(--aoi-radius-nav-indicator);
  background: var(--aoi-nav-active-bg);
  color: var(--aoi-nav-active-color);
}

.bottom-nav__icon-wrap {
  display: inline-grid;
  min-height: var(--aoi-bottom-nav-icon-min-height);
  place-items: center;
}

.bottom-nav__label {
  display: block;
  max-width: 100%;
  overflow: hidden;
  padding: 0 var(--aoi-bottom-nav-label-padding-inline);
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 639px) {
  .bottom-nav {
    display: grid;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bottom-nav__item {
    transition-duration: 1ms;
    will-change: auto;
  }
}
</style>
