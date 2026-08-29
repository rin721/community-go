<script setup lang="ts">
import type { AoiSkeletonAnimation, AoiSkeletonEmphasis, AoiSkeletonShape, AoiSkeletonSize } from "~/utils/aoiSkeleton"
import { aoiSkeletonDefaultsKey, toAoiSkeletonCssValue } from "~/utils/aoiSkeleton"

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<{
  animation?: AoiSkeletonAnimation
  ariaHidden?: boolean
  aspectRatio?: AoiSkeletonSize
  height?: AoiSkeletonSize
  inline?: boolean
  maxWidth?: AoiSkeletonSize
  minWidth?: AoiSkeletonSize
  radius?: AoiSkeletonSize
  shape?: AoiSkeletonShape
  tag?: string
  emphasis?: AoiSkeletonEmphasis
  width?: AoiSkeletonSize
}>(), {
  animation: undefined,
  ariaHidden: true,
  aspectRatio: undefined,
  height: undefined,
  inline: false,
  maxWidth: undefined,
  minWidth: undefined,
  radius: undefined,
  shape: "block",
  tag: "span",
  emphasis: undefined,
  width: undefined
})

const attrs = useAttrs()
const defaults = inject(aoiSkeletonDefaultsKey, null)
const resolvedAnimation = computed(() => props.animation ?? defaults?.animation.value ?? "shimmer")
const resolvedEmphasis = computed(() => props.emphasis ?? defaults?.emphasis.value)
const passThroughAttrs = computed(() => {
  const {
    class: _class,
    style: _style,
    ...rest
  } = attrs

  return rest
})
const skeletonStyle = computed(() => ({
  "--aoi-skeleton-width": toAoiSkeletonCssValue(props.width),
  "--aoi-skeleton-height": toAoiSkeletonCssValue(props.height),
  "--aoi-skeleton-min-width": toAoiSkeletonCssValue(props.minWidth),
  "--aoi-skeleton-max-width": toAoiSkeletonCssValue(props.maxWidth),
  "--aoi-skeleton-aspect-ratio": toAoiSkeletonCssValue(props.aspectRatio),
  "--aoi-skeleton-radius": toAoiSkeletonCssValue(props.radius)
}))
</script>

<template>
  <component
    :is="tag"
    v-bind="passThroughAttrs"
    class="aoi-skeleton"
    :class="[
      attrs.class,
      `aoi-skeleton--${shape}`,
      { 'aoi-skeleton--inline': inline }
    ]"
    :style="[skeletonStyle, attrs.style]"
    :aria-hidden="ariaHidden ? 'true' : undefined"
    :data-aoi-skeleton-animation="resolvedAnimation"
    :data-aoi-skeleton-emphasis="resolvedEmphasis"
  >
    <slot />
  </component>
</template>

<style scoped>
.aoi-skeleton {
  position: relative;
  display: block;
  width: var(--aoi-skeleton-width, var(--aoi-skeleton-default-width, 100%));
  min-width: var(--aoi-skeleton-min-width, 0);
  max-width: var(--aoi-skeleton-max-width, 100%);
  height: var(--aoi-skeleton-height, var(--aoi-skeleton-default-height, 1rem));
  aspect-ratio: var(--aoi-skeleton-aspect-ratio, var(--aoi-skeleton-default-aspect-ratio, auto));
  overflow: hidden;
  border-radius: var(--aoi-skeleton-radius, var(--aoi-skeleton-default-radius, var(--aoi-radius-card)));
  background: var(--aoi-skeleton-fill, color-mix(in srgb, var(--aoi-surface-muted) 82%, var(--aoi-border)));
  box-shadow: inset 0 0 0 1px var(--aoi-skeleton-edge, color-mix(in srgb, white 36%, transparent));
  color: transparent;
  contain: paint;
  pointer-events: none;
  user-select: none;
}

.aoi-skeleton--inline {
  display: inline-block;
  vertical-align: middle;
}

.aoi-skeleton--text {
  --aoi-skeleton-default-height: .86em;
  --aoi-skeleton-default-radius: var(--aoi-radius-xs);
}

.aoi-skeleton--media {
  --aoi-skeleton-default-height: auto;
  --aoi-skeleton-default-aspect-ratio: 16 / 9;
  --aoi-skeleton-default-radius: var(--aoi-radius-card);
}

.aoi-skeleton--avatar {
  --aoi-skeleton-default-width: 40px;
  --aoi-skeleton-default-height: 40px;
  --aoi-skeleton-default-radius: var(--aoi-radius-round);
}

.aoi-skeleton--circle {
  --aoi-skeleton-default-width: 40px;
  --aoi-skeleton-default-height: 40px;
  --aoi-skeleton-default-radius: var(--aoi-radius-round);
}

.aoi-skeleton--pill {
  --aoi-skeleton-default-width: 72px;
  --aoi-skeleton-default-height: 24px;
  --aoi-skeleton-default-radius: var(--aoi-radius-round);
}

.aoi-skeleton[data-aoi-skeleton-emphasis="surface"] {
  --aoi-skeleton-fill: color-mix(in srgb, var(--aoi-surface-solid) 78%, var(--aoi-surface-muted));
  --aoi-skeleton-highlight: color-mix(in srgb, white 82%, transparent);
}

.aoi-skeleton[data-aoi-skeleton-emphasis="strong"] {
  --aoi-skeleton-fill: color-mix(in srgb, var(--aoi-text-muted) 16%, var(--aoi-surface-muted));
  --aoi-skeleton-highlight: color-mix(in srgb, white 72%, transparent);
}

.aoi-skeleton[data-aoi-skeleton-emphasis="accent"] {
  --aoi-skeleton-fill: color-mix(in srgb, var(--aoi-accent-50) 15%, var(--aoi-surface-muted));
  --aoi-skeleton-highlight: color-mix(in srgb, var(--aoi-sun-50) 24%, white 58%);
  --aoi-skeleton-edge: color-mix(in srgb, var(--aoi-accent-50) 18%, transparent);
}

.aoi-skeleton[data-aoi-skeleton-animation="shimmer"]::after {
  position: absolute;
  inset: 0;
  content: "";
  background:
    linear-gradient(
      100deg,
      transparent 0%,
      var(--aoi-skeleton-highlight, color-mix(in srgb, white 68%, transparent)) 42%,
      transparent 76%
    );
  transform: translate3d(-120%, 0, 0);
  animation: aoi-skeleton-shimmer 1350ms var(--aoi-ease-out) infinite;
}

.aoi-skeleton[data-aoi-skeleton-animation="pulse"] {
  animation: aoi-skeleton-pulse 1400ms var(--aoi-ease-out) infinite;
}

.aoi-skeleton[data-aoi-skeleton-animation="none"]::after {
  content: none;
}

:global(:root.dark) .aoi-skeleton {
  --aoi-skeleton-fill: color-mix(in srgb, var(--aoi-surface-muted) 72%, white 5%);
  --aoi-skeleton-highlight: color-mix(in srgb, white 12%, transparent);
  --aoi-skeleton-edge: color-mix(in srgb, white 7%, transparent);
}

:global(:root.dark) .aoi-skeleton[data-aoi-skeleton-emphasis="surface"] {
  --aoi-skeleton-fill: color-mix(in srgb, var(--aoi-surface-solid) 86%, white 5%);
  --aoi-skeleton-highlight: color-mix(in srgb, white 14%, transparent);
}

:global(:root.dark) .aoi-skeleton[data-aoi-skeleton-emphasis="strong"] {
  --aoi-skeleton-fill: color-mix(in srgb, var(--aoi-text-muted) 24%, var(--aoi-surface-muted));
  --aoi-skeleton-highlight: color-mix(in srgb, white 18%, transparent);
}

:global(:root.dark) .aoi-skeleton[data-aoi-skeleton-emphasis="accent"] {
  --aoi-skeleton-fill: color-mix(in srgb, var(--aoi-accent-40) 18%, var(--aoi-surface-muted));
  --aoi-skeleton-highlight: color-mix(in srgb, var(--aoi-accent-40) 32%, white 8%);
}

:global(:root[data-aoi-contrast="high"]) .aoi-skeleton {
  --aoi-skeleton-fill: color-mix(in srgb, var(--aoi-text-muted) 18%, var(--aoi-surface-solid));
  --aoi-skeleton-edge: var(--aoi-border);
}

@keyframes aoi-skeleton-shimmer {
  to {
    transform: translate3d(120%, 0, 0);
  }
}

@keyframes aoi-skeleton-pulse {
  0%,
  100% {
    opacity: .72;
  }

  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aoi-skeleton,
  .aoi-skeleton::after {
    animation: none !important;
  }
}
</style>
