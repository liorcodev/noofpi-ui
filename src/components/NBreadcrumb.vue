<script setup lang="ts">
import { computed, type PropType } from "vue";
import type { BreadcrumbItem, BreadcrumbSize } from "../types";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NBreadcrumb" });

const props = defineProps({
  items: {
    type: Array as PropType<BreadcrumbItem[]>,
    default: () => [],
  },
  linkAs: {
    type: [String, Object, Function] as PropType<string | object>,
    default: "a",
  },
  separatorIcon: { type: String, default: "i-lucide-chevron-right" },
  /** Collapses the middle items into `…` above this count. `0` never collapses */
  maxItems: { type: Number, default: 0 },
  size: { type: String as PropType<BreadcrumbSize>, default: "md" },
  label: { type: String, default: "Breadcrumb" },
});

type Entry =
  { type: "item"; item: BreadcrumbItem; current: boolean } | { type: "gap" };

const entries = computed<Entry[]>(() => {
  const last = props.items.length - 1;
  const all: Entry[] = props.items.map((item, index) => ({
    type: "item",
    item,
    current: index === last,
  }));
  const max = Math.floor(props.maxItems);
  if (max < 2 || all.length <= max) return all;
  // Keeps the first item and the last `max - 1`
  return [all[0]!, { type: "gap" }, ...all.slice(all.length - (max - 1))];
});

function linkAttrs(to?: string, target?: string) {
  if (props.linkAs === "a")
    return {
      href: to,
      target,
      rel: target === "_blank" ? "noopener noreferrer" : undefined,
    };
  return { to, target };
}
</script>

<template>
  <nav class="n-breadcrumb" :aria-label="label" :data-size="size">
    <ol class="n-breadcrumb-list">
      <template
        v-for="(entry, index) in entries"
        :key="entry.type === 'gap' ? 'gap' : `${index}-${entry.item.label}`"
      >
        <li v-if="index > 0" class="n-breadcrumb-separator" aria-hidden="true">
          <slot name="separator">
            <NIcon :name="separatorIcon" />
          </slot>
        </li>
        <li v-if="entry.type === 'gap'" class="n-breadcrumb-ellipsis">
          <span aria-hidden="true">…</span>
          <span class="n-breadcrumb-sr">More</span>
        </li>
        <li v-else class="n-breadcrumb-entry">
          <component
            :is="entry.item.to && !entry.current ? linkAs : 'span'"
            class="n-breadcrumb-item"
            :aria-current="entry.current ? 'page' : undefined"
            :data-current="entry.current ? '' : undefined"
            v-bind="
              entry.item.to && !entry.current
                ? linkAttrs(entry.item.to, entry.item.target)
                : undefined
            "
          >
            <NIcon v-if="entry.item.icon" :name="entry.item.icon" />
            {{ entry.item.label }}
          </component>
        </li>
      </template>
    </ol>
  </nav>
</template>
