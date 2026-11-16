<script setup lang="ts">
import { computed, inject, ref, watch, type PropType } from "vue";
import { FIELD_KEY } from "../internal/form-context";
import type { PinInputType } from "../types";

defineOptions({ name: "NPinInput" });

const props = defineProps({
  /** Number of cells */
  length: { type: Number, default: 6 },
  /** `numeric` accepts digits, `alphanumeric` also letters */
  type: { type: String as PropType<PinInputType>, default: "numeric" },
  /** Hide the characters, like a password */
  mask: { type: Boolean, default: false },
  /** Native `name`: submits the whole code from one hidden input */
  name: { type: String, default: undefined },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits<{
  /** Every cell is filled */
  complete: [value: string];
}>();

const model = defineModel<string>({ default: "" });
const field = inject(FIELD_KEY, null);

const accepted = computed(() =>
  props.type === "numeric" ? /\d/ : /[a-z0-9]/i,
);
function sanitize(value: string) {
  return [...value].filter((char) => accepted.value.test(char));
}

// One entry per cell, so a cell in the middle can be empty while the model stays a plain string
const chars = ref<string[]>([]);
function fill(value: string) {
  const next = sanitize(value).slice(0, props.length);
  chars.value = Array.from({ length: props.length }, (_, i) => next[i] ?? "");
}
fill(model.value);
watch(
  () => [model.value, props.length, props.type] as const,
  ([value]) => {
    if (value !== chars.value.join("")) fill(value);
  },
);

function publish() {
  const value = chars.value.join("");
  model.value = value;
  if (value.length === props.length) emit("complete", value);
}

const cells = ref<HTMLInputElement[]>([]);
const root = ref<HTMLElement>();

function focusCell(index: number) {
  const cell = cells.value[Math.min(Math.max(index, 0), props.length - 1)];
  cell?.focus();
}

// Writes `incoming` from `start` on and moves the focus after the last character written
function write(start: number, incoming: string[]) {
  const next = [...chars.value];
  incoming.slice(0, props.length - start).forEach((char, offset) => {
    next[start + offset] = char;
  });
  chars.value = next;
  publish();
  focusCell(start + incoming.length);
}

function onInput(event: Event, index: number) {
  const target = event.target as HTMLInputElement;
  const incoming = sanitize(target.value);
  // Drops rejected characters from the DOM; Vue only patches `:value` when the state changes
  target.value = chars.value[index] ?? "";
  if (incoming.length) write(index, incoming);
}

function onPaste(event: ClipboardEvent, index: number) {
  event.preventDefault();
  const incoming = sanitize(event.clipboardData?.getData("text") ?? "");
  if (incoming.length) write(index, incoming);
}

function clear(index: number) {
  const next = [...chars.value];
  next[index] = "";
  chars.value = next;
  publish();
}

function onKeydown(event: KeyboardEvent, index: number) {
  const rtl = root.value && getComputedStyle(root.value).direction === "rtl";
  switch (event.key) {
    case "Backspace":
      event.preventDefault();
      if (chars.value[index]) clear(index);
      else if (index > 0) {
        clear(index - 1);
        focusCell(index - 1);
      }
      break;
    case "Delete":
      event.preventDefault();
      clear(index);
      break;
    case "ArrowLeft":
      event.preventDefault();
      focusCell(index + (rtl ? 1 : -1));
      break;
    case "ArrowRight":
      event.preventDefault();
      focusCell(index + (rtl ? -1 : 1));
      break;
    case "Home":
      event.preventDefault();
      focusCell(0);
      break;
    case "End":
      event.preventDefault();
      focusCell(props.length - 1);
      break;
  }
}

const isInvalid = computed(() => props.invalid || field?.invalid.value);
</script>

<template>
  <div
    ref="root"
    class="n-pin"
    role="group"
    :aria-describedby="field?.describedBy.value"
    :data-disabled="disabled ? '' : undefined"
  >
    <input
      v-for="(_, index) in length"
      :key="index"
      :ref="
        (el) => {
          if (el) cells[index] = el as HTMLInputElement;
        }
      "
      class="n-input n-pin-cell"
      :type="mask ? 'password' : 'text'"
      :inputmode="type === 'numeric' ? 'numeric' : 'text'"
      :autocomplete="index === 0 ? 'one-time-code' : 'off'"
      :id="index === 0 ? field?.id : undefined"
      :value="chars[index]"
      :disabled="disabled"
      :aria-label="`${index + 1} / ${length}`"
      :aria-invalid="isInvalid ? 'true' : undefined"
      @input="onInput($event, index)"
      @keydown="onKeydown($event, index)"
      @paste="onPaste($event, index)"
      @focus="($event.target as HTMLInputElement).select()"
    />
    <input v-if="name" type="hidden" :name="name" :value="model" />
  </div>
</template>
