<script setup lang="ts">
import { computed, useSlots, type PropType } from "vue";
import type { ButtonColor, ButtonIcon, StatProps, StatTrend } from "../types";

defineOptions({ name: "NStat" });

const props = defineProps({
  as: {
    type: [String, Object, Function] as PropType<StatProps["as"]>,
    default: "div",
  },
  label: { type: String, default: undefined },
  value: { type: [String, Number], default: undefined },
  description: { type: String, default: undefined },
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  trend: { type: String as PropType<StatTrend>, default: undefined },
});

const slots = useSlots();

const trendIcon = computed(() =>
  props.trend === "up"
    ? "i-lucide-trending-up"
    : props.trend === "down"
      ? "i-lucide-trending-down"
      : props.trend === "neutral"
        ? "i-lucide-minus"
        : undefined,
);
</script>

<template>
  <component :is="as" class="n-stat" :data-color="color" :data-trend="trend">
    <div v-if="label || slots.label || icon || slots.icon" class="n-stat-head">
      <span v-if="label || slots.label" class="n-stat-label">
        <slot name="label">{{ label }}</slot>
      </span>
      <slot name="icon">
        <span v-if="icon" class="n-stat-icon" aria-hidden="true">
          <span v-if="typeof icon === 'string'" :class="icon" />
          <component :is="icon" v-else />
        </span>
      </slot>
    </div>
    <div v-if="value !== undefined || slots.default" class="n-stat-value">
      <slot>{{ value }}</slot>
    </div>
    <div v-if="description || slots.description" class="n-stat-description">
      <span
        v-if="trendIcon"
        :class="['n-stat-trend', trendIcon]"
        aria-hidden="true"
      />
      <slot name="description">{{ description }}</slot>
    </div>
  </component>
</template>
