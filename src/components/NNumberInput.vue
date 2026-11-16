<script setup lang="ts">
import { computed, inject, ref, useAttrs, watch } from "vue";
import { FIELD_KEY } from "../internal/form-context";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NNumberInput", inheritAttrs: false });

const props = defineProps({
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  /** How much the buttons and the arrow keys change the value (PageUp/PageDown change it by 10 steps) */
  step: { type: Number, default: 1 },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  decrementLabel: { type: String, default: "Decrease" },
  incrementLabel: { type: String, default: "Increase" },
});

// `undefined` while the input is empty
const model = defineModel<number | undefined>();
const field = inject(FIELD_KEY, null);

// `class` and `style` go on the wrapper, every other attribute on the `<input>`
const attrs = useAttrs();
const rootAttrs = computed(() => ({
  class: attrs.class,
  style: attrs.style,
}));
const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

const text = ref(model.value === undefined ? "" : String(model.value));
watch(model, (value) => {
  text.value = value === undefined ? "" : String(value);
});

function decimals(value: number | undefined) {
  const [, fraction = ""] = String(value ?? 0).split(".");
  return fraction.length;
}

function clamp(value: number) {
  if (props.min !== undefined) value = Math.max(props.min, value);
  if (props.max !== undefined) value = Math.min(props.max, value);
  return value;
}

// Typed text becomes the model on change/blur/Enter; invalid text reverts to the model
function commit() {
  const raw = text.value.trim().replace(",", ".");
  if (raw === "") {
    model.value = undefined;
    text.value = "";
    return;
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(raw)) {
    text.value = model.value === undefined ? "" : String(model.value);
    return;
  }
  model.value = clamp(Number(raw));
  text.value = String(model.value);
}

function stepBy(steps: number) {
  if (props.disabled) return;
  commit();
  const precision = Math.max(decimals(props.step), decimals(props.min));
  const next = (model.value ?? 0) + steps * props.step;
  model.value = clamp(Number(next.toFixed(precision)));
  text.value = String(model.value);
}

function onKeydown(event: KeyboardEvent) {
  const steps: Record<string, number> = {
    ArrowUp: 1,
    ArrowDown: -1,
    PageUp: 10,
    PageDown: -10,
  };
  if (event.key in steps) {
    event.preventDefault();
    stepBy(steps[event.key]!);
  } else if (event.key === "Home" && props.min !== undefined) {
    event.preventDefault();
    model.value = props.min;
  } else if (event.key === "End" && props.max !== undefined) {
    event.preventDefault();
    model.value = props.max;
  }
}

const atMin = computed(
  () =>
    props.min !== undefined &&
    model.value !== undefined &&
    model.value <= props.min,
);
const atMax = computed(
  () =>
    props.max !== undefined &&
    model.value !== undefined &&
    model.value >= props.max,
);
const isInvalid = computed(() => props.invalid || field?.invalid.value);
</script>

<template>
  <div
    v-bind="rootAttrs"
    class="n-number"
    :data-invalid="isInvalid ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
  >
    <button
      type="button"
      class="n-number-button"
      tabindex="-1"
      :aria-label="decrementLabel"
      :disabled="disabled || atMin"
      @mousedown.prevent
      @click="stepBy(-1)"
    >
      <NIcon name="i-lucide-minus" />
    </button>
    <input
      v-bind="inputAttrs"
      v-model="text"
      class="n-number-input"
      type="text"
      inputmode="decimal"
      role="spinbutton"
      autocomplete="off"
      :id="field?.id"
      :disabled="disabled"
      :aria-valuenow="model"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="field?.describedBy.value"
      @change="commit"
      @keydown="onKeydown"
    />
    <button
      type="button"
      class="n-number-button"
      tabindex="-1"
      :aria-label="incrementLabel"
      :disabled="disabled || atMax"
      @mousedown.prevent
      @click="stepBy(1)"
    >
      <NIcon name="i-lucide-plus" />
    </button>
  </div>
</template>
