<script setup lang="ts">
import { computed, useSlots, type PropType } from "vue";
import type {
  SeparatorAlign,
  SeparatorOrientation,
  SeparatorVariant,
} from "../types";

defineOptions({ name: "NSeparator" });

const props = defineProps({
  orientation: {
    type: String as PropType<SeparatorOrientation>,
    default: "horizontal",
  },
  /** Text shown in the line. The default slot replaces it */
  label: { type: String, default: undefined },
  /** Where the label sits on the line */
  align: { type: String as PropType<SeparatorAlign>, default: "center" },
  variant: { type: String as PropType<SeparatorVariant>, default: "solid" },
  /** Purely visual: hidden from assistive technology */
  decorative: { type: Boolean, default: false },
});

const slots = useSlots();
const labeled = computed(() => Boolean(props.label) || Boolean(slots.default));
</script>

<template>
  <div
    class="n-separator"
    :role="decorative ? 'none' : 'separator'"
    :aria-orientation="
      decorative || orientation === 'horizontal' ? undefined : 'vertical'
    "
    :data-orientation="orientation"
    :data-align="align"
    :data-variant="variant"
    :data-labeled="labeled ? '' : undefined"
  >
    <span v-if="labeled" class="n-separator-label">
      <slot>{{ label }}</slot>
    </span>
  </div>
</template>
