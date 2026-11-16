<script setup lang="ts">
import { computed, useSlots, type PropType } from "vue";
import type {
  ButtonColor,
  ButtonIcon,
  ButtonProps,
  ButtonShape,
  ButtonSize,
  ButtonVariant,
} from "../types";
import ButtonIconView from "../internal/ButtonIcon.vue";
import { responsiveClasses, type Responsive } from "../utils/responsive";

defineOptions({ name: "NButton" });

const props = defineProps({
  as: {
    type: [String, Object, Function] as PropType<ButtonProps["as"]>,
    default: "button",
  },
  type: { type: String as PropType<ButtonProps["type"]>, default: "button" },
  label: { type: String, default: undefined },
  variant: { type: String as PropType<ButtonVariant>, default: "solid" },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  size: {
    type: [String, Object] as PropType<Responsive<ButtonSize>>,
    default: "md",
  },
  shape: {
    type: [String, Object] as PropType<Responsive<ButtonShape>>,
    default: "rounded",
  },
  block: {
    type: [Boolean, Object] as PropType<Responsive<boolean>>,
    default: false,
  },
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  trailingIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  loading: { type: Boolean, default: false },
  loadingIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  disabled: { type: Boolean, default: false },
});

const slots = useSlots();

const isNativeButton = computed(() => props.as === "button");
const isDisabled = computed(() => props.disabled || props.loading);
const hasLabel = computed(() => Boolean(props.label) || Boolean(slots.default));

function vnodeText(nodes: unknown): string {
  if (typeof nodes === "string") return nodes;
  if (Array.isArray(nodes)) return nodes.map(vnodeText).join("");
  if (nodes && typeof nodes === "object" && "children" in nodes)
    return vnodeText((nodes as { children: unknown }).children);
  return "";
}

// Labels without capitals or digits are centered on their x-height, others on their cap height (see `.n-button-label`)
function isLowercaseLabel() {
  const text = props.label ?? vnodeText(slots.default?.());
  return !/[\p{Lu}\p{N}]/u.test(text);
}
const hasLeading = computed(
  () => props.loading || Boolean(props.icon) || Boolean(slots.leading),
);
const hasTrailing = computed(
  () => Boolean(props.trailingIcon) || Boolean(slots.trailing),
);
// Without a label the button is a square (or a circle) around its icon
const iconOnly = computed(
  () => !hasLabel.value && (hasLeading.value || hasTrailing.value),
);

// The `n-size-*`, `n-shape-*` and `n-block` utilities come from noofpi-ui's CSS, which also enumerates every
// breakpoint variant of them (Tailwind can't see classes assembled here)
const classes = computed(() => [
  "n-button",
  ...responsiveClasses(props.size, (size) => `n-size-${size}`),
  ...responsiveClasses(props.shape, (shape) => `n-shape-${shape}`),
  ...responsiveClasses(props.block, (block) =>
    block ? "n-block" : "n-inline",
  ),
]);
</script>

<template>
  <component
    :is="as"
    :class="classes"
    :type="isNativeButton ? type : undefined"
    :disabled="isNativeButton && isDisabled ? true : undefined"
    :aria-disabled="!isNativeButton && isDisabled ? 'true' : undefined"
    :tabindex="!isNativeButton && isDisabled ? -1 : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :data-variant="variant"
    :data-color="color"
    :data-icon-only="iconOnly ? '' : undefined"
    :data-lowercase="hasLabel && isLowercaseLabel() ? '' : undefined"
    :data-loading="loading ? '' : undefined"
  >
    <slot name="leading">
      <ButtonIconView v-if="loading && loadingIcon" :icon="loadingIcon" spin />
      <svg
        v-else-if="loading"
        class="n-button-icon n-spin"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" opacity=".25" />
        <path d="M21 12a9 9 0 0 0-9-9" />
      </svg>
      <ButtonIconView v-else-if="icon" :icon="icon" />
    </slot>
    <span v-if="hasLabel" class="n-button-label">
      <slot>{{ label }}</slot>
    </span>
    <slot name="trailing">
      <ButtonIconView v-if="trailingIcon" :icon="trailingIcon" />
    </slot>
  </component>
</template>
