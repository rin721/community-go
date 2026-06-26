<script setup lang="ts">
import type { Announcement } from "~/types/api"

defineProps<{
  announcement: Announcement | null
}>()
</script>

<template>
  <section v-if="announcement" v-aoi-reveal="'rise'" class="notice" aria-labelledby="notice-title">
    <div class="notice__icon" aria-hidden="true">
      <AoiIcon name="info" :size="16" decorative />
    </div>
    <div>
      <h2 id="notice-title" class="notice__title">{{ announcement.title }}</h2>
      <p class="notice__body">
        <AoiLink v-if="announcement.href" :to="announcement.href">{{ announcement.body }}</AoiLink>
        <template v-else>{{ announcement.body }}</template>
      </p>
    </div>
  </section>
</template>

<style scoped>
.notice {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  border: 0;
  border-radius: var(--aoi-radius-container);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--aoi-active-color) 4%, transparent), transparent 42%),
    color-mix(in srgb, var(--aoi-surface-solid) 28%, transparent);
  box-shadow: 0 14px 36px rgba(33, 33, 33, 0.035);
  backdrop-filter: blur(8px);
  margin: 0 0 18px;
  padding: 13px 16px;
}

.notice__icon {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: var(--aoi-radius-sm);
  background: color-mix(in srgb, var(--aoi-active-color) 10%, transparent);
  color: var(--aoi-active-color);
}

.notice__title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 750;
}

.notice__body {
  margin: 0;
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.notice__body a {
  color: var(--aoi-accent-60);
  font-weight: 650;
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 639px) {
  .notice {
    grid-template-columns: 26px minmax(0, 1fr);
    width: 100%;
    margin-bottom: 14px;
    padding: 12px;
  }

  .notice__title {
    font-size: 15px;
  }

  .notice__body {
    display: -webkit-box;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }
}
</style>
