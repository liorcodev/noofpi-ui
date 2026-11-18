<script setup lang="ts">
import { inject, provide, useId, type PropType } from "vue";
import { FIELD_KEY } from "../internal/form-context";
import type {
  ButtonColor,
  ButtonSize,
  ButtonVariant,
  ChoiceItem,
  ChoiceOrientation,
} from "../types";
import NButton from "./NButton.vue";

defineOptions({ name: "NRadioGroup" });

const props = defineProps({
  items: { type: Array as PropType<readonly ChoiceItem[]>, required: true },
  orientation: {
    type: String as PropType<ChoiceOrientation>,
    default: "vertical",
  },
  /** Render each item as a toggle button instead of a radio */
  buttons: { type: Boolean, default: false },
  /** Native `name` shared by the radios (not in `buttons` mode). Default: generated */
  name: { type: String, default: undefined },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** Accent of the radios; in button mode the color of the buttons, see `NButton` */
  color: { type: String as PropType<ButtonColor>, default: undefined },
  size: { type: String as PropType<ButtonSize>, default: undefined },
  variant: { type: String as PropType<ButtonVariant>, default: "outline" },
  /** The variant of the selected button */
  checkedVariant: {
    type: String as PropType<ButtonVariant>,
    default: "solid",
  },
});

const model = defineModel<unknown>();
const field = inject(FIELD_KEY, null);
provide(FIELD_KEY, null);
const groupName = `n-radio-${useId()}`;
</script>

<template>
  <fieldset
    class="n-choice-group"
    :id="field?.id"
    :disabled="disabled"
    role="radiogroup"
    :data-color="color ?? 'primary'"
    :data-orientation="orientation"
    :aria-invalid="invalid || field?.invalid.value ? 'true' : undefined"
    :aria-describedby="field?.describedBy.value"
  >
    <template v-for="item in items" :key="String(item.value)">
      <NButton
        v-if="buttons"
        role="radio"
        :aria-checked="model === item.value ? 'true' : 'false'"
        :data-checked="model === item.value ? '' : undefined"
        :label="item.label"
        :disabled="item.disabled"
        :color="color"
        :size="size"
        :variant="model === item.value ? checkedVariant : variant"
        @click="model = item.value"
      />
      <div v-else class="n-choice">
        <label class="n-checkbox">
          <input
            v-model="model"
            class="n-checkbox-input"
            type="radio"
            :name="name ?? groupName"
            :value="item.value"
            :disabled="item.disabled"
            :aria-invalid="invalid || field?.invalid.value ? 'true' : undefined"
          />
          <span class="n-checkbox-label">{{ item.label }}</span>
        </label>
        <p v-if="item.description" class="n-choice-description">
          {{ item.description }}
        </p>
      </div>
    </template>
  </fieldset>
</template>
