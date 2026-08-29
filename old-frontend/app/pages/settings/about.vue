<script setup lang="ts">
const techStack = [
  { description: "Vue framework for the Aoi frontend", href: "https://nuxt.com/", label: "Nuxt 4" },
  { description: "Composition API and component runtime", href: "https://vuejs.org/", label: "Vue 3" },
  { description: "Typed application source", href: "https://www.typescriptlang.org/", label: "TypeScript" },
  { description: "Local client stores", href: "https://pinia.vuejs.org/", label: "Pinia" },
  { description: "Wrapped through local Aoi components", href: "https://material-web.dev/", label: "Material Web" }
]
</script>

<template>
  <div class="settings-page">
    <SettingsPageHeader
      title="关于"
      description="Aoi 是一个轻量视频社区，围绕投稿发现、创作者关注、弹幕讨论和个人资料库展开。"
    />

    <SettingsPanel
      icon="sparkles"
      title="Aoi Web"
      description="一个用于打磨视频社区信息架构、播放体验、上传草稿和本地互动的 Nuxt 4 原型。"
    >
      <div class="settings-about-hero">
        <div class="settings-about-logo">
          <strong>Aoi</strong>
          <span class="settings-about-logo__glint" aria-hidden="true" />
        </div>
        <span>Nuxt 4 · Community Flow · Aoi Design System</span>
      </div>
    </SettingsPanel>

    <SettingsPanel
      icon="blocks"
      title="使用技术"
      description="项目依赖保持轻量，Material Web 通过 Aoi wrapper 暴露。"
    >
      <div class="settings-link-list">
        <AoiLink
          v-for="item in techStack"
          :key="item.href"
          class="settings-link-card"
          external
          target="_blank"
          :to="item.href"
        >
          <strong>{{ item.label }}</strong>
          <span>{{ item.description }}</span>
          <AoiIcon name="external-link" :size="16" decorative />
        </AoiLink>
      </div>
    </SettingsPanel>
  </div>
</template>

<style scoped>
.settings-about-hero {
  position: relative;
  display: grid;
  min-height: 160px;
  align-content: end;
  gap: 8px;
  overflow: hidden;
  border-radius: var(--aoi-radius-md);
  background:
    radial-gradient(circle at 84% 26%, color-mix(in srgb, var(--aoi-sakura-50) 46%, transparent), transparent 26%),
    linear-gradient(135deg, var(--aoi-accent-20), var(--aoi-accent-50) 52%, var(--aoi-secondary-50));
  color: white;
  padding: 20px;
}

.settings-about-logo {
  position: relative;
  justify-self: start;
  width: fit-content;
  color: inherit;
}

.settings-about-logo::before {
  position: absolute;
  inset: -12px -16px;
  border-radius: var(--aoi-radius-round);
  background: radial-gradient(circle, rgba(255, 255, 255, .34), transparent 64%);
  content: "";
  opacity: 0;
  transform: scale(.86);
  transition:
    opacity var(--aoi-motion-normal) var(--aoi-ease-out),
    transform var(--aoi-motion-normal) var(--aoi-ease-out);
}

.settings-about-logo:hover::before,
.settings-about-logo:focus-within::before {
  opacity: .72;
  transform: scale(1);
}

.settings-about-logo__glint {
  position: absolute;
  inset: -4px -12px;
  overflow: hidden;
  border-radius: var(--aoi-radius-round);
  pointer-events: none;
}

.settings-about-logo__glint::after {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -36%;
  width: 28%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, .86), transparent);
  content: "";
  transform: skewX(-18deg);
}

.settings-about-logo:hover .settings-about-logo__glint::after {
  animation: settings-about-glint 560ms var(--aoi-ease-out);
}

.settings-about-logo strong {
  position: relative;
  display: inline-block;
  font-size: 38px;
  line-height: 1;
  text-shadow: 0 0 24px rgba(255, 255, 255, .38);
}

.settings-about-hero > span {
  font-weight: 760;
}

@keyframes settings-about-glint {
  from {
    transform: translateX(0) skewX(-18deg);
  }

  to {
    transform: translateX(520%) skewX(-18deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-about-logo::before {
    transition: none;
  }

  .settings-about-logo:hover .settings-about-logo__glint::after {
    animation: none;
  }
}

.settings-link-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}

.settings-link-card {
  display: grid;
  min-height: 104px;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px 10px;
  align-content: start;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-md);
  background: var(--aoi-card-bg);
  padding: 14px;
  transition:
    background var(--aoi-motion-fast) var(--aoi-ease-out),
    color var(--aoi-motion-fast) var(--aoi-ease-out),
    transform var(--aoi-motion-fast) var(--aoi-ease-press);
}

.settings-link-card:hover {
  background: var(--aoi-state-hover);
  color: var(--aoi-accent-60);
}

.settings-link-card:active {
  transform: scale(.98);
}

.settings-link-card strong {
  font-weight: 840;
}

.settings-link-card span {
  grid-column: 1 / -1;
  color: var(--aoi-text-muted);
  line-height: 1.55;
}
</style>
