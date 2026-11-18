<script setup lang="ts">
import { inject, provide, type PropType } from "vue";
import { FIELD_KEY } from "../internal/form-context";
import type {
  ButtonColor,
  ButtonSize,
  ButtonVariant,
  ChoiceItem,
  ChoiceOrientation,
} from "../types";
import NCheckButton from "./NCheckButton.vue";
import NCheckbox from "./NCheckbox.vue";

defineOptions({ name: "NCheckboxGroup" });

defineProps({
  items: { type: Array as PropType<readonly ChoiceItem[]>, required: true },
  orientation: {
    type: String as PropType<ChoiceOrientation>,
    default: "vertical",
  },
  /** Render each item as a toggle button instead of a checkbox */
  buttons: { type: Boolean, default: false },
  /** Native `name` of every checkbox (checkbox mode only) */
  name: { type: String, default: undefined },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** Accent of the checkboxes; in button mode the color of the buttons, see `NCheckButton` */
  color: { type: String as PropType<ButtonColor>, default: undefined },
  size: { type: String as PropType<ButtonSize>, default: undefined },
  variant: { type: String as PropType<ButtonVariant>, default: undefined },
  checkedVariant: {
    type: String as PropType<ButtonVariant>,
    default: undefined,
  },
});

const model = defineModel<unknown[]>({ default: () => [] });
const field = inject(FIELD_KEY, null);
// The group carries the field's id and messages once, not every item
provide(FIELD_KEY, null);
</script>

<template>
  <fieldset
    class="n-choice-group"
    :id="field?.id"
    :disabled="disabled"
    :data-orientation="orientation"
    :aria-invalid="invalid || field?.invalid.value ? 'true' : undefined"
    :aria-describedby="field?.describedBy.value"
  >
    <template v-for="item in items" :key="String(item.value)">
      <NCheckButton
        v-if="buttons"
        v-model="model"
        :value="item.value"
        :label="item.label"
        :disabled="item.disabled"
        :color="color"
        :size="size"
        :variant="variant"
        :checked-variant="checkedVariant"
      />
      <div v-else class="n-choice">
        <NCheckbox
          v-model="model"
          :value="item.value"
          :name="name"
          :color="color"
          :label="item.label"
          :disabled="item.disabled"
          :invalid="invalid || field?.invalid.value"
        />
        <p v-if="item.description" class="n-choice-description">
          {{ item.description }}
        </p>
      </div>
    </template>
  </fieldset>
</template>
