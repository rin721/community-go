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
  min-height: 172px;
  overflow: hidden;
  border-bottom: 1px solid var(--aoi-surface-border);
  background: color-mix(in srgb, var(--aoi-surface-solid) 82%, transparent);
}

.brand-band::before {
  position: absolute;
  inset: 18px 5vw;
  border-radius: var(--aoi-radius-card);
  background:
    radial-gradient(circle at 8% 16%, color-mix(in srgb, var(--aoi-accent-10) 64%, transparent), transparent 36%),
    radial-gradient(circle at 88% 72%, color-mix(in srgb, var(--aoi-sakura-10) 74%, transparent), transparent 38%);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--aoi-surface-solid) 68%, transparent);
  content: "";
  opacity: .72;
  pointer-events: none;
}

.brand-band::after {
  position: absolute;
  right: 5vw;
  bottom: 17px;
  left: 5vw;
  height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--aoi-accent-60) 18%, transparent), transparent);
  content: "";
  opacity: .42;
  pointer-events: none;
}

.brand-band__inner {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  max-width: var(--aoi-content-max-width);
  min-height: 172px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 0 auto;
  padding: 28px 5vw 34px;
}

.brand-band__copy {
  min-width: 0;
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
  max-width: 620px;
  margin: 12px 0 0;
  color: var(--aoi-text-muted);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.brand-band__motif {
  display: grid;
  gap: 18px;
  color: color-mix(in srgb, var(--aoi-text) 82%, var(--aoi-accent-60));
  font-family: Montserrat, Inter, system-ui, sans-serif;
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
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
  .brand-band {
    min-height: 138px;
  }

  .brand-band::before {
    inset: 12px;
  }

  .brand-band::after {
    right: 12px;
    left: 12px;
  }

  .brand-band__inner {
    min-height: 138px;
    padding: 20px 16px 26px;
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
