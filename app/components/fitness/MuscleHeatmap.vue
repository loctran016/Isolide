<script setup lang="ts">
import bodyFrontRaw from '~/assets/svg/body-front.svg?raw'
import bodyBackRaw from '~/assets/svg/body-back.svg?raw'
import { parseDateTime, today } from '@internationalized/date'
import type { MuscleGroup, StrengthRecord } from '~/types/database.types'

const props = withDefaults(defineProps<{ days?: number; strengthExercises: StrengthRecord[] }>(), {
  days: 30,
})

const emit = defineEmits<{ select: [groups: MuscleGroup[]] }>()

const TIME_ZONE = 'Asia/Ho_Chi_Minh'

const MUSCLE_MAP: Record<MuscleGroup, { front?: string[]; back?: string[] }> = {
  'Upper chest': { front: ['pectoralis_major'] },
  'Middle chest': { front: ['pectoralis_minor'] },
  'Lower chest': { front: ['pectoralis_minor'] },
  'Front delts': { front: ['deltoid_anterior_head'] },
  'Side delts': { front: ['deltoid_middle_head'], back: ['deltoid_middle_head'] },
  'Rear delts': { back: ['deltoid_posterior_head'] },
  'Upper Abs': { front: ['tendinous_inscriptions_upper', 'tendinous_inscriptions_middle'] },
  'Lower Abs': { front: ['tendinous_inscriptions_lower', 'rectus_abdominis'] },
  Obliques: { front: ['obliques_upper', 'obliques_lower'] },
  Lats: { back: ['latissimus_dorsi'] },
  Traps: {
    front: ['trapezius'],
    back: ['trapezius_upper', 'trapezius', 'infraspinatus', 'teres_major'],
  },
  'Lower back': { back: ['erector_spinae'] },
  Forearm: {
    front: ['brachioradialis', 'flexor_carpi_ulnaris', 'extensor_carpi_ulnaris'],
    back: ['brachioradialis', 'flexor_carpi_ulnaris', 'extensor_carpi_ulnaris'],
  },
  Triceps: { back: ['triceps_brachii_lateral_long', 'triceps_brachii_medial'] },
  Biceps: { front: ['biceps_brachii_long_head', 'biceps_brachii_short_head'] },
}

const PATH_TO_GROUPS = computed(() => {
  const map: Record<string, MuscleGroup[]> = {}
  for (const [group, sides] of Object.entries(MUSCLE_MAP) as [
    MuscleGroup,
    { front?: string[]; back?: string[] },
  ][]) {
    for (const id of [...(sides.front ?? []), ...(sides.back ?? [])]) {
      if (!map[id]) map[id] = []
      map[id].push(group)
    }
  }
  return map
})

function setsLoggedForMuscle(group: MuscleGroup, cutoff: ReturnType<typeof today>) {
  let total = 0
  for (const item of props.strengthExercises) {
    if (!item?.date || !item.muscles?.includes(group)) continue
    const d = parseDateTime(item.date)
    if (d.compare(cutoff) < 0) continue
    total += item.sets?.length ?? 0
  }
  return total
}

const volumeByPathId = computed(() => {
  const cutoff = today(TIME_ZONE).subtract({ days: props.days })
  const totals: Record<string, number> = {}
  for (const [group, sides] of Object.entries(MUSCLE_MAP) as [
    MuscleGroup,
    { front?: string[]; back?: string[] },
  ][]) {
    const groupSets = setsLoggedForMuscle(group, cutoff)
    if (groupSets === 0) continue
    for (const id of [...(sides.front ?? []), ...(sides.back ?? [])]) {
      totals[id] = (totals[id] ?? 0) + groupSets
    }
  }
  return totals
})

const maxPathVolume = computed(() => Math.max(1, ...Object.values(volumeByPathId.value)))
const selectedGroups = ref<MuscleGroup[]>([])

const highlightedPathIds = computed(() => {
  const ids = new Set<string>()
  for (const group of selectedGroups.value) {
    const sides = MUSCLE_MAP[group]
    if (!sides) continue
    for (const id of [...(sides.front ?? []), ...(sides.back ?? [])]) ids.add(id)
  }
  return ids
})

function colorForVolume(volume: number) {
  if (volume === 0) return null
  const t = Math.min(1, volume / maxPathVolume.value)
  const alpha = 0.18 + t * 0.5
  return `rgba(168, 85, 247, ${alpha.toFixed(2)})`
}

const frontRef = ref<HTMLDivElement | null>(null)
const backRef = ref<HTMLDivElement | null>(null)
const isMounted = ref(false)

function handlePathClick(id: string) {
  const groups = PATH_TO_GROUPS.value[id]
  if (!groups) return
  selectedGroups.value = groups
  emit('select', groups)
}

function paint(container: HTMLDivElement | null, side: 'front' | 'back') {
  if (!container) return
  const idsForSide = new Set<string>()
  for (const sides of Object.values(MUSCLE_MAP)) {
    for (const id of sides[side] ?? []) idsForSide.add(id)
  }

  for (const id of idsForSide) {
    const el = container.querySelector<SVGPathElement>(`#${id}`)
    if (!el) continue

    const color = colorForVolume(volumeByPathId.value[id] ?? 0)
    if (color) el.style.fill = color
    else el.style.removeProperty('fill')

    el.classList.add('clickable')
    el.classList.toggle('selected', highlightedPathIds.value.has(id))

    el.removeEventListener('click', (el as any)._muscleClickHandler)
    const handler = () => handlePathClick(id)
    ;(el as any)._muscleClickHandler = handler
    el.addEventListener('click', handler)
  }
}

function repaint() {
  paint(frontRef.value, 'front')
  paint(backRef.value, 'back')
}

onMounted(() => {
  isMounted.value = true
  nextTick(repaint)
})

watch(volumeByPathId, () => nextTick(repaint))
watch(selectedGroups, () => nextTick(repaint))
</script>

<template>
  <div v-if="isMounted" class="grid grid-cols-2 gap-4 place-items-center">
    <div ref="frontRef" class="body-map w-full max-w-40" v-html="bodyFrontRaw" />
    <div ref="backRef" class="body-map w-full max-w-40" v-html="bodyBackRaw" />
  </div>
  <div v-else class="h-64 flex items-center justify-center text-sm text-stone-500">Loading…</div>
</template>

<style scoped>
.body-map :deep(path) {
  fill: rgba(41, 37, 36, 0.22);
  stroke: transparent;
  stroke-width: 0;
  cursor: default;
  transition:
    fill 200ms ease,
    stroke 200ms ease;
}

html.dark .body-map :deep(path) {
  fill: rgba(255, 255, 255, 0.22);
}

.body-map :deep(path.clickable) {
  cursor: pointer;
}

.body-map :deep(path.clickable:hover) {
  stroke: rgba(168, 85, 247, 0.35);
  stroke-width: 1.5px;
}

.body-map :deep(path.selected) {
  stroke: #a855f7 !important;
  stroke-width: 2px !important;
}
</style>
