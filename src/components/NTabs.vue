<script setup lang="ts">
import { computed, ref, useId, watch, type PropType } from "vue";
import type {
  ButtonColor,
  TabItem,
  TabsActivation,
  TabsOrientation,
  TabsVariant,
} from "../types";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NTabs" });

const props = defineProps({
  items: { type: Array as PropType<readonly TabItem[]>, required: true },
  orientation: {
    type: String as PropType<TabsOrientation>,
    default: "horizontal",
  },
  variant: { type: String as PropType<TabsVariant>, default: "line" },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  /** `"automatic"` selects a tab as arrow keys focus it, `"manual"` waits for Enter or Space */
  activation: {
    type: String as PropType<TabsActivation>,
    default: "automatic",
  },
  /** Keeps the panels of visited tabs mounted (hidden) instead of unmounting them */
  keepAlive: { type: Boolean, default: false },
  /** Accessible name of the tab list */
  label: { type: String, default: undefined },
});

const model = defineModel<string | number>();

defineSlots<{
  /** Replaces the content of a tab */
  label?: (props: { item: TabItem; selected: boolean }) => unknown;
  /** Panel of every tab without a slot named after its `value` (`#overview` for `value: "overview"`) */
  panel?: (props: { item: TabItem }) => unknown;
  /** Panel of the tab with that `value` */
  [value: string]: ((props: any) => unknown) | undefined;
}>();

const baseId = useId();
const list = ref<HTMLElement>();
const tabId = (index: number) => `n-tabs-tab-${baseId}-${index}`;
const panelId = (index: number) => `n-tabs-panel-${baseId}-${index}`;

// Without a matching `v-model` the first enabled tab is selected
const current = computed(
  () =>
    props.items.find((item) => item.value === model.value) ??
    props.items.find((item) => !item.disabled),
);

const visited = ref(new Set<TabItem["value"]>());
watch(current, (item) => item && visited.value.add(item.value), {
  immediate: true,
});

function isRendered(item: TabItem) {
  return (
    item === current.value || (props.keepAlive && visited.value.has(item.value))
  );
}

function select(item: TabItem) {
  if (!item.disabled) model.value = item.value;
}

function onKeydown(event: KeyboardEvent) {
  const horizontal = props.orientation === "horizontal";
  const rtl = horizontal && getComputedStyle(list.value!).direction === "rtl";
  const previousKey = horizontal
    ? rtl
      ? "ArrowRight"
      : "ArrowLeft"
    : "ArrowUp";
  const nextKey = horizontal ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";

  const enabled = props.items.filter((item) => !item.disabled);
  const elements = Array.from(
    list.value?.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)') ??
      [],
  );
  if (!elements.length) return;
  const from = elements.indexOf(document.activeElement as HTMLElement);

  let index: number;
  if (event.key === nextKey) index = (from + 1) % elements.length;
  else if (event.key === previousKey)
    index = from <= 0 ? elements.length - 1 : from - 1;
  else if (event.key === "Home") index = 0;
  else if (event.key === "End") index = elements.length - 1;
  else return;

  event.preventDefault();
  elements[index]?.focus();
  const target = enabled[index];
  if (props.activation === "automatic" && target) select(target);
}
</script>

<template>
  <div
    class="n-tabs"
    :data-color="color"
    :data-orientation="orientation"
    :data-variant="variant"
  >
    <div
      ref="list"
      class="n-tabs-list"
      role="tablist"
      :aria-orientation="orientation"
      :aria-label="label"
      @keydown="onKeydown"
    >
      <button
        v-for="(item, index) in items"
        :id="tabId(index)"
        :key="String(item.value)"
        class="n-tabs-tab"
        type="button"
        role="tab"
        :aria-selected="item === current ? 'true' : 'false'"
        :aria-controls="isRendered(item) ? panelId(index) : undefined"
        :data-selected="item === current ? '' : undefined"
        :tabindex="item === current && !item.disabled ? 0 : -1"
        :disabled="item.disabled"
        @click="select(item)"
      >
        <slot name="label" :item="item" :selected="item === current">
          <NIcon v-if="item.icon" :name="item.icon" class="n-tabs-icon" />
          <span>{{ item.label }}</span>
        </slot>
      </button>
    </div>
    <template v-for="(item, index) in items" :key="String(item.value)">
      <div
        v-if="isRendered(item)"
        :id="panelId(index)"
        class="n-tabs-panel"
        role="tabpanel"
        tabindex="0"
        :aria-labelledby="tabId(index)"
        :hidden="item !== current"
      >
        <slot :name="String(item.value)" :item="item">
          <slot name="panel" :item="item" />
        </slot>
      </div>
    </template>
  </div>
</template>
