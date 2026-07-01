<template>
  <div>
    <div ref="sheetMusic"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{ abcNotation: string }>()

const sheetMusic = ref<HTMLElement | null>(null)
let abcjs: typeof import('abcjs') | null = null

async function renderAbc() {
  if (!sheetMusic.value || !props.abcNotation) return
  if (!abcjs) abcjs = await import('abcjs')

  sheetMusic.value.innerHTML = ''
  abcjs.renderAbc(sheetMusic.value, props.abcNotation, {
    responsive: 'resize',
    selectionColor: 'oklch(55.8% 0.288 302.321)',
  })
}

onMounted(async () => {
  await renderAbc()
})

watch(
  () => props.abcNotation,
  async () => {
    await renderAbc()
  },
)

onBeforeUnmount(() => {
  if (sheetMusic.value) sheetMusic.value.innerHTML = ''
})
</script>
