<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router"
import type { AoiActionVariant, AoiTone } from "~/types/ui"

type ButtonSize = "sm" | "md" | "lg"
type LinkTarget = "_blank" | "_parent" | "_self" | "_top" | (string & {})
type AriaCurrentValue = "page" | "step" | "location" | "date" | "time" | "true" | "false"

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<{
  variant?: AoiActionVariant
  tone?: AoiTone
  size?: ButtonSize
  icon?: string
  trailingIcon?: string
  active?: boolean
  loading?: boolean
  disabled?: boolean
  label?: string
  ariaCurrent?: AriaCurrentValue
  ariaLabel?: string
  ariaPressed?: boolean
  external?: boolean
  href?: RouteLocationRaw
  noRel?: boolean
  rel?: string | null
  target?: LinkTarget | null
  to?: RouteLocationRaw
  type?: "button" | "submit" | "reset"
}>(), {
  variant: "plain",
  tone: "muted",
  size: "md",
  icon: undefined,
  trailingIcon: undefined,
  active: false,
  loading: false,
  disabled: false,
  label: undefined,
  ariaCurrent: undefined,
  ariaLabel: undefined,
  ariaPressed: undefined,
  external: undefined,
  href: undefined,
  noRel: false,
  rel: undefined,
  target: undefined,
  to: undefined,
  type: "button"
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const attrs = useAttrs()
const tagName = computed(() => {
  const map: Record<AoiActionVariant, string> = {
    elevated: "md-elevated-button",
    filled: "md-filled-button",
    outlined: "md-outlined-button",
    plain: "md-text-button",
    tonal: "md-filled-tonal-button"
  }

  return map[props.variant]
})

const hasLink = computed(() => Boolean(props.to || props.href))
const resolvedIcon = computed(() => props.loading ? "loader-circle" : props.icon)
const hasTrailingIcon = computed(() => Boolean(props.trailingIcon && !props.loading))
const resolvedAriaLabel = computed(() => props.ariaLabel || props.label)
const hideInnerLinkVisual = computed(() => Boolean(resolvedAriaLabel.value))
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs

  return rest
})
const buttonClass = computed(() => [
  "aoi-button",
  `aoi-button--${props.size}`,
  {
    "aoi-button--active": props.active
  }
])
const linkClass = computed(() => [
  "aoi-button-link",
  attrs.class,
  {
    "aoi-button-link--active": props.active
  }
])
const directButtonClass = computed(() => [
  ...buttonClass.value,
  attrs.class
])

function onClick(event: MouseEvent) {
  emit("click", event)
}
</script>

<template>
  <AoiLink
    v-if="hasLink && !disabled && !loading"
    v-bind="rootAttrs"
    :class="linkClass"
    :aria-current="ariaCurrent"
    :aria-label="resolvedAriaLabel"
    :aria-pressed="ariaPressed === undefined ? undefined : String(ariaPressed)"
    :external="external"
    :href="href"
    :no-rel="noRel"
    :rel="rel"
    :target="target"
    :to="to"
    @click="onClick"
  >
    <component
      :is="tagName"
      :class="buttonClass"
      :data-aoi-variant="variant"
      :data-aoi-tone="tone"
      :data-aoi-active="active || undefined"
      :aria-hidden.attr="hideInnerLinkVisual ? 'true' : undefined"
      :href="undefined"
      :tabindex="hideInnerLinkVisual ? -1 : undefined"
      :type="type"
      :trailing-icon="hasTrailingIcon || undefined"
    >
      <AoiIcon
        v-if="resolvedIcon"
        slot="icon"
        :class="{ 'aoi-spin': loading }"
        :name="resolvedIcon"
        decorative
      />
      <AoiIcon
        v-if="hasTrailingIcon && trailingIcon"
        slot="icon"
        :name="trailingIcon"
        decorative
      />
      <slot />
    </component>
  </AoiLink>
  <component
    v-else
    v-bind="rootAttrs"
    :is="tagName"
    :class="directButtonClass"
    :data-aoi-variant="variant"
    :data-aoi-tone="tone"
    :data-aoi-active="active || undefined"
    :aria-current.attr="ariaCurrent || undefined"
    :aria-label.attr="resolvedAriaLabel || undefined"
    :aria-pressed.attr="ariaPressed === undefined ? undefined : String(ariaPressed)"
    :disabled="disabled || loading || undefined"
    :type="type"
    :trailing-icon="hasTrailingIcon || undefined"
    @click="onClick"
  >
    <AoiIcon
      v-if="resolvedIcon"
      slot="icon"
      :class="{ 'aoi-spin': loading }"
      :name="resolvedIcon"
      decorative
    />
    <AoiIcon
      v-if="hasTrailingIcon && trailingIcon"
      slot="icon"
      :name="trailingIcon"
      decorative
    />
    <slot />
  </component>
</template>

<style scoped>
.aoi-spin {
  animation: aoi-spin 900ms linear infinite;
}

.aoi-button-link {
  display: inline-flex;
  color: inherit;
  text-decoration: none;
}

.aoi-button-link:focus-visible {
  outline: 2px solid var(--aoi-focus);
  outline-offset: 2px;
  border-radius: var(--aoi-radius-control);
}

.aoi-button-link .aoi-button {
  pointer-events: none;
}

.aoi-button-link:hover .aoi-button[data-aoi-variant="plain"],
.aoi-button-link:focus-visible .aoi-button[data-aoi-variant="plain"],
.aoi-button-link:hover .aoi-button[data-aoi-variant="outlined"],
.aoi-button-link:focus-visible .aoi-button[data-aoi-variant="outlined"] {
  background: var(--aoi-action-plain-hover);
}

.aoi-button-link:active .aoi-button[data-aoi-variant="plain"],
.aoi-button-link:active .aoi-button[data-aoi-variant="outlined"] {
  background: var(--aoi-action-plain-pressed);
}

.aoi-button-link:hover .aoi-button[data-aoi-variant="tonal"],
.aoi-button-link:focus-visible .aoi-button[data-aoi-variant="tonal"],
.aoi-button-link:hover .aoi-button[data-aoi-variant="elevated"],
.aoi-button-link:focus-visible .aoi-button[data-aoi-variant="elevated"] {
  background: var(--aoi-action-soft-bg-hover);
}

.aoi-button-link:active .aoi-button[data-aoi-variant="tonal"],
.aoi-button-link:active .aoi-button[data-aoi-variant="elevated"] {
  background: var(--aoi-action-soft-bg-pressed);
}

.aoi-button-link:hover .aoi-button[data-aoi-variant="filled"],
.aoi-button-link:focus-visible .aoi-button[data-aoi-variant="filled"] {
  background: var(--aoi-action-solid-bg-hover);
}

.aoi-button-link:active .aoi-button[data-aoi-variant="filled"] {
  background: var(--aoi-action-solid-bg-pressed);
}

.aoi-button {
  --aoi-action-color: var(--aoi-intent-secondary-color);
  --aoi-action-on-solid: var(--aoi-intent-secondary-on-solid);
  --aoi-action-solid-bg: var(--aoi-intent-secondary-solid-bg);
  --aoi-action-solid-bg-hover: var(--aoi-intent-secondary-solid-bg-hover);
  --aoi-action-solid-bg-pressed: var(--aoi-intent-secondary-solid-bg-pressed);
  --aoi-action-soft-bg: var(--aoi-intent-secondary-soft-bg);
  --aoi-action-soft-bg-hover: var(--aoi-intent-secondary-soft-bg-hover);
  --aoi-action-soft-bg-pressed: var(--aoi-intent-secondary-soft-bg-pressed);
  --aoi-action-border: var(--aoi-intent-secondary-border);
  --aoi-action-plain-hover: var(--aoi-intent-secondary-plain-hover);
  --aoi-action-plain-pressed: var(--aoi-intent-secondary-plain-pressed);
  --md-filled-button-container-color: var(--aoi-action-solid-bg);
  --md-filled-button-focus-container-color: var(--aoi-action-solid-bg-hover);
  --md-filled-button-hover-container-color: var(--aoi-action-solid-bg-hover);
  --md-filled-button-pressed-container-color: var(--aoi-action-solid-bg-pressed);
  --md-filled-button-label-text-color: var(--aoi-action-on-solid);
  --md-filled-button-focus-label-text-color: var(--aoi-action-on-solid);
  --md-filled-button-hover-label-text-color: var(--aoi-action-on-solid);
  --md-filled-button-pressed-label-text-color: var(--aoi-action-on-solid);
  --md-filled-button-icon-color: var(--aoi-action-on-solid);
  --md-filled-button-focus-icon-color: var(--aoi-action-on-solid);
  --md-filled-button-hover-icon-color: var(--aoi-action-on-solid);
  --md-filled-button-pressed-icon-color: var(--aoi-action-on-solid);
  --md-filled-tonal-button-container-color: var(--aoi-action-soft-bg);
  --md-filled-tonal-button-focus-container-color: var(--aoi-action-soft-bg-hover);
  --md-filled-tonal-button-hover-container-color: var(--aoi-action-soft-bg-hover);
  --md-filled-tonal-button-pressed-container-color: var(--aoi-action-soft-bg-pressed);
  --md-filled-tonal-button-label-text-color: var(--aoi-action-color);
  --md-filled-tonal-button-focus-label-text-color: var(--aoi-action-color);
  --md-filled-tonal-button-hover-label-text-color: var(--aoi-action-color);
  --md-filled-tonal-button-pressed-label-text-color: var(--aoi-action-color);
  --md-filled-tonal-button-icon-color: var(--aoi-action-color);
  --md-filled-tonal-button-focus-icon-color: var(--aoi-action-color);
  --md-filled-tonal-button-hover-icon-color: var(--aoi-action-color);
  --md-filled-tonal-button-pressed-icon-color: var(--aoi-action-color);
  --md-outlined-button-outline-color: var(--aoi-action-border);
  --md-outlined-button-hover-outline-color: var(--aoi-action-border);
  --md-outlined-button-focus-outline-color: var(--aoi-action-border);
  --md-outlined-button-pressed-outline-color: var(--aoi-action-border);
  --md-outlined-button-label-text-color: var(--aoi-action-color);
  --md-outlined-button-focus-label-text-color: var(--aoi-action-color);
  --md-outlined-button-hover-label-text-color: var(--aoi-action-color);
  --md-outlined-button-pressed-label-text-color: var(--aoi-action-color);
  --md-outlined-button-icon-color: var(--aoi-action-color);
  --md-outlined-button-focus-icon-color: var(--aoi-action-color);
  --md-outlined-button-hover-icon-color: var(--aoi-action-color);
  --md-outlined-button-pressed-icon-color: var(--aoi-action-color);
  --md-outlined-button-hover-state-layer-color: var(--aoi-action-color);
  --md-outlined-button-focus-state-layer-color: var(--aoi-action-color);
  --md-outlined-button-pressed-state-layer-color: var(--aoi-action-color);
  --md-text-button-label-text-color: var(--aoi-action-color);
  --md-text-button-focus-label-text-color: var(--aoi-action-color);
  --md-text-button-hover-label-text-color: var(--aoi-action-color);
  --md-text-button-pressed-label-text-color: var(--aoi-action-color);
  --md-text-button-icon-color: var(--aoi-action-color);
  --md-text-button-focus-icon-color: var(--aoi-action-color);
  --md-text-button-hover-icon-color: var(--aoi-action-color);
  --md-text-button-pressed-icon-color: var(--aoi-action-color);
  --md-text-button-hover-state-layer-color: var(--aoi-action-color);
  --md-text-button-focus-state-layer-color: var(--aoi-action-color);
  --md-text-button-pressed-state-layer-color: var(--aoi-action-color);
  --md-elevated-button-container-color: var(--aoi-action-soft-bg);
  --md-elevated-button-focus-container-color: var(--aoi-action-soft-bg-hover);
  --md-elevated-button-hover-container-color: var(--aoi-action-soft-bg-hover);
  --md-elevated-button-pressed-container-color: var(--aoi-action-soft-bg-pressed);
  --md-elevated-button-label-text-color: var(--aoi-action-color);
  --md-elevated-button-focus-label-text-color: var(--aoi-action-color);
  --md-elevated-button-hover-label-text-color: var(--aoi-action-color);
  --md-elevated-button-pressed-label-text-color: var(--aoi-action-color);
  --md-elevated-button-icon-color: var(--aoi-action-color);
  --md-elevated-button-focus-icon-color: var(--aoi-action-color);
  --md-elevated-button-hover-icon-color: var(--aoi-action-color);
  --md-elevated-button-pressed-icon-color: var(--aoi-action-color);
  transition:
    background var(--aoi-action-motion-base) var(--aoi-ease-out),
    border-color var(--aoi-action-motion-base) var(--aoi-ease-out),
    color var(--aoi-action-motion-fast) var(--aoi-ease-out),
    box-shadow var(--aoi-action-motion-base) var(--aoi-ease-out),
    transform var(--aoi-action-motion-base) var(--aoi-ease-out);
}

.aoi-button--active {
  --aoi-action-color: var(--aoi-active-color);
  color: var(--aoi-action-color);
}

.aoi-button[data-aoi-tone="accent"] {
  --aoi-action-color: var(--aoi-intent-primary-color);
  --aoi-action-on-solid: var(--aoi-intent-primary-on-solid);
  --aoi-action-solid-bg: var(--aoi-intent-primary-solid-bg);
  --aoi-action-solid-bg-hover: var(--aoi-intent-primary-solid-bg-hover);
  --aoi-action-solid-bg-pressed: var(--aoi-intent-primary-solid-bg-pressed);
  --aoi-action-soft-bg: var(--aoi-intent-primary-soft-bg);
  --aoi-action-soft-bg-hover: var(--aoi-intent-primary-soft-bg-hover);
  --aoi-action-soft-bg-pressed: var(--aoi-intent-primary-soft-bg-pressed);
  --aoi-action-border: var(--aoi-intent-primary-border);
  --aoi-action-plain-hover: var(--aoi-intent-primary-plain-hover);
  --aoi-action-plain-pressed: var(--aoi-intent-primary-plain-pressed);
}

.aoi-button[data-aoi-tone="neutral"] {
  --aoi-action-color: var(--aoi-intent-neutral-color);
  --aoi-action-on-solid: var(--aoi-intent-neutral-on-solid);
  --aoi-action-solid-bg: var(--aoi-intent-neutral-solid-bg);
  --aoi-action-solid-bg-hover: var(--aoi-intent-neutral-solid-bg-hover);
  --aoi-action-solid-bg-pressed: var(--aoi-intent-neutral-solid-bg-pressed);
  --aoi-action-soft-bg: var(--aoi-intent-neutral-soft-bg);
  --aoi-action-soft-bg-hover: var(--aoi-intent-neutral-soft-bg-hover);
  --aoi-action-soft-bg-pressed: var(--aoi-intent-neutral-soft-bg-pressed);
  --aoi-action-border: var(--aoi-intent-neutral-border);
  --aoi-action-plain-hover: var(--aoi-intent-neutral-plain-hover);
  --aoi-action-plain-pressed: var(--aoi-intent-neutral-plain-pressed);
}

.aoi-button[data-aoi-tone="success"] {
  --aoi-action-color: var(--aoi-intent-success-color);
  --aoi-action-on-solid: var(--aoi-intent-success-on-solid);
  --aoi-action-solid-bg: var(--aoi-intent-success-solid-bg);
  --aoi-action-solid-bg-hover: var(--aoi-intent-success-solid-bg-hover);
  --aoi-action-solid-bg-pressed: var(--aoi-intent-success-solid-bg-pressed);
  --aoi-action-soft-bg: var(--aoi-intent-success-soft-bg);
  --aoi-action-soft-bg-hover: var(--aoi-intent-success-soft-bg-hover);
  --aoi-action-soft-bg-pressed: var(--aoi-intent-success-soft-bg-pressed);
  --aoi-action-border: var(--aoi-intent-success-border);
  --aoi-action-plain-hover: var(--aoi-intent-success-plain-hover);
  --aoi-action-plain-pressed: var(--aoi-intent-success-plain-pressed);
}

.aoi-button[data-aoi-tone="warning"] {
  --aoi-action-color: var(--aoi-intent-warning-color);
  --aoi-action-on-solid: var(--aoi-intent-warning-on-solid);
  --aoi-action-solid-bg: var(--aoi-intent-warning-solid-bg);
  --aoi-action-solid-bg-hover: var(--aoi-intent-warning-solid-bg-hover);
  --aoi-action-solid-bg-pressed: var(--aoi-intent-warning-solid-bg-pressed);
  --aoi-action-soft-bg: var(--aoi-intent-warning-soft-bg);
  --aoi-action-soft-bg-hover: var(--aoi-intent-warning-soft-bg-hover);
  --aoi-action-soft-bg-pressed: var(--aoi-intent-warning-soft-bg-pressed);
  --aoi-action-border: var(--aoi-intent-warning-border);
  --aoi-action-plain-hover: var(--aoi-intent-warning-plain-hover);
  --aoi-action-plain-pressed: var(--aoi-intent-warning-plain-pressed);
}

.aoi-button[data-aoi-tone="danger"] {
  --aoi-action-color: var(--aoi-intent-danger-color);
  --aoi-action-on-solid: var(--aoi-intent-danger-on-solid);
  --aoi-action-solid-bg: var(--aoi-intent-danger-solid-bg);
  --aoi-action-solid-bg-hover: var(--aoi-intent-danger-solid-bg-hover);
  --aoi-action-solid-bg-pressed: var(--aoi-intent-danger-solid-bg-pressed);
  --aoi-action-soft-bg: var(--aoi-intent-danger-soft-bg);
  --aoi-action-soft-bg-hover: var(--aoi-intent-danger-soft-bg-hover);
  --aoi-action-soft-bg-pressed: var(--aoi-intent-danger-soft-bg-pressed);
  --aoi-action-border: var(--aoi-intent-danger-border);
  --aoi-action-plain-hover: var(--aoi-intent-danger-plain-hover);
  --aoi-action-plain-pressed: var(--aoi-intent-danger-plain-pressed);
}

.aoi-button[data-aoi-tone="info"] {
  --aoi-action-color: var(--aoi-intent-info-color);
  --aoi-action-on-solid: var(--aoi-intent-info-on-solid);
  --aoi-action-solid-bg: var(--aoi-intent-info-solid-bg);
  --aoi-action-solid-bg-hover: var(--aoi-intent-info-solid-bg-hover);
  --aoi-action-solid-bg-pressed: var(--aoi-intent-info-solid-bg-pressed);
  --aoi-action-soft-bg: var(--aoi-intent-info-soft-bg);
  --aoi-action-soft-bg-hover: var(--aoi-intent-info-soft-bg-hover);
  --aoi-action-soft-bg-pressed: var(--aoi-intent-info-soft-bg-pressed);
  --aoi-action-border: var(--aoi-intent-info-border);
  --aoi-action-plain-hover: var(--aoi-intent-info-plain-hover);
  --aoi-action-plain-pressed: var(--aoi-intent-info-plain-pressed);
}

.aoi-button[data-aoi-variant="plain"][data-aoi-tone="muted"] {
  --md-text-button-hover-state-layer-color: var(--aoi-text);
  --md-text-button-focus-state-layer-color: var(--aoi-text);
  --md-text-button-pressed-state-layer-color: var(--aoi-text);
  --md-text-button-hover-state-layer-opacity: .06;
  --md-text-button-focus-state-layer-opacity: .08;
  --md-text-button-pressed-state-layer-opacity: .1;
}

@keyframes aoi-spin {
  to {
    rotate: 360deg;
  }
}
</style>
