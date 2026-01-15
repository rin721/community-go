import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { imagetools } from 'vite-imagetools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), imagetools()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
})
