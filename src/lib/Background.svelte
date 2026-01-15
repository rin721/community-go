<script>
  import { onMount } from "svelte";

  // Load images
  const modules = import.meta.glob(
    "../assets/images/*.{png,jpg,jpeg,webp,svg}",
    {
      eager: true,
      query: { w: 400, format: "webp", quality: 10 },
    }
  );
  const imageUrls = Object.values(modules).map((mod) => mod.default);
  const hasImages = imageUrls.length > 0;

  // Fallback colors
  const colors = [
    "#ff9ff3",
    "#feca57",
    "#ff6b6b",
    "#48dbfb",
    "#1dd1a1",
    "#5f27cd",
    "#54a0ff",
    "#00d2d3",
    "#c8d6e5",
    "#8395a7",
  ];

  /* 
     Configuration 
  */

  let innerWidth = 0;
  let innerHeight = 0;

  // Reduced Speed
  const SPEED = 0.25;
  // Larger tiles for less chaotic feel
  const TILE_SIZE = 360;

  let items = [];
  let requestRef;
  let time = 0;

  // Initialize grid
  function initItems() {
    // Generate enough tiles to cover screen + buffer
    // Extra columns/rows for wrapping
    // We increase the buffer slightly because rotation might expose edges
    const cols = Math.ceil(innerWidth / TILE_SIZE) + 2;
    const rows = Math.ceil(innerHeight / TILE_SIZE) + 2;

    const totalWidth = cols * TILE_SIZE;
    const totalHeight = rows * TILE_SIZE;

    const newItems = [];

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let imageUrl = null;
        let color = colors[Math.floor(Math.random() * colors.length)];

        if (hasImages) {
          imageUrl = imageUrls[Math.floor(Math.random() * imageUrls.length)];
        }

        newItems.push({
          // Base grid position
          gridX: i * TILE_SIZE,
          gridY: j * TILE_SIZE,

          // Static offsets for "messy" look
          offsetX: (Math.random() - 0.5) * 80, // Increased offset range
          offsetY: (Math.random() - 0.5) * 80,

          width: TILE_SIZE,
          height: TILE_SIZE,
          color,
          imageUrl,
          id: `${i}-${j}`,
          scale: 0.85 + Math.random() * 0.25, // 0.85 - 1.1
          rotation: (Math.random() - 0.5) * 40, // Random rotation +/- 20deg
          zIndex: Math.floor(Math.random() * 5),
        });
      }
    }
    items = newItems;
  }

  /*
    Seamless Wrapping Logic
  */
  function animate() {
    time += SPEED;

    const boundsX = (Math.ceil(innerWidth / TILE_SIZE) + 2) * TILE_SIZE;
    const boundsY = (Math.ceil(innerHeight / TILE_SIZE) + 2) * TILE_SIZE;

    // Center Offset: shift everything so we start filling from top-left properly with buffer

    items = items.map((item) => {
      let rawX = item.gridX - time + item.offsetX;
      let rawY = item.gridY + time + item.offsetY;

      const minX = -TILE_SIZE * 1.5; // Larger buffer for rotation
      const width = boundsX;
      let displayX = ((((rawX - minX) % width) + width) % width) + minX;

      const minY = -TILE_SIZE * 1.5;
      const height = boundsY;
      let displayY = ((((rawY - minY) % height) + height) % height) + minY;

      return { ...item, displayX, displayY };
    });

    requestRef = requestAnimationFrame(animate);
  }

  onMount(() => {
    if (innerWidth) initItems();
    requestRef = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef);
  });

  // React to resize
  $: if (innerWidth && innerHeight && items.length === 0) {
    initItems();
  }
</script>

<svelte:window bind:innerWidth bind:innerHeight on:resize={initItems} />

<div class="background-container">
  {#each items as item (item.id)}
    <div
      class="tile"
      style="
          transform: translate3d({item.displayX}px, {item.displayY}px, 0) scale({item.scale}) rotate({item.rotation}deg);
          width: {item.width}px;
          height: {item.height}px;
          z-index: {item.zIndex};
        "
    >
      {#if item.imageUrl}
        <img src={item.imageUrl} alt="" loading="lazy" />
      {:else}
        <div class="placeholder" style="background-color: {item.color}"></div>
      {/if}
    </div>
  {/each}
  <div class="overlay"></div>
</div>

<style>
  .background-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    overflow: hidden;
    background-color: var(--bg-cool);
  }

  .tile {
    position: absolute;
    top: 0;
    left: 0;
    /* Soft white border style */
    border: 8px solid #ffffff;
    border-radius: 32px; /* Very rounded corners for softness */
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);

    will-change: transform;
    overflow: hidden;
    /* Ensure borderbox includes border */
    box-sizing: border-box;
  }

  .tile img,
  .tile .placeholder {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    /* Prevent image from bleeding out of border-radius if browser renders weirdly */
    border-radius: 20px;
  }

  .placeholder {
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.4),
      rgba(0, 0, 0, 0.1)
    );
  }

  .overlay {
    position: absolute;
    inset: 0;
    /* Soft overlay */
    background: radial-gradient(
      circle at center,
      rgba(34, 47, 62, 0.5) 0%,
      rgba(34, 47, 62, 0.8) 100%
    );
    backdrop-filter: blur(4px);
    z-index: 100;
  }
</style>
