<script setup lang="ts">
withDefaults(defineProps<{
  metric?: string
  title: string
  variant?: "login" | "register"
}>(), {
  metric: "ready",
  variant: "login"
})

const rootRef = ref<HTMLElement | null>(null)
const viewport = useAoiInViewport(rootRef, {
  once: false,
  rootMargin: "0px",
  threshold: 0.12
})
const isMotionVisible = computed(() => viewport.isIntersecting.value)
</script>

<template>
  <div
    ref="rootRef"
    class="auth-visual"
    :class="[`auth-visual--${variant}`, { 'auth-visual--paused': !isMotionVisible }]"
    aria-hidden="true"
  >
    <span class="auth-visual__ring auth-visual__ring--outer" />
    <span class="auth-visual__ring auth-visual__ring--inner" />
    <span class="auth-visual__sweep" />
    <span class="auth-visual__lane auth-visual__lane--one" />
    <span class="auth-visual__lane auth-visual__lane--two" />
    <span class="auth-visual__tile auth-visual__tile--one" />
    <span class="auth-visual__tile auth-visual__tile--two" />

    <div class="auth-visual__readout">
      <span>DX Route</span>
      <strong>{{ title }}</strong>
      <small>{{ metric }}</small>
    </div>
  </div>
</template>

<style scoped>
.auth-visual {
  position: relative;
  min-height: 440px;
  overflow: hidden;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-md);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.28), transparent 42%),
    linear-gradient(135deg, var(--aoi-accent-50), var(--aoi-secondary-50) 48%, var(--aoi-sakura-50));
  box-shadow: var(--aoi-shadow-sm);
}

.auth-visual--register {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.28), transparent 42%),
    linear-gradient(135deg, var(--aoi-sakura-50), #7a68f0 48%, var(--aoi-accent-50));
}

.auth-visual__ring,
.auth-visual__lane,
.auth-visual__sweep,
.auth-visual__tile {
  position: absolute;
  pointer-events: none;
}

.auth-visual__ring {
  right: 40px;
  bottom: 44px;
  border: 2px solid rgba(255, 255, 255, 0.82);
  border-radius: var(--aoi-radius-round);
  box-shadow:
    0 0 0 12px rgba(255, 255, 255, 0.14),
    0 0 28px rgba(255, 255, 255, 0.32);
}

.auth-visual__ring--outer {
  width: 168px;
  height: 168px;
  animation: auth-spin 2.2s linear infinite;
  will-change: transform;
}

.auth-visual__ring--inner {
  right: 90px;
  bottom: 94px;
  width: 68px;
  height: 68px;
  border-color: rgba(255, 255, 255, 0.58);
  animation: auth-spin 1.7s linear infinite reverse;
  will-change: transform;
}

.auth-visual__sweep {
  top: -30%;
  left: 50%;
  width: 110px;
  height: 160%;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.58), transparent);
  transform: translate3d(-260px, 0, 0) rotate(27deg);
  animation: auth-sweep-panel 2.1s var(--aoi-ease-out) infinite;
  will-change: transform;
}

.auth-visual__lane {
  left: 34px;
  height: 5px;
  border-radius: var(--aoi-radius-round);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 0 rgba(255, 255, 255, 0.46);
  animation: auth-lane-panel 1.4s var(--aoi-ease-out) both;
}

.auth-visual__lane--one {
  top: 56px;
  width: 168px;
}

.auth-visual__lane--two {
  top: 150px;
  width: 260px;
  background: rgba(255, 255, 255, 0.44);
  animation-delay: 120ms;
}

.auth-visual__tile {
  top: 122px;
  width: 120px;
  height: 82px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: var(--aoi-radius-sm);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.68), rgba(255, 255, 255, 0.2)),
    color-mix(in srgb, var(--aoi-sun-50) 46%, white);
  box-shadow: 0 18px 34px rgba(23, 38, 43, 0.18);
  animation: auth-tile-panel 1.25s var(--aoi-ease-out) both;
  will-change: transform;
}

.auth-visual__tile--one {
  left: 48%;
}

.auth-visual__tile--two {
  left: 66%;
  animation-delay: 160ms;
}

.auth-visual__readout {
  position: absolute;
  right: 26px;
  bottom: 26px;
  left: 26px;
  display: grid;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.48);
  border-radius: var(--aoi-radius-sm);
  background: rgba(255, 255, 255, 0.8);
  color: var(--aoi-text);
  padding: 16px;
  backdrop-filter: blur(16px);
}

.auth-visual__readout span,
.auth-visual__readout small {
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.auth-visual__readout strong {
  color: var(--aoi-accent-60);
  font-size: 34px;
  line-height: 1.1;
}

.auth-visual--paused *,
.auth-visual--paused *::before,
.auth-visual--paused *::after {
  animation-play-state: paused;
}

@keyframes auth-spin {
  to {
    rotate: 360deg;
  }
}

@keyframes auth-sweep-panel {
  0%,
  8% {
    transform: translate3d(-260px, 0, 0) rotate(27deg);
  }

  72%,
  100% {
    transform: translate3d(360px, 0, 0) rotate(27deg);
  }
}

@keyframes auth-lane-panel {
  from {
    clip-path: inset(0 100% 0 0);
    opacity: .25;
  }

  to {
    clip-path: inset(0);
    opacity: 1;
  }
}

@keyframes auth-tile-panel {
  from {
    opacity: 0;
    transform: translate3d(140px, 0, 0) rotate(8deg) scale(.84);
  }

  to {
    opacity: .94;
    transform: translate3d(0, 0, 0) rotate(-3deg) scale(1);
  }
}

@media (max-width: 860px) {
  .auth-visual {
    min-height: 260px;
  }
}

@media (max-width: 639px) {
  .auth-visual__tile--two {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-visual__ring,
  .auth-visual__sweep,
  .auth-visual__tile {
    will-change: auto;
  }
}
</style>
