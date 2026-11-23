<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
  type PropType,
} from "vue";
import { FIELD_KEY } from "../internal/form-context";
import ColorPanel from "../internal/ColorPanel.vue";
import type { ButtonColor, ColorPickerFormat } from "../types";
import { formatColor, parseColor, type Hsva } from "../utils/color";

defineOptions({ name: "NColorPicker" });

const props = defineProps({
  /** Accent of the focus ring and of the panel */
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  /** Syntax of the `v-model` value */
  format: { type: String as PropType<ColorPickerFormat>, default: "hex" },
  /** Adds an opacity slider: the value then carries an alpha */
  alpha: { type: Boolean, default: false },
  /** Colors to pick with one click (any CSS color the picker reads) */
  swatches: { type: Array as PropType<string[]>, default: () => [] },
  /** Renders the panel in place, without the trigger and popover */
  inline: { type: Boolean, default: false },
  /** Shown while no color is selected */
  placeholder: { type: String, default: undefined },
  /** Native `name`: a hidden input submits the color with a surrounding `<form>` */
  name: { type: String, default: undefined },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** Accessible name when there is no `NFormField` label */
  label: { type: String, default: undefined },
  areaLabel: { type: String, default: undefined },
  hueLabel: { type: String, default: undefined },
  alphaLabel: { type: String, default: undefined },
  inputLabel: { type: String, default: undefined },
});

const model = defineModel<string | null>();
const open = defineModel<boolean>("open", { default: false });

const field = inject(FIELD_KEY, null);

const root = ref<HTMLElement>();
const trigger = ref<HTMLElement>();
const popover = ref<HTMLElement>();
const baseId = useId();
const popoverId = `n-color-picker-${baseId}`;

const isInvalid = computed(() => props.invalid || !!field?.invalid.value);

// The panel works on HSVA, which keeps the hue of a gray that the value can't
const current = ref<Hsva>({ h: 217, s: 0.76, v: 0.96, a: 1 });

const stringify = (color: Hsva) =>
  formatColor(color, props.format, props.alpha);

function read(value: unknown): Hsva | null {
  const parsed = parseColor(value);
  return parsed && !props.alpha ? { ...parsed, a: 1 } : parsed;
}

const hasValue = computed(() => !!read(model.value));

watch(
  () => model.value,
  (value) => {
    const parsed = read(value);
    if (parsed && stringify(parsed) !== stringify(current.value))
      current.value = parsed;
  },
  { immediate: true },
);

const text = computed(() => (hasValue.value ? stringify(current.value) : ""));

function update(next: Hsva) {
  current.value = next;
  const value = stringify(next);
  if (value !== model.value) model.value = value;
}

function commit(value: string) {
  const parsed = read(value);
  if (parsed) update(parsed);
}

const swatchColor = computed(() =>
  hasValue.value ? formatColor(current.value, "rgb", props.alpha) : undefined,
);

function show() {
  if (!props.disabled) open.value = true;
}

function close(refocus = false) {
  open.value = false;
  if (refocus) trigger.value?.focus();
}

const side = ref<"bottom" | "top">("bottom");

// Opens upward when there's no room below and more room above
function fit() {
  const anchor = root.value?.getBoundingClientRect();
  const height = popover.value?.offsetHeight;
  if (!anchor || !height) return;
  const below = window.innerHeight - anchor.bottom;
  side.value = below < height + 8 && anchor.top > below ? "top" : "bottom";
}

watch(open, async (isOpen) => {
  if (!isOpen) return;
  side.value = "bottom";
  await nextTick();
  fit();
  popover.value?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
});

function onKeydown(event: KeyboardEvent) {
  if (props.inline) return;
  if (event.key === "Escape" && open.value) {
    event.stopPropagation();
    close(true);
  } else if (event.key === "ArrowDown" && !open.value) {
    event.preventDefault();
    show();
  }
}

function onFocusout(event: FocusEvent) {
  const next = event.relatedTarget as Node | null;
  if (open.value && next && !root.value?.contains(next)) close();
}

function onPointerDown(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) close();
}

onMounted(() => document.addEventListener("pointerdown", onPointerDown));
onBeforeUnmount(() =>
  document.removeEventListener("pointerdown", onPointerDown),
);
</script>

<template>
  <div
    ref="root"
    class="n-color-picker"
    :data-color="color"
    :data-inline="inline ? '' : undefined"
    :data-open="open ? '' : undefined"
    :data-side="side"
    :data-disabled="disabled ? '' : undefined"
    @keydown="onKeydown"
    @focusout="onFocusout"
  >
    <template v-if="!inline">
      <button
        :id="field?.id"
        ref="trigger"
        class="n-color-picker-trigger"
        type="button"
        aria-haspopup="dialog"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="open ? popoverId : undefined"
        :aria-label="label"
        :aria-invalid="isInvalid ? 'true' : undefined"
        :aria-describedby="field?.describedBy.value"
        :disabled="disabled"
        :data-placeholder="text ? undefined : ''"
        @click="open ? close() : show()"
      >
        <span
          class="n-color-picker-preview"
          :style="{ '--n-color-picker-swatch': swatchColor }"
          :data-empty="swatchColor ? undefined : ''"
        />
        <span class="n-color-picker-value">{{ text || placeholder }}</span>
      </button>
      <Transition name="n-color-picker">
        <div
          v-if="open"
          :id="popoverId"
          ref="popover"
          class="n-color-picker-popover"
          role="dialog"
          :aria-label="label ?? placeholder"
        >
          <ColorPanel
            :color="current"
            :text="text"
            :alpha="alpha"
            :swatches="swatches"
            :area-label="areaLabel"
            :hue-label="hueLabel"
            :alpha-label="alphaLabel"
            :input-label="inputLabel"
            @change="update"
            @commit="commit"
          />
        </div>
      </Transition>
    </template>
    <ColorPanel
      v-else
      :color="current"
      :text="text"
      :alpha="alpha"
      :swatches="swatches"
      :area-label="areaLabel"
      :hue-label="hueLabel"
      :alpha-label="alphaLabel"
      :input-label="inputLabel"
      :disabled="disabled"
      @change="update"
      @commit="commit"
    />
    <input
      v-if="name"
      type="hidden"
      :name="name"
      :value="text"
      :disabled="disabled"
    />
  </div>
</template>
