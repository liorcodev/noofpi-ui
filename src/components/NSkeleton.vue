<script setup lang="ts">
import { computed, type PropType } from "vue";
import type { SkeletonProps, SkeletonShape } from "../types";

defineOptions({ name: "NSkeleton" });

const props = defineProps({
  as: {
    type: [String, Object, Function] as PropType<SkeletonProps["as"]>,
    default: "div",
  },
  shape: { type: String as PropType<SkeletonShape>, default: "rect" },
  width: { type: [String, Number], default: undefined },
  height: { type: [String, Number], default: undefined },
  lines: { type: Number, default: 1 },
  animated: { type: Boolean, default: true },
  label: { type: String, default: undefined },
});

const length = (value: string | number | undefined) =>
  typeof value === "number" ? `${value}px` : value;

const style = computed(() => ({
  "--n-skeleton-w": length(props.width),
  "--n-skeleton-h": length(props.height),
}));

const count = computed(() =>
  props.shape === "text" ? Math.max(1, Math.floor(props.lines) || 1) : 1,
);
</script>

<template>
  <component
    :is="as"
    class="n-skeleton"
    :data-shape="shape"
    :data-animated="animated ? '' : undefined"
    :style="style"
    :role="label ? 'status' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <template v-if="shape === 'text'">
      <span v-for="line in count" :key="line" class="n-skeleton-line" />
    </template>
  </component>
</template>
