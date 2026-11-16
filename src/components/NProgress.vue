<script setup lang="ts">
import { computed, useId, useSlots, type PropType } from "vue";
import type { ButtonColor, ProgressProps, ProgressSize } from "../types";

defineOptions({ name: "NProgress" });

const props = defineProps({
  as: {
    type: [String, Object, Function] as PropType<ProgressProps["as"]>,
    default: "div",
  },
  value: { type: Number, default: undefined },
  max: { type: Number, default: 100 },
  label: { type: String, default: undefined },
  showValue: { type: Boolean, default: false },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  size: { type: String as PropType<ProgressSize>, default: "md" },
});

const slots = useSlots();
const labelId = useId();

const indeterminate = computed(
  () => props.value === undefined || Number.isNaN(props.value),
);

const clamped = computed(() =>
  Math.min(Math.max(props.value ?? 0, 0), props.max),
);

const percent = computed(() =>
  props.max > 0 ? Math.round((clamped.value / props.max) * 100) : 0,
);

const hasHead = computed(
  () =>
    !!props.label || !!slots.label || (props.showValue && !indeterminate.value),
);
</script>

<template>
  <component
    :is="as"
    class="n-progress"
    :data-color="color"
    :data-size="size"
    :data-indeterminate="indeterminate ? '' : undefined"
  >
    <div v-if="hasHead" class="n-progress-head">
      <span v-if="label || slots.label" :id="labelId" class="n-progress-label">
        <slot name="label">{{ label }}</slot>
      </span>
      <span v-if="showValue && !indeterminate" class="n-progress-value">
        <slot name="value" :value="clamped" :percent="percent">
          {{ percent }}%
        </slot>
      </span>
    </div>
    <div
      class="n-progress-track"
      role="progressbar"
      aria-valuemin="0"
      :aria-valuemax="max"
      :aria-valuenow="indeterminate ? undefined : clamped"
      :aria-labelledby="label || slots.label ? labelId : undefined"
    >
      <div
        class="n-progress-bar"
        :style="indeterminate ? undefined : { width: `${percent}%` }"
      />
    </div>
  </component>
</template>
