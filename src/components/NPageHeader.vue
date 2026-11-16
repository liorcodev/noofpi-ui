<script setup lang="ts">
import { useSlots, type PropType } from "vue";
import type {
  ButtonColor,
  ButtonIcon,
  PageHeaderProps,
  PageHeaderSize,
} from "../types";

defineOptions({ name: "NPageHeader" });

defineProps({
  as: {
    type: [String, Object, Function] as PropType<PageHeaderProps["as"]>,
    default: "div",
  },
  title: { type: String, default: undefined },
  description: { type: String, default: undefined },
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  size: { type: String as PropType<PageHeaderSize>, default: "md" },
  headingAs: { type: String, default: "h1" },
});

const slots = useSlots();
</script>

<template>
  <component
    :is="as"
    class="n-page-header"
    :data-size="size"
    :data-color="color"
  >
    <slot name="icon">
      <span v-if="icon" class="n-page-header-icon" aria-hidden="true">
        <span v-if="typeof icon === 'string'" :class="icon" />
        <component :is="icon" v-else />
      </span>
    </slot>
    <div
      v-if="title || description || slots.title || slots.description"
      class="n-page-header-text"
    >
      <component
        :is="headingAs"
        v-if="title || slots.title"
        class="n-page-header-title"
      >
        <slot name="title">{{ title }}</slot>
      </component>
      <p
        v-if="description || slots.description"
        class="n-page-header-description"
      >
        <slot name="description">{{ description }}</slot>
      </p>
    </div>
    <div v-if="slots.actions" class="n-page-header-actions">
      <slot name="actions" />
    </div>
  </component>
</template>
