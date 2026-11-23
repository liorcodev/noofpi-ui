<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onMounted,
  useAttrs,
  useTemplateRef,
  watch,
} from "vue";
import { FIELD_KEY } from "../internal/form-context";

defineOptions({ name: "NTextarea", inheritAttrs: false });

const props = defineProps({
  /** Visible lines when empty (also the minimum height with `autoresize`) */
  rows: { type: Number, default: 3 },
  /** Grow with the text instead of scrolling */
  autoresize: { type: Boolean, default: false },
  /** With `autoresize`, the number of lines after which the textarea scrolls */
  maxRows: { type: Number, default: undefined },
  /** Show the character count under the textarea, as `12 / 200` when `maxlength` is set */
  counter: { type: Boolean, default: false },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
});

const model = defineModel<string>();
const field = inject(FIELD_KEY, null);
const attrs = useAttrs();
const el = useTemplateRef<HTMLTextAreaElement>("el");

// `class` and `style` style the wrapper, everything else is a native attribute of the `<textarea>`
const textareaAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

const length = computed(() => (model.value ?? "").length);
const maxlength = computed(() => {
  const value = Number(attrs.maxlength);
  return Number.isFinite(value) && value >= 0 && attrs.maxlength !== ""
    ? value
    : undefined;
});

function resize() {
  const textarea = el.value;
  if (!textarea || !props.autoresize) return;
  textarea.style.height = "auto";
  // Zero while hidden (e.g. `display: none`), where the CSS `rows` height stays
  if (textarea.scrollHeight)
    textarea.style.height = `${textarea.scrollHeight}px`;
}

onMounted(resize);
watch([model, () => props.autoresize, () => props.rows], () =>
  nextTick(resize),
);
</script>

<template>
  <div class="n-textarea-wrap" :class="attrs.class" :style="attrs.style as any">
    <textarea
      ref="el"
      v-model="model"
      class="n-textarea"
      :id="field?.id"
      :rows="rows"
      :data-autoresize="autoresize ? '' : undefined"
      :style="maxRows ? { '--n-textarea-max-rows': maxRows } : undefined"
      :aria-invalid="invalid || field?.invalid.value ? 'true' : undefined"
      :aria-describedby="field?.describedBy.value"
      v-bind="textareaAttrs"
      @input="resize"
    ></textarea>
    <span v-if="counter" class="n-textarea-counter">
      {{ maxlength === undefined ? length : `${length} / ${maxlength}` }}
    </span>
  </div>
</template>
