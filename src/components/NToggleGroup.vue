<script setup lang="ts">
import { computed, inject, provide, ref, type PropType } from "vue";
import { FIELD_KEY } from "../internal/form-context";
import type {
  ButtonColor,
  ButtonShape,
  ButtonSize,
  ButtonVariant,
  ChoiceOrientation,
  ToggleGroupItem,
} from "../types";
import NButton from "./NButton.vue";

defineOptions({ name: "NToggleGroup" });

const props = defineProps({
  items: {
    type: Array as PropType<readonly ToggleGroupItem[]>,
    required: true,
  },
  /** Any number of items can be on; `v-model` is then an array */
  multiple: { type: Boolean, default: false },
  orientation: {
    type: String as PropType<ChoiceOrientation>,
    default: "horizontal",
  },
  size: { type: String as PropType<ButtonSize>, default: "md" },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  shape: { type: String as PropType<ButtonShape>, default: "rounded" },
  variant: { type: String as PropType<ButtonVariant>, default: "ghost" },
  /** The variant of an item that is on */
  checkedVariant: {
    type: String as PropType<ButtonVariant>,
    default: "solid",
  },
  /** The border and padding around the items */
  bordered: { type: Boolean, default: true },
  /** Fill the width, the items sharing it equally */
  block: { type: Boolean, default: false },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** Accessible name of the group */
  label: { type: String, default: undefined },
});

defineSlots<{
  /** The content of an item, instead of its icon and label */
  item?: (props: { item: ToggleGroupItem; checked: boolean }) => unknown;
}>();

const model = defineModel<unknown>();
const field = inject(FIELD_KEY, null);
provide(FIELD_KEY, null);

const root = ref<HTMLElement>();

const isChecked = (item: ToggleGroupItem) =>
  props.multiple
    ? Array.isArray(model.value) && model.value.includes(item.value)
    : model.value === item.value;

// A single choice is a radio group with one tab stop: the selected item, or the first enabled one
const tabStop = computed(
  () =>
    props.items.find((item) => !item.disabled && isChecked(item)) ??
    props.items.find((item) => !item.disabled),
);

function select(item: ToggleGroupItem) {
  if (item.disabled || props.disabled) return;
  if (!props.multiple) {
    model.value = item.value;
    return;
  }
  const current = Array.isArray(model.value) ? model.value : [];
  model.value = isChecked(item)
    ? current.filter((value) => value !== item.value)
    : [...current, item.value];
}

function onKeydown(event: KeyboardEvent) {
  if (props.multiple || !root.value) return;
  const horizontal = props.orientation === "horizontal";
  const rtl = horizontal && getComputedStyle(root.value).direction === "rtl";
  const previousKeys = horizontal
    ? [rtl ? "ArrowRight" : "ArrowLeft", "ArrowUp"]
    : ["ArrowUp", "ArrowLeft"];
  const nextKeys = horizontal
    ? [rtl ? "ArrowLeft" : "ArrowRight", "ArrowDown"]
    : ["ArrowDown", "ArrowRight"];

  const elements = Array.from(
    root.value.querySelectorAll<HTMLElement>('[role="radio"]:not(:disabled)'),
  );
  if (!elements.length) return;
  const from = elements.indexOf(document.activeElement as HTMLElement);

  let index: number;
  if (nextKeys.includes(event.key)) index = (from + 1) % elements.length;
  else if (previousKeys.includes(event.key))
    index = from <= 0 ? elements.length - 1 : from - 1;
  else if (event.key === "Home") index = 0;
  else if (event.key === "End") index = elements.length - 1;
  else return;

  event.preventDefault();
  elements[index]?.focus();
  const target = props.items.filter((item) => !item.disabled)[index];
  if (target) select(target);
}
</script>

<template>
  <div
    ref="root"
    class="n-toggle-group"
    :id="field?.id"
    :role="multiple ? 'group' : 'radiogroup'"
    :aria-label="label"
    :aria-orientation="multiple ? undefined : orientation"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-invalid="invalid || field?.invalid.value ? 'true' : undefined"
    :aria-describedby="field?.describedBy.value"
    :data-orientation="orientation"
    :data-shape="shape"
    :data-bordered="bordered ? '' : undefined"
    :data-block="block ? '' : undefined"
    :data-invalid="invalid || field?.invalid.value ? '' : undefined"
    @keydown="onKeydown"
  >
    <NButton
      v-for="item in items"
      :key="String(item.value)"
      :role="multiple ? undefined : 'radio'"
      :aria-checked="multiple ? undefined : isChecked(item) ? 'true' : 'false'"
      :aria-pressed="
        multiple ? (isChecked(item) ? 'true' : 'false') : undefined
      "
      :aria-label="item.ariaLabel"
      :data-checked="isChecked(item) ? '' : undefined"
      :tabindex="multiple || item === tabStop ? undefined : -1"
      :label="item.label"
      :icon="item.icon"
      :disabled="disabled || item.disabled"
      :color="color"
      :size="size"
      :shape="shape"
      :variant="isChecked(item) ? checkedVariant : variant"
      @click="select(item)"
    >
      <template v-if="$slots.item" #default>
        <slot name="item" :item="item" :checked="isChecked(item)" />
      </template>
    </NButton>
  </div>
</template>
