<script setup lang="ts">
import { computed, inject, useAttrs } from "vue";
import { FIELD_KEY } from "../internal/form-context";

defineOptions({ name: "NCheckbox", inheritAttrs: false });

defineProps({
  label: { type: String, default: undefined },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
});

const model = defineModel<boolean | unknown[]>();
const field = inject(FIELD_KEY, null);
const attrs = useAttrs();
// class and style belong on the wrapper; everything else on the native input
const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});
</script>

<template>
  <label class="n-checkbox" :class="attrs.class" :style="attrs.style">
    <input
      v-bind="inputAttrs"
      v-model="model"
      class="n-checkbox-input"
      type="checkbox"
      :id="(attrs.id as string | undefined) ?? field?.id"
      :aria-invalid="invalid || field?.invalid.value ? 'true' : undefined"
      :aria-describedby="field?.describedBy.value"
    />
    <span v-if="label || $slots.default" class="n-checkbox-label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>
