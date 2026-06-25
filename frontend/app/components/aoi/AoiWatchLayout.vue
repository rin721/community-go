<template>
  <div class="aoi-watch-layout">
    <div class="aoi-watch-layout__main">
      <div class="aoi-watch-layout__primary">
        <slot name="primary" />
      </div>
      <div v-if="$slots.below" class="aoi-watch-layout__below">
        <slot name="below" />
      </div>
    </div>
    <aside class="aoi-watch-layout__side">
      <slot name="side" />
    </aside>
  </div>
</template>

<style scoped>
.aoi-watch-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(320px, 28vw, 372px);
  gap: var(--aoi-grid-gap);
  align-items: start;
}

.aoi-watch-layout:has(.aoi-video-player--theater),
.aoi-watch-layout:has(.aoi-danmaku-video-player--theater) {
  grid-template-columns: minmax(0, 1fr) clamp(304px, 24vw, 336px);
}

.aoi-watch-layout__main,
.aoi-watch-layout__primary,
.aoi-watch-layout__side,
.aoi-watch-layout__below {
  min-width: 0;
}

.aoi-watch-layout__main {
  display: grid;
  gap: var(--aoi-grid-gap);
  align-content: start;
}

.aoi-watch-layout__side {
  display: grid;
  gap: 10px;
  min-height: 0;
}

.aoi-watch-layout__below {
  display: grid;
  min-width: 0;
}

@media (max-width: 1100px) {
  .aoi-watch-layout {
    grid-template-columns: 1fr;
  }

  .aoi-watch-layout:has(.aoi-video-player--theater),
  .aoi-watch-layout:has(.aoi-danmaku-video-player--theater) {
    grid-template-columns: 1fr;
  }

  .aoi-watch-layout__side {
    order: 2;
  }
}
</style>
