<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router"

type LinkTarget = "_blank" | "_parent" | "_self" | "_top" | (string & {})
type AriaCurrentValue = "page" | "step" | "location" | "date" | "time" | "true" | "false"
type AoiLinkSlotProps = {
  href?: string | null
  isActive?: boolean
  isExactActive?: boolean
  isExternal?: boolean
  navigate?: (event?: MouseEvent) => Promise<unknown>
  rel?: string | null
  target?: LinkTarget | null
}
type UrlParts = {
  host: string
  protocol: string
  suffix: string
}

defineOptions({
  inheritAttrs: false
})

const slots = useSlots()
const attrs = useAttrs()
const props = withDefaults(defineProps<{
  activeClass?: string
  ariaCurrentValue?: AriaCurrentValue
  custom?: boolean
  exactActiveClass?: string
  external?: boolean
  formatUrl?: boolean
  href?: RouteLocationRaw
  noPrefetch?: boolean
  noRel?: boolean
  prefetch?: boolean
  rel?: string | null
  replace?: boolean
  target?: LinkTarget | null
  to?: RouteLocationRaw
  ripple?: boolean
}>(), {
  activeClass: undefined,
  ariaCurrentValue: undefined,
  custom: false,
  exactActiveClass: undefined,
  external: undefined,
  formatUrl: false,
  href: undefined,
  noPrefetch: false,
  noRel: false,
  prefetch: undefined,
  rel: undefined,
  replace: false,
  target: undefined,
  to: undefined,
  ripple: false
})

defineSlots<{
  default?: (props: AoiLinkSlotProps) => unknown
}>()

const linkProps = computed(() => ({
  activeClass: props.activeClass,
  ariaCurrentValue: props.ariaCurrentValue,
  exactActiveClass: props.exactActiveClass,
  external: props.external,
  href: props.href,
  noPrefetch: props.noPrefetch || undefined,
  noRel: props.noRel || undefined,
  prefetch: props.prefetch,
  rel: props.rel,
  replace: props.replace || undefined,
  target: props.target,
  to: props.to
}))

const urlSource = computed(() => getRouteLocationString(props.to) || getRouteLocationString(props.href))
const urlParts = computed(() => parseAbsoluteUrl(urlSource.value))
const shouldFormatUrl = computed(() => Boolean(urlParts.value && (props.formatUrl || !slots.default)))
const hasUserClass = computed(() => Boolean(attrs.class))
const resolvedLinkAttrs = computed(() => ({
  ...linkProps.value,
  ...attrs,
  class: [
    { "aoi-link": !hasUserClass.value },
    attrs.class,
    { "aoi-link--url": shouldFormatUrl.value },
    { "aoi-link--has-ripple": props.ripple }
  ]
}))

function getRouteLocationString(location?: RouteLocationRaw) {
  return typeof location === "string" ? location.trim() : undefined
}

function parseAbsoluteUrl(value?: string): UrlParts | undefined {
  if (!value) {
    return undefined
  }

  const match = /^([a-z][a-z\d+\-.]*:\/\/)([^/?#]+)(.*)$/i.exec(value)

  if (!match) {
    return undefined
  }

  return {
    host: match[2] || "",
    protocol: match[1] || "",
    suffix: match[3] || ""
  }
}
</script>

<template>
  <span
    v-if="custom"
    class="aoi-link-custom"
  >
    <NuxtLink
      v-bind="linkProps"
      custom
    >
      <template #default="slotProps">
        <slot v-bind="slotProps" />
      </template>
    </NuxtLink>
  </span>
  <NuxtLink
    v-else
    v-bind="resolvedLinkAttrs"
  >
    <AoiRipple v-if="ripple" class="aoi-link__ripple" />
    <template v-if="shouldFormatUrl && urlParts">
      <span class="aoi-link__url-derived">{{ urlParts.protocol }}</span>
      <span class="aoi-link__url-host">{{ urlParts.host }}</span>
      <span v-if="urlParts.suffix" class="aoi-link__url-derived">{{ urlParts.suffix }}</span>
    </template>
    <slot v-else />
  </NuxtLink>
</template>

<style>
.aoi-link-custom {
  display: contents;
}

:where(.aoi-link) {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  align-items: baseline;
  flex-wrap: wrap;
  vertical-align: baseline;
}

.aoi-link--url {
  color: var(--aoi-accent-60);
  font-weight: 780;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.aoi-link__url-derived {
  color: color-mix(in srgb, var(--aoi-accent-60) 34%, white);
  font-weight: 720;
}

.aoi-link__url-host {
  color: var(--aoi-accent-60);
  font-weight: 850;
}

.aoi-link--has-ripple {
  position: relative;
  overflow: clip;
}

.aoi-link__ripple {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
}
</style>
