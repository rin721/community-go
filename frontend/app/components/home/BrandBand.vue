<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section v-aoi-reveal="'rise'" class="brand-band" aria-labelledby="brand-band-title">
    <div class="brand-band__inner">
      <div class="brand-band__copy">
        <p class="brand-band__eyebrow">Welcome</p>
        <h1 id="brand-band-title" class="brand-band__title">{{ t("app.name") }}</h1>
        <p class="brand-band__subtitle">{{ t("home.subtitle") }}</p>
      </div>
      <div class="brand-band__motif" aria-hidden="true">
        <span>+ + + +</span>
        <span>+ + +</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.brand-band {
  position: relative;
  overflow: visible;
  border: 0;
  background: none;
  box-shadow: none;
}

.brand-band__inner {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(var(--aoi-content-wide-max-width), calc(100% - 10vw));
  max-width: var(--aoi-content-max-width);
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 0 auto;
  border: 0;
  background: none;
  box-shadow: none;
  padding: 26px 0 30px;
  backdrop-filter: none;
}

.brand-band__copy {
  min-width: 0;
  max-width: min(680px, 100%);
}

.brand-band__eyebrow {
  margin: 0 0 10px;
  color: var(--aoi-accent-60);
  font-family: Montserrat, Inter, "Noto Sans SC", system-ui, sans-serif;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
}

.brand-band__title {
  margin: 0;
  color: var(--aoi-accent-60);
  font-family: Montserrat, Inter, "Noto Sans SC", system-ui, sans-serif;
  font-size: 64px;
  font-weight: 800;
  line-height: 1;
  overflow-wrap: anywhere;
}

.brand-band__subtitle {
  max-width: 640px;
  margin: 12px 0 0;
  color: var(--aoi-text-muted);
  line-height: 1.7;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.brand-band__motif {
  display: grid;
  gap: 18px;
  color: color-mix(in srgb, var(--aoi-text) 82%, var(--aoi-accent-60));
  font-family: Montserrat, Inter, system-ui, sans-serif;
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
  opacity: .72;
  text-align: right;
  white-space: nowrap;
}

.brand-band__motif span:nth-child(2) {
  color: var(--aoi-accent-60);
}

@media (max-width: 900px) {
  .brand-band__inner {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 639px) {
  .brand-band__inner {
    width: calc(100% - 24px);
    padding: 18px 0 22px;
  }

  .brand-band__eyebrow {
    font-size: 12px;
  }

  .brand-band__title {
    font-size: 36px;
  }

  .brand-band__subtitle {
    max-width: 100%;
    font-size: 13px;
    line-height: 1.65;
  }

  .brand-band__motif {
    display: none;
  }
}
</style>
