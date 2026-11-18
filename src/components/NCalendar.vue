<script setup lang="ts">
import { computed, nextTick, ref, watch, type PropType } from "vue";
import type { ButtonColor, DateRange } from "../types";
import {
  addDays,
  addMonths,
  formatDate,
  parseISO,
  startOfMonth,
  todayISO,
  weekday,
} from "../utils/date";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NCalendar" });

const props = defineProps({
  /** Accent of the selected dates, today and the focus ring */
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  /** Selects a start and an end date: `v-model` is a `DateRange` */
  range: { type: Boolean, default: false },
  /** Earliest selectable date (`YYYY-MM-DD`) */
  min: { type: String, default: undefined },
  /** Latest selectable date (`YYYY-MM-DD`) */
  max: { type: String, default: undefined },
  /** Marks individual dates (`YYYY-MM-DD`) as unselectable */
  isDateDisabled: {
    type: Function as PropType<(date: string) => boolean>,
    default: undefined,
  },
  /** First day of the week, `0` (Sunday) to `6` */
  weekStart: { type: Number, default: 0 },
  locale: { type: String, default: undefined },
  label: { type: String, default: "Calendar" },
  prevLabel: { type: String, default: "Previous month" },
  nextLabel: { type: String, default: "Next month" },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits<{
  /** A date was chosen, even if it was already selected */
  select: [date: string];
}>();

const model = defineModel<string | DateRange | null>();

const root = ref<HTMLElement>();

const weekStart = computed(() => ((Math.trunc(props.weekStart) % 7) + 7) % 7);

const selection = computed<DateRange>(() => {
  const value = model.value;
  if (props.range) {
    const range = typeof value === "object" && value ? value : null;
    return {
      start: parseISO(range?.start) ? range!.start : null,
      end: parseISO(range?.end) ? range!.end : null,
    };
  }
  return { start: parseISO(value) ? (value as string) : null, end: null };
});

const clamp = (iso: string) =>
  props.min && iso < props.min
    ? props.min
    : props.max && iso > props.max
      ? props.max
      : iso;

const focused = ref(clamp(selection.value.start ?? todayISO()));
const view = ref(startOfMonth(focused.value));
const hovered = ref<string | null>(null);

// Follows the model when it changes from outside, e.g. a cleared or typed value
watch(
  () => selection.value.start,
  (start) => {
    if (!start || startOfMonth(start) === view.value) return;
    focused.value = start;
    view.value = startOfMonth(start);
  },
);

const title = computed(() =>
  formatDate(view.value, props.locale, { month: "long", year: "numeric" }),
);

const weekdays = computed(() =>
  Array.from({ length: 7 }, (_, index) => {
    const day = (weekStart.value + index) % 7;
    const date = `2023-01-${String(1 + day).padStart(2, "0")}`;
    return {
      key: day,
      short: formatDate(date, props.locale, { weekday: "short" }),
      long: formatDate(date, props.locale, { weekday: "long" }),
    };
  }),
);

const today = todayISO();

const isDisabled = (iso: string) =>
  props.disabled ||
  (!!props.min && iso < props.min) ||
  (!!props.max && iso > props.max) ||
  !!props.isDateDisabled?.(iso);

// A fixed six weeks keep the calendar the same height in every month
const weeks = computed(() => {
  const first = view.value;
  const offset = (weekday(first) - weekStart.value + 7) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 7 }, (_, column) => {
      const iso = addDays(start, row * 7 + column);
      return {
        iso,
        day: Number(iso.slice(8)),
        outside: iso.slice(0, 7) !== first.slice(0, 7),
        label: formatDate(iso, props.locale, { dateStyle: "full" }),
      };
    }),
  );
});

// While a range is half picked, the dates up to the hovered one preview it
const bounds = computed(() => {
  const { start, end } = selection.value;
  if (!props.range || !start) return null;
  const other = end ?? hovered.value ?? start;
  return start <= other ? [start, other] : [other, start];
});

function stateOf(iso: string) {
  const { start, end } = selection.value;
  const picked = iso === start || iso === end;
  const [low, high] = bounds.value ?? [];
  return {
    selected: picked,
    inRange: !!low && !!high && iso > low && iso < high,
    rangeStart: !!low && iso === low && low !== high,
    rangeEnd: !!high && iso === high && low !== high,
  };
}

const canGoPrev = computed(
  () => !props.min || addDays(view.value, -1) >= props.min,
);
const canGoNext = computed(
  () => !props.max || addMonths(view.value, 1) <= props.max,
);

function go(months: number) {
  view.value = addMonths(view.value, months);
  focused.value = addMonths(focused.value, months);
}

function choose(iso: string) {
  if (isDisabled(iso)) return;
  focused.value = iso;
  if (startOfMonth(iso) !== view.value) view.value = startOfMonth(iso);
  emit("select", iso);
  if (!props.range) {
    model.value = iso;
    return;
  }
  const { start, end } = selection.value;
  if (!start || end) {
    model.value = { start: iso, end: null };
  } else {
    model.value =
      iso < start ? { start: iso, end: start } : { start, end: iso };
  }
}

async function moveFocus(iso: string) {
  focused.value = iso;
  if (startOfMonth(iso) !== view.value) view.value = startOfMonth(iso);
  await nextTick();
  root.value
    ?.querySelector<HTMLElement>(`[data-date="${focused.value}"]`)
    ?.focus();
}

function onKeydown(event: KeyboardEvent) {
  const date = focused.value;
  const offset = (weekday(date) - weekStart.value + 7) % 7;
  const target: string | undefined = {
    ArrowLeft: addDays(date, -1),
    ArrowRight: addDays(date, 1),
    ArrowUp: addDays(date, -7),
    ArrowDown: addDays(date, 7),
    Home: addDays(date, -offset),
    End: addDays(date, 6 - offset),
    PageUp: addMonths(date, event.shiftKey ? -12 : -1),
    PageDown: addMonths(date, event.shiftKey ? 12 : 1),
  }[event.key];
  if (target) {
    event.preventDefault();
    moveFocus(target);
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    choose(date);
  }
}
</script>

<template>
  <div
    ref="root"
    class="n-calendar"
    role="group"
    :aria-label="label"
    :data-color="color"
    :data-disabled="disabled ? '' : undefined"
  >
    <div class="n-calendar-header">
      <button
        class="n-calendar-nav"
        type="button"
        :aria-label="prevLabel"
        :disabled="disabled || !canGoPrev"
        @click="go(-1)"
      >
        <NIcon name="i-lucide-chevron-left" />
      </button>
      <div class="n-calendar-title" aria-live="polite">{{ title }}</div>
      <button
        class="n-calendar-nav"
        type="button"
        :aria-label="nextLabel"
        :disabled="disabled || !canGoNext"
        @click="go(1)"
      >
        <NIcon name="i-lucide-chevron-right" />
      </button>
    </div>
    <table
      class="n-calendar-grid"
      role="grid"
      :aria-label="title"
      :aria-multiselectable="range ? 'true' : undefined"
      @mouseleave="hovered = null"
    >
      <thead>
        <tr>
          <th
            v-for="day in weekdays"
            :key="day.key"
            class="n-calendar-weekday"
            scope="col"
            :abbr="day.long"
          >
            {{ day.short }}
          </th>
        </tr>
      </thead>
      <tbody @keydown="onKeydown">
        <tr v-for="week in weeks" :key="week[0]!.iso">
          <td
            v-for="cell in week"
            :key="cell.iso"
            class="n-calendar-cell"
            role="gridcell"
            :aria-selected="stateOf(cell.iso).selected ? 'true' : 'false'"
            :data-in-range="stateOf(cell.iso).inRange ? '' : undefined"
            :data-range-start="stateOf(cell.iso).rangeStart ? '' : undefined"
            :data-range-end="stateOf(cell.iso).rangeEnd ? '' : undefined"
          >
            <button
              class="n-calendar-day"
              type="button"
              :data-date="cell.iso"
              :tabindex="cell.iso === focused ? 0 : -1"
              :aria-label="cell.label"
              :aria-disabled="isDisabled(cell.iso) ? 'true' : undefined"
              :aria-current="cell.iso === today ? 'date' : undefined"
              :data-selected="stateOf(cell.iso).selected ? '' : undefined"
              :data-today="cell.iso === today ? '' : undefined"
              :data-outside="cell.outside ? '' : undefined"
              @click="choose(cell.iso)"
              @mouseenter="hovered = cell.iso"
              @focus="hovered = null"
            >
              {{ cell.day }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
