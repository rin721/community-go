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
  gap: 10px;
  align-items: start;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-surface);
  box-shadow: var(--aoi-shadow-sm);
  backdrop-filter: blur(16px);
  margin: 2px 0 18px;
  padding: 14px 16px;
}

.notice__icon {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-accent-10);
  color: var(--aoi-accent-60);
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
    margin-bottom: 16px;
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
