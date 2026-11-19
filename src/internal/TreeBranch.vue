<script setup lang="ts">
import { computed, type PropType } from "vue";
import type { TreeItem, TreeValue } from "../types";
import NIcon from "../components/NIcon.vue";

defineOptions({ name: "NTreeBranch" });

const props = defineProps({
  items: {
    type: Array as PropType<TreeItem[]>,
    required: true,
  },
  level: { type: Number, required: true },
  expanded: { type: Array as PropType<TreeValue[]>, required: true },
  selected: { type: Array as PropType<TreeValue[]>, required: true },
  checked: { type: Array as PropType<TreeValue[]>, required: true },
  focusValue: {
    type: [String, Number] as PropType<TreeValue | undefined>,
    default: undefined,
  },
  search: { type: String, required: true },
  checkable: { type: Boolean, required: true },
  loading: { type: Array as PropType<TreeValue[]>, required: true },
  loadedChildren: {
    type: Object as PropType<Record<string, TreeItem[]>>,
    required: true,
  },
  hasLoader: { type: Boolean, required: true },
  droppable: { type: Boolean, default: false },
  checkState: {
    type: Function as PropType<(item: TreeItem) => boolean | "mixed">,
    required: true,
  },
  visible: {
    type: Function as PropType<(item: TreeItem) => boolean>,
    required: true,
  },
});

const emit = defineEmits<{
  select: [item: TreeItem];
  toggle: [item: TreeItem];
  check: [item: TreeItem, checked: boolean];
  focus: [item: TreeItem];
  dragover: [item: TreeItem, event: DragEvent];
  drop: [item: TreeItem, event: DragEvent];
}>();

defineSlots<{
  item?: (props: {
    item: TreeItem;
    expanded: boolean;
    selected: boolean;
    checked: boolean | "mixed";
  }) => unknown;
  icon?: (props: { item: TreeItem; expanded: boolean }) => unknown;
}>();

const visibleItems = computed(() => props.items.filter(props.visible));
const childrenOf = (item: TreeItem) =>
  item.children ?? props.loadedChildren[String(item.value)] ?? [];
// Only a node that can still reveal something gets an arrow: explicit or loaded children decide on their own,
// and the loader is only consulted for a node it hasn't been asked about yet
function hasChildren(item: TreeItem) {
  if (item.children !== undefined) return item.children.length > 0;
  const loaded = props.loadedChildren[String(item.value)];
  if (loaded) return loaded.length > 0;
  return props.hasLoader && !item.disabled;
}
const isExpanded = (item: TreeItem) =>
  props.expanded.includes(item.value) || Boolean(props.search.trim());

function onDragOver(item: TreeItem, event: DragEvent) {
  if (!props.droppable || item.disabled) return;
  event.preventDefault();
  (event.currentTarget as HTMLElement).setAttribute("data-drop", "");
  emit("dragover", item, event);
}

function onDragLeave(event: DragEvent) {
  const row = event.currentTarget as HTMLElement;
  if (!row.contains(event.relatedTarget as Node))
    row.removeAttribute("data-drop");
}

function onDrop(item: TreeItem, event: DragEvent) {
  if (!props.droppable || item.disabled) return;
  event.preventDefault();
  event.stopPropagation();
  (event.currentTarget as HTMLElement).removeAttribute("data-drop");
  emit("drop", item, event);
}
</script>

<template>
  <ul class="n-tree-branch" role="group">
    <li
      v-for="item in visibleItems"
      :key="String(item.value)"
      class="n-tree-node"
      role="none"
    >
      <div
        class="n-tree-row"
        role="treeitem"
        :tabindex="focusValue === item.value ? 0 : -1"
        :aria-level="level"
        :aria-selected="selected.includes(item.value)"
        :aria-expanded="hasChildren(item) ? isExpanded(item) : undefined"
        :aria-checked="checkable ? checkState(item) : undefined"
        :aria-disabled="item.disabled ? 'true' : undefined"
        :data-value="item.value"
        :data-selected="selected.includes(item.value) ? '' : undefined"
        @click="emit('select', item)"
        @focus="emit('focus', item)"
        @dragover="onDragOver(item, $event)"
        @dragleave="onDragLeave"
        @drop="onDrop(item, $event)"
      >
        <span
          v-if="hasChildren(item)"
          class="n-tree-toggle"
          role="button"
          tabindex="-1"
          :aria-label="isExpanded(item) ? 'Collapse' : 'Expand'"
          @click.stop="emit('toggle', item)"
        >
          <NIcon
            name="i-lucide-loader-circle"
            class="n-tree-loader"
            v-if="loading.includes(item.value)"
          />
          <NIcon
            v-else
            name="i-lucide-chevron-right"
            class="n-tree-chevron"
            :data-expanded="isExpanded(item) ? '' : undefined"
          />
        </span>
        <span v-else class="n-tree-toggle n-tree-toggle-placeholder" />

        <input
          v-if="checkable"
          class="n-tree-checkbox"
          type="checkbox"
          :checked="checkState(item) === true"
          :indeterminate.prop="checkState(item) === 'mixed'"
          :disabled="item.disabled"
          :aria-label="`Select ${item.label}`"
          @click.stop
          @change="
            emit('check', item, ($event.target as HTMLInputElement).checked)
          "
        />

        <slot
          name="icon"
          :item="item"
          :expanded="isExpanded(item)"
          v-if="$slots.icon"
        />
        <NIcon v-else-if="item.icon" :name="item.icon" class="n-tree-icon" />

        <span class="n-tree-content">
          <slot
            name="item"
            :item="item"
            :expanded="isExpanded(item)"
            :selected="selected.includes(item.value)"
            :checked="checkState(item)"
          >
            <span class="n-tree-label">{{ item.label }}</span>
            <span v-if="item.description" class="n-tree-description">
              {{ item.description }}
            </span>
          </slot>
        </span>

        <span v-if="item.badge !== undefined" class="n-tree-badge">
          {{ item.badge }}
        </span>
      </div>

      <NTreeBranch
        v-if="isExpanded(item) && childrenOf(item).length"
        :items="childrenOf(item)"
        :level="level + 1"
        :expanded="expanded"
        :selected="selected"
        :checked="checked"
        :focus-value="focusValue"
        :search="search"
        :checkable="checkable"
        :loading="loading"
        :loaded-children="loadedChildren"
        :has-loader="hasLoader"
        :droppable="droppable"
        :check-state="checkState"
        :visible="visible"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
        @check="(node, value) => emit('check', node, value)"
        @focus="emit('focus', $event)"
        @dragover="(node, event) => emit('dragover', node, event)"
        @drop="(node, event) => emit('drop', node, event)"
      >
        <template #icon="slotProps">
          <slot name="icon" v-bind="slotProps" />
        </template>
        <template #item="slotProps">
          <slot name="item" v-bind="slotProps" />
        </template>
      </NTreeBranch>
    </li>
  </ul>
</template>
