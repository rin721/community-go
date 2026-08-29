<script setup lang="ts">
const props = withDefaults(defineProps<{
  description?: string
  disabled?: boolean
  eyebrow?: string
  errorMessage?: string
  loading?: boolean
  submitIcon?: string
  submitLabel: string
  successMessage?: string
  title: string
  titleId: string
}>(), {
  description: undefined,
  disabled: false,
  eyebrow: "Aoi Account",
  errorMessage: undefined,
  loading: false,
  submitIcon: undefined,
  successMessage: undefined
})

const emit = defineEmits<{
  submit: []
}>()
</script>

<template>
  <form class="auth-panel" @submit.prevent="emit('submit')">
    <p v-if="props.eyebrow" class="auth-panel__eyebrow">{{ props.eyebrow }}</p>
    <h1 :id="props.titleId">{{ props.title }}</h1>
    <p v-if="props.description" class="auth-panel__description">{{ props.description }}</p>

    <div class="auth-panel__fields">
      <slot name="fields" />
    </div>

    <AoiButton
      tone="accent"
      variant="filled"
      :icon="props.submitIcon"
      type="submit"
      :disabled="props.disabled"
      :loading="props.loading"
    >
      {{ props.submitLabel }}
    </AoiButton>

    <AoiStatusMessage
      v-if="props.errorMessage"
      intent="danger"
      icon="circle-alert"
      :message="props.errorMessage"
    />

    <AoiStatusMessage
      v-if="props.successMessage"
      intent="success"
      icon="circle-check"
      :message="props.successMessage"
    />

    <slot />

    <div v-if="$slots.switch" class="auth-panel__switch">
      <slot name="switch" />
    </div>
  </form>
</template>

<style scoped>
.auth-panel {
  display: grid;
  align-content: center;
  gap: 16px;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-container);
  background: var(--aoi-surface);
  box-shadow: var(--aoi-shadow-sm);
  padding: 24px;
}

.auth-panel__eyebrow,
.auth-panel__description,
.auth-panel__switch {
  margin: 0;
}

.auth-panel__eyebrow {
  color: var(--aoi-active-color);
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0;
  text-transform: uppercase;
}

.auth-panel h1 {
  margin: 0;
  color: var(--aoi-text);
  font-size: 30px;
  line-height: 1.2;
}

.auth-panel__description,
.auth-panel__switch {
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.auth-panel__fields {
  display: grid;
  gap: 12px;
}

.auth-panel__switch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.auth-panel__switch :deep(.aoi-link) {
  color: var(--aoi-accent-60);
  font-weight: 800;
}

@media (max-width: 639px) {
  .auth-panel {
    padding: 18px;
  }

  .auth-panel h1 {
    font-size: 24px;
  }
}
</style>
