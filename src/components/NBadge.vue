<script setup lang="ts">
import { computed, useSlots, type PropType } from "vue";
import type {
  BadgeProps,
  BadgeSize,
  BadgeVariant,
  ButtonColor,
  ButtonIcon,
} from "../types";

defineOptions({ name: "NBadge" });

const props = defineProps({
  as: {
    type: [String, Object, Function] as PropType<BadgeProps["as"]>,
    default: "span",
  },
  label: { type: [String, Number], default: undefined },
  variant: { type: String as PropType<BadgeVariant>, default: "solid" },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  size: { type: String as PropType<BadgeSize>, default: "md" },
  pill: { type: Boolean, default: false },
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  trailingIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
});

const slots = useSlots();

const hasLabel = computed(
  () =>
    (props.label !== undefined && props.label !== "") || Boolean(slots.default),
);

function vnodeText(nodes: unknown): string {
  if (typeof nodes === "string") return nodes;
  if (Array.isArray(nodes)) return nodes.map(vnodeText).join("");
  if (nodes && typeof nodes === "object" && "children" in nodes)
    return vnodeText((nodes as { children: unknown }).children);
  return "";
}

// Labels without capitals or digits are centered on their x-height, others on their cap height (see `.n-badge-label`)
function isLowercaseLabel() {
  const text = slots.default
    ? vnodeText(slots.default())
    : (props.label?.toString() ?? "");
  return !/[\p{Lu}\p{N}]/u.test(text);
}
</script>

<template>
  <component
    :is="as"
    class="n-badge"
    :data-variant="variant"
    :data-color="color"
    :data-size="size"
    :data-pill="pill ? '' : undefined"
    :data-lowercase="hasLabel && isLowercaseLabel() ? '' : undefined"
  >
    <slot name="leading">
      <span
        v-if="typeof icon === 'string'"
        :class="['n-badge-icon', icon]"
        aria-hidden="true"
      />
      <component
        :is="icon"
        v-else-if="icon"
        class="n-badge-icon"
        aria-hidden="true"
      />
    </slot>
    <span v-if="hasLabel" class="n-badge-label">
      <slot>{{ label }}</slot>
    </span>
    <slot name="trailing">
      <span
        v-if="typeof trailingIcon === 'string'"
        :class="['n-badge-icon', trailingIcon]"
        aria-hidden="true"
      />
      <component
        :is="trailingIcon"
        v-else-if="trailingIcon"
        class="n-badge-icon"
        aria-hidden="true"
      />
    </slot>
  </component>
</template>
