<script setup lang="ts">
import { computed, type PropType } from "vue";
import type { ButtonColor, PaginationSize } from "../types";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NPagination" });

const props = defineProps({
  total: { type: Number, default: 0 },
  pageSize: { type: Number, default: 10 },
  /** Pages shown on each side of the current one */
  siblings: { type: Number, default: 1 },
  /** Pages always shown at the start and the end */
  boundaries: { type: Number, default: 1 },
  showEdges: { type: Boolean, default: false },
  size: { type: String as PropType<PaginationSize>, default: "md" },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  label: { type: String, default: "Pagination" },
  prevLabel: { type: String, default: "Previous page" },
  nextLabel: { type: String, default: "Next page" },
  firstLabel: { type: String, default: "First page" },
  lastLabel: { type: String, default: "Last page" },
  pageLabel: {
    type: Function as PropType<(page: number) => string>,
    default: (page: number) => `Page ${page}`,
  },
  disabled: { type: Boolean, default: false },
});

const model = defineModel<number>({ default: 1 });

const count = computed(() => {
  const size = Math.max(1, Math.floor(props.pageSize) || 1);
  return Math.max(1, Math.ceil(Math.max(0, props.total) / size));
});

const page = computed(() =>
  Math.min(Math.max(Math.floor(model.value) || 1, 1), count.value),
);

const range = (from: number, to: number) =>
  Array.from({ length: Math.max(to - from + 1, 0) }, (_, i) => from + i);

type Entry = { type: "page"; page: number } | { type: "gap"; key: string };

// The number of entries stays the same while paging, so the buttons do not shift
const entries = computed<Entry[]>(() => {
  const total = count.value;
  const boundary = Math.max(0, Math.floor(props.boundaries));
  const sibling = Math.max(0, Math.floor(props.siblings));
  const current = page.value;

  const start = range(1, Math.min(boundary, total));
  const end = range(Math.max(total - boundary + 1, boundary + 1), total);

  const from = Math.max(
    Math.min(current - sibling, total - boundary - sibling * 2 - 1),
    boundary + 2,
  );
  const to = Math.min(
    Math.max(current + sibling, boundary + sibling * 2 + 2),
    end.length ? end[0]! - 2 : total - 1,
  );

  const result: Entry[] = [];
  const gapStart =
    from > boundary + 2
      ? "start"
      : boundary + 1 < total - boundary
        ? boundary + 1
        : null;
  const gapEnd =
    to < total - boundary - 1
      ? "end"
      : total - boundary > boundary
        ? total - boundary
        : null;

  for (const value of start) result.push({ type: "page", page: value });
  if (gapStart === "start") result.push({ type: "gap", key: "start" });
  else if (gapStart !== null) result.push({ type: "page", page: gapStart });
  for (const value of range(from, to))
    result.push({ type: "page", page: value });
  if (gapEnd === "end") result.push({ type: "gap", key: "end" });
  else if (gapEnd !== null) result.push({ type: "page", page: gapEnd });
  for (const value of end) result.push({ type: "page", page: value });
  return result;
});

function go(value: number) {
  const next = Math.min(Math.max(value, 1), count.value);
  if (props.disabled || next === page.value) return;
  model.value = next;
}

const atStart = computed(() => props.disabled || page.value <= 1);
const atEnd = computed(() => props.disabled || page.value >= count.value);
</script>

<template>
  <nav
    class="n-pagination"
    :data-color="color"
    :aria-label="label"
    :data-size="size"
    :data-disabled="disabled ? '' : undefined"
  >
    <ul class="n-pagination-list">
      <li v-if="showEdges">
        <button
          class="n-pagination-item"
          type="button"
          :aria-label="firstLabel"
          :disabled="atStart"
          @click="go(1)"
        >
          <NIcon name="i-lucide-chevrons-left" />
        </button>
      </li>
      <li>
        <button
          class="n-pagination-item"
          type="button"
          :aria-label="prevLabel"
          :disabled="atStart"
          @click="go(page - 1)"
        >
          <NIcon name="i-lucide-chevron-left" />
        </button>
      </li>
      <li
        v-for="entry in entries"
        :key="entry.type === 'gap' ? entry.key : entry.page"
      >
        <span
          v-if="entry.type === 'gap'"
          class="n-pagination-gap"
          aria-hidden="true"
        >
          …
        </span>
        <button
          v-else
          class="n-pagination-item"
          type="button"
          :aria-label="pageLabel(entry.page)"
          :aria-current="entry.page === page ? 'page' : undefined"
          :data-active="entry.page === page ? '' : undefined"
          :disabled="disabled"
          @click="go(entry.page)"
        >
          {{ entry.page }}
        </button>
      </li>
      <li>
        <button
          class="n-pagination-item"
          type="button"
          :aria-label="nextLabel"
          :disabled="atEnd"
          @click="go(page + 1)"
        >
          <NIcon name="i-lucide-chevron-right" />
        </button>
      </li>
      <li v-if="showEdges">
        <button
          class="n-pagination-item"
          type="button"
          :aria-label="lastLabel"
          :disabled="atEnd"
          @click="go(count)"
        >
          <NIcon name="i-lucide-chevrons-right" />
        </button>
      </li>
    </ul>
  </nav>
</template>
