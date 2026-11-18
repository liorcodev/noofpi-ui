<script setup lang="ts">
import { computed, useSlots, type PropType } from "vue";
import type {
  ButtonColor,
  ButtonIcon,
  EmptyStateAction,
  EmptyStateProps,
} from "../types";
import NButton from "./NButton.vue";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NEmptyState" });

const props = defineProps({
  as: {
    type: [String, Object, Function] as PropType<EmptyStateProps["as"]>,
    default: "div",
  },
  title: { type: String, default: undefined },
  description: { type: String, default: undefined },
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  size: { type: String as PropType<EmptyStateProps["size"]>, default: "md" },
  actions: {
    type: Array as PropType<EmptyStateAction[]>,
    default: () => [],
  },
});

const slots = useSlots();
const hasActions = computed(
  () => Boolean(props.actions.length) || Boolean(slots.actions),
);
</script>

<template>
  <component
    :is="as"
    class="n-empty-state"
    :data-color="color"
    :data-size="size"
  >
    <div v-if="icon || $slots.media" class="n-empty-state-media">
      <slot name="media">
        <NIcon v-if="icon" :name="icon" class="n-empty-state-icon" />
      </slot>
    </div>
    <div class="n-empty-state-heading">
      <h3 v-if="title || $slots.title" class="n-empty-state-title">
        <slot name="title">{{ title }}</slot>
      </h3>
      <div
        v-if="description || $slots.default"
        class="n-empty-state-description"
      >
        <slot>{{ description }}</slot>
      </div>
    </div>
    <div v-if="hasActions" class="n-empty-state-actions">
      <slot name="actions">
        <NButton
          v-for="(action, index) in actions"
          :key="index"
          :color="action.color ?? color"
          v-bind="action"
        />
      </slot>
    </div>
  </component>
</template>
