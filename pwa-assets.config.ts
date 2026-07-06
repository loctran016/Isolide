// pwa-assets.config.ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  // Specify your preset blueprint configuration
  preset: minimal2023Preset,
  images: [
    // Point this to the source SVG logo you want to parse
    'public/logo.svg',
  ],
})
