<script setup lang="ts">
import { today, parseDate } from '@internationalized/date'

const props = withDefaults(
  defineProps<{
    logsByDate: Record<string, number> // iso date -> count
    maxValue: number // max possible per day (1 for single habits, 2 for skincare)
    color: string
    isDark: boolean
    showYearSelector?: boolean
    height?: string // css height class
  }>(),
  {
    showYearSelector: false,
    height: 'h-50',
  },
)

const TIME_ZONE = 'Asia/Ho_Chi_Minh'

// Pin today
const todayDate = today(TIME_ZONE).toString()
const todayYear = computed(() => parseDate(todayDate).year)

// Year selector (optional)
const selectedYear = ref(todayYear.value)

const availableYears = computed(() => {
  const years = new Set([todayYear.value])
  for (const iso of Object.keys(props.logsByDate)) {
    const year = parseInt(iso.slice(0, 4))
    if (!isNaN(year)) years.add(year)
  }
  return [...years].sort((a, b) => b - a)
})

// Generate full year heatmap data
const yearHeatmapData = computed(() => {
  const year = props.showYearSelector ? selectedYear.value : todayYear.value
  const data: [string, number][] = []
  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year, 11, 31))

  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    data.push([iso, props.logsByDate[iso] ?? 0])
  }
  return data
})

function formatIsoDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

const chartOption = computed(() => {
  const textColor = props.isDark ? '#e7e5e4' : '#44403c'
  const year = props.showYearSelector ? selectedYear.value : todayYear.value

  return {
    tooltip: {
      formatter: (params: any) =>
        `${formatIsoDate(params.value[0])}: ${params.value[1]}/${props.maxValue}`,
    },
    visualMap: {
      min: 0,
      max: props.maxValue,
      show: false,
      inRange: {
        color: [
          `${props.color}0F`, // 6% opacity
          props.color,
        ],
      },
    },
    calendar: {
      top: 40,
      left: 40,
      right: 20,
      bottom: 20,
      cellSize: ['auto', 16],
      range: String(year),
      firstDay: 1,
      itemStyle: {
        borderWidth: 3,
        borderColor: 'transparent',
        color: 'transparent',
      },
      splitLine: { show: false },
      yearLabel: { show: false },
      monthLabel: { color: textColor },
      dayLabel: {
        color: textColor,
        nameMap: ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'],
      },
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: yearHeatmapData.value,
      },
    ],
  }
})
</script>

<template>
  <div>
    <!-- Year selector (only shown when showYearSelector is true) -->
    <div v-if="showYearSelector" class="flex justify-end mb-2">
      <ClientOnly>
        <Select
          :model-value="String(selectedYear)"
          @update:model-value="(v: string) => (selectedYear = Number(v))"
          :options="availableYears.map(String)"
        />
        <template #fallback>
          <div
            class="h-9 w-20 rounded-xl border border-white/40 dark:border-white/10 bg-white/30 dark:bg-stone-700/10 animate-pulse"
          />
        </template>
      </ClientOnly>
    </div>

    <ClientOnly>
      <VChart :option="chartOption" autoresize :class="[height, 'w-full']" />
      <template #fallback>
        <div :class="[height, 'flex items-center justify-center text-sm opacity-50']">Loading…</div>
      </template>
    </ClientOnly>
  </div>
</template>
