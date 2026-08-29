<template>
  <div>
    <main class="aoi-shell-auth">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.aoi-shell-auth {
  min-height: 100vh;
  margin-left: 0;
  transform: translate3d(0, var(--aoi-page-rubber-band-offset, 0px), 0);
}
</style>
