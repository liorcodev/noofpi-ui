<script setup lang="ts">
import { computed, inject, useAttrs, type PropType } from "vue";
import { FIELD_KEY } from "../internal/form-context";
import type { ButtonColor, SwitchSize } from "../types";

defineOptions({ name: "NSwitch", inheritAttrs: false });

defineProps({
  label: { type: String, default: undefined },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  size: { type: String as PropType<SwitchSize>, default: "md" },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
});

const model = defineModel<boolean>();
const field = inject(FIELD_KEY, null);
const attrs = useAttrs();
// class and style belong on the wrapper; everything else on the native input
const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});
</script>

<template>
  <label
    class="n-switch"
    :class="attrs.class"
    :style="attrs.style"
    :data-color="color"
    :data-size="size"
  >
    <input
      v-bind="inputAttrs"
      v-model="model"
      class="n-switch-input"
      type="checkbox"
      role="switch"
      :id="(attrs.id as string | undefined) ?? field?.id"
      :aria-invalid="invalid || field?.invalid.value ? 'true' : undefined"
      :aria-describedby="field?.describedBy.value"
    />
    <span v-if="label || $slots.default" class="n-switch-label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>
