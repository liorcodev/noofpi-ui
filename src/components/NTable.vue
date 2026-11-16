<script setup lang="ts">
import { computed, type PropType } from "vue";
import type {
  TableBorder,
  TableBreakpoint,
  TableColumn,
  TableProps,
  TableRow,
  TableSize,
  TableSort,
} from "../types";

defineOptions({ name: "NTable" });

const props = defineProps({
  as: {
    type: [String, Object, Function] as PropType<TableProps["as"]>,
    default: "div",
  },
  columns: { type: Array as PropType<TableColumn[]>, required: true },
  data: { type: Array as PropType<TableRow[]>, default: () => [] },
  rowKey: {
    type: [String, Function] as PropType<TableProps["rowKey"]>,
    default: undefined,
  },
  caption: { type: String, default: undefined },
  label: { type: String, default: "Table" },
  size: { type: String as PropType<TableSize>, default: "md" },
  border: { type: String as PropType<TableBorder>, default: "sm" },
  striped: { type: Boolean, default: false },
  hoverable: { type: Boolean, default: true },
  stackBelow: {
    type: String as PropType<TableBreakpoint>,
    default: undefined,
  },
  maxHeight: { type: String, default: undefined },
  loading: { type: Boolean, default: false },
  empty: { type: String, default: "No data" },
  loadingLabel: { type: String, default: "Loading…" },
  clickable: { type: Boolean, default: false },
  manualSort: { type: Boolean, default: false },
});

const emit = defineEmits<{
  rowClick: [row: TableRow, index: number, event: Event];
}>();

const sort = defineModel<TableSort | undefined>("sort");

defineSlots<{
  /** Content of a cell. Default: the row's value for the column */
  [name: `cell-${string}`]: (props: {
    row: TableRow;
    value: unknown;
    index: number;
    column: TableColumn;
  }) => unknown;
  /** Content of a column's header. Default: its `label` */
  [name: `header-${string}`]: (props: { column: TableColumn }) => unknown;
  /** Replaces the `empty` text */
  empty?: () => unknown;
  /** Replaces the `loadingLabel` and spinner */
  loading?: () => unknown;
  /** Below the rows, outside the scroll area, e.g. pagination */
  footer?: () => unknown;
}>();

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function compare(a: unknown, b: unknown) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return +a - +b;
  if (typeof a === "boolean" && typeof b === "boolean") return +a - +b;
  return collator.compare(String(a), String(b));
}

const rows = computed(() => {
  const current = sort.value;
  if (!current || props.manualSort) return props.data;
  const sign = current.direction === "asc" ? 1 : -1;
  // Empty values go last in both directions
  return [...props.data].sort((a, b) => {
    const x = a[current.key];
    const y = b[current.key];
    const xEmpty = x == null || x === "";
    const yEmpty = y == null || y === "";
    if (xEmpty || yEmpty) return Number(xEmpty) - Number(yEmpty);
    return compare(x, y) * sign;
  });
});

function keyOf(row: TableRow, index: number) {
  if (typeof props.rowKey === "function") return props.rowKey(row, index);
  return props.rowKey ? (row[props.rowKey] as string | number) : index;
}

function ariaSort(column: TableColumn) {
  if (!column.sortable) return undefined;
  if (sort.value?.key !== column.key) return "none";
  return sort.value.direction === "asc" ? "ascending" : "descending";
}

function sortIcon(column: TableColumn) {
  if (sort.value?.key !== column.key) return "i-lucide-chevrons-up-down";
  return sort.value.direction === "asc"
    ? "i-lucide-arrow-up"
    : "i-lucide-arrow-down";
}

// none -> ascending -> descending -> none
function toggleSort(column: TableColumn) {
  const current = sort.value;
  if (current?.key !== column.key) {
    sort.value = { key: column.key, direction: "asc" };
  } else if (current.direction === "asc") {
    sort.value = { key: column.key, direction: "desc" };
  } else {
    sort.value = undefined;
  }
}

const INTERACTIVE = "a, button, input, select, textarea, label, summary";

function onRowClick(row: TableRow, index: number, event: Event) {
  if (!props.clickable) return;
  const target = event.target as Element | null;
  // Clicks on a link or button inside the row belong to that control
  if (target?.closest(INTERACTIVE)) return;
  emit("rowClick", row, index, event);
}
</script>

<template>
  <component
    :is="as"
    :class="['n-table', stackBelow && `max-${stackBelow}:n-table-stacked`]"
    :data-size="size"
    :data-border="border"
    :data-striped="striped ? '' : undefined"
    :data-hoverable="hoverable ? '' : undefined"
    :data-clickable="clickable ? '' : undefined"
    :data-loading="loading ? '' : undefined"
    :style="maxHeight ? { '--n-table-max-h': maxHeight } : undefined"
  >
    <div
      class="n-table-scroll"
      role="region"
      tabindex="0"
      :aria-label="caption || label"
      :data-limited="maxHeight ? '' : undefined"
    >
      <table class="n-table-el" :aria-busy="loading ? 'true' : undefined">
        <caption v-if="caption" class="n-table-caption">
          {{
            caption
          }}
        </caption>
        <thead class="n-table-thead">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="n-table-head"
              :data-align="column.align"
              :data-hide-below="column.hideBelow"
              :data-nowrap="column.nowrap ? '' : undefined"
              :style="column.width ? { width: column.width } : undefined"
              :aria-sort="ariaSort(column)"
            >
              <button
                v-if="column.sortable"
                type="button"
                class="n-table-sort"
                @click="toggleSort(column)"
              >
                <slot :name="`header-${column.key}`" :column="column">
                  {{ column.label }}
                </slot>
                <span
                  :class="['n-table-sort-icon', sortIcon(column)]"
                  :data-active="sort?.key === column.key ? '' : undefined"
                  aria-hidden="true"
                />
              </button>
              <slot v-else :name="`header-${column.key}`" :column="column">
                {{ column.label }}
              </slot>
            </th>
          </tr>
        </thead>
        <tbody class="n-table-tbody">
          <tr
            v-for="(row, index) in rows"
            :key="keyOf(row, index)"
            class="n-table-row"
            :tabindex="clickable ? 0 : undefined"
            @click="onRowClick(row, index, $event)"
            @keydown.enter.self="onRowClick(row, index, $event)"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="n-table-cell"
              :data-label="column.label"
              :data-align="column.align"
              :data-hide-below="column.hideBelow"
              :data-nowrap="column.nowrap ? '' : undefined"
            >
              <span class="n-table-cell-content">
                <slot
                  :name="`cell-${column.key}`"
                  :row="row"
                  :value="row[column.key]"
                  :index="index"
                  :column="column"
                >
                  {{ row[column.key] }}
                </slot>
              </span>
            </td>
          </tr>
          <tr v-if="!rows.length" class="n-table-status">
            <td :colspan="columns.length || 1">
              <div class="n-table-status-content" role="status">
                <slot v-if="loading" name="loading">
                  <span class="n-table-spinner i-lucide-loader-circle n-spin" />
                  {{ loadingLabel }}
                </slot>
                <slot v-else name="empty">{{ empty }}</slot>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="$slots.footer" class="n-table-footer">
      <slot name="footer" />
    </div>
  </component>
</template>
