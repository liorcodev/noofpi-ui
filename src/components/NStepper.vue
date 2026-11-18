<script setup lang="ts">
import { computed, type PropType } from "vue";
import type {
  ButtonColor,
  StepperItem,
  StepperOrientation,
  StepperSize,
} from "../types";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NStepper" });

const props = defineProps({
  items: {
    type: Array as PropType<StepperItem[]>,
    default: () => [],
  },
  orientation: {
    type: String as PropType<StepperOrientation>,
    default: "horizontal",
  },
  size: { type: String as PropType<StepperSize>, default: "md" },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  /** Lets users click a completed step to go back to it */
  clickable: { type: Boolean, default: true },
  label: { type: String, default: "Progress" },
});

const model = defineModel<number>({ default: 0 });

const current = computed(() =>
  Math.min(
    Math.max(Math.floor(model.value) || 0, 0),
    Math.max(props.items.length - 1, 0),
  ),
);

function state(index: number) {
  if (index < current.value) return "complete";
  return index === current.value ? "current" : "upcoming";
}

function go(index: number) {
  if (!props.clickable || props.items[index]?.disabled) return;
  if (index < current.value) model.value = index;
}
</script>

<template>
  <ol
    class="n-stepper"
    :data-color="color"
    :aria-label="label"
    :data-orientation="orientation"
    :data-size="size"
  >
    <li
      v-for="(item, index) in items"
      :key="index"
      class="n-stepper-step"
      :data-state="state(index)"
      :aria-current="state(index) === 'current' ? 'step' : undefined"
    >
      <component
        :is="clickable && state(index) === 'complete' ? 'button' : 'div'"
        class="n-stepper-trigger"
        :type="clickable && state(index) === 'complete' ? 'button' : undefined"
        :disabled="
          clickable && state(index) === 'complete' ? item.disabled : undefined
        "
        @click="go(index)"
      >
        <span class="n-stepper-indicator">
          <slot
            name="indicator"
            :item="item"
            :index="index"
            :state="state(index)"
          >
            <NIcon v-if="state(index) === 'complete'" name="i-lucide-check" />
            <NIcon v-else-if="item.icon" :name="item.icon" />
            <template v-else>{{ index + 1 }}</template>
          </slot>
        </span>
        <span class="n-stepper-text">
          <span class="n-stepper-title">{{ item.title }}</span>
          <span v-if="item.description" class="n-stepper-description">
            {{ item.description }}
          </span>
        </span>
      </component>
      <span
        v-if="index < items.length - 1"
        class="n-stepper-separator"
        aria-hidden="true"
      />
    </li>
  </ol>
</template>
