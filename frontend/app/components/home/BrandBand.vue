<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section v-aoi-reveal="'rise'" class="brand-band" aria-label="Aoi 品牌区域">
    <div class="brand-band__inner">
      <div>
        <h1 class="brand-band__title">{{ t("app.name") }}</h1>
        <p class="brand-band__subtitle">{{ t("home.subtitle") }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.brand-band {
  position: relative;
  min-height: 150px;
  border-bottom: 1px solid var(--aoi-border);
  overflow: hidden;
  background:
    linear-gradient(110deg, transparent 0 49%, rgba(34, 184, 207, 0.16) 49% 58%, transparent 58%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.92), rgba(233, 251, 253, 0.78));
}

.brand-band::before,
.brand-band::after {
  position: absolute;
  content: "";
  pointer-events: none;
}

.brand-band::before {
  top: 28px;
  right: -42px;
  width: 190px;
  height: 86px;
  border: 2px solid rgba(242, 112, 156, 0.7);
  border-radius: 50%;
  transform: rotate(-16deg);
}

.brand-band::after {
  right: 90px;
  bottom: 22px;
  width: 160px;
  height: 3px;
  background: linear-gradient(90deg, var(--aoi-accent-50), var(--aoi-sakura-50), transparent);
  transform: rotate(-28deg);
  transform-origin: right center;
}

.brand-band__inner {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  max-width: var(--aoi-content-max-width);
  min-height: 150px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 0 auto;
  padding: 22px 5vw;
}

.brand-band__title {
  margin: 0;
  color: var(--aoi-accent-60);
  font-family: Montserrat, Inter, "Noto Sans SC", system-ui, sans-serif;
  font-size: 56px;
  font-weight: 800;
  line-height: 1;
}

.brand-band__subtitle {
  max-width: 560px;
  margin: 12px 0 0;
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

@media (max-width: 900px) {
  .brand-band__inner {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 639px) {
  .brand-band {
    display: none;
  }
}
</style>
