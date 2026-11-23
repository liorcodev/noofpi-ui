<script setup lang="ts">
import { useId, type PropType } from "vue";
import type { ButtonIcon, CollapsibleVariant } from "../types";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NCollapsible" });

defineProps({
  /** Text of the trigger. The `label` slot replaces it */
  label: { type: String, default: undefined },
  icon: { type: [String, Object] as PropType<ButtonIcon>, default: undefined },
  variant: { type: String as PropType<CollapsibleVariant>, default: "plain" },
  disabled: { type: Boolean, default: false },
});

/** Whether the content is shown (`v-model`). Works without a `v-model` too */
const open = defineModel<boolean>({ default: false });

defineSlots<{
  /** Replaces the content of the trigger */
  label?: (props: { open: boolean }) => unknown;
  /** The content that is shown and hidden */
  default?: (props: { open: boolean }) => unknown;
}>();

const baseId = useId();
const triggerId = `n-collapsible-trigger-${baseId}`;
const panelId = `n-collapsible-panel-${baseId}`;
</script>

<template>
  <div
    class="n-collapsible"
    :data-variant="variant"
    :data-open="open ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
  >
    <button
      :id="triggerId"
      class="n-collapsible-trigger"
      type="button"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="panelId"
      :disabled="disabled"
      @click="open = !open"
    >
      <slot name="label" :open="open">
        <NIcon v-if="icon" :name="icon" class="n-collapsible-icon" />
        <span class="n-collapsible-label">{{ label }}</span>
      </slot>
      <NIcon name="i-lucide-chevron-down" class="n-collapsible-chevron" />
    </button>
    <div
      :id="panelId"
      class="n-collapsible-panel"
      role="region"
      :aria-labelledby="triggerId"
      :inert="!open"
    >
      <div class="n-collapsible-panel-inner">
        <div class="n-collapsible-content">
          <slot :open="open" />
        </div>
      </div>
    </div>
  </div>
</template>
