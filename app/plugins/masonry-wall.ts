// app/plugins/masonry-wall.client.ts
import { MasonryWall } from '@yeger/vue-masonry-wall'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('MasonryWall', MasonryWall)
})
