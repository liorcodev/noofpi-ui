<script setup lang="ts">
import type { PropType } from "vue";
import type {
  ButtonColor,
  TimelineItem,
  TimelineOrientation,
  TimelineSize,
} from "../types";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NTimeline" });

defineProps({
  items: {
    type: Array as PropType<TimelineItem[]>,
    default: () => [],
  },
  orientation: {
    type: String as PropType<TimelineOrientation>,
    default: "vertical",
  },
  size: { type: String as PropType<TimelineSize>, default: "md" },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  label: { type: String, default: "Timeline" },
});
</script>

<template>
  <ol
    class="n-timeline"
    :data-color="color"
    :aria-label="label"
    :data-orientation="orientation"
    :data-size="size"
  >
    <li
      v-for="(item, index) in items"
      :key="index"
      class="n-timeline-item"
      :data-color="item.color"
    >
      <div class="n-timeline-rail">
        <span
          class="n-timeline-indicator"
          :data-icon="item.icon ? '' : undefined"
        >
          <slot name="indicator" :item="item" :index="index">
            <NIcon v-if="item.icon" :name="item.icon" />
          </slot>
        </span>
        <span
          v-if="index < items.length - 1"
          class="n-timeline-connector"
          aria-hidden="true"
        />
      </div>
      <div class="n-timeline-content">
        <span v-if="item.date || $slots.date" class="n-timeline-date">
          <slot name="date" :item="item" :index="index">{{ item.date }}</slot>
        </span>
        <span v-if="item.title || $slots.title" class="n-timeline-title">
          <slot name="title" :item="item" :index="index">{{ item.title }}</slot>
        </span>
        <span
          v-if="item.description || $slots.description"
          class="n-timeline-description"
        >
          <slot name="description" :item="item" :index="index">
            {{ item.description }}
          </slot>
        </span>
      </div>
    </li>
  </ol>
</template>
