<script setup lang="ts">
const shortcutGroups = [
  {
    title: "播放页",
    items: [
      { keys: ["Space"], label: "播放 / 暂停" },
      { keys: ["Esc"], label: "退出全屏" },
      { keys: ["F", "F11"], label: "全屏" },
      { keys: ["M"], label: "静音" },
      { keys: ["↑", "↓"], label: "音量" },
      { keys: ["←", "→"], label: "快退 / 快进" }
    ]
  },
  {
    title: "评论区",
    items: [
      { keys: ["Ctrl", "Enter"], label: "发送评论" },
      { keys: ["Ctrl", "B"], label: "加粗" },
      { keys: ["Ctrl", "I"], label: "倾斜" },
      { keys: ["Ctrl", "U"], label: "下划线" }
    ]
  }
]
</script>

<template>
  <div class="settings-page">
    <SettingsPageHeader
      title="快捷键"
      description="当前项目可用或计划保留的键盘操作指南。"
    />

    <SettingsPanel
      v-for="group in shortcutGroups"
      :key="group.title"
      icon="keyboard"
      :title="group.title"
    >
      <div class="settings-shortcut-list">
        <div
          v-for="item in group.items"
          :key="`${group.title}-${item.label}`"
          class="settings-shortcut-item"
        >
          <span>{{ item.label }}</span>
          <kbd v-for="key in item.keys" :key="key">{{ key }}</kbd>
        </div>
      </div>
    </SettingsPanel>
  </div>
</template>

<style scoped>
.settings-shortcut-list {
  display: grid;
  gap: 10px;
}

.settings-shortcut-item {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-card-bg);
  padding: 9px 11px;
}

.settings-shortcut-item span {
  margin-right: auto;
  color: var(--aoi-text);
  font-weight: 720;
}

.settings-shortcut-item kbd {
  min-width: 28px;
  border: 1px solid color-mix(in srgb, var(--aoi-accent-60) 18%, var(--aoi-border));
  border-radius: var(--aoi-radius-xs);
  background: var(--aoi-surface-solid);
  color: var(--aoi-accent-60);
  font-family: inherit;
  font-size: 12px;
  font-weight: 820;
  padding: 4px 7px;
  text-align: center;
}
</style>
