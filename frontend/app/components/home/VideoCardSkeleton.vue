<template>
  <AoiSkeletonGroup
    class="video-card-skeleton"
    tag="article"
    layout="stack"
    gap="8px"
    :busy="false"
  >
    <AoiSkeleton
      class="video-card-skeleton__cover"
      shape="media"
      aspect-ratio="16 / 9"
      radius="var(--aoi-radius-card)"
      emphasis="accent"
    />

    <AoiSkeletonText
      class="video-card-skeleton__title"
      :lines="2"
      :widths="['94%', '72%']"
      line-height="14px"
      gap="8px"
    />

    <AoiSkeletonGroup
      layout="row"
      gap="6px"
      align="center"
      :busy="false"
    >
      <AoiSkeleton shape="circle" width="4px" height="4px" emphasis="strong" />
      <AoiSkeleton shape="text" width="42%" height="10px" />
    </AoiSkeletonGroup>

    <AoiSkeletonGroup
      layout="row"
      gap="8px"
      align="center"
      wrap
      :busy="false"
    >
      <AoiSkeleton shape="pill" width="36px" height="11px" />
      <AoiSkeleton shape="pill" width="32px" height="11px" />
      <AoiSkeleton shape="pill" width="38px" height="11px" />
      <AoiSkeleton shape="pill" width="54px" height="11px" />
    </AoiSkeletonGroup>
  </AoiSkeletonGroup>
</template>

<style scoped>
.video-card-skeleton {
  min-width: 0;
  border-radius: var(--aoi-radius-card);
  padding: 8px;
}

.video-card-skeleton__cover {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .32);
}

.video-card-skeleton__title {
  min-height: 42px;
  align-content: start;
}

@media (max-width: 639px) {
  .video-card-skeleton {
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    gap: 7px;
    padding: 5px;
  }

  .video-card-skeleton__title {
    min-height: 40px;
  }
}
</style>
