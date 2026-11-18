<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
  type PropType,
} from "vue";
import { FIELD_KEY } from "../internal/form-context";
import type { ButtonColor, DateRange } from "../types";
import { formatDate, parseISO } from "../utils/date";
import NCalendar from "./NCalendar.vue";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NDatePicker" });

const props = defineProps({
  /** Accent of the focus ring and of the calendar */
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  /** Picks a start and an end date: `v-model` is a `DateRange` */
  range: { type: Boolean, default: false },
  /** Shown while no date is selected */
  placeholder: { type: String, default: undefined },
  /** Native `name`: hidden inputs submit the date with a surrounding `<form>` (with `range`, `<name>-start` and `<name>-end`) */
  name: { type: String, default: undefined },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** Accessible name when there is no `NFormField` label */
  label: { type: String, default: undefined },
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
  /** Options of the formatted date in the trigger */
  format: {
    type: Object as PropType<Intl.DateTimeFormatOptions>,
    default: () => ({ dateStyle: "medium" }),
  },
  prevLabel: { type: String, default: undefined },
  nextLabel: { type: String, default: undefined },
});

const model = defineModel<string | DateRange | null>();
const open = defineModel<boolean>("open", { default: false });

const field = inject(FIELD_KEY, null);

const root = ref<HTMLElement>();
const trigger = ref<HTMLElement>();
const popover = ref<HTMLElement>();
const baseId = useId();
const popoverId = `n-date-picker-${baseId}`;

const isInvalid = computed(() => props.invalid || !!field?.invalid.value);

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

const text = computed(() => {
  const { start, end } = selection.value;
  if (!start) return "";
  const show = (iso: string) => formatDate(iso, props.locale, props.format);
  if (!props.range) return show(start);
  return end ? `${show(start)} – ${show(end)}` : `${show(start)} –`;
});

function show() {
  if (!props.disabled) open.value = true;
}

function close(refocus = false) {
  open.value = false;
  if (refocus) trigger.value?.focus();
}

function onSelect() {
  if (!props.range) close(true);
}

// A range is complete once it has both dates
watch(
  () => selection.value.end,
  (end) => {
    if (props.range && end && open.value) close(true);
  },
);

const side = ref<"bottom" | "top">("bottom");

// Opens upward when there's no room below and more room above
function fit() {
  const anchor = root.value?.getBoundingClientRect();
  const height = popover.value?.offsetHeight;
  if (!anchor || !height) return;
  const below = window.innerHeight - anchor.bottom;
  side.value = below < height + 8 && anchor.top > below ? "top" : "bottom";
}

watch(open, async (isOpen) => {
  if (!isOpen) return;
  side.value = "bottom";
  await nextTick();
  fit();
  popover.value?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
});

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && open.value) {
    event.stopPropagation();
    close(true);
  } else if (event.key === "ArrowDown" && !open.value) {
    event.preventDefault();
    show();
  }
}

function onFocusout(event: FocusEvent) {
  const next = event.relatedTarget as Node | null;
  if (open.value && next && !root.value?.contains(next)) close();
}

function onPointerDown(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) close();
}

onMounted(() => document.addEventListener("pointerdown", onPointerDown));
onBeforeUnmount(() =>
  document.removeEventListener("pointerdown", onPointerDown),
);
</script>

<template>
  <div
    ref="root"
    class="n-date-picker"
    :data-color="color"
    :data-open="open ? '' : undefined"
    :data-side="side"
    :data-disabled="disabled ? '' : undefined"
    @keydown="onKeydown"
    @focusout="onFocusout"
  >
    <button
      :id="field?.id"
      ref="trigger"
      class="n-date-picker-trigger"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="open ? popoverId : undefined"
      :aria-label="label"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="field?.describedBy.value"
      :disabled="disabled"
      :data-placeholder="text ? undefined : ''"
      @click="open ? close() : show()"
    >
      <NIcon name="i-lucide-calendar" class="n-date-picker-icon" />
      <span class="n-date-picker-value">{{ text || placeholder }}</span>
    </button>
    <template v-if="name">
      <input
        v-if="!range"
        type="hidden"
        :name="name"
        :value="selection.start ?? ''"
        :disabled="disabled"
      />
      <template v-else>
        <input
          type="hidden"
          :name="`${name}-start`"
          :value="selection.start ?? ''"
          :disabled="disabled"
        />
        <input
          type="hidden"
          :name="`${name}-end`"
          :value="selection.end ?? ''"
          :disabled="disabled"
        />
      </template>
    </template>
    <Transition name="n-date-picker">
      <div
        v-if="open"
        :id="popoverId"
        ref="popover"
        class="n-date-picker-popover"
        role="dialog"
        :aria-label="label ?? placeholder"
      >
        <NCalendar
          v-model="model"
          :color="color"
          :range="range"
          :min="min"
          :max="max"
          :is-date-disabled="isDateDisabled"
          :week-start="weekStart"
          :locale="locale"
          :prev-label="prevLabel"
          :next-label="nextLabel"
          @select="onSelect"
        />
      </div>
    </Transition>
  </div>
</template>
