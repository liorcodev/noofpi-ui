<script setup lang="ts">
import { computed, ref, type PropType } from "vue";
import { formatColor, hsvaToRgb, parseColor, type Hsva } from "../utils/color";

defineOptions({ name: "ColorPanel" });

const props = defineProps({
  color: { type: Object as PropType<Hsva>, required: true },
  /** The color as text, for the text field and the screen reader */
  text: { type: String, required: true },
  alpha: { type: Boolean, default: false },
  swatches: { type: Array as PropType<string[]>, default: () => [] },
  areaLabel: { type: String, default: "Color" },
  hueLabel: { type: String, default: "Hue" },
  alphaLabel: { type: String, default: "Opacity" },
  inputLabel: { type: String, default: "Color value" },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits<{
  /** Any change of the color, from the area, a slider or a swatch */
  change: [color: Hsva];
  /** A color typed in the text field, once it's committed */
  commit: [text: string];
}>();

const area = ref<HTMLElement>();
const dragging = ref(false);

const clamp = (n: number) => Math.min(Math.max(n, 0), 1);

function pick(event: PointerEvent) {
  const box = area.value?.getBoundingClientRect();
  if (!box?.width || !box.height) return;
  emit("change", {
    ...props.color,
    s: clamp((event.clientX - box.left) / box.width),
    v: clamp(1 - (event.clientY - box.top) / box.height),
  });
}

function onPointerDown(event: PointerEvent) {
  if (props.disabled || event.button > 0) return;
  event.preventDefault();
  area.value?.focus();
  area.value?.setPointerCapture?.(event.pointerId);
  dragging.value = true;
  pick(event);
}

function onPointerMove(event: PointerEvent) {
  if (dragging.value) pick(event);
}

function onPointerUp() {
  dragging.value = false;
}

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

function onKeydown(event: KeyboardEvent) {
  const arrow = ARROWS[event.key];
  if (!arrow || props.disabled) return;
  event.preventDefault();
  const step = event.shiftKey ? 0.1 : 0.01;
  emit("change", {
    ...props.color,
    s: clamp(props.color.s + arrow[0] * step),
    v: clamp(props.color.v + arrow[1] * step),
  });
}

function onHue(event: Event) {
  emit("change", {
    ...props.color,
    h: Number((event.target as HTMLInputElement).value),
  });
}

function onAlpha(event: Event) {
  emit("change", {
    ...props.color,
    a: Number((event.target as HTMLInputElement).value) / 100,
  });
}

// Text being typed: it only replaces the value once committed
const draft = ref<string>();
const shown = computed(() => draft.value ?? props.text);

function commit() {
  if (draft.value !== undefined) emit("commit", draft.value);
  draft.value = undefined;
}

function pickSwatch(swatch: string) {
  const parsed = parseColor(swatch);
  if (parsed && !props.disabled)
    emit("change", { ...parsed, a: props.alpha ? parsed.a : 1 });
}

const swatchList = computed(() =>
  props.swatches.flatMap((swatch) => {
    const parsed = parseColor(swatch);
    return parsed
      ? [
          {
            swatch,
            active:
              formatColor(parsed, "hex", props.alpha) ===
              formatColor(props.color, "hex", props.alpha),
          },
        ]
      : [];
  }),
);

const style = computed(() => {
  const [r, g, b] = hsvaToRgb(props.color);
  return {
    "--n-color-picker-hue": props.color.h,
    "--n-color-picker-x": `${props.color.s * 100}%`,
    "--n-color-picker-y": `${(1 - props.color.v) * 100}%`,
    "--n-color-picker-rgb": `${r} ${g} ${b}`,
  };
});
</script>

<template>
  <div class="n-color-picker-panel" :style="style">
    <div
      ref="area"
      class="n-color-picker-area"
      role="slider"
      tabindex="0"
      :aria-label="areaLabel"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(color.s * 100)"
      :aria-valuetext="text"
      :aria-disabled="disabled ? 'true' : undefined"
      :data-dragging="dragging ? '' : undefined"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onKeydown"
    >
      <span class="n-color-picker-handle" />
    </div>
    <input
      class="n-color-picker-range n-color-picker-hue"
      type="range"
      min="0"
      max="360"
      step="1"
      :value="Math.round(color.h)"
      :aria-label="hueLabel"
      :disabled="disabled"
      @input="onHue"
    />
    <input
      v-if="alpha"
      class="n-color-picker-range n-color-picker-alpha"
      type="range"
      min="0"
      max="100"
      step="1"
      :value="Math.round(color.a * 100)"
      :aria-label="alphaLabel"
      :disabled="disabled"
      @input="onAlpha"
    />
    <input
      class="n-color-picker-text"
      type="text"
      spellcheck="false"
      autocomplete="off"
      :value="shown"
      :aria-label="inputLabel"
      :disabled="disabled"
      @input="draft = ($event.target as HTMLInputElement).value"
      @change="commit"
      @keydown.enter.prevent="commit"
      @blur="draft = undefined"
    />
    <div v-if="swatchList.length" class="n-color-picker-swatches">
      <button
        v-for="item in swatchList"
        :key="item.swatch"
        class="n-color-picker-swatch"
        type="button"
        :style="{ '--n-color-picker-swatch': item.swatch }"
        :aria-label="item.swatch"
        :aria-pressed="item.active ? 'true' : 'false'"
        :disabled="disabled"
        @click="pickSwatch(item.swatch)"
      />
    </div>
  </div>
</template>
