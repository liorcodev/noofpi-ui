<script setup lang="ts">
import { computed, nextTick, reactive, ref, type PropType } from "vue";
import NTreeBranch from "../internal/TreeBranch.vue";
import type { TreeItem, TreeProps, TreeSelection, TreeValue } from "../types";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NTree" });

const props = defineProps({
  items: { type: Array as PropType<TreeItem[]>, default: () => [] },
  selection: {
    type: String as PropType<TreeSelection>,
    default: "single",
  },
  searchable: { type: Boolean, default: false },
  searchPlaceholder: { type: String, default: "Search…" },
  emptyText: { type: String, default: "No items found" },
  checkable: { type: Boolean, default: false },
  droppable: { type: Boolean, default: false },
  loadChildren: {
    type: Function as PropType<TreeProps["loadChildren"]>,
    default: undefined,
  },
  label: { type: String, default: "Tree" },
});

const selected = defineModel<TreeValue | TreeValue[] | undefined>("selected");
const expanded = defineModel<TreeValue[]>("expanded", { default: () => [] });
const checked = defineModel<TreeValue[]>("checked", { default: () => [] });
const search = defineModel<string>("search", { default: "" });

const emit = defineEmits<{
  select: [item: TreeItem];
  check: [item: TreeItem, checked: boolean];
  dragover: [item: TreeItem, event: DragEvent];
  drop: [item: TreeItem, event: DragEvent];
  "load-error": [error: unknown, item: TreeItem];
}>();

defineSlots<{
  item?: (props: {
    item: TreeItem;
    expanded: boolean;
    selected: boolean;
    checked: boolean | "mixed";
  }) => unknown;
  icon?: (props: { item: TreeItem; expanded: boolean }) => unknown;
  empty?: () => unknown;
}>();

const root = ref<HTMLElement>();
const focusValue = ref<TreeValue>();
const loading = ref<TreeValue[]>([]);
const loadedChildren = reactive<Record<string, TreeItem[]>>({});

const selectedValues = computed<TreeValue[]>(() => {
  if (selected.value === undefined) return [];
  return Array.isArray(selected.value) ? selected.value : [selected.value];
});

function childrenOf(item: TreeItem) {
  return item.children ?? loadedChildren[String(item.value)] ?? [];
}

function descendants(item: TreeItem): TreeItem[] {
  return [item, ...childrenOf(item).flatMap((child) => descendants(child))];
}

function allItems(items = props.items): TreeItem[] {
  return items.flatMap((item) => [item, ...allItems(childrenOf(item))]);
}

function matches(item: TreeItem): boolean {
  const term = search.value.trim().toLocaleLowerCase();
  return (
    !term ||
    [item.label, item.description]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(term))
  );
}

function visible(item: TreeItem): boolean {
  return matches(item) || childrenOf(item).some((child) => visible(child));
}

const hasResults = computed(() => props.items.some(visible));

function checkState(item: TreeItem): boolean | "mixed" {
  const enabled = descendants(item).filter((node) => !node.disabled);
  if (!enabled.length) return false;
  const count = enabled.filter((node) =>
    checked.value.includes(node.value),
  ).length;
  if (count === 0) return false;
  if (count === enabled.length) return true;
  return "mixed";
}

function select(item: TreeItem) {
  if (item.disabled) return;
  focusValue.value = item.value;
  if (props.selection === "single") {
    selected.value = item.value;
  } else {
    selected.value = selectedValues.value.includes(item.value)
      ? selectedValues.value.filter((value) => value !== item.value)
      : [...selectedValues.value, item.value];
  }
  emit("select", item);
}

function check(item: TreeItem, isChecked: boolean) {
  if (item.disabled) return;
  const values = new Set(checked.value);
  const changed = descendants(item).filter((node) => !node.disabled);
  for (const node of changed) {
    if (isChecked) values.add(node.value);
    else values.delete(node.value);
  }
  checked.value = [...values];
  emit("check", item, isChecked);
}

async function toggle(item: TreeItem) {
  if (item.disabled || loading.value.includes(item.value)) return;
  if (expanded.value.includes(item.value) && !search.value.trim()) {
    expanded.value = expanded.value.filter((value) => value !== item.value);
    return;
  }

  const hasChildren = item.children !== undefined;
  const hasLoadedChildren = String(item.value) in loadedChildren;
  if (!hasChildren && !hasLoadedChildren && props.loadChildren) {
    loading.value = [...loading.value, item.value];
    try {
      const children = await props.loadChildren(item);
      loadedChildren[String(item.value)] = children;
      if (checked.value.includes(item.value)) {
        const values = new Set(checked.value);
        for (const child of children.flatMap(descendants)) {
          if (!child.disabled) values.add(child.value);
        }
        checked.value = [...values];
      }
    } catch (error) {
      emit("load-error", error, item);
      return;
    } finally {
      loading.value = loading.value.filter((value) => value !== item.value);
    }
  }

  if (!expanded.value.includes(item.value))
    expanded.value = [...expanded.value, item.value];
}

function focusItem(item: TreeItem) {
  focusValue.value = item.value;
}

function canExpand(item: TreeItem) {
  if (item.children !== undefined) return item.children.length > 0;
  const loaded = loadedChildren[String(item.value)];
  if (loaded) return loaded.length > 0;
  return Boolean(props.loadChildren) && !item.disabled;
}

function renderedRows() {
  return Array.from(
    root.value?.querySelectorAll<HTMLElement>(
      '.n-tree-row:not([aria-disabled="true"])',
    ) ?? [],
  );
}

function valueOf(row: HTMLElement) {
  const value = row.dataset.value;
  return allItems().find((item) => String(item.value) === value);
}

function focusRow(row?: HTMLElement) {
  if (!row) return;
  const item = valueOf(row);
  if (item) focusValue.value = item.value;
  nextTick(() => row.focus());
}

async function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  if (!target.classList.contains("n-tree-row")) return;

  const rows = renderedRows();
  const index = rows.indexOf(target);
  const item = valueOf(target);
  if (!item) return;

  let targetRow: HTMLElement | undefined;
  if (event.key === "ArrowDown") targetRow = rows[(index + 1) % rows.length];
  else if (event.key === "ArrowUp")
    targetRow = rows[index <= 0 ? rows.length - 1 : index - 1];
  else if (event.key === "Home") targetRow = rows[0];
  else if (event.key === "End") targetRow = rows.at(-1);
  else if (event.key === "ArrowRight") {
    if (!canExpand(item)) return;
    if (!expanded.value.includes(item.value) || search.value.trim()) {
      await toggle(item);
    } else {
      const row = target
        .closest(".n-tree-node")
        ?.querySelector<HTMLElement>(
          ":scope > .n-tree-branch > .n-tree-node > .n-tree-row",
        );
      targetRow = row ?? undefined;
    }
  } else if (event.key === "ArrowLeft") {
    if (expanded.value.includes(item.value)) {
      expanded.value = expanded.value.filter((value) => value !== item.value);
    } else {
      const parent = target
        .closest(".n-tree-node")
        ?.parentElement?.closest(".n-tree-node")
        ?.querySelector<HTMLElement>(":scope > .n-tree-row");
      targetRow = parent ?? undefined;
    }
  } else if (event.key === "Enter") {
    select(item);
  } else if (event.key === " ") {
    if (props.checkable) check(item, checkState(item) !== true);
    else select(item);
  } else {
    return;
  }

  event.preventDefault();
  focusRow(targetRow);
}

function ensureFocus() {
  if (
    focusValue.value !== undefined &&
    allItems().some((item) => item.value === focusValue.value)
  )
    return;
  focusValue.value = selectedValues.value[0] ?? props.items[0]?.value;
}

ensureFocus();
</script>

<template>
  <div ref="root" class="n-tree" @keydown="onKeydown">
    <div v-if="searchable" class="n-tree-search">
      <NIcon name="i-lucide-search" class="n-tree-search-icon" />
      <input
        v-model="search"
        type="search"
        class="n-tree-search-input"
        :placeholder="searchPlaceholder"
        :aria-label="searchPlaceholder"
      />
    </div>

    <div v-if="!hasResults" class="n-tree-empty" role="status">
      <slot name="empty">{{ emptyText }}</slot>
    </div>
    <NTreeBranch
      v-else
      role="tree"
      :aria-label="label"
      :aria-multiselectable="selection === 'multiple' ? 'true' : undefined"
      :items="items"
      :level="1"
      :expanded="expanded"
      :selected="selectedValues"
      :checked="checked"
      :focus-value="focusValue"
      :search="search"
      :checkable="checkable"
      :loading="loading"
      :loaded-children="loadedChildren"
      :has-loader="Boolean(loadChildren)"
      :droppable="droppable"
      :check-state="checkState"
      :visible="visible"
      @select="select"
      @toggle="toggle"
      @check="check"
      @focus="focusItem"
      @dragover="(item, event) => emit('dragover', item, event)"
      @drop="(item, event) => emit('drop', item, event)"
    >
      <template #icon="slotProps">
        <slot name="icon" v-bind="slotProps" />
      </template>
      <template #item="slotProps">
        <slot name="item" v-bind="slotProps" />
      </template>
    </NTreeBranch>
  </div>
</template>
