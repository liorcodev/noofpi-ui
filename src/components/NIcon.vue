<script setup lang="ts">
import type { PropType } from "vue";
import type { ButtonIcon } from "../types";

defineOptions({ name: "NIcon" });

defineProps({
  name: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    required: true,
  },
  label: { type: String, default: undefined },
});
</script>

<template>
  <span
    v-if="typeof name === 'string'"
    :class="['n-icon', name]"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  />
  <component
    :is="name"
    v-else
    class="n-icon"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  />
</template>
