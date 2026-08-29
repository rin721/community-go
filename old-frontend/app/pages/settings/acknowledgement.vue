<script setup lang="ts">
const links = [
  { description: "Nuxt documentation and community examples.", href: "https://nuxt.com/", label: "Nuxt" },
  { description: "Material Web components wrapped by Aoi.", href: "https://material-web.dev/", label: "Material Web" },
  { description: "Icon set used through @nuxt/icon.", href: "https://lucide.dev/", label: "Lucide" },
  { description: "Inspiration for the settings information architecture.", href: "https://kirakira.moe/settings/appearance", label: "KIRAKIRA Settings" }
]
</script>

<template>
  <div class="settings-page">
    <SettingsPageHeader
      title="鸣谢"
      description="感谢这些工具、设计参考和开源生态让 Aoi 的原型速度飞起来。"
    />

    <SettingsPanel
      icon="heart-handshake"
      title="友情链接"
      description="这些链接会在新标签页打开。"
    >
      <div class="settings-link-list">
        <AoiLink
          v-for="item in links"
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
