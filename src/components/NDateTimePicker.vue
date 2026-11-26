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
import { parseISO, todayISO } from "../utils/date";
import {
  dayPeriods,
  formatDateTime,
  formatDateTimeLabel,
  fromSeconds,
  parseDateTime,
  parseTime,
  prefersHour12,
  toSeconds,
  zoneName,
  type TimeParts,
} from "../utils/date-time";
import NButton from "./NButton.vue";
import NCalendar from "./NCalendar.vue";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NDateTimePicker" });

type Unit = "hour" | "minute" | "second" | "period";

interface Column {
  key: Unit;
  label: string;
  tab: number;
  options: {
    value: number;
    label: string;
    selected: boolean;
    disabled: boolean;
  }[];
}

const props = defineProps({
  /** Accent of the focus ring, of the calendar and of the selected time */
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  /** Shown while no date and time is selected */
  placeholder: { type: String, default: undefined },
  /** Native `name`: a hidden input submits the value (`YYYY-MM-DDTHH:mm`, with `seconds` `YYYY-MM-DDTHH:mm:ss`) with a surrounding `<form>` */
  name: { type: String, default: undefined },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** Accessible name when there is no `NFormField` label */
  label: { type: String, default: undefined },
  /** Earliest selectable date and time (`YYYY-MM-DDTHH:mm`; a plain `YYYY-MM-DD` starts that day) */
  min: { type: String, default: undefined },
  /** Latest selectable date and time (`YYYY-MM-DDTHH:mm`; a plain `YYYY-MM-DD` ends that day) */
  max: { type: String, default: undefined },
  /** Marks individual dates (`YYYY-MM-DD`) as unselectable */
  isDateDisabled: {
    type: Function as PropType<(date: string) => boolean>,
    default: undefined,
  },
  /** First day of the week, `0` (Sunday) to `6` */
  weekStart: { type: Number, default: 0 },
  locale: { type: String, default: undefined },
  /** Options of the formatted date and time in the trigger */
  format: {
    type: Object as PropType<Intl.DateTimeFormatOptions>,
    default: undefined,
  },
  /** 12-hour clock with an AM/PM column. Default: what `locale` uses, 24-hour when that is unknown */
  hour12: { type: Boolean, default: undefined },
  /** Distance between the selectable minutes. It must divide 60 (1, 2, 5, 10, 15, 20, 30), otherwise it is 1 */
  minuteStep: { type: Number, default: 1 },
  /** Adds a seconds column: the value then carries seconds (`YYYY-MM-DDTHH:mm:ss`) */
  seconds: { type: Boolean, default: false },
  /** Time a picked date gets while no time was chosen: `HH:mm`, `HH:mm:ss`, or `"now"` for the current time rounded down to `minuteStep`. It is moved into `min` and `max` when needed */
  defaultTime: { type: String, default: "00:00" },
  /** IANA time zone (`"Europe/Berlin"`) whose short name is shown next to the time. The value stays a wall-clock time: nothing is converted */
  timeZone: { type: String, default: undefined },
  /** Adds a button that clears the value */
  clearable: { type: Boolean, default: false },
  prevLabel: { type: String, default: undefined },
  nextLabel: { type: String, default: undefined },
  /** Accessible name of the time section */
  timeLabel: { type: String, default: "Time" },
  hourLabel: { type: String, default: "Hours" },
  minuteLabel: { type: String, default: "Minutes" },
  secondLabel: { type: String, default: "Seconds" },
  periodLabel: { type: String, default: "AM/PM" },
  /** Label of the button that picks the current date and time */
  nowLabel: { type: String, default: "Now" },
  clearLabel: { type: String, default: "Clear" },
  doneLabel: { type: String, default: "Done" },
});

/** A wall-clock `YYYY-MM-DDTHH:mm` string (`YYYY-MM-DDTHH:mm:ss` with `seconds`), without a time zone */
const model = defineModel<string | null>();
const open = defineModel<boolean>("open", { default: false });

const field = inject(FIELD_KEY, null);

const root = ref<HTMLElement>();
const trigger = ref<HTMLElement>();
const popover = ref<HTMLElement>();
const baseId = useId();
const popoverId = `n-date-time-picker-${baseId}`;

const isInvalid = computed(() => props.invalid || !!field?.invalid.value);

const parsed = computed(() => parseDateTime(model.value));

const step = computed(() => {
  const value = Math.trunc(props.minuteStep);
  return value >= 1 && value < 60 && 60 % value === 0 ? value : 1;
});

const is12 = computed(() => props.hour12 ?? prefersHour12(props.locale));
const periods = computed(() => dayPeriods(props.locale));

function bound(value: string | undefined, end: boolean) {
  const dateTime = parseDateTime(value);
  if (dateTime) return { date: dateTime.date, seconds: toSeconds(dateTime) };
  if (value && parseISO(value))
    return { date: value, seconds: end ? 86399 : 0 };
  return null;
}

const lowest = computed(() => bound(props.min, false));
const highest = computed(() => bound(props.max, true));

// The earliest and latest second of the day that can be picked on `date`
function limits(date: string): [number, number] {
  return [
    lowest.value?.date === date ? lowest.value.seconds : 0,
    highest.value?.date === date ? highest.value.seconds : 86399,
  ];
}

// Moves a time into the limits of its day, onto the minute step
function fit(date: string, total: number) {
  const [low, high] = limits(date);
  if (total < low) {
    const minutes = Math.ceil(low / 60 / step.value) * step.value;
    return Math.min(minutes * 60, high);
  }
  if (total > high) {
    const minutes = Math.floor(high / 60 / step.value) * step.value;
    return Math.max(minutes * 60, low);
  }
  return total;
}

// A time slot is one minute long when seconds are shown, otherwise it is a single second
function slotFits(date: string, start: number) {
  const [low, high] = limits(date);
  return start + (props.seconds ? 59 : 0) >= low && start <= high;
}

const clock = ref<Date | null>(null);

const fallback = computed<TimeParts>(() => {
  if (props.defaultTime === "now") {
    const now = clock.value;
    const minutes = now ? now.getHours() * 60 + now.getMinutes() : 0;
    return fromSeconds(Math.floor(minutes / step.value) * step.value * 60);
  }
  return parseTime(props.defaultTime) ?? { hour: 0, minute: 0, second: 0 };
});

// A time picked before any date
const draft = ref<TimeParts | null>(null);

const shown = computed<TimeParts>(() => {
  const time = parsed.value ?? draft.value ?? fallback.value;
  return { ...time, second: props.seconds ? time.second : 0 };
});
const hasTime = computed(() => !!parsed.value || !!draft.value);

const zone = computed(() =>
  props.timeZone
    ? zoneName(props.timeZone, parsed.value?.date ?? todayISO(), props.locale)
    : "",
);

const text = computed(() => {
  const value = parsed.value;
  if (!value) return "";
  const options = props.format ?? {
    dateStyle: "medium",
    timeStyle: props.seconds ? "medium" : "short",
  };
  const clockOption =
    props.hour12 === undefined || "hour12" in options || "hourCycle" in options
      ? {}
      : { hour12: props.hour12 };
  const base = formatDateTimeLabel(value, props.locale, {
    ...options,
    ...clockOption,
  });
  return zone.value ? `${base} ${zone.value}` : base;
});

const timeText = computed(() => {
  const base = formatDateTimeLabel(
    { date: parsed.value?.date ?? "2000-01-01", ...shown.value },
    props.locale,
    {
      timeStyle: props.seconds ? "medium" : "short",
      hour12: is12.value,
    },
  );
  return zone.value ? `${base} ${zone.value}` : base;
});

const hiddenValue = computed(() =>
  parsed.value
    ? formatDateTime(parsed.value.date, parsed.value, props.seconds)
    : "",
);

const twoDigits = computed(
  () => new Intl.NumberFormat(props.locale, { minimumIntegerDigits: 2 }),
);
const plain = computed(() => new Intl.NumberFormat(props.locale));

const minutes = computed(() =>
  Array.from({ length: 60 / step.value }, (_, index) => index * step.value),
);

function hourFits(hour: number) {
  const date = parsed.value?.date;
  return (
    !date || minutes.value.some((m) => slotFits(date, hour * 3600 + m * 60))
  );
}

const columns = computed<Column[]>(() => {
  const time = shown.value;
  const date = parsed.value?.date;
  const set = hasTime.value;
  const twelve = is12.value;

  const make = (
    key: Unit,
    label: string,
    values: number[],
    isCurrent: (value: number) => boolean,
    isDisabled: (value: number) => boolean,
    text: (value: number) => string,
  ): Column => {
    const options = values.map((value) => ({
      value,
      label: text(value),
      selected: set && isCurrent(value),
      disabled: isDisabled(value),
    }));
    const current = values.findIndex(
      (value, index) => isCurrent(value) && !options[index]!.disabled,
    );
    return {
      key,
      label,
      options,
      tab: current >= 0 ? current : options.findIndex((o) => !o.disabled),
    };
  };

  const hourValues = twelve
    ? [12, ...Array.from({ length: 11 }, (_, i) => i + 1)]
    : Array.from({ length: 24 }, (_, i) => i);
  const toHour = (value: number) =>
    twelve ? (value % 12) + (time.hour >= 12 ? 12 : 0) : value;

  const result: Column[] = [
    make(
      "hour",
      props.hourLabel,
      hourValues,
      (value) => toHour(value) === time.hour,
      (value) => !hourFits(toHour(value)),
      (value) => (twelve ? plain.value : twoDigits.value).format(value),
    ),
    make(
      "minute",
      props.minuteLabel,
      minutes.value,
      (value) => value === time.minute,
      (value) => !!date && !slotFits(date, time.hour * 3600 + value * 60),
      (value) => twoDigits.value.format(value),
    ),
  ];
  if (props.seconds) {
    const [low, high] = date ? limits(date) : [0, 86399];
    result.push(
      make(
        "second",
        props.secondLabel,
        Array.from({ length: 60 }, (_, i) => i),
        (value) => value === time.second,
        (value) => {
          const at = time.hour * 3600 + time.minute * 60 + value;
          return at < low || at > high;
        },
        (value) => twoDigits.value.format(value),
      ),
    );
  }
  if (twelve) {
    result.push(
      make(
        "period",
        props.periodLabel,
        [0, 1],
        (value) => (time.hour >= 12 ? 1 : 0) === value,
        (value) =>
          Array.from({ length: 12 }, (_, i) => i + value * 12).every(
            (hour) => !hourFits(hour),
          ),
        (value) => periods.value[value]!,
      ),
    );
  }
  return result;
});

function commit(date: string, total: number) {
  draft.value = null;
  model.value = formatDateTime(date, fromSeconds(total), props.seconds);
}

function onDate(value: string | DateRange | null | undefined) {
  if (typeof value !== "string") return;
  commit(value, fit(value, toSeconds(shown.value)));
}

function pick(unit: Unit, value: number) {
  const time = { ...shown.value };
  if (unit === "hour")
    time.hour = is12.value ? (value % 12) + (time.hour >= 12 ? 12 : 0) : value;
  else if (unit === "minute") time.minute = value;
  else if (unit === "second") time.second = value;
  else time.hour = (time.hour % 12) + value * 12;
  const date = parsed.value?.date;
  if (date) commit(date, fit(date, toSeconds(time)));
  else draft.value = time;
}

async function onColumnKeydown(event: KeyboardEvent, column: Column) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const list = event.currentTarget as HTMLElement;
  const from = (event.target as HTMLElement).closest<HTMLElement>(
    "[data-index]",
  );
  const current = Number(from?.dataset.index ?? column.tab);
  const enabled = column.options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);
  const target =
    event.key === "Home"
      ? enabled[0]
      : event.key === "End"
        ? enabled.at(-1)
        : event.key === "ArrowDown"
          ? enabled.find((index) => index > current)
          : enabled.filter((index) => index < current).at(-1);
  if (target === undefined) return;
  pick(column.key, column.options[target]!.value);
  await nextTick();
  list.querySelector<HTMLElement>(`[data-index="${target}"]`)?.focus();
}

// The date the "Now" button picks: today, moved into `min` and `max`
function nowTarget() {
  const now = new Date();
  let date = todayISO();
  let total =
    Math.floor(now.getMinutes() / step.value) * step.value * 60 +
    now.getHours() * 3600 +
    (props.seconds ? now.getSeconds() : 0);
  if (lowest.value && date < lowest.value.date) {
    date = lowest.value.date;
    total = 0;
  } else if (highest.value && date > highest.value.date) {
    date = highest.value.date;
    total = 86399;
  }
  return { date, total: fit(date, total) };
}

const nowBlocked = () => !!props.isDateDisabled?.(nowTarget().date);

function setNow() {
  const { date, total } = nowTarget();
  if (props.isDateDisabled?.(date)) return;
  commit(date, total);
  nextTick(centerColumns);
}

function clear() {
  draft.value = null;
  model.value = null;
}

function show() {
  if (!props.disabled) open.value = true;
}

function close(refocus = false) {
  open.value = false;
  if (refocus) trigger.value?.focus();
}

const side = ref<"bottom" | "top">("bottom");

// Opens upward when there's no room below and more room above
function place() {
  const anchor = root.value?.getBoundingClientRect();
  const height = popover.value?.offsetHeight;
  if (!anchor || !height) return;
  const below = window.innerHeight - anchor.bottom;
  side.value = below < height + 8 && anchor.top > below ? "top" : "bottom";
}

// Scrolls each column so the selected option is in the middle
function centerColumns() {
  popover.value
    ?.querySelectorAll<HTMLElement>(".n-date-time-picker-column")
    .forEach((list) => {
      const option = list.querySelector<HTMLElement>("[data-selected]");
      if (option)
        list.scrollTop =
          option.offsetTop - (list.clientHeight - option.offsetHeight) / 2;
    });
}

watch(open, async (isOpen) => {
  if (!isOpen) {
    draft.value = null;
    return;
  }
  clock.value = new Date();
  side.value = "bottom";
  await nextTick();
  place();
  centerColumns();
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

onMounted(() => {
  clock.value = new Date();
  document.addEventListener("pointerdown", onPointerDown);
});
onBeforeUnmount(() =>
  document.removeEventListener("pointerdown", onPointerDown),
);
</script>

<template>
  <div
    ref="root"
    class="n-date-time-picker"
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
      class="n-date-time-picker-trigger"
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
      <NIcon name="i-lucide-calendar-clock" class="n-date-time-picker-icon" />
      <span class="n-date-time-picker-value">{{ text || placeholder }}</span>
    </button>
    <input
      v-if="name"
      type="hidden"
      :name="name"
      :value="hiddenValue"
      :disabled="disabled"
    />
    <Transition name="n-date-time-picker">
      <div
        v-if="open"
        :id="popoverId"
        ref="popover"
        class="n-date-time-picker-popover"
        role="dialog"
        :aria-label="label ?? placeholder"
      >
        <div class="n-date-time-picker-body">
          <NCalendar
            :model-value="parsed?.date ?? null"
            :color="color"
            :min="lowest?.date"
            :max="highest?.date"
            :is-date-disabled="isDateDisabled"
            :week-start="weekStart"
            :locale="locale"
            :prev-label="prevLabel"
            :next-label="nextLabel"
            @update:model-value="onDate"
          />
          <div
            class="n-date-time-picker-time"
            role="group"
            :aria-label="timeLabel"
          >
            <div class="n-date-time-picker-time-head">
              <NIcon
                name="i-lucide-clock"
                class="n-date-time-picker-time-icon"
              />
              <span class="n-date-time-picker-time-text">{{ timeText }}</span>
            </div>
            <div class="n-date-time-picker-columns">
              <div
                v-for="column in columns"
                :key="column.key"
                class="n-date-time-picker-column"
                role="listbox"
                :aria-label="column.label"
                @keydown="onColumnKeydown($event, column)"
              >
                <button
                  v-for="(option, index) in column.options"
                  :key="option.value"
                  class="n-date-time-picker-option"
                  type="button"
                  role="option"
                  :data-index="index"
                  :aria-selected="option.selected ? 'true' : 'false'"
                  :aria-disabled="option.disabled ? 'true' : undefined"
                  :data-selected="option.selected ? '' : undefined"
                  :tabindex="index === column.tab ? 0 : -1"
                  @click="!option.disabled && pick(column.key, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="n-date-time-picker-footer">
          <NButton
            variant="ghost"
            color="neutral"
            size="sm"
            :label="nowLabel"
            :disabled="nowBlocked()"
            @click="setNow"
          />
          <NButton
            v-if="clearable"
            variant="ghost"
            color="neutral"
            size="sm"
            :label="clearLabel"
            :disabled="!parsed"
            @click="clear"
          />
          <NButton
            class="n-date-time-picker-done"
            :color="color"
            size="sm"
            :label="doneLabel"
            @click="close(true)"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>
