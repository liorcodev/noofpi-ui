<script setup lang="ts">
import {
  computed,
  inject,
  useAttrs,
  useId,
  useSlots,
  type PropType,
} from "vue";
import { FIELD_KEY } from "../internal/form-context";
import type { ButtonColor, SliderSize } from "../types";

defineOptions({ name: "NSlider", inheritAttrs: false });

const props = defineProps({
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  label: { type: String, default: undefined },
  showValue: { type: Boolean, default: false },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  size: { type: String as PropType<SliderSize>, default: "md" },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

// `undefined` until the slider moves: it then sits at `min`
const model = defineModel<number | undefined>();
const field = inject(FIELD_KEY, null);
const slots = useSlots();
const labelId = useId();

// `class` and `style` go on the wrapper, every other attribute on the `<input>`
const attrs = useAttrs();
const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

const current = computed(() =>
  Math.min(Math.max(model.value ?? props.min, props.min), props.max),
);

const percent = computed(() =>
  props.max > props.min
    ? ((current.value - props.min) / (props.max - props.min)) * 100
    : 0,
);

const hasHead = computed(
  () => !!props.label || !!slots.label || props.showValue,
);
const isInvalid = computed(() => props.invalid || field?.invalid.value);

function onInput(event: Event) {
  model.value = Number((event.target as HTMLInputElement).value);
}
</script>

<template>
  <div
    class="n-slider"
    :class="attrs.class"
    :style="[attrs.style as any, { '--n-slider-pct': percent }]"
    :data-color="color"
    :data-size="size"
    :data-invalid="isInvalid ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
  >
    <div v-if="hasHead" class="n-slider-head">
      <span v-if="label || slots.label" :id="labelId" class="n-slider-label">
        <slot name="label">{{ label }}</slot>
      </span>
      <span v-if="showValue" class="n-slider-value">
        <slot name="value" :value="current">{{ current }}</slot>
      </span>
    </div>
    <input
      v-bind="inputAttrs"
      class="n-slider-input"
      type="range"
      :id="(attrs.id as string | undefined) ?? field?.id"
      :min="min"
      :max="max"
      :step="step"
      :value="current"
      :disabled="disabled"
      :aria-labelledby="label || slots.label ? labelId : undefined"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="field?.describedBy.value"
      @input="onInput"
    />
  </div>
</template>
