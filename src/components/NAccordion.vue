<script setup lang="ts">
import { computed, ref, useId, type PropType } from "vue";
import type { AccordionItem, AccordionType, AccordionVariant } from "../types";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NAccordion" });

const props = defineProps({
  items: { type: Array as PropType<readonly AccordionItem[]>, required: true },
  /** `"single"` keeps one section open, `"multiple"` lets any number be open */
  type: { type: String as PropType<AccordionType>, default: "single" },
  /** With `type="single"`: the open section can be closed again */
  collapsible: { type: Boolean, default: true },
  variant: { type: String as PropType<AccordionVariant>, default: "line" },
});

const model = defineModel<string | number | (string | number)[] | undefined>();

defineSlots<{
  /** Replaces the content of a section's header */
  label?: (props: { item: AccordionItem; open: boolean }) => unknown;
  /** Panel of every section without a slot named after its `value` (`#faq` for `value: "faq"`) */
  panel?: (props: { item: AccordionItem }) => unknown;
  /** Panel of the section with that `value` */
  [value: string]: ((props: any) => unknown) | undefined;
}>();

const baseId = useId();
const root = ref<HTMLElement>();
const triggerId = (index: number) => `n-accordion-trigger-${baseId}-${index}`;
const panelId = (index: number) => `n-accordion-panel-${baseId}-${index}`;

const openValues = computed<(string | number)[]>(() => {
  const value = model.value;
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
});

const isOpen = (item: AccordionItem) => openValues.value.includes(item.value);

function toggle(item: AccordionItem) {
  if (item.disabled) return;
  const open = isOpen(item);
  if (props.type === "multiple") {
    model.value = open
      ? openValues.value.filter((value) => value !== item.value)
      : [...openValues.value, item.value];
  } else if (!open) {
    model.value = item.value;
  } else if (props.collapsible) {
    model.value = undefined;
  }
}

function onKeydown(event: KeyboardEvent) {
  const elements = Array.from(
    root.value?.querySelectorAll<HTMLElement>(
      ".n-accordion-trigger:not(:disabled)",
    ) ?? [],
  );
  if (!elements.length) return;
  const from = elements.indexOf(document.activeElement as HTMLElement);

  let index: number;
  if (event.key === "ArrowDown") index = (from + 1) % elements.length;
  else if (event.key === "ArrowUp")
    index = from <= 0 ? elements.length - 1 : from - 1;
  else if (event.key === "Home") index = 0;
  else if (event.key === "End") index = elements.length - 1;
  else return;

  event.preventDefault();
  elements[index]?.focus();
}
</script>

<template>
  <div
    ref="root"
    class="n-accordion"
    :data-variant="variant"
    @keydown="onKeydown"
  >
    <div
      v-for="(item, index) in items"
      :key="String(item.value)"
      class="n-accordion-item"
      :data-open="isOpen(item) ? '' : undefined"
      :data-disabled="item.disabled ? '' : undefined"
    >
      <h3 class="n-accordion-header">
        <button
          :id="triggerId(index)"
          class="n-accordion-trigger"
          type="button"
          :aria-expanded="isOpen(item) ? 'true' : 'false'"
          :aria-controls="panelId(index)"
          :disabled="item.disabled"
          @click="toggle(item)"
        >
          <slot name="label" :item="item" :open="isOpen(item)">
            <NIcon
              v-if="item.icon"
              :name="item.icon"
              class="n-accordion-icon"
            />
            <span class="n-accordion-label">{{ item.label }}</span>
          </slot>
          <NIcon name="i-lucide-chevron-down" class="n-accordion-chevron" />
        </button>
      </h3>
      <div
        :id="panelId(index)"
        class="n-accordion-panel"
        role="region"
        :aria-labelledby="triggerId(index)"
        :inert="!isOpen(item)"
      >
        <div class="n-accordion-panel-inner">
          <div class="n-accordion-content">
            <slot :name="String(item.value)" :item="item">
              <slot name="panel" :item="item">{{ item.content }}</slot>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
