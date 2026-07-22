<script setup lang="ts">
import { parseDateTime, today, parseDate } from '@internationalized/date'
import { EXERCISE_TO_SPLIT, STRENGTH_EXERCISES } from '~/types/database.types'
import { WEEK_SCHEDULE } from '~/data/fitness.js'
import { usePreferredDark } from '@vueuse/core'
import { getIsland } from '~/data/islands'

const island = getIsland('/fitness')!

useHead({
  title: island.pageTitle,
  meta: [{ name: 'description', content: island.description }],
})

definePageMeta({ title: island.pageTitle, titleIcon: island.titleIcon })

const TIME_ZONE = 'Asia/Ho_Chi_Minh'

const { themePref } = useTheme()
const prefersDark = usePreferredDark()

// Removed needless colorMode computed – isDark references themePref.value directly
const isDark = computed(
  () => themePref.value === 'dark' || (themePref.value === 'system' && prefersDark.value),
)

const client = useSupabaseClient()
const {
  data: strengthExercises,
  pending: isLoading,
  error: errorMessage,
  refresh: fetchEntries,
} = await useAsyncData(
  'strength-entries',
  async () => {
    // Explicit column selection instead of select('*')
    const { data, error } = await client
      .from('strength')
      .select('id, exercise, date, sets, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },
  { deep: false },
)

const selectedMuscleGroups = ref([])

// pins "today" to a single value shared between server render and client hydration
const todayDate = useState('fitness-today', () => today(TIME_ZONE).toString())

// reconstruct CalendarDate for comparisons
const todayCalendarDate = computed(() => parseDate(todayDate.value))

// Fast string comparison instead of parseDateTime for every item
const todayStrengthExercises = computed(() => {
  return (strengthExercises.value ?? []).filter((item) => {
    if (!item?.date) return false
    return item.date.slice(0, 10) === todayDate.value
  })
})

// Split Intl.DateTimeFormat into its own computed – explicit dependency, only runs once
const todayDayName = computed(() => {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(
    todayCalendarDate.value.toDate(TIME_ZONE),
  )
})

const todaySchedule = computed(() => {
  return WEEK_SCHEDULE.find((d) => d.day === todayDayName.value) ?? null
})

const selectedExercise = ref('DB Bench Press')

const { currentStreak } = useWorkoutStats(strengthExercises, todayDate)

const RECENT_WINDOW_DAYS = 30

// Precompute cutoff ISO string once, then use cheap string comparison
const splitTotals = computed(() => {
  const cutoffDate = todayCalendarDate.value.subtract({ days: RECENT_WINDOW_DAYS })
  const cutoffIso = cutoffDate.toString()
  let push = 0
  let pull = 0
  for (const item of strengthExercises.value ?? []) {
    if (!item?.date) continue
    if (item.date.slice(0, 10) < cutoffIso) continue
    const split = EXERCISE_TO_SPLIT[item.exercise]
    const setCount = item.sets?.length ?? 0
    if (split === 'Push') push += setCount
    else if (split === 'Pull') pull += setCount
  }
  return { push, pull }
})

const hasSplitData = computed(() => splitTotals.value.push + splitTotals.value.pull > 0)

const splitOption = computed(() => {
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} sets ({d}%)' },
    legend: {
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 11, color: isDark.value ? '#e7e5e4' : '#44403c' },
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '75%'],
        center: ['50%', '42%'],
        label: { show: false },
        data: [
          { value: splitTotals.value.push, name: 'Push', itemStyle: { color: '#ec4899' } },
          { value: splitTotals.value.pull, name: 'Pull', itemStyle: { color: '#a855f7' } },
        ],
      },
    ],
  }
})
</script>

<template>
  <div
    class="my-2 grid grid-cols-2 lg:grid-cols-6 gap-3 p-3 sm:gap-4 sm:px-4 sm:py-4 mx-auto font-sans dark:text-gray-100"
  >
    <!-- Progress card -->
    <div class="sm:lt-lg:order-0 col-span-2 lg:col-span-4 card">
      <div class="flex items-center justify-between">
        <h2 class="card-title">
          <div class="i-solar:graph-new-up-bold text-lg" />
          Progress
        </h2>
        <ClientOnly>
          <Select v-model="selectedExercise" :options="STRENGTH_EXERCISES" />
          <template #fallback>
            <div
              class="h-9 w-40 rounded-xl border border-white/40 dark:border-white/10 bg-white/30 dark:bg-stone-700/10 animate-pulse"
            />
          </template>
        </ClientOnly>
      </div>
      <div class="scrollbar-none overflow-x-auto">
        <ExerciseProgressChart
          class="mt-4 min-w-100"
          :exercise="selectedExercise"
          :today-date="todayDate"
          :is-dark="isDark"
          :strength-exercises="strengthExercises"
        />
      </div>
    </div>

    <!-- Today Schedule -->
    <div
      class="lt-sm:col-span-2 lt-sm:order-first sm:lt-lg:order-0 sm:lt-lg:row-span-2 lg:col-span-2 card"
    >
      <h2 class="card-title flex flex-col items-start gap-1">
        <template v-if="todaySchedule">
          {{ todaySchedule.day }}
          <span class="font-medium text-base opacity-80">{{ todaySchedule.label }}</span>
        </template>
        <template v-else>Today</template>
      </h2>

      <template v-if="todaySchedule">
        <p v-if="todaySchedule.note" class="text-sm opacity-70 mt-4 leading-relaxed">
          {{ todaySchedule.note }}
        </p>

        <ul v-else-if="todaySchedule.exercises" class="mt-4 flex flex-col gap-1.5">
          <li v-for="ex in todaySchedule.exercises" :key="ex.canonical">
            <StrengthForm :preset-exercise="ex.canonical">
              <button
                type="button"
                class="w-full flex items-center justify-between gap-4 text-sm rounded-lg px-3 py-2.5 -mx-1 hover:bg-purple-400/15 dark:hover:bg-purple-500/15 transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                @click="selectedExercise = ex.canonical"
              >
                <span class="truncate">
                  {{ ex.display }}
                  <span
                    v-if="ex.isApproximate"
                    class="text-stone-400"
                    title="Closest matching exercise in your library"
                    >*</span
                  >
                </span>
                <span class="opacity-50 tabular-nums shrink-0 text-xs">{{ ex.detail }}</span>
              </button>
            </StrengthForm>
          </li>
        </ul>
      </template>
    </div>

    <!-- Weight & BF -->
    <div
      class="lt-sm:col-span-2 lt-sm:min-h-24 sm:lt-lg:order-1 lg:col-span-2 lg:h-76 card flex flex-col"
    >
      <h2 class="card-title !text-base mb-2">Weight & BF</h2>
      <LazyBodyMetricsChart
        :hydrate-on-visible="{ rootMargin: '300px' }"
        :is-dark="isDark"
        class="flex-1 min-h-0"
      />
    </div>

    <!-- Action buttons row 1 -->
    <div
      class="lt-sm:col-span-2 sm:lt-lg:order-0 lg:col-span-1 flex lg:flex-col gap-3 sm:gap-4 lt-md:h-25 text-gray-800 dark:text-gray-100"
    >
      <StrengthForm>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded="false"
          data-state="closed"
          class="card lt-lg:max-w-[calc(50%_-_0.5rem)] lg:h-36 flex items-center gap-2 justify-center w-full cursor-pointer group"
        >
          <div
            class="i-solar:dumbbell-large-minimalistic-line-duotone dark:i-solar:dumbbell-large-minimalistic-bold-duotone text-4xl lg:text-6xl"
          />
          <p
            class="text-3xl lg:text-4xl opacity-55 dark:opacity-15 transition-all duration-200 group-hover:opacity-100"
          >
            +
          </p>
        </button>
      </StrengthForm>
      <CardioForm>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded="false"
          data-state="closed"
          class="card lg:h-36 lt-lg:max-w-[calc(50%_-_0.5rem)] flex items-center gap-2 justify-center w-full cursor-pointer group"
        >
          <div
            class="i-solar:treadmill-round-line-duotone dark:i-solar:treadmill-round-bold-duotone text-5xl lg:text-7xl"
          />
          <p
            class="text-3xl lg:text-4xl opacity-55 dark:opacity-15 transition-all duration-200 group-hover:opacity-100"
          >
            +
          </p>
        </button>
      </CardioForm>
    </div>

    <!-- Action buttons row 2 -->
    <div
      class="lt-sm:col-span-2 sm:lt-lg:order-0 lg:col-span-1 flex lg:flex-col gap-3 sm:gap-4 lt-md:h-25 text-gray-800 dark:text-gray-100"
    >
      <BodyMetricForm>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded="false"
          data-state="closed"
          class="card lg:h-36 lt-lg:max-w-[calc(50%_-_0.5rem)] flex items-center gap-2 justify-center w-full cursor-pointer group"
        >
          <div
            class="i-solar:weigher-line-duotone dark:i-solar:weigher-bold-duotone text-4xl lg:text-6xl"
          />
          <p
            class="text-3xl lg:text-4xl opacity-55 dark:opacity-15 transition-all duration-200 group-hover:opacity-100"
          >
            +
          </p>
        </button>
      </BodyMetricForm>
      <div
        class="card lt-lg:max-w-[calc(50%_-_0.5rem)] w-full lg:h-36 flex flex-col gap-1 items-center justify-center"
      >
        <div class="text-3xl sm:text-4xl lg:text-5xl font-semibold flex items-center gap-1">
          <div
            class="i-solar:fire-line-duotone dark:i-solar:fire-bold-duotone text-3xl sm:text-4xl lg:text-6xl"
          />
          <span class="opacity-90 dark:opacity-100">{{ currentStreak }}</span>
        </div>
        <p class="text-base opacity-85">{{ currentStreak === 1 ? 'day' : 'days' }} active</p>
      </div>
    </div>

    <!-- Push/Pull split -->
    <div class="lt-sm:col-span-2 sm:lt-lg:order-1 lg:col-span-2 lg:h-76 card">
      <h2 class="card-title !text-base mb-2">Push / Pull split</h2>
      <ClientOnly>
        <VChart v-if="hasSplitData" :option="splitOption" autoresize class="h-50 w-full" />
        <p v-else class="h-50 flex items-center justify-center text-sm text-center px-4">
          Log a few workouts to see your split.
        </p>
        <template #fallback>
          <div class="h-40 flex items-center justify-center text-sm opacity-50">Loading…</div>
        </template>
      </ClientOnly>
      <p class="text-xs mt-1 opacity-90">Last {{ RECENT_WINDOW_DAYS }} days, by sets logged</p>
    </div>

    <!-- Workout Calendar -->
    <LazyWorkoutCalendarHeatmap
      hydrate-on-visible
      :strength-exercises="strengthExercises ?? []"
      :today-date="todayDate"
      :is-dark="isDark"
      class="col-span-2 lg:col-span-6"
    />

    <!-- Muscle diagram -->
    <div class="col-span-2 sm:lt-lg:order-2 lg:col-span-3 xl:col-span-2 card">
      <h2 class="card-title">
        <div class="i-mdi:human" />
        Muscle Diagram
      </h2>
      <p class="text-xs opacity-60 mt-1">Last {{ RECENT_WINDOW_DAYS }} days, by sets logged</p>
      <LazyMuscleHeatmap
        :hydrate-on-visible="{ rootMargin: '300px' }"
        :days="RECENT_WINDOW_DAYS"
        :strength-exercises="strengthExercises ?? []"
        class="mt-4"
        @select="(groups) => (selectedMuscleGroups = groups)"
      />
    </div>

    <!-- Muscle table -->
    <div class="col-span-2 sm:lt-lg:order-2 lg:col-span-3 xl:col-span-4 card">
      <h2 class="card-title">
        <div class="i-solar:database-linear" />
        Muscle Table
      </h2>
      <p class="text-xs opacity-60 mt-1">
        Last {{ RECENT_WINDOW_DAYS }} days, select muscle group with the diagram
      </p>
      <LazyExerciseContribution
        hydrate-on-visible
        :muscles="selectedMuscleGroups"
        :strength-exercises="strengthExercises ?? []"
        :today-date="todayDate"
        :days="RECENT_WINDOW_DAYS"
        class="mt-4"
      />
    </div>

    <!-- All Workouts -->
    <LazyAllWorkoutsGrid
      hydrate-on-visible
      :strength-exercises="strengthExercises ?? []"
      class="order-last col-span-2 lg:col-span-6"
    />
  </div>
</template>
