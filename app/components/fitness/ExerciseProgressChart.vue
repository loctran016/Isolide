<script setup lang="ts">
import { parseDateTime, parseDate } from '@internationalized/date'
import type { StrengthExercise, StrengthRecord } from '~/types/database.types'

const props = withDefaults(
  defineProps<{
    exercise: StrengthExercise | null
    todayDate: string
    isDark: boolean
    strengthExercises: StrengthRecord[] | null
    weeks?: number
  }>(),
  { weeks: 6 },
)

const todayCalendarDate = computed(() => parseDate(props.todayDate))

const history = computed(() => {
  if (!props.exercise) return []
  const cutoff = todayCalendarDate.value.subtract({ weeks: props.weeks })

  return (props.strengthExercises ?? [])
    .filter((item) => item.exercise === props.exercise && item.date)
    .map((item) => ({ ...item, calDate: parseDateTime(item.date) }))
    .filter((item) => item.calDate.compare(cutoff) >= 0)
    .sort((a, b) => a.calDate.compare(b.calDate))
})

function formatShortDate(calDate: ReturnType<typeof parseDateTime>) {
  return `${calDate.month}/${calDate.day}`
}

const chartOption = computed(() => {
  const textColor = props.isDark ? '#e7e5e4' : '#44403c'

  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 11, color: textColor } },
    grid: { left: 50, right: 50, top: 20, bottom: 36 },
    xAxis: {
      type: 'category',
      data: history.value.map((h) => formatShortDate(h.calDate)),
      boundaryGap: false,
      axisLabel: { color: textColor },
      axisLine: { lineStyle: { color: textColor } },
    },
    yAxis: [
      {
        type: 'value',
        name: '1RM (kg)',
        position: 'left',
        splitLine: { lineStyle: { opacity: 0.1 } },
        axisLabel: { color: textColor },
        nameTextStyle: { color: textColor },
      },
      {
        type: 'value',
        name: 'Volume (kg)',
        position: 'right',
        splitLine: { show: false },
        axisLabel: { color: textColor },
        nameTextStyle: { color: textColor },
      },
    ],
    series: [
      {
        name: 'Est. 1RM',
        type: 'line',
        yAxisIndex: 0,
        data: history.value.map((h) => h.one_rep_max ?? null),
        smooth: true,
        itemStyle: { color: '#a855f7' },
        lineStyle: { color: '#a855f7' },
      },
      {
        name: 'Total volume',
        type: 'line',
        yAxisIndex: 1,
        data: history.value.map((h) => h.total_volume ?? null),
        smooth: true,
        itemStyle: { color: '#ec4899' },
        lineStyle: { color: '#ec4899' },
      },
    ],
  }
})
</script>

<template>
  <div>
    <p v-if="!exercise" class="text-sm opacity-60 py-8 text-center">
      Click an exercise from today's schedule to see its progress here.
    </p>
    <p v-else-if="history.length < 2" class="text-sm opacity-60 py-8 text-center">
      Not enough logged history yet for {{ exercise }}.
    </p>
    <template v-else>
      <p class="text-sm font-medium mb-2">{{ exercise }} — last {{ weeks }} weeks</p>
      <ClientOnly>
        <VChart :option="chartOption" autoresize class="h-64 w-full" />
        <template #fallback>
          <div class="h-64 flex items-center justify-center text-sm opacity-50">Loading…</div>
        </template>
      </ClientOnly>
    </template>
  </div>
</template>
