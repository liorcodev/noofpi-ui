<script setup lang="ts">
import { useSlots, type PropType } from "vue";
import type { ButtonColor, CardProps, CardVariant } from "../types";

defineOptions({ name: "NCard" });

defineProps({
  as: {
    type: [String, Object, Function] as PropType<CardProps["as"]>,
    default: "div",
  },
  variant: { type: String as PropType<CardVariant>, default: "outline" },
  color: { type: String as PropType<ButtonColor>, default: "neutral" },
});

const slots = useSlots();
</script>

<template>
  <component
    :is="as"
    class="n-card"
    :data-variant="variant"
    :data-color="color"
  >
    <div v-if="slots.media" class="n-card-media"><slot name="media" /></div>
    <div v-if="slots.header" class="n-card-header"><slot name="header" /></div>
    <div v-if="slots.default" class="n-card-body"><slot /></div>
    <div v-if="slots.footer" class="n-card-footer"><slot name="footer" /></div>
  </component>
</template>
