<script setup lang="ts">
import { useSlots, type PropType } from "vue";
import type {
  ButtonColor,
  ButtonIcon,
  DataListItem,
  DataListProps,
  DataListSize,
} from "../types";

defineOptions({ name: "NDataList" });

defineProps({
  as: {
    type: [String, Object, Function] as PropType<DataListProps["as"]>,
    default: "div",
  },
  title: { type: String, default: undefined },
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  items: { type: Array as PropType<DataListItem[]>, default: () => [] },
  size: { type: String as PropType<DataListSize>, default: "md" },
  divided: { type: Boolean, default: true },
});

defineSlots<{
  /** Replaces the `title` */
  title?: () => unknown;
  /** Replaces the icon tile */
  icon?: () => unknown;
  /** Content of a row's label. Default: the item's `label` */
  label?: (props: { item: DataListItem; index: number }) => unknown;
  /** Content of a row's value. Default: the item's `value` */
  value?: (props: { item: DataListItem; index: number }) => unknown;
  /** Extra rows after `items` (use `.n-data-list-row` with `<dt>` and `<dd>`) */
  default?: () => unknown;
}>();

const slots = useSlots();
</script>

<template>
  <component
    :is="as"
    class="n-data-list"
    :data-color="color"
    :data-size="size"
    :data-divided="divided ? '' : undefined"
  >
    <div
      v-if="title || slots.title || icon || slots.icon"
      class="n-data-list-head"
    >
      <slot name="icon">
        <span v-if="icon" class="n-data-list-icon" aria-hidden="true">
          <span v-if="typeof icon === 'string'" :class="icon" />
          <component :is="icon" v-else />
        </span>
      </slot>
      <h3 v-if="title || slots.title" class="n-data-list-title">
        <slot name="title">{{ title }}</slot>
      </h3>
    </div>
    <dl class="n-data-list-body">
      <div v-for="(item, index) in items" :key="index" class="n-data-list-row">
        <dt class="n-data-list-label">
          <slot name="label" :item="item" :index="index">{{ item.label }}</slot>
        </dt>
        <dd class="n-data-list-value">
          <slot name="value" :item="item" :index="index">{{ item.value }}</slot>
        </dd>
      </div>
      <slot />
    </dl>
  </component>
</template>
