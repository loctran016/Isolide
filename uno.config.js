import { defineConfig, presetWind4, presetIcons, presetWebFonts } from 'unocss'
import { presetScrollbar } from 'unocss-preset-scrollbar'
import { presetScrollbarHide } from 'unocss-preset-scrollbar-hide'
export default defineConfig({
  presets: [
    presetWind4({
      preflights: {
        reset: true,
      },
    }),
    presetIcons(),
    presetWebFonts({
      provider: 'google', // default provider
      fonts: {
        // these will extend the default theme
        sans: 'Inter',
        head: 'Space Grotesk',
        // mono: ["Fira Code", "Fira Mono:400,700"],
        // custom ones
      },
    }),
    presetScrollbar(),
  ],
  shortcuts: {
    card: 'rounded-2xl bg-white/45 dark:bg-stone-800/50 backdrop-blur-xl backdrop-saturate-150 border border-white/40 dark:border-white/10 p-6',
    'card-title': 'font-semibold font-head flex items-center gap-1 ml-2 text-lg',
    'scrollarea-track':
      'flex select-none touch-none p-0.5 z-20 transition-colors duration-[160ms] ease-out data-[orientation=vertical]:w-2 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2',
    'scrollarea-thumb':
      'flex-1 bg-purple-500/40 hover:bg-purple-500/70 dark:bg-purple-400/30 dark:hover:bg-purple-400/60 rounded-full relative before:content-empty before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-44px before:min-h-44px',
  },
})
