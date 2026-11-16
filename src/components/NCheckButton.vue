<script setup lang="ts">
import { computed, type PropType } from "vue";
import type { ButtonVariant } from "../types";
import NButton from "./NButton.vue";

defineOptions({ name: "NCheckButton" });

// Other props (`label`, `color`, `size`, `shape`, `icon`, `disabled`, ...) fall through to `NButton`
const props = defineProps({
  /** The entry this button adds to an array `v-model` */
  value: { type: null as unknown as PropType<any>, default: undefined },
  variant: { type: String as PropType<ButtonVariant>, default: "outline" },
  /** The variant while checked */
  checkedVariant: { type: String as PropType<ButtonVariant>, default: "solid" },
});

const model = defineModel<boolean | unknown[]>();

const checked = computed(() =>
  Array.isArray(model.value)
    ? model.value.includes(props.value)
    : Boolean(model.value),
);

function toggle() {
  if (Array.isArray(model.value)) {
    model.value = checked.value
      ? model.value.filter((entry) => entry !== props.value)
      : [...model.value, props.value];
  } else {
    model.value = !checked.value;
  }
}
</script>

<template>
  <NButton
    :variant="checked ? checkedVariant : variant"
    :aria-pressed="checked ? 'true' : 'false'"
    :data-checked="checked ? '' : undefined"
    @click="toggle"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </NButton>
</template>
