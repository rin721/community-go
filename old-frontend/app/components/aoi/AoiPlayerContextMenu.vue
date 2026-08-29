<script setup lang="ts">
export interface AoiPlayerContextMenuItem {
  value: string
  label: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  checked?: boolean
  children?: AoiPlayerContextMenuItem[]
}

export interface AoiPlayerContextMenuGroup {
  label: string
  items: AoiPlayerContextMenuItem[]
}

const props = withDefaults(defineProps<{
  open?: boolean
  x?: number
  y?: number
  groups?: AoiPlayerContextMenuGroup[]
}>(), {
  open: false,
  x: 0,
  y: 0,
  groups: () => []
})

const emit = defineEmits<{
  "update:open": [value: boolean]
  select: [value: string]
}>()

const menuRef = ref<HTMLElement | null>(null)
const activeSubmenu = ref("")
const estimatedWidth = 292
const estimatedHeight = 560
const measuredSize = ref({
  width: estimatedWidth,
  height: estimatedHeight
})
const { t } = useI18n()

const layer = useAoiLayer("menu", computed(() => props.open))
const submenuOnLeft = computed(() => import.meta.client && props.x > window.innerWidth - measuredSize.value.width * 2)
const menuStyle = computed(() => {
  if (!import.meta.client) {
    return layer.style.value
  }

  const left = Math.max(8, Math.min(props.x, window.innerWidth - measuredSize.value.width - 8))
  const top = Math.max(8, Math.min(props.y, window.innerHeight - measuredSize.value.height - 8))

  return {
    ...layer.style.value,
    left: `${left}px`,
    top: `${top}px`
  }
})

async function measureMenu() {
  await nextTick()
  if (!menuRef.value) {
    return
  }

  const rect = menuRef.value.getBoundingClientRect()
  measuredSize.value = {
    width: Math.max(estimatedWidth, rect.width),
    height: Math.max(estimatedHeight, rect.height)
  }
}

watch(() => props.open, (value) => {
  if (!value) {
    activeSubmenu.value = ""
    measuredSize.value = {
      width: estimatedWidth,
      height: estimatedHeight
    }
    return
  }

  void measureMenu()
})

watch(() => props.groups, () => {
  if (props.open) {
    void measureMenu()
  }
}, { deep: true })

function close() {
  emit("update:open", false)
}

function select(item: AoiPlayerContextMenuItem) {
  if (item.disabled || item.children?.length) {
    return
  }

  emit("select", item.value)
  close()
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!props.open || menuRef.value?.contains(event.target as Node)) {
    return
  }

  close()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (!props.open || event.key !== "Escape") {
    return
  }

  event.preventDefault()
  close()
}

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown, true)
  document.addEventListener("keydown", onDocumentKeydown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, true)
  document.removeEventListener("keydown", onDocumentKeydown, true)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="menuRef"
      class="aoi-player-context-menu"
      :class="{ 'aoi-player-context-menu--submenu-left': submenuOnLeft }"
      :style="menuStyle"
      role="menu"
      :aria-label="t('player.contextMenu')"
      @click.stop
      @contextmenu.prevent.stop
    >
      <section
        v-for="group in groups"
        :key="group.label"
        class="aoi-player-context-menu__group"
        :aria-label="group.label"
      >
        <p class="aoi-player-context-menu__group-label">{{ group.label }}</p>
        <div
          v-for="item in group.items"
          :key="item.value"
          class="aoi-player-context-menu__item-shell"
          :class="{
            'aoi-player-context-menu__item-shell--checked': item.checked,
            'aoi-player-context-menu__item-shell--disabled': item.disabled,
            'aoi-player-context-menu__item-shell--parent': item.children?.length
          }"
          @mouseenter="activeSubmenu = item.value"
        >
          <button
            class="aoi-player-context-menu__item"
            type="button"
            role="menuitem"
            :aria-disabled="item.disabled || undefined"
            :aria-haspopup="item.children?.length ? 'menu' : undefined"
            :aria-expanded="item.children?.length ? activeSubmenu === item.value : undefined"
            :data-value="item.value"
            :disabled="item.disabled || undefined"
            @click="select(item)"
            @focus="activeSubmenu = item.value"
          >
            <AoiRipple v-if="!item.disabled" />
            <span class="aoi-player-context-menu__item-icon">
              <AoiIcon
                v-if="item.checked"
                name="check"
                :size="15"
                decorative
              />
              <AoiIcon
                v-else-if="item.icon"
                :name="item.icon"
                :size="15"
                decorative
              />
            </span>
            <span class="aoi-player-context-menu__item-label">{{ item.label }}</span>
            <kbd v-if="item.shortcut" class="aoi-player-context-menu__shortcut">{{ item.shortcut }}</kbd>
            <AoiIcon
              v-if="item.children?.length"
              class="aoi-player-context-menu__chevron"
              name="chevron-right"
              :size="15"
              decorative
            />
          </button>

          <div
            v-if="item.children?.length && activeSubmenu === item.value"
            class="aoi-player-context-menu__submenu"
            role="menu"
            :aria-label="item.label"
          >
            <button
              v-for="child in item.children"
              :key="child.value"
              class="aoi-player-context-menu__item"
              :class="{
                'aoi-player-context-menu__item--checked': child.checked,
                'aoi-player-context-menu__item--disabled': child.disabled
              }"
              type="button"
              role="menuitem"
              :aria-disabled="child.disabled || undefined"
              :data-value="child.value"
              :disabled="child.disabled || undefined"
              @click.stop="select(child)"
            >
              <AoiRipple v-if="!child.disabled" />
              <span class="aoi-player-context-menu__item-icon">
                <AoiIcon
                  v-if="child.checked"
                  name="check"
                  :size="15"
                  decorative
                />
                <AoiIcon
                  v-else-if="child.icon"
                  :name="child.icon"
                  :size="15"
                  decorative
                />
              </span>
              <span class="aoi-player-context-menu__item-label">{{ child.label }}</span>
              <kbd v-if="child.shortcut" class="aoi-player-context-menu__shortcut">{{ child.shortcut }}</kbd>
            </button>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.aoi-player-context-menu {
  position: fixed;
  z-index: var(--aoi-z-menu);
  display: grid;
  width: min(292px, calc(100vw - 16px));
  overflow: visible;
  border: 1px solid color-mix(in srgb, var(--aoi-player-border) 76%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--aoi-player-surface) 94%, transparent);
  box-shadow: 0 18px 48px rgba(0, 0, 0, .28);
  color: var(--aoi-player-text);
  padding: 6px;
  backdrop-filter: blur(18px);
}

.aoi-player-context-menu__group {
  display: grid;
  gap: 1px;
}

.aoi-player-context-menu__group + .aoi-player-context-menu__group {
  margin-top: 4px;
  border-top: 1px solid color-mix(in srgb, var(--aoi-player-border) 70%, transparent);
  padding-top: 4px;
}

.aoi-player-context-menu__group-label {
  margin: 0;
  color: var(--aoi-player-text-muted);
  font-size: 10.5px;
  font-weight: 720;
  line-height: 16px;
  padding-inline: 7px;
}

.aoi-player-context-menu__item-shell {
  position: relative;
  display: grid;
}

.aoi-player-context-menu__item {
  position: relative;
  overflow: clip;
  display: grid;
  min-height: 28px;
  grid-template-columns: 20px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 11.5px;
  font-weight: 650;
  padding: 0 7px;
  text-align: left;
}

.aoi-player-context-menu__item:hover,
.aoi-player-context-menu__item:focus-visible {
  outline: 0;
  background: color-mix(in srgb, var(--aoi-player-text) 8%, transparent);
}

.aoi-player-context-menu__item:active {
  background: color-mix(in srgb, var(--aoi-player-text) 8%, transparent);
}

.aoi-player-context-menu__item-shell--checked .aoi-player-context-menu__item {
  color: var(--aoi-player-accent);
}

.aoi-player-context-menu__item-shell--disabled .aoi-player-context-menu__item {
  color: var(--aoi-player-text-muted);
  cursor: default;
  opacity: .62;
}

.aoi-player-context-menu__item-shell--disabled .aoi-player-context-menu__item:hover,
.aoi-player-context-menu__item-shell--disabled .aoi-player-context-menu__item:focus-visible {
  background: transparent;
}

.aoi-player-context-menu__item-icon {
  display: grid;
  width: 20px;
  place-items: center;
}

.aoi-player-context-menu__item-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aoi-player-context-menu__shortcut {
  border: 0;
  background: transparent;
  color: var(--aoi-player-text-muted);
  font: inherit;
  font-size: 10.5px;
}

.aoi-player-context-menu__chevron {
  color: var(--aoi-player-text-muted);
}

.aoi-player-context-menu__submenu {
  position: absolute;
  top: -8px;
  left: calc(100% + 8px);
  display: grid;
  width: min(248px, calc(100vw - 16px));
  border: 1px solid color-mix(in srgb, var(--aoi-player-border) 76%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--aoi-player-surface) 96%, transparent);
  box-shadow: 0 18px 48px rgba(0, 0, 0, .24);
  padding: 6px;
  backdrop-filter: blur(18px);
}

.aoi-player-context-menu--submenu-left .aoi-player-context-menu__submenu {
  right: calc(100% + 8px);
  left: auto;
}

@media (prefers-reduced-motion: reduce) {
  .aoi-player-context-menu,
  .aoi-player-context-menu__submenu {
    backdrop-filter: none;
  }
}
</style>
