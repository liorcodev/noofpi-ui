<script setup lang="ts">
import { computed, useSlots, type PropType } from "vue";
import type { ButtonColor, ChipPosition, ChipSize } from "../types";

defineOptions({ name: "NChip" });

const props = defineProps({
  text: { type: [String, Number], default: undefined },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  size: { type: String as PropType<ChipSize>, default: "md" },
  position: { type: String as PropType<ChipPosition>, default: "top-right" },
  inset: { type: Boolean, default: false },
  standalone: { type: Boolean, default: false },
  show: { type: Boolean, default: true },
});

const slots = useSlots();

// Without text (or a `content` slot) the chip is a plain dot, which is decorative
const hasContent = computed(
  () =>
    (props.text !== undefined && props.text !== "") || Boolean(slots.content),
);
</script>

<template>
  <span
    v-if="standalone && show"
    class="n-chip-badge"
    data-standalone=""
    :data-color="color"
    :data-size="size"
    :data-text="hasContent ? '' : undefined"
    :aria-hidden="hasContent ? undefined : 'true'"
  >
    <span v-if="hasContent" class="n-chip-text">
      <slot name="content">{{ text }}</slot>
    </span>
  </span>
  <span v-else-if="!standalone" class="n-chip">
    <slot />
    <span
      v-if="show"
      class="n-chip-badge"
      :data-color="color"
      :data-size="size"
      :data-position="position"
      :data-inset="inset ? '' : undefined"
      :data-text="hasContent ? '' : undefined"
      :aria-hidden="hasContent ? undefined : 'true'"
    >
      <span v-if="hasContent" class="n-chip-text">
        <slot name="content">{{ text }}</slot>
      </span>
    </span>
  </span>
</template>
