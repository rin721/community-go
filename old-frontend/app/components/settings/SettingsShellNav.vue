<script setup lang="ts">
interface SettingsShellItem {
  depth: "basic" | "all"
  icon: string
  label: string
  to: string
}

interface SettingsShellGroup {
  items: SettingsShellItem[]
  label: string
}

const props = defineProps<{
  activePath: string
  description: string
  depthItems: Array<{
    description?: string
    icon?: string
    label: string
    value: string
  }>
  depthLabel: string
  depthModelValue: string
  emptyText: string
  groups: SettingsShellGroup[]
  modelValue: string
  searchLabel: string
  searchPlaceholder: string
  title: string
}>()

const emit = defineEmits<{
  "update:depthModelValue": [value: string]
  "update:modelValue": [value: string]
}>()

const query = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value)
})
const depth = computed({
  get: () => props.depthModelValue,
  set: (value: string) => emit("update:depthModelValue", value)
})

const settingsShellNav = ref<HTMLElement | null>(null)
const desktopGroups = ref<HTMLElement | null>(null)
const mobileItems = ref<HTMLElement | null>(null)
const desktopIndicatorStyle = ref<Record<string, string>>({})
const mobileIndicatorStyle = ref<Record<string, string>>({})
const mobileNavOpen = ref(false)
const isDesktopNavScrollable = ref(false)
const mobileNav = ref<HTMLElement | null>(null)
const isMobileViewport = ref(false)
const isMobileNavDocked = ref(false)
const isMobileNavHidden = ref(false)
let indicatorFrame = 0
let mobileNavFrame = 0
let indicatorResizeObserver: ResizeObserver | undefined
let mobileNavMediaQuery: MediaQueryList | undefined
let mobileNavScrollListening = false
let lastWindowScrollY = 0

const mobileNavScrollDeadZone = 6
const mobileNavDockTolerance = 16

const activeNavItem = computed(() => props.groups
  .flatMap((group) => group.items)
  .find((item) => item.to === props.activePath))
const mobileNavTitle = computed(() => activeNavItem.value?.label || props.title)

function resolveIndicatorStyle(container: HTMLElement | null, placement: "bottom" | "left") {
  const activeItem = container?.querySelector<HTMLElement>(".settings-shell-nav__item--active")

  if (!container || !activeItem) {
    return {
      "--settings-shell-nav-indicator-opacity": "0",
      "--settings-shell-nav-indicator-height": "0px",
      "--settings-shell-nav-indicator-width": "0px",
      "--settings-shell-nav-indicator-x": "0px",
      "--settings-shell-nav-indicator-y": "0px"
    }
  }

  const containerRect = container.getBoundingClientRect()
  const activeRect = activeItem.getBoundingClientRect()
  const indicatorWidth = placement === "bottom" ? activeRect.width / 4 : 3
  const indicatorHeight = placement === "bottom" ? 3 : 16
  const x = activeRect.left - containerRect.left + container.scrollLeft
    + (placement === "bottom" ? (activeRect.width - indicatorWidth) / 2 : 0)
  const y = activeRect.top - containerRect.top + container.scrollTop
    + (placement === "bottom" ? activeRect.height - indicatorHeight : activeRect.height / 2 - indicatorHeight / 2)

  return {
    "--settings-shell-nav-indicator-opacity": "1",
    "--settings-shell-nav-indicator-height": `${indicatorHeight}px`,
    "--settings-shell-nav-indicator-width": `${indicatorWidth}px`,
    "--settings-shell-nav-indicator-x": `${x}px`,
    "--settings-shell-nav-indicator-y": `${y}px`
  }
}

function updateIndicators() {
  desktopIndicatorStyle.value = resolveIndicatorStyle(desktopGroups.value, "left")
  mobileIndicatorStyle.value = resolveIndicatorStyle(mobileItems.value, "left")
}

function measureDesktopNavScroll() {
  const nav = settingsShellNav.value

  if (!nav) {
    isDesktopNavScrollable.value = false
    return
  }

  const scrollable = nav.scrollHeight > nav.clientHeight + 1
  isDesktopNavScrollable.value = scrollable

  if (!scrollable && nav.scrollTop !== 0) {
    nav.scrollTop = 0
  }
}

function updateLayout() {
  updateIndicators()
  measureDesktopNavScroll()
}

function scheduleIndicatorUpdate() {
  if (!import.meta.client) {
    return
  }

  window.cancelAnimationFrame(indicatorFrame)
  indicatorFrame = window.requestAnimationFrame(updateLayout)
}

function openMobileNav() {
  isMobileNavHidden.value = false
  mobileNavOpen.value = true
}

function closeMobileNav() {
  mobileNavOpen.value = false
  isMobileNavHidden.value = false
  scheduleMobileNavUpdate(true)
}

function onMobileNavItemClick() {
  closeMobileNav()
}

function onMobileNavKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeMobileNav()
  }
}

function getWindowScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0
}

function getMobileNavStickyTop() {
  const top = mobileNav.value ? Number.parseFloat(window.getComputedStyle(mobileNav.value).top) : 0

  return Number.isFinite(top) ? top : 0
}

function updateMobileNavState(forceShow = false) {
  if (!import.meta.client || !isMobileViewport.value) {
    isMobileNavDocked.value = false
    isMobileNavHidden.value = false
    return
  }

  const nav = mobileNav.value
  const currentScrollY = getWindowScrollY()
  const scrollDelta = currentScrollY - lastWindowScrollY

  if (!nav) {
    lastWindowScrollY = currentScrollY
    return
  }

  const rect = nav.getBoundingClientRect()
  const stickyTop = getMobileNavStickyTop()
  const isDocked = currentScrollY > 0 && rect.top <= stickyTop + mobileNavDockTolerance
  isMobileNavDocked.value = isDocked

  if (forceShow || mobileNavOpen.value || currentScrollY <= mobileNavDockTolerance || !isDocked) {
    isMobileNavHidden.value = false
    lastWindowScrollY = currentScrollY
    return
  }

  if (Math.abs(scrollDelta) >= mobileNavScrollDeadZone) {
    isMobileNavHidden.value = scrollDelta > 0
  }

  lastWindowScrollY = currentScrollY
}

function scheduleMobileNavUpdate(forceShow = false) {
  if (!import.meta.client) {
    return
  }

  window.cancelAnimationFrame(mobileNavFrame)
  mobileNavFrame = window.requestAnimationFrame(() => updateMobileNavState(forceShow))
}

function onMobileNavScroll() {
  scheduleMobileNavUpdate()
}

function setMobileNavScrollListening(shouldListen: boolean) {
  if (!import.meta.client || shouldListen === mobileNavScrollListening) {
    return
  }

  mobileNavScrollListening = shouldListen

  if (shouldListen) {
    window.addEventListener("scroll", onMobileNavScroll, { passive: true })
    return
  }

  window.removeEventListener("scroll", onMobileNavScroll)
}

function syncMobileViewportState() {
  if (!import.meta.client) {
    return
  }

  isMobileViewport.value = Boolean(mobileNavMediaQuery?.matches)
  setMobileNavScrollListening(isMobileViewport.value)
  lastWindowScrollY = getWindowScrollY()
  scheduleMobileNavUpdate(true)
}

function onMobileNavResize() {
  syncMobileViewportState()
}

watch(
  () => [props.activePath, props.groups, props.modelValue, props.depthModelValue],
  async () => {
    await nextTick()
    scheduleIndicatorUpdate()
  },
  { deep: true, flush: "post" }
)

watch(
  () => props.activePath,
  () => {
    closeMobileNav()
    scheduleMobileNavUpdate(true)
  }
)

watch(
  mobileNavOpen,
  async (isOpen) => {
    if (!import.meta.client) {
      return
    }

    if (isOpen) {
      isMobileNavHidden.value = false
      window.addEventListener("keydown", onMobileNavKeydown)
      await nextTick()
      scheduleIndicatorUpdate()
      return
    }

    window.removeEventListener("keydown", onMobileNavKeydown)
  },
  { flush: "post" }
)

onMounted(async () => {
  await nextTick()
  scheduleIndicatorUpdate()
  lastWindowScrollY = getWindowScrollY()
  mobileNavMediaQuery = window.matchMedia("(max-width: 960px)")
  mobileNavMediaQuery.addEventListener("change", syncMobileViewportState)
  syncMobileViewportState()

  indicatorResizeObserver = new ResizeObserver(scheduleIndicatorUpdate)

  if (settingsShellNav.value) {
    indicatorResizeObserver.observe(settingsShellNav.value)
  }

  if (desktopGroups.value) {
    indicatorResizeObserver.observe(desktopGroups.value)
  }

  if (mobileItems.value) {
    indicatorResizeObserver.observe(mobileItems.value)
  }

  window.addEventListener("resize", scheduleIndicatorUpdate)
  window.addEventListener("resize", onMobileNavResize)
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(indicatorFrame)
  window.cancelAnimationFrame(mobileNavFrame)
  indicatorResizeObserver?.disconnect()
  mobileNavMediaQuery?.removeEventListener("change", syncMobileViewportState)
  window.removeEventListener("resize", scheduleIndicatorUpdate)
  window.removeEventListener("resize", onMobileNavResize)
  setMobileNavScrollListening(false)
  window.removeEventListener("keydown", onMobileNavKeydown)
})
</script>

<template>
  <aside
    ref="settingsShellNav"
    v-aoi-scroll-native="isDesktopNavScrollable"
    class="settings-shell-nav"
    :data-scrollable="isDesktopNavScrollable ? 'true' : undefined"
    aria-label="设置分类"
  >
    <div class="settings-shell-nav__intro">
      <span class="settings-shell-nav__mark" aria-hidden="true">
        <AoiIcon name="settings" :size="22" decorative />
      </span>
      <div>
        <h1>{{ props.title }}</h1>
        <p>{{ props.description }}</p>
      </div>
    </div>

    <AoiTextField
      v-model="query"
      class="settings-shell-nav__search-field"
      icon="search"
      :label="props.searchLabel"
      :placeholder="props.searchPlaceholder"
      appearance="outlined"
      type="search"
    />

    <AoiSegmentedControl
      v-model="depth"
      class="settings-shell-nav__depth"
      :items="props.depthItems"
      :aria-label="props.depthLabel"
      :columns="2"
    />

    <nav
      ref="desktopGroups"
      class="settings-shell-nav__groups"
      aria-label="设置页面"
    >
      <span
        class="settings-shell-nav__indicator"
        :style="desktopIndicatorStyle"
        aria-hidden="true"
      />
      <section
        v-for="group in props.groups"
        :key="group.label"
        class="settings-shell-nav__group"
      >
        <h2>{{ group.label }}</h2>
        <AoiLink
          v-for="item in group.items"
          :key="item.to"
          class="settings-shell-nav__item"
          :class="{ 'settings-shell-nav__item--active': props.activePath === item.to }"
          :to="item.to"
          :aria-current="props.activePath === item.to ? 'page' : undefined"
          :aria-label="item.label"
        >
          <AoiRipple class="settings-shell-nav__item-ripple" />
          <span class="settings-shell-nav__item-surface" aria-hidden="true" />
          <span class="settings-shell-nav__item-content" aria-hidden="true">
            <AoiIconButton
              class="settings-shell-nav__item-icon"
              :active="props.activePath === item.to"
              decorative
              :icon="item.icon"
              :label="item.label"
              size="sm"
              :tone="props.activePath === item.to ? 'accent' : 'muted'"
              variant="plain"
            />
            <span class="settings-shell-nav__item-label">{{ item.label }}</span>
          </span>
        </AoiLink>
      </section>

      <p v-if="props.groups.length === 0" class="settings-shell-nav__empty">
        {{ props.emptyText }}
      </p>
    </nav>
  </aside>

  <div
    ref="mobileNav"
    class="settings-shell-nav-mobile"
    :aria-hidden="isMobileNavHidden ? 'true' : undefined"
    :data-docked="isMobileNavDocked ? 'true' : undefined"
    :data-hidden="isMobileNavHidden ? 'true' : undefined"
    :inert="isMobileNavHidden ? true : undefined"
  >
    <div
      class="settings-shell-nav-mobile__bar"
      :aria-hidden="isMobileNavHidden ? 'true' : undefined"
    >
      <AoiIconButton
        icon="menu"
        label="打开设置菜单"
        size="md"
        tone="muted"
        variant="plain"
        @click="openMobileNav"
      />
      <h1 class="settings-shell-nav-mobile__title">
        {{ mobileNavTitle }}
      </h1>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="mobileNavOpen"
      class="settings-shell-nav-drawer"
      role="presentation"
    >
      <div
        class="settings-shell-nav-drawer__scrim"
        aria-hidden="true"
        @click="closeMobileNav"
      />
      <aside
        v-aoi-scroll-native
        class="settings-shell-nav-drawer__panel"
        role="dialog"
        aria-modal="true"
        :aria-label="props.title"
      >
        <header class="settings-shell-nav-drawer__header">
          <div class="settings-shell-nav-drawer__heading">
            <AoiIconButton
              decorative
              icon="settings"
              label="设置"
              size="sm"
              tone="accent"
              variant="plain"
            />
            <h2>{{ props.title }}</h2>
          </div>
          <AoiIconButton
            icon="x"
            label="关闭设置菜单"
            size="lg"
            tone="muted"
            variant="plain"
            @click="closeMobileNav"
          />
        </header>

        <AoiTextField
          v-model="query"
          class="settings-shell-nav__search-field"
          icon="search"
          :label="props.searchLabel"
          :placeholder="props.searchPlaceholder"
          appearance="outlined"
          type="search"
        />

        <AoiSegmentedControl
          v-model="depth"
          class="settings-shell-nav__depth"
          :items="props.depthItems"
          :aria-label="props.depthLabel"
          :columns="2"
        />

        <nav
          ref="mobileItems"
          class="settings-shell-nav-drawer__items"
          aria-label="设置页面"
        >
          <span
            class="settings-shell-nav__indicator"
            :style="mobileIndicatorStyle"
            aria-hidden="true"
          />
          <section
            v-for="group in props.groups"
            :key="group.label"
            class="settings-shell-nav__group"
          >
            <h2>{{ group.label }}</h2>
            <AoiLink
              v-for="item in group.items"
              :key="item.to"
              class="settings-shell-nav__item"
              :class="{ 'settings-shell-nav__item--active': props.activePath === item.to }"
              :to="item.to"
              :aria-current="props.activePath === item.to ? 'page' : undefined"
              :aria-label="item.label"
              @click="onMobileNavItemClick"
            >
              <AoiRipple class="settings-shell-nav__item-ripple" />
              <span class="settings-shell-nav__item-surface" aria-hidden="true" />
              <span class="settings-shell-nav__item-content" aria-hidden="true">
                <AoiIconButton
                  class="settings-shell-nav__item-icon"
                  :active="props.activePath === item.to"
                  decorative
                  :icon="item.icon"
                  :label="item.label"
                  size="md"
                  :tone="props.activePath === item.to ? 'accent' : 'muted'"
                  variant="plain"
                />
                <span class="settings-shell-nav__item-label">{{ item.label }}</span>
              </span>
            </AoiLink>
          </section>

          <p v-if="props.groups.length === 0" class="settings-shell-nav__empty">
            {{ props.emptyText }}
          </p>
        </nav>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-shell-nav {
  position: sticky;
  top: var(--aoi-settings-sticky-top);
  z-index: var(--aoi-z-sticky);
  display: grid;
  max-height: calc(100dvh - var(--aoi-settings-sticky-top) * 2);
  align-self: start;
  gap: var(--aoi-grid-gap-compact);
  overflow: clip;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-container);
  background: var(--aoi-panel-bg);
  box-shadow: var(--aoi-shadow-sm);
  padding: var(--aoi-card-padding);
}

.settings-shell-nav[data-scrollable="true"] {
  overflow-y: auto;
  overscroll-behavior: contain;
}

.settings-shell-nav__search-field {
  --md-filled-text-field-container-height: var(--aoi-control-height-md);
  --md-outlined-text-field-container-height: var(--aoi-control-height-md);
}

.settings-shell-nav__intro {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--aoi-grid-gap-compact);
  align-items: start;
}

.settings-shell-nav__mark {
  display: inline-grid;
  width: var(--aoi-settings-shell-mark-size);
  height: var(--aoi-settings-shell-mark-size);
  place-items: center;
  border-radius: var(--aoi-radius-round);
  background: var(--aoi-accent-10);
  color: var(--aoi-accent-60);
}

.settings-shell-nav__intro h1,
.settings-shell-nav__intro p,
.settings-shell-nav__group h2 {
  margin: 0;
}

.settings-shell-nav__intro h1 {
  font-size: var(--aoi-settings-shell-title-size);
  line-height: 1.1;
}

.settings-shell-nav__intro p,
.settings-shell-nav__empty {
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.settings-shell-nav__groups {
  position: relative;
  display: grid;
  gap: var(--aoi-grid-gap);
}

.settings-shell-nav__depth :deep(.aoi-segmented__item) {
  min-height: var(--aoi-control-height-md);
}

.settings-shell-nav-mobile {
  display: none;
}

.settings-shell-nav__group {
  display: grid;
  gap: max(6px, calc(var(--aoi-grid-gap-compact) - 5px));
}

.settings-shell-nav__group h2 {
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 780;
  letter-spacing: 0;
}

.settings-shell-nav__item {
  position: relative;
  display: flex;
  width: 100%;
  min-height: var(--aoi-settings-nav-item-height);
  align-items: center;
  border-radius: var(--aoi-radius-choice);
  color: var(--aoi-text-muted);
  font-weight: 740;
  overflow: clip;
  padding: 0;
  text-align: left;
  text-decoration: none;
  --md-ripple-hover-color: var(--aoi-active-color);
  --md-ripple-hover-opacity: .08;
  --md-ripple-pressed-color: var(--aoi-active-color);
  --md-ripple-pressed-opacity: .12;
}

.settings-shell-nav__item-ripple {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: var(--aoi-radius-choice);
}

.settings-shell-nav__item-surface {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  border-radius: var(--aoi-radius-choice);
  background: transparent;
  pointer-events: none;
  transition:
    background var(--aoi-action-motion-base) var(--aoi-ease-out),
    transform var(--aoi-action-motion-base) var(--aoi-ease-out);
}

.settings-shell-nav__item-content {
  position: relative;
  z-index: 2;
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: var(--aoi-settings-nav-item-height);
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 0 10px 0 8px;
  pointer-events: none;
  transition: transform var(--aoi-action-motion-base) var(--aoi-ease-out);
}

.settings-shell-nav__item-icon {
  flex: 0 0 auto;
}

.settings-shell-nav__item :deep(.settings-shell-nav__item-icon.aoi-icon-button) {
  --aoi-icon-action-size: 24px;
  --aoi-icon-action-soft-bg: transparent;
  --aoi-icon-action-soft-bg-hover: transparent;
  --aoi-icon-action-soft-bg-pressed: transparent;
  --md-icon-button-icon-size: 15px;
  --md-icon-button-state-layer-size: 24px;
  background: transparent;
  color: inherit;
  flex: 0 0 auto;
}

.settings-shell-nav__item-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-shell-nav__indicator {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  display: block;
  width: var(--settings-shell-nav-indicator-width, 3px);
  height: var(--settings-shell-nav-indicator-height, 16px);
  background: var(--aoi-active-color);
  opacity: var(--settings-shell-nav-indicator-opacity, 0);
  pointer-events: none;
  transform: translate3d(
    var(--settings-shell-nav-indicator-x, 0),
    var(--settings-shell-nav-indicator-y, 0),
    0
  ) scale(1, var(--settings-shell-nav-indicator-scale-y, 1));
  transform-origin: center;
  transition:
    transform var(--aoi-action-motion-base) var(--aoi-ease-out),
    opacity var(--aoi-action-motion-fast) var(--aoi-ease-out);
}

.settings-shell-nav__item:hover,
.settings-shell-nav__item:focus-within {
  color: var(--aoi-text);
}

.settings-shell-nav__item--active {
  position: relative;
  color: var(--aoi-active-color);
  font-weight: 800;
}

.settings-shell-nav__item:hover .settings-shell-nav__item-content,
.settings-shell-nav__item:focus-visible .settings-shell-nav__item-content {
  transform: translate3d(3px, 0, 0);
}

.settings-shell-nav__item:hover .settings-shell-nav__item-surface,
.settings-shell-nav__item:focus-visible .settings-shell-nav__item-surface {
  background: color-mix(in srgb, var(--aoi-active-color) 8%, transparent);
}

.settings-shell-nav__item:active {
  font-weight: 820;
}

.settings-shell-nav__item:active .settings-shell-nav__item-surface {
  background: color-mix(in srgb, var(--aoi-active-color) 14%, transparent);
}

.settings-shell-nav__item.settings-shell-nav__item--active .settings-shell-nav__item-surface {
  background: var(--aoi-nav-active-bg);
}

.settings-shell-nav__item.settings-shell-nav__item--active:hover,
.settings-shell-nav__item.settings-shell-nav__item--active:focus-visible {
  color: var(--aoi-active-color);
  font-weight: 840;
}

.settings-shell-nav__item.settings-shell-nav__item--active:hover .settings-shell-nav__item-surface,
.settings-shell-nav__item.settings-shell-nav__item--active:focus-visible .settings-shell-nav__item-surface,
.settings-shell-nav__item.settings-shell-nav__item--active:active .settings-shell-nav__item-surface {
  background: color-mix(in srgb, var(--aoi-active-color) 14%, transparent);
}

.settings-shell-nav__item.settings-shell-nav__item--active:active {
  font-weight: 900;
}

.settings-shell-nav__groups:has(.settings-shell-nav__item--active:active) .settings-shell-nav__indicator,
.settings-shell-nav-drawer__items:has(.settings-shell-nav__item--active:active) .settings-shell-nav__indicator {
  --settings-shell-nav-indicator-scale-y: .625;
}

.settings-shell-nav__empty {
  margin: 0;
}

.settings-shell-nav-drawer {
  position: fixed;
  inset: 0;
  z-index: var(--aoi-z-dialog);
}

.settings-shell-nav-drawer__scrim {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--aoi-bg) 32%, transparent);
  backdrop-filter: blur(2px);
}

.settings-shell-nav-drawer__panel {
  position: relative;
  z-index: 1;
  display: grid;
  width: min(82vw, 360px);
  max-width: 100%;
  height: 100dvh;
  align-content: start;
  gap: 18px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-right: 1px solid var(--aoi-border);
  background: color-mix(in srgb, var(--aoi-panel-bg) 92%, var(--aoi-surface) 8%);
  box-shadow: var(--aoi-shadow-lg);
  padding: max(18px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));
}

.settings-shell-nav-drawer__header,
.settings-shell-nav-drawer__heading {
  display: flex;
  align-items: center;
}

.settings-shell-nav-drawer__header {
  justify-content: space-between;
  gap: var(--aoi-grid-gap);
}

.settings-shell-nav-drawer__heading {
  min-width: 0;
  gap: 10px;
}

.settings-shell-nav-drawer__heading h2 {
  margin: 0;
  color: var(--aoi-active-color);
  font-size: clamp(1.75rem, 8vw, 2.4rem);
  line-height: 1.05;
}

.settings-shell-nav-drawer__items {
  position: relative;
  display: grid;
  gap: var(--aoi-grid-gap);
}

.settings-shell-nav-drawer .settings-shell-nav__item {
  min-height: 52px;
  font-size: 1.05rem;
}

.settings-shell-nav-drawer .settings-shell-nav__item-content {
  min-height: 52px;
  gap: 16px;
  padding-inline: 20px 14px;
}

@media (max-width: 960px) {
  .settings-shell-nav {
    display: none;
  }

  .settings-shell-nav-mobile {
    position: sticky;
    top: var(--aoi-settings-mobile-sticky-top);
    z-index: var(--aoi-z-sticky);
    display: grid;
    margin-block-end: var(--aoi-grid-gap);
  }

  .settings-shell-nav-mobile__bar {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    border: 1px solid var(--aoi-border);
    border-radius: var(--aoi-radius-container);
    background: var(--aoi-panel-bg);
    box-shadow: var(--aoi-shadow-sm);
    padding: 8px 12px;
    transform-origin: center top;
    transition:
      transform var(--aoi-motion-base) var(--aoi-ease-out),
      opacity var(--aoi-motion-base) var(--aoi-ease-out),
      border-color var(--aoi-motion-fast) var(--aoi-ease-out),
      background-color var(--aoi-motion-fast) var(--aoi-ease-out),
      box-shadow var(--aoi-motion-fast) var(--aoi-ease-out);
    will-change: transform, opacity;
  }

  .settings-shell-nav-mobile[data-docked="true"] .settings-shell-nav-mobile__bar {
    border-color: color-mix(in srgb, var(--aoi-active-color) 18%, var(--aoi-border));
    background: color-mix(in srgb, var(--aoi-panel-bg) 88%, var(--aoi-surface) 12%);
    box-shadow: var(--aoi-shadow-lg);
    backdrop-filter: blur(var(--aoi-nav-surface-blur));
  }

  .settings-shell-nav-mobile[data-hidden="true"] {
    pointer-events: none;
  }

  .settings-shell-nav-mobile[data-hidden="true"] .settings-shell-nav-mobile__bar {
    opacity: 0;
    transform: translate3d(0, calc(-100% - 12px), 0) scale(.98);
  }

  .settings-shell-nav-mobile__title {
    margin: 0;
    overflow: hidden;
    color: var(--aoi-active-color);
    font-size: 1.45rem;
    line-height: 1.15;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-shell-nav__indicator,
  .settings-shell-nav-mobile__bar {
    transition: none;
  }

  .settings-shell-nav-mobile[data-hidden="true"] .settings-shell-nav-mobile__bar {
    transform: none;
  }
}
</style>
