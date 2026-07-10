<script setup lang="ts" generic="TData">
import type { ColumnDef } from '@tanstack/vue-table'
import {
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'

const props = withDefaults(
  defineProps<{
    data: TData[]
    columns: ColumnDef<TData, any>[]
    pageSize?: number
    searchPlaceholder?: string
  }>(),
  { pageSize: 10, searchPlaceholder: 'Filter…' },
)

const globalFilter = ref('')
const sorting = ref([])

const table = useVueTable({
  get data() {
    return props.data
  },
  get columns() {
    return props.columns
  },
  state: {
    get globalFilter() {
      return globalFilter.value
    },
    get sorting() {
      return sorting.value
    },
  },
  onGlobalFilterChange: (updater) => {
    globalFilter.value = typeof updater === 'function' ? updater(globalFilter.value) : updater
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
  },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  initialState: { pagination: { pageSize: props.pageSize } },
})
</script>

<template>
  <div class="space-y-3">
    <input
      v-model="globalFilter"
      type="text"
      :placeholder="searchPlaceholder"
      class="w-full max-w-xs bg-transparent outline-none border-b border-stone-800/30 dark:border-stone-100/30 focus:border-purple-500 transition-colors px-1 py-1.5 text-sm"
    />

    <div class="overflow-x-auto rounded-lg border border-white/40 dark:border-white/10">
      <table class="w-full text-sm">
        <thead>
          <tr
            v-for="headerGroup in table.getHeaderGroups()"
            :key="headerGroup.id"
            class="border-b border-stone-800/10 dark:border-stone-100/10"
          >
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              class="text-left px-3 py-2 font-medium text-xs uppercase tracking-wide opacity-60 cursor-pointer select-none whitespace-nowrap"
              @click="header.column.getToggleSortingHandler()?.($event)"
            >
              <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
              <span v-if="header.column.getIsSorted() === 'asc'">▲</span>
              <span v-else-if="header.column.getIsSorted() === 'desc'">▼</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            class="border-b border-stone-800/5 dark:border-stone-100/5 hover:bg-purple-400/5 dark:hover:bg-purple-500/5"
          >
            <td
              v-for="cell in row.getVisibleCells()"
              :key="cell.id"
              class="px-3 py-2 whitespace-nowrap"
            >
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </td>
          </tr>
          <tr v-if="!table.getRowModel().rows.length">
            <td :colspan="columns.length" class="px-3 py-6 text-center opacity-60">
              No rows match.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between text-sm">
      <span class="opacity-60">
        Page {{ table.getState().pagination.pageIndex + 1 }} of {{ table.getPageCount() || 1 }} ({{
          table.getFilteredRowModel().rows.length
        }}
        rows)
      </span>
      <div class="flex gap-2">
        <button
          type="button"
          class="px-3 py-1.5 rounded-md border border-stone-800/30 dark:border-stone-100/30 hover:border-purple-500 hover:text-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          :disabled="!table.getCanPreviousPage()"
          @click="table.previousPage()"
        >
          Previous
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-md border border-stone-800/30 dark:border-stone-100/30 hover:border-purple-500 hover:text-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          :disabled="!table.getCanNextPage()"
          @click="table.nextPage()"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
