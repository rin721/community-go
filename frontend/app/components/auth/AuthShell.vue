<script setup lang="ts">
const props = withDefaults(defineProps<{
  labelledby: string
  visualPosition?: "start" | "end"
}>(), {
  visualPosition: "start"
})
</script>

<template>
  <section
    class="auth-shell"
    :class="`auth-shell--visual-${props.visualPosition}`"
    :aria-labelledby="props.labelledby"
  >
    <div class="auth-shell__visual">
      <slot name="visual" />
    </div>
    <div class="auth-shell__panel">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.auth-shell {
  display: grid;
  gap: 20px;
  align-items: stretch;
}

.auth-shell--visual-start {
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, .95fr);
}

.auth-shell--visual-end {
  grid-template-columns: minmax(320px, .95fr) minmax(0, 1.05fr);
}

.auth-shell--visual-end .auth-shell__visual {
  order: 2;
}

.auth-shell--visual-end .auth-shell__panel {
  order: 1;
}

@media (max-width: 860px) {
  .auth-shell,
  .auth-shell--visual-start,
  .auth-shell--visual-end {
    grid-template-columns: 1fr;
  }

  .auth-shell--visual-end .auth-shell__visual,
  .auth-shell--visual-end .auth-shell__panel {
    order: initial;
  }
}
</style>
