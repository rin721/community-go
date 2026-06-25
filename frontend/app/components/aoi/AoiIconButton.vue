<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router"
import type { AoiActionVariant, AoiTone } from "~/types/ui"

type IconButtonSize = "sm" | "md" | "lg"
type LinkTarget = "_blank" | "_parent" | "_self" | "_top" | (string & {})
type AriaCurrentValue = "page" | "step" | "location" | "date" | "time" | "true" | "false"

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<{
  icon: string
  label: string
  variant?: AoiActionVariant
  tone?: AoiTone
  size?: IconButtonSize
  active?: boolean
  decorative?: boolean
  loading?: boolean
  disabled?: boolean
  ariaCurrent?: AriaCurrentValue
  ariaPressed?: boolean
  external?: boolean
  href?: RouteLocationRaw
  noRel?: boolean
  rel?: string | null
  target?: LinkTarget | null
  to?: RouteLocationRaw
}>(), {
  variant: "plain",
  tone: "muted",
  size: "md",
  active: false,
  decorative: false,
  loading: false,
  disabled: false,
  ariaCurrent: undefined,
  ariaPressed: undefined,
  external: undefined,
  href: undefined,
  noRel: false,
  rel: undefined,
  target: undefined,
  to: undefined
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const attrs = useAttrs()
const tagName = computed(() => {
  const map: Record<AoiActionVariant, string> = {
    elevated: "md-filled-icon-button",
    filled: "md-filled-icon-button",
    outlined: "md-outlined-icon-button",
    plain: "md-icon-button",
    tonal: "md-filled-tonal-icon-button"
  }

  return map[props.variant]
})

const iconSize = computed(() => {
  const map: Record<IconButtonSize, number> = {
    sm: 18,
    md: 21,
    lg: 24
  }

  return map[props.size]
})

const resolvedIcon = computed(() => props.loading ? "loader-circle" : props.icon)
const hasLink = computed(() => Boolean(props.to || props.href))
const resolvedAriaCurrent = computed(() => props.ariaCurrent || (props.active && hasLink.value ? "page" : undefined))
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs

  return rest
})
const iconButtonClass = computed(() => [
  "aoi-icon-button",
  `aoi-icon-button--${props.size}`,
  attrs.class,
  {
    "aoi-icon-button--active": props.active,
    "aoi-icon-button--decorative": props.decorative,
    "aoi-icon-button--loading": props.loading
  }
])
const linkClass = computed(() => [
  "aoi-icon-button-link",
  attrs.class,
  {
    "aoi-icon-button-link--active": props.active
  }
])

function onClick(event: MouseEvent) {
  if (props.decorative) {
    return
  }

  emit("click", event)
}
</script>

<template>
  <AoiLink
    v-if="hasLink && !decorative && !disabled && !loading"
    v-bind="rootAttrs"
    :class="linkClass"
    :aria-current="resolvedAriaCurrent"
    :aria-label="label"
    :aria-pressed="ariaPressed"
    :external="external"
    :href="href"
    :no-rel="noRel"
    :rel="rel"
    :target="target"
    :to="to"
    @click="onClick"
  >
    <AoiRipple class="aoi-icon-button-link__ripple" />
    <component
      :is="tagName"
      :class="iconButtonClass"
      :data-aoi-variant="variant"
      :data-aoi-tone="tone"
      :data-aoi-active="active || undefined"
      aria-hidden="true"
      :selected="active || undefined"
      tabindex="-1"
      :toggle="active || undefined"
    >
      <AoiIcon :class="{ 'aoi-spin': loading }" :name="resolvedIcon" :size="iconSize" decorative />
    </component>
  </AoiLink>
  <component
    v-else-if="decorative"
    v-bind="rootAttrs"
    :is="tagName"
    :class="iconButtonClass"
    :data-aoi-variant="variant"
    :data-aoi-tone="tone"
    :data-aoi-active="active || undefined"
    aria-hidden="true"
    inert
    :selected="active || undefined"
    tabindex="-1"
    :toggle="active || undefined"
    @click="onClick"
  >
    <AoiIcon :class="{ 'aoi-spin': loading }" :name="resolvedIcon" :size="iconSize" decorative />
  </component>
  <component
    v-else
    v-bind="rootAttrs"
    :is="tagName"
    :class="iconButtonClass"
    :data-aoi-variant="variant"
    :data-aoi-tone="tone"
    :data-aoi-active="active || undefined"
    :aria-label="label"
    :aria-pressed="ariaPressed"
    :disabled="disabled || loading || undefined"
    :selected="active || undefined"
    :toggle="active || undefined"
    @click="onClick"
  >
    <AoiIcon :class="{ 'aoi-spin': loading }" :name="resolvedIcon" :size="iconSize" decorative />
  </component>
</template>

<style scoped>
.aoi-spin {
  animation: aoi-spin 900ms linear infinite;
}

.aoi-icon-button-link {
  position: relative;
  display: inline-flex;
  width: fit-content;
  color: inherit;
  line-height: 1;
  overflow: clip;
  border-radius: var(--aoi-radius-nav-indicator);
  text-decoration: none;
  --md-ripple-hover-color: currentColor;
  --md-ripple-hover-opacity: .08;
  --md-ripple-pressed-color: currentColor;
  --md-ripple-pressed-opacity: .12;
}

.aoi-icon-button-link--active {
  color: var(--aoi-active-color);
}

.aoi-icon-button-link__ripple {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
}

.aoi-icon-button-link:focus-visible {
  outline: none;
  border-radius: var(--aoi-radius-nav-indicator);
  box-shadow: 0 0 0 var(--aoi-focus-ring-width) var(--aoi-focus);
}

.aoi-icon-button-link .aoi-icon-button {
  position: relative;
  z-index: 1;
  pointer-events: none;
}

.aoi-icon-button--decorative {
  cursor: default;
  pointer-events: none;
}

.aoi-icon-button-link:hover .aoi-icon-button,
.aoi-icon-button-link:focus-visible .aoi-icon-button {
  background: var(--aoi-icon-action-soft-bg-hover);
}

.aoi-icon-button-link:active .aoi-icon-button {
  background: var(--aoi-icon-action-soft-bg-pressed);
}

.aoi-icon-button {
  --aoi-icon-action-size: var(--aoi-icon-button-size, var(--aoi-control-height-md));
  --aoi-icon-action-color: var(--aoi-intent-secondary-color);
  --aoi-icon-action-on-solid: var(--aoi-intent-secondary-on-solid);
  --aoi-icon-action-solid-bg: var(--aoi-intent-secondary-solid-bg);
  --aoi-icon-action-soft-bg: transparent;
  --aoi-icon-action-soft-bg-hover: var(--aoi-intent-secondary-soft-bg-hover);
  --aoi-icon-action-soft-bg-pressed: var(--aoi-intent-secondary-soft-bg-pressed);
  --aoi-icon-action-border: var(--aoi-intent-secondary-border);
  --md-icon-button-icon-color: var(--aoi-icon-action-color);
  --md-icon-button-hover-icon-color: var(--aoi-icon-action-color);
  --md-icon-button-focus-icon-color: var(--aoi-icon-action-color);
  --md-icon-button-pressed-icon-color: var(--aoi-icon-action-color);
  --md-icon-button-hover-state-layer-color: var(--aoi-icon-action-color);
  --md-icon-button-focus-state-layer-color: var(--aoi-icon-action-color);
  --md-icon-button-pressed-state-layer-color: var(--aoi-icon-action-color);
  --md-icon-button-state-layer-shape: var(--aoi-radius-nav-indicator);
  --md-icon-button-state-layer-size: var(--aoi-icon-action-size);
  --md-filled-icon-button-container-color: var(--aoi-icon-action-solid-bg);
  --md-filled-icon-button-icon-color: var(--aoi-icon-action-on-solid);
  --md-filled-icon-button-hover-icon-color: var(--aoi-icon-action-on-solid);
  --md-filled-icon-button-focus-icon-color: var(--aoi-icon-action-on-solid);
  --md-filled-icon-button-pressed-icon-color: var(--aoi-icon-action-on-solid);
  --md-filled-icon-button-container-shape: var(--aoi-radius-nav-indicator);
  --md-filled-tonal-icon-button-container-color: var(--aoi-icon-action-soft-bg);
  --md-filled-tonal-icon-button-hover-container-color: var(--aoi-icon-action-soft-bg-hover);
  --md-filled-tonal-icon-button-focus-container-color: var(--aoi-icon-action-soft-bg-hover);
  --md-filled-tonal-icon-button-pressed-container-color: var(--aoi-icon-action-soft-bg-pressed);
  --md-filled-tonal-icon-button-icon-color: var(--aoi-icon-action-color);
  --md-filled-tonal-icon-button-hover-icon-color: var(--aoi-icon-action-color);
  --md-filled-tonal-icon-button-focus-icon-color: var(--aoi-icon-action-color);
  --md-filled-tonal-icon-button-pressed-icon-color: var(--aoi-icon-action-color);
  --md-filled-tonal-icon-button-container-shape: var(--aoi-radius-nav-indicator);
  --md-outlined-icon-button-outline-color: var(--aoi-icon-action-border);
  --md-outlined-icon-button-hover-outline-color: var(--aoi-icon-action-border);
  --md-outlined-icon-button-focus-outline-color: var(--aoi-icon-action-border);
  --md-outlined-icon-button-pressed-outline-color: var(--aoi-icon-action-border);
  --md-outlined-icon-button-icon-color: var(--aoi-icon-action-color);
  --md-outlined-icon-button-hover-icon-color: var(--aoi-icon-action-color);
  --md-outlined-icon-button-focus-icon-color: var(--aoi-icon-action-color);
  --md-outlined-icon-button-pressed-icon-color: var(--aoi-icon-action-color);
  --md-outlined-icon-button-container-shape: var(--aoi-radius-nav-indicator);
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: var(--aoi-icon-action-size);
  height: var(--aoi-icon-action-size);
  border-radius: var(--aoi-radius-nav-indicator);
  background: var(--aoi-icon-action-soft-bg);
  color: var(--aoi-icon-action-color);
  transition:
    background var(--aoi-action-motion-base) var(--aoi-ease-out),
    color var(--aoi-action-motion-fast) var(--aoi-ease-out),
    box-shadow var(--aoi-action-motion-base) var(--aoi-ease-out);
}

.aoi-icon-button--sm {
  --aoi-icon-action-size: var(--aoi-control-height-sm);
}

.aoi-icon-button--lg {
  --aoi-icon-action-size: var(--aoi-control-height-lg);
}

.aoi-icon-button[data-aoi-tone="accent"] {
  --aoi-icon-action-color: var(--aoi-intent-primary-color);
  --aoi-icon-action-on-solid: var(--aoi-intent-primary-on-solid);
  --aoi-icon-action-solid-bg: var(--aoi-intent-primary-solid-bg);
  --aoi-icon-action-soft-bg-hover: var(--aoi-intent-primary-soft-bg-hover);
  --aoi-icon-action-soft-bg-pressed: var(--aoi-intent-primary-soft-bg-pressed);
  --aoi-icon-action-border: var(--aoi-intent-primary-border);
}

.aoi-icon-button[data-aoi-tone="neutral"] {
  --aoi-icon-action-color: var(--aoi-intent-neutral-color);
  --aoi-icon-action-on-solid: var(--aoi-intent-neutral-on-solid);
  --aoi-icon-action-solid-bg: var(--aoi-intent-neutral-solid-bg);
  --aoi-icon-action-soft-bg-hover: var(--aoi-intent-neutral-soft-bg-hover);
  --aoi-icon-action-soft-bg-pressed: var(--aoi-intent-neutral-soft-bg-pressed);
  --aoi-icon-action-border: var(--aoi-intent-neutral-border);
}

.aoi-icon-button[data-aoi-tone="success"] {
  --aoi-icon-action-color: var(--aoi-intent-success-color);
  --aoi-icon-action-on-solid: var(--aoi-intent-success-on-solid);
  --aoi-icon-action-solid-bg: var(--aoi-intent-success-solid-bg);
  --aoi-icon-action-soft-bg-hover: var(--aoi-intent-success-soft-bg-hover);
  --aoi-icon-action-soft-bg-pressed: var(--aoi-intent-success-soft-bg-pressed);
  --aoi-icon-action-border: var(--aoi-intent-success-border);
}

.aoi-icon-button[data-aoi-tone="warning"] {
  --aoi-icon-action-color: var(--aoi-intent-warning-color);
  --aoi-icon-action-on-solid: var(--aoi-intent-warning-on-solid);
  --aoi-icon-action-solid-bg: var(--aoi-intent-warning-solid-bg);
  --aoi-icon-action-soft-bg-hover: var(--aoi-intent-warning-soft-bg-hover);
  --aoi-icon-action-soft-bg-pressed: var(--aoi-intent-warning-soft-bg-pressed);
  --aoi-icon-action-border: var(--aoi-intent-warning-border);
}

.aoi-icon-button[data-aoi-tone="danger"] {
  --aoi-icon-action-color: var(--aoi-intent-danger-color);
  --aoi-icon-action-on-solid: var(--aoi-intent-danger-on-solid);
  --aoi-icon-action-solid-bg: var(--aoi-intent-danger-solid-bg);
  --aoi-icon-action-soft-bg-hover: var(--aoi-intent-danger-soft-bg-hover);
  --aoi-icon-action-soft-bg-pressed: var(--aoi-intent-danger-soft-bg-pressed);
  --aoi-icon-action-border: var(--aoi-intent-danger-border);
}

.aoi-icon-button[data-aoi-tone="info"] {
  --aoi-icon-action-color: var(--aoi-intent-info-color);
  --aoi-icon-action-on-solid: var(--aoi-intent-info-on-solid);
  --aoi-icon-action-solid-bg: var(--aoi-intent-info-solid-bg);
  --aoi-icon-action-soft-bg-hover: var(--aoi-intent-info-soft-bg-hover);
  --aoi-icon-action-soft-bg-pressed: var(--aoi-intent-info-soft-bg-pressed);
  --aoi-icon-action-border: var(--aoi-intent-info-border);
}

.aoi-icon-button--active {
  --aoi-icon-action-color: var(--aoi-active-color);
  --aoi-icon-action-soft-bg: color-mix(in srgb, var(--aoi-active-color) 12%, transparent);
  --aoi-icon-action-soft-bg-hover: color-mix(in srgb, var(--aoi-active-color) 16%, transparent);
  --aoi-icon-action-soft-bg-pressed: color-mix(in srgb, var(--aoi-active-color) 22%, transparent);
  --aoi-icon-action-border: color-mix(in srgb, var(--aoi-active-color) 42%, transparent);
}

.aoi-icon-button[data-aoi-variant="elevated"] {
  box-shadow: var(--aoi-shadow-sm);
}

@keyframes aoi-spin {
  to {
    rotate: 360deg;
  }
}
</style>
