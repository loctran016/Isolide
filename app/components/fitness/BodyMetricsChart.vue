<script setup lang="ts">
const props = defineProps<{ isDark: boolean }>()

interface BodyMetricRow {
  id: number
  weight: number
  height: number
  neck: number
  waist: number
  bf: number
  created_at: string
}

const supabase = useSupabaseClient()

const { data: bodyMetrics } = await useAsyncData('body-metrics-history', async () => {
  const { data, error } = await supabase
    .from('body_metrics')
    .select('id, weight, height, neck, waist, bf, created_at')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as BodyMetricRow[]
})

function formatShortDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const hasTrend = computed(() => (bodyMetrics.value?.length ?? 0) >= 2)
const latest = computed(() => {
  const rows = bodyMetrics.value ?? []
  return rows.length ? rows[rows.length - 1] : null
})

const chartOption = computed(() => {
  const textColor = props.isDark ? '#e7e5e4' : '#44403c'
  const rows = bodyMetrics.value ?? []

  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 11, color: textColor } },
    grid: { left: 45, right: 45, top: 12, bottom: 36 },
    xAxis: {
      type: 'category',
      data: rows.map((r) => formatShortDate(r.created_at)),
      boundaryGap: false,
      axisLabel: { color: textColor },
      axisLine: { lineStyle: { color: textColor } },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Weight (kg)',
        position: 'left',
        splitLine: { lineStyle: { opacity: 0.1 } },
        axisLabel: { color: textColor },
        nameTextStyle: { color: textColor },
      },
      {
        type: 'value',
        name: 'BF %',
        position: 'right',
        splitLine: { show: false },
        axisLabel: { color: textColor },
        nameTextStyle: { color: textColor },
      },
    ],
    series: [
      {
        name: 'Weight',
        type: 'line',
        yAxisIndex: 0,
        data: rows.map((r) => r.weight),
        smooth: true,
        itemStyle: { color: '#a855f7' },
        lineStyle: { color: '#a855f7' },
      },
      {
        name: 'Body fat %',
        type: 'line',
        yAxisIndex: 1,
        data: rows.map((r) => r.bf),
        smooth: true,
        itemStyle: { color: '#ec4899' },
        lineStyle: { color: '#ec4899' },
      },
    ],
  }
})
</script>

<template>
  <div class="h-full flex flex-col">
    <p
      v-if="!bodyMetrics?.length"
      class="flex-1 flex items-center justify-center text-sm opacity-60 text-center"
    >
      No body metrics logged yet.
    </p>
    <p
      v-else-if="!hasTrend"
      class="flex-1 flex items-center justify-center text-sm opacity-60 text-center"
    >
      Log at least one more entry to see a trend.
    </p>
    <template v-else>
      <div v-if="latest" class="flex items-baseline gap-4 mb-1">
        <span class="text-2xl font-semibold">
          {{ latest.weight }}<span class="text-sm font-normal opacity-60"> kg</span>
        </span>
        <span class="text-lg font-medium text-pink-600 dark:text-pink-400">
          {{ latest.bf }}%<span class="text-xs font-normal opacity-60"> BF</span>
        </span>
      </div>
      <ClientOnly>
        <VChart :option="chartOption" autoresize class="flex-1 min-h-0 w-full" />
        <template #fallback>
          <div class="flex-1 flex items-center justify-center text-sm opacity-50">Loading…</div>
        </template>
      </ClientOnly>
    </template>
  </div>
</template>
