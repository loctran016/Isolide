<script setup lang="ts">
import { today, parseDate } from '@internationalized/date'
import { usePreferredDark } from '@vueuse/core'

definePageMeta({ title: 'Habit Island', titleIcon: 'i-solar:star-rainbow-bold' })

useHead({
  title: 'Habit Island',
  //   meta: [{ name: 'description', content: 'Activity and metric logs.' }],
})

const TIME_ZONE = 'Asia/Ho_Chi_Minh'
const supabase = useSupabaseClient()

const { themePref } = useTheme()
const colorMode = computed(() => themePref.value)
const prefersDark = usePreferredDark()
const isDark = computed(
  () => colorMode.value === 'dark' || (colorMode.value === 'system' && prefersDark.value),
)

interface HabitLog {
  id: number
  habit_key: string
  date: string
}

const { data: logs, refresh: refreshLogs } = await useAsyncData('habit-logs', async () => {
  const { data, error } = await supabase.from('habit_logs').select('id, habit_key, date')
  if (error) throw error
  return (data ?? []) as HabitLog[]
})

const todayIso = useState('habit-today', () => today(TIME_ZONE).toString())

const logIndex = computed(() => {
  const map: Record<string, Record<string, number>> = {}
  for (const log of logs.value ?? []) {
    if (!map[log.habit_key]) map[log.habit_key] = {}
    map[log.habit_key][log.date] = log.id
  }
  return map
})

function countsFor(keys: string[]) {
  const counts: Record<string, number> = {}
  for (const key of keys) {
    for (const iso of Object.keys(logIndex.value[key] ?? {})) {
      counts[iso] = (counts[iso] ?? 0) + 1
    }
  }
  return counts
}

const skincareCounts = computed(() => countsFor(['skincare_am', 'skincare_pm']))
const pennywortCounts = computed(() => countsFor(['pennywort']))
const pianoCounts = computed(() => countsFor(['piano']))

const isLoggedToday = (key: string) => Boolean(logIndex.value[key]?.[todayIso.value])
const pending = ref<Record<string, boolean>>({})

async function toggleHabit(key: string) {
  if (pending.value[key]) return
  pending.value[key] = true

  try {
    const existingId = logIndex.value[key]?.[todayIso.value]
    if (existingId) {
      const { error } = await supabase.from('habit_logs').delete().eq('id', existingId)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('habit_logs')
        .insert({ habit_key: key, date: todayIso.value })
      if (error) throw error
    }
    await refreshLogs()
  } catch (e) {
    console.error('Failed to toggle habit', key, e)
  } finally {
    pending.value[key] = false
  }
}

// --- Streak calculations ---

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0

  const sortedDates = [...dates].sort((a, b) => b.localeCompare(a))
  const todayStr = todayIso.value
  const todayDate = parseDate(todayStr)

  let streak = 0
  let currentDate = todayDate

  if (!sortedDates.includes(todayStr)) {
    currentDate = currentDate.subtract({ days: 1 })
  }

  while (true) {
    const iso = `${currentDate.year}-${String(currentDate.month).padStart(2, '0')}-${String(currentDate.day).padStart(2, '0')}`
    if (sortedDates.includes(iso)) {
      streak++
      currentDate = currentDate.subtract({ days: 1 })
    } else {
      break
    }
  }

  return streak
}

// --- Stats for side cards ---

const pianoCompletedDates = computed(() => {
  return Object.keys(pianoCounts.value).filter((iso) => pianoCounts.value[iso] > 0)
})

// Each piano session = 15 minutes
const PIANO_SESSION_MINUTES = 15

const pianoTotalMinutes = computed(() => pianoCompletedDates.value.length * PIANO_SESSION_MINUTES)

const pianoTotalHours = computed(() => {
  const hours = Math.floor(pianoTotalMinutes.value / 60)
  const minutes = pianoTotalMinutes.value % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
})

const pennywortThisWeek = computed(() => {
  const todayDate = parseDate(todayIso.value)
  const dayOfWeek = todayDate.toDate(TIME_ZONE).getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  let monday = todayDate.subtract({ days: mondayOffset })

  let count = 0
  for (let i = 0; i < 7; i++) {
    const iso = `${monday.year}-${String(monday.month).padStart(2, '0')}-${String(monday.day).padStart(2, '0')}`
    if (pennywortCounts.value[iso] > 0) count++
    monday = monday.add({ days: 1 })
  }
  return count
})

const pennywortTotalDays = computed(() => {
  return Object.keys(pennywortCounts.value).filter((iso) => pennywortCounts.value[iso] > 0).length
})
</script>

<template>
  <div
    class="grid grid-cols-1 md:grid-cols-4 gap-4 px-4 my-2 py-4 mx-auto font-sans dark:text-gray-100"
  >
    <!-- Skincare: AM + PM, full width -->
    <div class="col-span-full card">
      <div class="flex items-center justify-between">
        <h2 class="card-title">
          <div class="i-mdi:face-man-shimmer" />
          Skincare
        </h2>
        <span class="text-xs opacity-60">AM & PM routine</span>
      </div>

      <div class="flex gap-2 mt-4">
        <button
          type="button"
          class="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium border transition-colors cursor-pointer disabled:opacity-50"
          :class="
            isLoggedToday('skincare_am')
              ? 'bg-purple-500/20 border-purple-400/50 text-purple-700 dark:text-purple-300'
              : 'border-stone-800/20 dark:border-stone-100/20 hover:border-purple-400/50'
          "
          :disabled="pending.skincare_am"
          @click="toggleHabit('skincare_am')"
        >
          Morning {{ isLoggedToday('skincare_am') ? '✓' : '' }}
        </button>
        <button
          type="button"
          class="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium border transition-colors cursor-pointer disabled:opacity-50"
          :class="
            isLoggedToday('skincare_pm')
              ? 'bg-purple-500/20 border-purple-400/50 text-purple-700 dark:text-purple-300'
              : 'border-stone-800/20 dark:border-stone-100/20 hover:border-purple-400/50'
          "
          :disabled="pending.skincare_pm"
          @click="toggleHabit('skincare_pm')"
        >
          Evening {{ isLoggedToday('skincare_pm') ? '✓' : '' }}
        </button>
      </div>

      <CalendarHeatmap
        class="mt-6"
        :logs-by-date="skincareCounts"
        :max-value="2"
        color="#a855f7"
        :is-dark="isDark"
        height="h-50"
      />
    </div>

    <!-- Piano -->
    <div class="card col-span-3">
      <div class="flex items-center justify-between">
        <h2 class="card-title">
          <div class="i-solar:music-notes-bold" />
          Piano
        </h2>
        <span class="text-xs opacity-60">Daily practice</span>
      </div>

      <button
        type="button"
        class="w-full mt-4 rounded-lg px-4 py-2.5 text-sm font-medium border transition-colors cursor-pointer disabled:opacity-50"
        :class="
          isLoggedToday('piano')
            ? 'bg-purple-500/20 border-purple-400/50 text-purple-700 dark:text-purple-300'
            : 'border-stone-800/20 dark:border-stone-100/20 hover:border-purple-400/50'
        "
        :disabled="pending.piano"
        @click="toggleHabit('piano')"
      >
        {{ isLoggedToday('piano') ? 'Practiced today ✓' : 'Log practice' }}
      </button>

      <CalendarHeatmap
        class="mt-6"
        :logs-by-date="pianoCounts"
        :max-value="1"
        color="#3b82f6"
        :is-dark="isDark"
        height="h-36"
      />
    </div>

    <!-- Piano stats card -->
    <div class="card col-span-1 !p-6 flex flex-col items-center justify-center gap-3">
      <div class="i-solar:piano-bold-duotone text-6xl opacity-80" />
      <span class="text-5xl font-bold">{{ pianoTotalHours }}</span>
      <div class="text-sm opacity-60">total practice</div>
    </div>

    <!-- Pennywort -->
    <div class="card col-span-3">
      <div class="flex items-center justify-between">
        <h2 class="card-title">
          <div class="i-solar:leaf-bold" />
          Pennywort
        </h2>
        <span class="text-xs opacity-60">3x per week goal</span>
      </div>

      <button
        type="button"
        class="w-full mt-4 rounded-lg px-4 py-2.5 text-sm font-medium border transition-colors cursor-pointer disabled:opacity-50"
        :class="
          isLoggedToday('pennywort')
            ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-700 dark:text-emerald-300'
            : 'border-stone-800/20 dark:border-stone-100/20 hover:border-purple-400/50'
        "
        :disabled="pending.pennywort"
        @click="toggleHabit('pennywort')"
      >
        {{ isLoggedToday('pennywort') ? 'Had it today ✓' : 'Log drink' }}
      </button>

      <CalendarHeatmap
        class="mt-6"
        :logs-by-date="pennywortCounts"
        :max-value="1"
        color="#10b981"
        :is-dark="isDark"
        height="h-36"
      />
    </div>
    <!-- Pennywort stats card -->
    <div class="card col-span-1 !p-6 flex flex-col items-center justify-center gap-3">
      <div class="i-solar:cup-bold-duotone text-6xl opacity-80" />
      <span class="text-5xl font-bold">{{ pennywortThisWeek }}/3</span>
      <div class="text-sm opacity-60">this week</div>
      <div class="text-xs opacity-40 mt-1">{{ pennywortTotalDays }} total days</div>
    </div>
  </div>
</template>
