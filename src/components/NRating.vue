<script setup lang="ts">
import { computed, inject, ref, type PropType } from "vue";
import { FIELD_KEY } from "../internal/form-context";
import type { ButtonColor, ButtonIcon, RatingSize } from "../types";

defineOptions({ name: "NRating" });

const props = defineProps({
  /** Number of stars */
  max: { type: Number, default: 5 },
  /** Lets a click on the half of a star pick half a point */
  allowHalf: { type: Boolean, default: false },
  /** Clicking the current value again resets it to `0` */
  clearable: { type: Boolean, default: false },
  /** Replaces the built-in star. The empty ones show it in a muted color */
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  /** Accessible name */
  label: { type: String, default: undefined },
  /** Native `name`: a hidden input submits the value with a surrounding `<form>` */
  name: { type: String, default: undefined },
  color: { type: String as PropType<ButtonColor>, default: "warning" },
  size: { type: String as PropType<RatingSize>, default: "md" },
  /** Shows the value without letting it change */
  readonly: { type: Boolean, default: false },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const model = defineModel<number | undefined>();
const field = inject(FIELD_KEY, null);
const root = ref<HTMLElement>();
const hover = ref<number | null>(null);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const step = computed(() => (props.allowHalf ? 0.5 : 1));
const current = computed(() => clamp(model.value ?? 0, 0, props.max));
const shown = computed(() => hover.value ?? current.value);
const interactive = computed(() => !props.readonly && !props.disabled);
const isInvalid = computed(() => props.invalid || field?.invalid.value);
const stars = computed(() =>
  Array.from({ length: props.max }, (_, i) => i + 1),
);

// How much of the star (0 to 1) is filled
const fillOf = (star: number) => clamp(shown.value - (star - 1), 0, 1);

const isRtl = () =>
  root.value ? getComputedStyle(root.value).direction === "rtl" : false;

function valueAt(event: MouseEvent, star: number) {
  if (!props.allowHalf) return star;
  const { left, width } = (
    event.currentTarget as HTMLElement
  ).getBoundingClientRect();
  let fraction = width ? (event.clientX - left) / width : 1;
  if (isRtl()) fraction = 1 - fraction;
  return star - 1 + (fraction <= 0.5 ? 0.5 : 1);
}

function onClick(event: MouseEvent, star: number) {
  if (!interactive.value) return;
  const value = valueAt(event, star);
  model.value = props.clearable && value === current.value ? 0 : value;
}

function onPointerMove(event: PointerEvent, star: number) {
  if (interactive.value && event.pointerType === "mouse")
    hover.value = valueAt(event, star);
}

function onKeydown(event: KeyboardEvent) {
  if (!interactive.value) return;
  // The stars start at the right in RTL, so the horizontal arrows swap
  const horizontal = isRtl() ? -1 : 1;
  const delta: Record<string, number> = {
    ArrowRight: horizontal,
    ArrowLeft: -horizontal,
    ArrowUp: 1,
    ArrowDown: -1,
  };
  // A rating that isn't `clearable` can't be taken back to 0 once it has a value
  const min = props.clearable ? 0 : Math.min(step.value, current.value);
  let next: number | undefined;
  if (event.key in delta) next = current.value + delta[event.key]! * step.value;
  else if (event.key === "Home") next = min;
  else if (event.key === "End") next = props.max;
  if (next === undefined) return;
  event.preventDefault();
  model.value = clamp(next, min, props.max);
}

const description = computed(() => {
  const text = `${current.value}/${props.max}`;
  return props.label ? `${props.label}: ${text}` : text;
});
</script>

<template>
  <div
    ref="root"
    class="n-rating"
    :id="field?.id"
    :role="interactive || disabled ? 'slider' : 'img'"
    :tabindex="interactive ? 0 : undefined"
    :aria-label="interactive || disabled ? label : description"
    :aria-valuemin="interactive || disabled ? 0 : undefined"
    :aria-valuemax="interactive || disabled ? max : undefined"
    :aria-valuenow="interactive || disabled ? current : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-invalid="isInvalid ? 'true' : undefined"
    :aria-describedby="field?.describedBy.value"
    :data-color="color"
    :data-size="size"
    :data-interactive="interactive ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-invalid="isInvalid ? '' : undefined"
    @keydown="onKeydown"
    @pointerleave="hover = null"
  >
    <span
      v-for="star in stars"
      :key="star"
      class="n-rating-item"
      :style="{ '--n-rating-fill': fillOf(star) }"
      @click="onClick($event, star)"
      @pointermove="onPointerMove($event, star)"
    >
      <span
        v-for="filled in [false, true]"
        :key="String(filled)"
        :class="filled ? 'n-rating-filled' : 'n-rating-empty'"
      >
        <span
          v-if="typeof icon === 'string'"
          :class="['n-rating-icon', icon]"
          aria-hidden="true"
        />
        <component
          :is="icon"
          v-else-if="icon"
          class="n-rating-icon"
          aria-hidden="true"
        />
        <svg
          v-else
          class="n-rating-icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polygon
            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          />
        </svg>
      </span>
    </span>
    <input v-if="name" type="hidden" :name="name" :value="current || ''" />
  </div>
</template>
