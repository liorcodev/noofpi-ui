<script setup lang="ts">
import { computed, useSlots, type PropType } from "vue";
import type {
  AlertProps,
  AlertVariant,
  ButtonColor,
  ButtonIcon,
} from "../types";
import NButton from "./NButton.vue";

defineOptions({ name: "NAlert" });

const props = defineProps({
  as: {
    type: [String, Object, Function] as PropType<AlertProps["as"]>,
    default: "div",
  },
  title: { type: String, default: undefined },
  description: { type: String, default: undefined },
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  variant: { type: String as PropType<AlertVariant>, default: "soft" },
  close: { type: Boolean, default: false },
  closeIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-x",
  },
  closeLabel: { type: String, default: "Close" },
  actions: {
    type: Array as PropType<AlertProps["actions"]>,
    default: undefined,
  },
});

const emit = defineEmits<{ close: [] }>();

const slots = useSlots();

const COLOR_ICONS: Partial<Record<ButtonColor, string>> = {
  success: "i-lucide-circle-check",
  info: "i-lucide-info",
  warning: "i-lucide-triangle-alert",
  error: "i-lucide-circle-alert",
};

const leadingIcon = computed(() => props.icon ?? COLOR_ICONS[props.color]);

const hasActions = computed(
  () => Boolean(props.actions?.length) || Boolean(slots.actions),
);

// On a solid alert the accent is the background, so buttons switch to inverted neutral
const solid = computed(() => props.variant === "solid");
</script>

<template>
  <component
    :is="as"
    class="n-alert"
    :data-variant="variant"
    :data-color="color"
    :role="color === 'error' || color === 'warning' ? 'alert' : 'status'"
  >
    <slot name="leading">
      <span
        v-if="typeof leadingIcon === 'string'"
        :class="['n-alert-icon', leadingIcon]"
        aria-hidden="true"
      />
      <component
        :is="leadingIcon"
        v-else-if="leadingIcon"
        class="n-alert-icon"
        aria-hidden="true"
      />
    </slot>
    <div class="n-alert-body">
      <p v-if="title || $slots.title" class="n-alert-title">
        <slot name="title">{{ title }}</slot>
      </p>
      <div v-if="description || $slots.default" class="n-alert-description">
        <slot>{{ description }}</slot>
      </div>
      <div v-if="hasActions" class="n-alert-actions">
        <slot name="actions">
          <NButton
            v-for="(action, index) in actions"
            :key="index"
            size="xs"
            :variant="solid ? 'solid' : 'outline'"
            :color="solid ? 'neutral' : color"
            v-bind="action"
          />
        </slot>
      </div>
    </div>
    <NButton
      v-if="close"
      class="n-alert-close"
      variant="ghost"
      color="neutral"
      shape="circle"
      size="xs"
      :icon="closeIcon"
      :aria-label="closeLabel"
      @click="emit('close')"
    />
  </component>
</template>
