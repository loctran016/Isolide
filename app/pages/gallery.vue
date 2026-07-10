<script setup lang="ts">
import type { CloudinaryPhoto } from '~~/server/api/gallery.get'

definePageMeta({ title: 'Light Island' })

const { data: photos, status } = await useFetch<CloudinaryPhoto[]>('/api/gallery')

const ALL = 'All'
const UNTAGGED = 'Untagged'

// category = folder, kept as its own filter axis (per your rename)
const categories = computed(() => {
  const unique = [...new Set((photos.value ?? []).map((p) => p.folder))].sort((a, b) =>
    a.localeCompare(b),
  )
  return [ALL, ...unique]
})

// tag, filtered independently from category
const tags = computed(() => {
  const unique = new Set<string>()
  for (const photo of photos.value ?? []) {
    if (photo.tags.length) photo.tags.forEach((t) => unique.add(t))
    else unique.add(UNTAGGED)
  }
  return [ALL, ...[...unique].sort((a, b) => a.localeCompare(b))]
})

const selectedCategory = ref(ALL)
const selectedTag = ref(ALL)

const filteredPhotos = computed(() => {
  return (photos.value ?? []).filter((photo) => {
    const matchesCategory =
      selectedCategory.value === ALL || photo.folder === selectedCategory.value
    const matchesTag =
      selectedTag.value === ALL ||
      (selectedTag.value === UNTAGGED ? !photo.tags.length : photo.tags.includes(selectedTag.value))
    return matchesCategory && matchesTag
  })
})
</script>
<template>
  <div class="mx-auto px-10 w-full mt-4 space-y-6 font-sans dark:text-gray-100 card">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <h2 class="text-2xl font-semibold font-head">Gallery</h2>

      <ClientOnly>
        <div class="flex items-center gap-3">
          <Select v-model="selectedCategory" :options="categories" />
          <Select v-model="selectedTag" :options="tags" />
        </div>
        <template #fallback>
          <div class="flex items-center gap-3">
            <div
              class="h-9 w-28 rounded-xl border border-white/40 dark:border-white/10 bg-white/30 dark:bg-stone-700/10 animate-pulse"
            />
            <div
              class="h-9 w-28 rounded-xl border border-white/40 dark:border-white/10 bg-white/30 dark:bg-stone-700/10 animate-pulse"
            />
          </div>
        </template>
      </ClientOnly>
    </div>

    <p v-if="status === 'pending'" class="text-stone-500 dark:text-stone-400">Loading photos…</p>

    <MasonryWall
      v-else-if="filteredPhotos.length"
      :items="filteredPhotos"
      :column-width="220"
      :gap="12"
      :ssr-columns="2"
      :min-columns="1"
    >
      <template #default="slotProps">
        <CldImage
          v-if="slotProps?.item"
          :src="slotProps.item.publicId"
          :width="400"
          :height="Math.round((slotProps.item.height / (slotProps.item.width || 1)) * 400)"
          crop="limit"
          format="auto"
          quality="auto"
          loading="lazy"
          :alt="slotProps.item.publicId"
          class="rounded-lg w-full block"
        />
      </template>
    </MasonryWall>

    <p v-else class="text-stone-500 dark:text-stone-400">
      No photos match {{ selectedCategory }} / {{ selectedTag }}.
    </p>
  </div>
</template>
