<script setup lang="ts">
import {
  computed,
  nextTick,
  reactive,
  ref,
  useId,
  watch,
  type PropType,
} from "vue";
import {
  FILE_EXPLORER_ACTIONS,
  type FileExplorerAction,
  type FileExplorerProps,
  type FileExplorerSort,
  type FileExplorerSortKey,
  type FileExplorerView,
  type FileItem,
  type MenuItem,
  type TreeItem,
  type TreeValue,
} from "../types";
import NButton from "./NButton.vue";
import NIcon from "./NIcon.vue";
import NMenu from "./NMenu.vue";
import NTree from "./NTree.vue";

defineOptions({ name: "NFileExplorer" });

// Items dragged inside the explorer carry their values under this type, which tells them apart from files dragged in from the computer
const MOVE_TYPE = "application/x-noofpi-files";

const props = defineProps({
  items: { type: Array as PropType<FileItem[]>, default: () => [] },
  multiple: { type: Boolean, default: false },
  actions: {
    type: Array as PropType<readonly FileExplorerAction[]>,
    default: () => FILE_EXPLORER_ACTIONS,
  },
  searchable: { type: Boolean, default: true },
  showUpload: { type: Boolean, default: false },
  rootLabel: { type: String, default: "All files" },
  searchPlaceholder: { type: String, default: "Search this folder…" },
  emptyText: { type: String, default: "This folder is empty" },
  label: { type: String, default: "File explorer" },
  loadChildren: {
    type: Function as PropType<FileExplorerProps["loadChildren"]>,
    default: undefined,
  },
  accept: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
});

const current = defineModel<TreeValue | undefined>("current");
const selected = defineModel<TreeValue[]>("selected", { default: () => [] });
const view = defineModel<FileExplorerView>("view", { default: "list" });
const sort = defineModel<FileExplorerSort>("sort", {
  default: () => ({ key: "name", direction: "asc" }),
});

const emit = defineEmits<{
  /** A file was opened (double click, Enter or the menu). Folders are navigated into instead */
  open: [item: FileItem];
  rename: [item: FileItem, label: string];
  delete: [items: FileItem[]];
  /** The Download action was used. Files with a `url` have already been saved; folders are yours to handle (a zip, say) */
  download: [items: FileItem[]];
  /** A new folder was named. Add it to `parent`; `undefined` is the top level */
  "create-folder": [name: string, parent?: FileItem];
  /** Files to upload into `folder`; `undefined` is the top level */
  upload: [files: File[], folder?: FileItem];
  /** Items dropped, or cut and pasted, on `folder`; `undefined` is the top level */
  move: [items: FileItem[], folder?: FileItem];
  /** Items copied and pasted into `folder`; `undefined` is the top level. Add copies of them, with new values */
  copy: [items: FileItem[], folder?: FileItem];
  /** The content of a folder was loaded by `loadChildren`. Store it as the folder's `children` */
  load: [folder: FileItem, children: FileItem[]];
  "load-error": [error: unknown, folder: FileItem];
}>();

defineSlots<{
  /** Replaces the name of an item */
  item?: (props: {
    item: FileItem;
    selected: boolean;
    rename: () => void;
  }) => unknown;
  /** Replaces the icon of an item */
  icon?: (props: { item: FileItem }) => unknown;
  /** Replaces the text of an empty folder */
  empty?: () => unknown;
  /** Replaces the bar shown while items are selected */
  toolbar?: (props: {
    selectedItems: FileItem[];
    rename: () => void;
    remove: () => void;
    download: () => void;
    copy: () => void;
    cut: () => void;
    clear: () => void;
  }) => unknown;
}>();

const root = ref<HTMLElement>();
const uploadInput = ref<HTMLInputElement>();
const id = useId();

const search = ref("");
const expanded = ref<TreeValue[]>([]);
const loaded = reactive<Record<string, FileItem[]>>({});
const loading = ref<TreeValue[]>([]);
const failed = ref<TreeValue[]>([]);
const pending = new Map<string, Promise<FileItem[]>>();

const renaming = ref<TreeValue>();
const renameValue = ref("");
const creating = ref(false);
const draftName = ref("");
const nameError = ref("");
const focusValue = ref<TreeValue>();
const anchor = ref<TreeValue>();
// What Copy and Cut put aside, until it is pasted
const clipboard = ref<{ mode: "copy" | "cut"; values: TreeValue[] } | null>(
  null,
);

const dragValues = ref<TreeValue[]>([]);
const dragMode = ref<"upload" | "move">();
// Where a drop would land: `null` is nowhere in particular, `{ folder: undefined }` is the top level
const hover = ref<{ folder?: FileItem } | null>(null);

// --- The data ---------------------------------------------------------------------------------------------------

const isFolder = (item: FileItem) =>
  item.type ? item.type === "folder" : item.children !== undefined;
const isLoaded = (item: FileItem) =>
  item.children !== undefined || String(item.value) in loaded;
const childrenOf = (item: FileItem) =>
  item.children ?? loaded[String(item.value)] ?? [];
const isLazy = (item: FileItem) =>
  isFolder(item) && !isLoaded(item) && Boolean(props.loadChildren);

// Every item with its parent, so that paths and "is this inside that" need no searching
const index = computed(() => {
  const map = new Map<TreeValue, { item: FileItem; parent?: FileItem }>();
  const walk = (items: FileItem[], parent?: FileItem) => {
    for (const item of items) {
      map.set(item.value, { item, parent });
      if (isFolder(item)) walk(childrenOf(item), item);
    }
  };
  walk(props.items);
  return map;
});

const findItem = (value: TreeValue) => index.value.get(value)?.item;
const parentOf = (item: FileItem) => index.value.get(item.value)?.parent;

function pathTo(item?: FileItem) {
  const chain: FileItem[] = [];
  for (let node = item; node; node = parentOf(node)) chain.unshift(node);
  return chain;
}

const currentFolder = computed(() =>
  current.value === undefined ? undefined : findItem(current.value),
);
const path = computed(() => pathTo(currentFolder.value));

// Numbers inside names count as numbers ("file2" before "file10")
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});
const timeOf = (item: FileItem) =>
  item.modified ? new Date(item.modified).getTime() || 0 : 0;

// Equal on the chosen column? Then by name, always ascending, so the order never jumps around
function compare(a: FileItem, b: FileItem) {
  const { key, direction } = sort.value;
  const byName = collator.compare(a.label, b.label);
  const primary =
    key === "name"
      ? byName
      : key === "size"
        ? isFolder(a) || isFolder(b)
          ? 0
          : (a.size ?? -1) - (b.size ?? -1)
        : timeOf(a) - timeOf(b);
  return primary !== 0 ? primary * (direction === "asc" ? 1 : -1) : byName;
}

function sortBy(key: FileExplorerSortKey) {
  sort.value = {
    key,
    direction:
      sort.value.key === key && sort.value.direction === "asc" ? "desc" : "asc",
  };
}

const ariaSort = (key: FileExplorerSortKey) =>
  sort.value.key === key
    ? sort.value.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

// Folders first, then files, each in the chosen order
const entries = computed(() => {
  const source = currentFolder.value
    ? childrenOf(currentFolder.value)
    : props.items;
  const term = search.value.trim().toLocaleLowerCase();
  const shown = term
    ? source.filter((item) =>
        [item.label, item.description]
          .filter(Boolean)
          .some((text) => String(text).toLocaleLowerCase().includes(term)),
      )
    : source;
  return [
    ...shown.filter(isFolder).sort(compare),
    ...shown.filter((item) => !isFolder(item)).sort(compare),
  ];
});

const selectedItems = computed(() =>
  selected.value.flatMap((value) => findItem(value) ?? []),
);

const loadingCurrent = computed(
  () =>
    !!currentFolder.value && loading.value.includes(currentFolder.value.value),
);
const failedCurrent = computed(
  () =>
    !!currentFolder.value && failed.value.includes(currentFolder.value.value),
);

const targetName = (folder?: FileItem) => folder?.label ?? props.rootLabel;

// An item that was deleted or moved away can't stay open or selected
watch(index, () => {
  if (current.value !== undefined && !index.value.has(current.value)) goTo();
  const stillThere = selected.value.filter((value) => index.value.has(value));
  if (stillThere.length !== selected.value.length) selected.value = stillThere;
});

// --- Loading ----------------------------------------------------------------------------------------------------

// One request per folder, however many places ask for it (opening it, expanding it in the tree)
function load(folder: FileItem): Promise<FileItem[]> {
  if (isLoaded(folder)) return Promise.resolve(childrenOf(folder));
  const key = String(folder.value);
  const running = pending.get(key);
  if (running) return running;
  if (!props.loadChildren) return Promise.resolve([]);

  loading.value = [...loading.value, folder.value];
  failed.value = failed.value.filter((value) => value !== folder.value);
  const request = Promise.resolve(props.loadChildren(folder))
    .then((children) => {
      loaded[key] = children;
      emit("load", folder, children);
      return children;
    })
    .catch((error) => {
      failed.value = [...failed.value, folder.value];
      emit("load-error", error, folder);
      throw error;
    })
    .finally(() => {
      pending.delete(key);
      loading.value = loading.value.filter((value) => value !== folder.value);
    });
  pending.set(key, request);
  return request;
}

function retry() {
  if (currentFolder.value) load(currentFolder.value).catch(() => {});
}

// --- Navigation -------------------------------------------------------------------------------------------------

function goTo(folder?: FileItem) {
  current.value = folder?.value;
  selected.value = [];
  search.value = "";
  focusValue.value = undefined;
  anchor.value = undefined;
  renaming.value = undefined;
  creating.value = false;
  nameError.value = "";
  if (!folder) return;
  expanded.value = [
    ...new Set([
      ...expanded.value,
      ...pathTo(folder).map((node) => node.value),
    ]),
  ];
  if (isLazy(folder)) load(folder).catch(() => {});
}

function goUp() {
  if (currentFolder.value) goTo(parentOf(currentFolder.value));
}

function open(item: FileItem) {
  if (item.disabled || props.disabled) return;
  if (isFolder(item)) goTo(item);
  else emit("open", item);
}

function crumb(folder?: FileItem) {
  if (folder?.value !== currentFolder.value?.value) goTo(folder);
}

// --- Selection --------------------------------------------------------------------------------------------------

function select(item: FileItem, event: MouseEvent | KeyboardEvent) {
  if (item.disabled || props.disabled) return;
  focusValue.value = item.value;

  const enabled = entries.value.filter((entry) => !entry.disabled);
  if (props.multiple && event.shiftKey && anchor.value !== undefined) {
    const from = enabled.findIndex((entry) => entry.value === anchor.value);
    const to = enabled.findIndex((entry) => entry.value === item.value);
    if (from >= 0 && to >= 0) {
      selected.value = enabled
        .slice(Math.min(from, to), Math.max(from, to) + 1)
        .map((entry) => entry.value);
      return;
    }
  }
  if (props.multiple && (event.ctrlKey || event.metaKey)) {
    selected.value = selected.value.includes(item.value)
      ? selected.value.filter((value) => value !== item.value)
      : [...selected.value, item.value];
  } else {
    selected.value = [item.value];
  }
  anchor.value = item.value;
}

function clearSelection() {
  if (selected.value.length) selected.value = [];
  anchor.value = undefined;
}

function selectAll() {
  if (props.multiple)
    selected.value = entries.value
      .filter((entry) => !entry.disabled)
      .map((entry) => entry.value);
}

// --- Actions ----------------------------------------------------------------------------------------------------

// An action can be left out with `actions`, and none works while the explorer is disabled
const has = (action: FileExplorerAction) => props.actions.includes(action);
const usable = (action: FileExplorerAction) => has(action) && !props.disabled;

// What a menu item or a shortcut acts on: the whole selection if the item is part of it, else the item alone
const targetsOf = (item: FileItem) =>
  selected.value.includes(item.value) ? selectedItems.value : [item];

const siblings = () =>
  currentFolder.value ? childrenOf(currentFolder.value) : props.items;
const isTaken = (name: string, ignore?: TreeValue) =>
  siblings().some(
    (item) =>
      item.value !== ignore &&
      item.label.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
const TAKEN = "A file or folder with this name already exists here.";

function uniqueName(base: string) {
  let name = base;
  for (let n = 2; isTaken(name); n++) name = `${base} ${n}`;
  return name;
}

function focusEditor() {
  nextTick(() => {
    const input = root.value?.querySelector<HTMLInputElement>(
      ".n-file-explorer-rename",
    );
    input?.focus();
    input?.select();
  });
}

function startCreate() {
  if (!usable("new-folder") || loadingCurrent.value || failedCurrent.value)
    return;
  renaming.value = undefined;
  search.value = "";
  nameError.value = "";
  draftName.value = uniqueName("New folder");
  creating.value = true;
  focusEditor();
}

// Enter keeps editing when the name is taken. Leaving the field with a taken name drops the new folder
function finishCreate(commit = true, leaving = false) {
  if (!creating.value) return;
  const name = draftName.value.trim();
  if (commit && name && isTaken(name)) {
    if (!leaving) {
      nameError.value = TAKEN;
      return;
    }
    commit = false;
  }
  creating.value = false;
  nameError.value = "";
  if (commit && name) emit("create-folder", name, currentFolder.value);
}

function startRename(
  item = selectedItems.value.length === 1 ? selectedItems.value[0] : undefined,
) {
  if (!item || !usable("rename")) return;
  creating.value = false;
  nameError.value = "";
  renaming.value = item.value;
  renameValue.value = item.label;
  focusEditor();
}

function finishRename(item: FileItem, commit = true, leaving = false) {
  if (renaming.value !== item.value) return;
  const label = renameValue.value.trim();
  const changed = label !== "" && label !== item.label;
  if (commit && changed && isTaken(label, item.value)) {
    if (!leaving) {
      nameError.value = TAKEN;
      return;
    }
    commit = false;
  }
  renaming.value = undefined;
  nameError.value = "";
  if (commit && changed) emit("rename", item, label);
  if (!leaving) focusRow(item.value);
}

function remove(items = selectedItems.value) {
  if (usable("delete") && items.length) emit("delete", [...items]);
}

// Files with a `url` are saved by the browser; the event covers everything else (folders, files behind a login)
function download(items = selectedItems.value) {
  if (!usable("download") || !items.length) return;
  for (const item of items) {
    if (isFolder(item) || !item.url) continue;
    const link = document.createElement("a");
    link.href = item.url;
    link.download = item.label;
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();
  }
  emit("download", [...items]);
}

// --- Copy, cut and paste ----------------------------------------------------------------------------------------

const clipboardItems = computed(() =>
  (clipboard.value?.values ?? []).flatMap((value) => findItem(value) ?? []),
);
const isCut = (item: FileItem) =>
  clipboard.value?.mode === "cut" &&
  clipboard.value.values.includes(item.value);

function putAside(mode: "copy" | "cut", items = selectedItems.value) {
  if (!usable(mode) || !items.length) return;
  clipboard.value = { mode, values: items.map((item) => item.value) };
}

// A cut moves, so the same rules as a drag apply. A copy can land in the folder it came from
function canPasteInto(folder?: FileItem) {
  if (!clipboard.value || !clipboardItems.value.length) return false;
  return canMoveInto(
    folder,
    clipboardItems.value,
    clipboard.value.mode === "copy",
  );
}

function paste(folder = currentFolder.value) {
  if (!usable("paste") || !canPasteInto(folder) || !clipboard.value) return;
  const items = [...clipboardItems.value];
  if (clipboard.value.mode === "cut") {
    emit("move", items, folder);
    clipboard.value = null;
  } else {
    emit("copy", items, folder);
  }
}

// --- The menu of an item ----------------------------------------------------------------------------------------

function actions(item: FileItem): MenuItem[][] {
  const folder = isFolder(item);
  const targets = targetsOf(item);
  const groups: MenuItem[][] = [
    [
      {
        label: folder ? "Open folder" : "Open",
        icon: folder ? "i-lucide-folder-open" : "i-lucide-eye",
        onSelect: () => open(item),
      },
    ],
    [],
    [],
  ];
  if (has("download"))
    groups[0]!.push({
      label: "Download",
      icon: "i-lucide-download",
      disabled: props.disabled,
      onSelect: () => download(targets),
    });
  if (has("copy"))
    groups[1]!.push({
      label: "Copy",
      icon: "i-lucide-copy",
      disabled: props.disabled,
      onSelect: () => putAside("copy", targets),
    });
  if (has("cut"))
    groups[1]!.push({
      label: "Cut",
      icon: "i-lucide-scissors",
      disabled: props.disabled,
      onSelect: () => putAside("cut", targets),
    });
  if (folder && has("paste"))
    groups[1]!.push({
      label: "Paste into folder",
      icon: "i-lucide-clipboard-paste",
      disabled: props.disabled || !canPasteInto(item),
      onSelect: () => paste(item),
    });
  if (has("rename"))
    groups[2]!.push({
      label: "Rename",
      icon: "i-lucide-pencil",
      disabled: props.disabled,
      onSelect: () => startRename(item),
    });
  if (has("delete"))
    groups[2]!.push({
      label: "Delete",
      icon: "i-lucide-trash-2",
      color: "error",
      disabled: props.disabled,
      onSelect: () => remove(targets),
    });
  return groups.filter((group) => group.length);
}

// --- Sorting, from the toolbar of the grid view ----------------------------------------------------------------

const sortItems = computed<MenuItem[][]>(() => [
  (["name", "size", "modified"] as const).map((key) => ({
    label: key[0]!.toUpperCase() + key.slice(1),
    icon: sort.value.key === key ? "i-lucide-check" : undefined,
    onSelect: () => (sort.value = { ...sort.value, key }),
  })),
  (["asc", "desc"] as const).map((direction) => ({
    label: direction === "asc" ? "Ascending" : "Descending",
    icon: sort.value.direction === direction ? "i-lucide-check" : undefined,
    onSelect: () => (sort.value = { ...sort.value, direction }),
  })),
]);

// --- Keyboard ---------------------------------------------------------------------------------------------------

const tabbable = computed(() => {
  const enabled = entries.value.filter((entry) => !entry.disabled);
  return (
    enabled.find((entry) => entry.value === focusValue.value)?.value ??
    enabled[0]?.value
  );
});

function focusRow(value: TreeValue) {
  focusValue.value = value;
  nextTick(() =>
    Array.from(
      root.value?.querySelectorAll<HTMLElement>(".n-file-explorer-item") ?? [],
    )
      .find((row) => row.dataset.value === String(value))
      ?.focus(),
  );
}

function onRowKeydown(event: KeyboardEvent, item: FileItem) {
  // Shortcuts with a modifier (Alt+Up, Ctrl+A) belong to the explorer, not to the row
  if (event.target !== event.currentTarget) return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const enabled = entries.value.filter((entry) => !entry.disabled);
  const at = enabled.findIndex((entry) => entry.value === item.value);
  let next: FileItem | undefined;

  if (event.key === "Enter") open(item);
  else if (event.key === " ") select(item, event);
  else if (event.key === "ArrowDown" || event.key === "ArrowRight")
    next = enabled[Math.min(at + 1, enabled.length - 1)];
  else if (event.key === "ArrowUp" || event.key === "ArrowLeft")
    next = enabled[Math.max(at - 1, 0)];
  else if (event.key === "Home") next = enabled[0];
  else if (event.key === "End") next = enabled.at(-1);
  else return;

  event.preventDefault();
  if (next) focusRow(next.value);
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  if (event.defaultPrevented || target.closest("input, textarea")) return;
  const modifier = event.ctrlKey || event.metaKey;

  if (event.key === "Escape" && (selected.value.length || clipboard.value)) {
    // First Escape clears the selection, the next one forgets what was copied or cut
    if (selected.value.length) clearSelection();
    else clipboard.value = null;
  } else if (event.key === "Delete") remove();
  else if (event.key === "F2") startRename();
  else if (modifier && event.key.toLowerCase() === "a" && props.multiple)
    selectAll();
  else if (modifier && event.key.toLowerCase() === "c" && selected.value.length)
    putAside("copy");
  else if (modifier && event.key.toLowerCase() === "x" && selected.value.length)
    putAside("cut");
  else if (modifier && event.key.toLowerCase() === "v" && clipboard.value)
    paste();
  else if (event.altKey && event.key === "ArrowUp") goUp();
  else return;
  event.preventDefault();
}

// --- Dragging ---------------------------------------------------------------------------------------------------

const hasType = (event: DragEvent, type: string) =>
  Array.from(event.dataTransfer?.types ?? []).includes(type);
const isInternalDrag = (event: DragEvent) =>
  dragValues.value.length > 0 || hasType(event, MOVE_TYPE);
const isHover = (folder?: FileItem) =>
  hover.value !== null && hover.value.folder?.value === folder?.value;

const dragItems = computed(() =>
  dragValues.value.flatMap((value) => findItem(value) ?? []),
);

// An item can't go into itself or one of its own folders, and moving it where it already is does nothing
// (a copy may land where it came from)
function canMoveInto(
  folder?: FileItem,
  items = dragItems.value,
  allowSameFolder = false,
) {
  return (
    items.length > 0 &&
    items.every(
      (item) =>
        !pathTo(folder).some((node) => node.value === item.value) &&
        (allowSameFolder || parentOf(item)?.value !== folder?.value),
    )
  );
}

function clearHover() {
  hover.value = null;
  dragMode.value = undefined;
}

function onDragStart(event: DragEvent, item: FileItem) {
  if (props.disabled || item.disabled || renaming.value === item.value) {
    event.preventDefault();
    return;
  }
  // `selected` only changes once the parent has applied it, so the dragged values are worked out here
  const wasSelected = selected.value.includes(item.value);
  const values = wasSelected ? [...selected.value] : [item.value];
  if (!wasSelected) selected.value = values;
  dragValues.value = values;
  event.dataTransfer?.setData(MOVE_TYPE, JSON.stringify(dragValues.value));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

function onDragEnd() {
  dragValues.value = [];
  clearHover();
}

// A folder, the top level or a breadcrumb accepts a drop: moved items, or files from the computer
function onTargetDragOver(event: DragEvent, folder?: FileItem) {
  if (props.disabled || folder?.disabled) return;
  if (isInternalDrag(event)) {
    if (!canMoveInto(folder)) {
      hover.value = null;
      return;
    }
    event.preventDefault();
    dragMode.value = "move";
    hover.value = { folder };
  } else if (props.showUpload && hasType(event, "Files")) {
    event.preventDefault();
    dragMode.value = "upload";
    hover.value = { folder };
  }
}

function onTargetDrop(event: DragEvent, folder?: FileItem) {
  event.preventDefault();
  event.stopPropagation();
  const raw = event.dataTransfer?.getData(MOVE_TYPE);
  if (!props.disabled && !folder?.disabled) {
    if (raw) {
      let values: TreeValue[] = [];
      try {
        values = JSON.parse(raw);
      } catch {
        // Not ours: ignored
      }
      const items = values.flatMap((value) => findItem(value) ?? []);
      if (canMoveInto(folder, items)) emit("move", items, folder);
    } else if (props.showUpload) {
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length) emit("upload", files, folder);
    }
  }
  dragValues.value = [];
  clearHover();
}

// Over anything else, files from the computer go to the open folder
function onDragOver(event: DragEvent) {
  if (props.disabled) return;
  const overTarget = (event.target as Element | null)?.closest?.(
    "[data-drop-target], .n-tree-row",
  );
  if (!overTarget) hover.value = null;
  if (isInternalDrag(event)) {
    dragMode.value = "move";
  } else if (props.showUpload && hasType(event, "Files")) {
    event.preventDefault();
    dragMode.value = "upload";
  }
}

function onDragLeave(event: DragEvent) {
  const next = event.relatedTarget as Node | null;
  if (!(event.currentTarget as HTMLElement).contains(next ?? null))
    clearHover();
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  if (!props.disabled && props.showUpload && !isInternalDrag(event)) {
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) emit("upload", files, currentFolder.value);
  }
  clearHover();
}

function onUpload(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files ?? []);
  if (files.length) emit("upload", files, currentFolder.value);
  if (uploadInput.value) uploadInput.value.value = "";
}

// What a drop would do, spelled out
const hint = computed(() => {
  if (dragMode.value === "upload")
    return `Upload to ${targetName(hover.value ? hover.value.folder : currentFolder.value)}`;
  if (dragMode.value === "move" && hover.value) {
    const count = dragValues.value.length;
    return `Move ${count} item${count === 1 ? "" : "s"} to ${targetName(hover.value.folder)}`;
  }
  return "";
});

// --- The folder tree --------------------------------------------------------------------------------------------

const folderItems = computed<TreeItem[]>(() => {
  const map = (items: FileItem[]): TreeItem[] =>
    items.filter(isFolder).map((item) => ({
      value: item.value,
      label: item.label,
      icon: item.icon,
      disabled: item.disabled,
      ...(isLoaded(item) ? { children: map(childrenOf(item)) } : {}),
    }));
  return map(props.items);
});

const treeLoader = computed(() =>
  props.loadChildren
    ? async (node: TreeItem): Promise<TreeItem[]> => {
        const folder = findItem(node.value);
        if (!folder) return [];
        const children = await load(folder);
        return children.filter(isFolder).map((child) => ({
          value: child.value,
          label: child.label,
          icon: child.icon,
          disabled: child.disabled,
        }));
      }
    : undefined,
);

function onTreeSelect(node: TreeItem) {
  const folder = findItem(node.value);
  if (folder) open(folder);
}

function onTreeDragOver(node: TreeItem, event: DragEvent) {
  onTargetDragOver(event, findItem(node.value));
}

function onTreeDrop(node: TreeItem, event: DragEvent) {
  onTargetDrop(event, findItem(node.value));
}

// --- Display ----------------------------------------------------------------------------------------------------

function formatSize(bytes?: number) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function sizeOf(item: FileItem) {
  if (!isFolder(item)) return formatSize(item.size);
  if (!isLoaded(item)) return "—";
  const count = childrenOf(item).length;
  return `${count} item${count === 1 ? "" : "s"}`;
}
</script>

<template>
  <section
    ref="root"
    class="n-file-explorer"
    :data-view="view"
    :data-disabled="disabled ? '' : undefined"
    :aria-label="label"
    @keydown="onKeydown"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <aside class="n-file-explorer-nav">
      <p class="n-file-explorer-nav-title">Folders</p>
      <button
        type="button"
        class="n-file-explorer-root"
        data-drop-target
        :data-drop="isHover() ? '' : undefined"
        :aria-current="currentFolder ? undefined : 'page'"
        @click="goTo()"
        @dragover="onTargetDragOver($event)"
        @drop="onTargetDrop($event)"
      >
        <NIcon name="i-lucide-hard-drive" />
        <span>{{ rootLabel }}</span>
      </button>
      <NTree
        v-model:expanded="expanded"
        :selected="current"
        :items="folderItems"
        :load-children="treeLoader"
        droppable
        label="Folders"
        @select="onTreeSelect"
        @dragover="onTreeDragOver"
        @drop="onTreeDrop"
      />
    </aside>

    <div class="n-file-explorer-main">
      <div class="n-file-explorer-toolbar">
        <NButton
          variant="ghost"
          color="neutral"
          size="sm"
          shape="circle"
          icon="i-lucide-arrow-up"
          aria-label="Up one level"
          :disabled="!currentFolder"
          @click="goUp"
        />
        <nav class="n-file-explorer-crumbs" aria-label="Path">
          <ol>
            <li>
              <button
                type="button"
                class="n-file-explorer-crumb"
                data-drop-target
                :data-drop="isHover() ? '' : undefined"
                :aria-current="currentFolder ? undefined : 'page'"
                @click="crumb()"
                @dragover="onTargetDragOver($event)"
                @drop="onTargetDrop($event)"
              >
                {{ rootLabel }}
              </button>
            </li>
            <li v-for="folder in path" :key="String(folder.value)">
              <NIcon
                name="i-lucide-chevron-right"
                class="n-file-explorer-crumb-separator"
              />
              <button
                type="button"
                class="n-file-explorer-crumb"
                data-drop-target
                :data-drop="isHover(folder) ? '' : undefined"
                :aria-current="folder === currentFolder ? 'page' : undefined"
                @click="crumb(folder)"
                @dragover="onTargetDragOver($event, folder)"
                @drop="onTargetDrop($event, folder)"
              >
                {{ folder.label }}
              </button>
            </li>
          </ol>
        </nav>
        <div class="n-file-explorer-tools">
          <NButton
            v-if="has('new-folder')"
            size="sm"
            variant="outline"
            color="neutral"
            icon="i-lucide-folder-plus"
            label="New folder"
            :disabled="disabled || loadingCurrent || failedCurrent"
            @click="startCreate"
          />
          <NButton
            v-if="has('paste')"
            size="sm"
            variant="outline"
            color="neutral"
            icon="i-lucide-clipboard-paste"
            label="Paste"
            :disabled="disabled || !canPasteInto(currentFolder)"
            @click="paste()"
          />
          <NButton
            v-if="showUpload"
            size="sm"
            icon="i-lucide-upload"
            label="Upload"
            :disabled="disabled"
            @click="uploadInput?.click()"
          />
          <NMenu
            class="n-file-explorer-sort"
            :items="sortItems"
            placement="bottom-end"
            label="Sort by"
          >
            <NButton
              size="sm"
              variant="ghost"
              color="neutral"
              icon="i-lucide-arrow-up-down"
              label="Sort"
            />
          </NMenu>
          <div class="n-file-explorer-views" role="group" aria-label="View">
            <NButton
              size="sm"
              shape="circle"
              color="neutral"
              icon="i-lucide-list"
              aria-label="List view"
              :variant="view === 'list' ? 'soft' : 'ghost'"
              :aria-pressed="view === 'list' ? 'true' : 'false'"
              @click="view = 'list'"
            />
            <NButton
              size="sm"
              shape="circle"
              color="neutral"
              icon="i-lucide-grid-2x2"
              aria-label="Grid view"
              :variant="view === 'grid' ? 'soft' : 'ghost'"
              :aria-pressed="view === 'grid' ? 'true' : 'false'"
              @click="view = 'grid'"
            />
          </div>
        </div>
      </div>

      <div v-if="searchable" class="n-file-explorer-search">
        <NIcon name="i-lucide-search" />
        <input
          v-model="search"
          type="search"
          :placeholder="searchPlaceholder"
          :aria-label="searchPlaceholder"
        />
      </div>

      <slot
        v-if="selectedItems.length"
        name="toolbar"
        :selected-items="selectedItems"
        :rename="() => startRename()"
        :remove="() => remove()"
        :download="() => download()"
        :copy="() => putAside('copy')"
        :cut="() => putAside('cut')"
        :clear="clearSelection"
      >
        <div
          class="n-file-explorer-selection"
          role="toolbar"
          aria-label="Selection"
        >
          <NButton
            size="xs"
            variant="ghost"
            color="neutral"
            shape="circle"
            icon="i-lucide-x"
            aria-label="Clear selection"
            @click="clearSelection"
          />
          <span class="n-file-explorer-selection-count"
            >{{ selectedItems.length }} selected</span
          >
          <NButton
            v-if="has('download')"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-download"
            label="Download"
            :disabled="disabled"
            @click="download()"
          />
          <NButton
            v-if="has('copy')"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-copy"
            label="Copy"
            :disabled="disabled"
            @click="putAside('copy')"
          />
          <NButton
            v-if="has('cut')"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-scissors"
            label="Cut"
            :disabled="disabled"
            @click="putAside('cut')"
          />
          <NButton
            v-if="has('rename')"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-pencil"
            label="Rename"
            :disabled="disabled || selectedItems.length !== 1"
            @click="startRename()"
          />
          <NButton
            v-if="has('delete')"
            size="xs"
            variant="ghost"
            color="error"
            icon="i-lucide-trash-2"
            label="Delete"
            :disabled="disabled"
            @click="remove()"
          />
        </div>
      </slot>

      <div class="n-file-explorer-body" @click.self="clearSelection">
        <div v-if="loadingCurrent" class="n-file-explorer-state" role="status">
          <NIcon
            name="i-lucide-loader-circle"
            class="n-file-explorer-spinner"
          />
          Loading…
        </div>
        <div
          v-else-if="failedCurrent"
          class="n-file-explorer-state"
          role="alert"
        >
          <span>Couldn't load this folder.</span>
          <NButton
            size="sm"
            variant="outline"
            color="neutral"
            icon="i-lucide-refresh-cw"
            label="Try again"
            @click="retry"
          />
        </div>
        <div
          v-else-if="entries.length || creating"
          class="n-file-explorer-items"
          role="grid"
          :aria-label="label"
          :aria-multiselectable="multiple ? 'true' : undefined"
          @click.self="clearSelection"
        >
          <div class="n-file-explorer-head" role="row">
            <span role="columnheader" :aria-sort="ariaSort('name')">
              <button
                type="button"
                class="n-file-explorer-sort-button"
                @click="sortBy('name')"
              >
                Name
                <NIcon
                  v-if="sort.key === 'name'"
                  :name="
                    sort.direction === 'asc'
                      ? 'i-lucide-arrow-up'
                      : 'i-lucide-arrow-down'
                  "
                />
              </button>
            </span>
            <span role="columnheader" :aria-sort="ariaSort('size')">
              <button
                type="button"
                class="n-file-explorer-sort-button"
                @click="sortBy('size')"
              >
                Size
                <NIcon
                  v-if="sort.key === 'size'"
                  :name="
                    sort.direction === 'asc'
                      ? 'i-lucide-arrow-up'
                      : 'i-lucide-arrow-down'
                  "
                />
              </button>
            </span>
            <span role="columnheader" :aria-sort="ariaSort('modified')">
              <button
                type="button"
                class="n-file-explorer-sort-button"
                @click="sortBy('modified')"
              >
                Modified
                <NIcon
                  v-if="sort.key === 'modified'"
                  :name="
                    sort.direction === 'asc'
                      ? 'i-lucide-arrow-up'
                      : 'i-lucide-arrow-down'
                  "
                />
              </button>
            </span>
            <span role="columnheader" class="n-file-explorer-sr">Actions</span>
          </div>
          <div
            v-if="creating"
            class="n-file-explorer-item"
            role="row"
            data-folder
            data-draft
          >
            <div class="n-file-explorer-name" role="gridcell">
              <NIcon class="n-file-explorer-icon" name="i-lucide-folder" />
              <div class="n-file-explorer-copy">
                <input
                  v-model="draftName"
                  class="n-file-explorer-rename"
                  aria-label="New folder name"
                  :aria-invalid="nameError ? 'true' : undefined"
                  @click.stop
                  @input="nameError = ''"
                  @keydown.enter.stop.prevent="finishCreate()"
                  @keydown.esc.stop.prevent="finishCreate(false)"
                  @blur="finishCreate(true, true)"
                />
                <span
                  v-if="nameError"
                  class="n-file-explorer-error"
                  role="alert"
                  >{{ nameError }}</span
                >
              </div>
            </div>
            <div class="n-file-explorer-size" role="gridcell">—</div>
            <div class="n-file-explorer-modified" role="gridcell">—</div>
            <div class="n-file-explorer-actions" role="gridcell"></div>
          </div>
          <div
            v-for="item in entries"
            :key="String(item.value)"
            class="n-file-explorer-item"
            role="row"
            :data-value="item.value"
            :data-folder="isFolder(item) ? '' : undefined"
            :data-selected="selected.includes(item.value) ? '' : undefined"
            :data-cut="isCut(item) ? '' : undefined"
            :data-drop="isFolder(item) && isHover(item) ? '' : undefined"
            :data-drop-target="isFolder(item) ? '' : undefined"
            :tabindex="item.value === tabbable ? 0 : -1"
            :aria-selected="selected.includes(item.value) ? 'true' : 'false'"
            :aria-disabled="item.disabled ? 'true' : undefined"
            :draggable="!disabled && !item.disabled && renaming !== item.value"
            @click="select(item, $event)"
            @dblclick="open(item)"
            @keydown="onRowKeydown($event, item)"
            @dragstart="onDragStart($event, item)"
            @dragend="onDragEnd"
            @dragover="isFolder(item) && onTargetDragOver($event, item)"
            @drop="isFolder(item) ? onTargetDrop($event, item) : undefined"
          >
            <div class="n-file-explorer-name" role="gridcell">
              <slot name="icon" :item="item">
                <NIcon
                  class="n-file-explorer-icon"
                  :name="
                    item.icon ??
                    (isFolder(item) ? 'i-lucide-folder' : 'i-lucide-file')
                  "
                />
              </slot>
              <div class="n-file-explorer-copy">
                <template v-if="renaming === item.value">
                  <input
                    :id="`${id}-rename`"
                    v-model="renameValue"
                    class="n-file-explorer-rename"
                    :aria-label="`Rename ${item.label}`"
                    :aria-invalid="nameError ? 'true' : undefined"
                    @click.stop
                    @dblclick.stop
                    @input="nameError = ''"
                    @keydown.enter.stop.prevent="finishRename(item)"
                    @keydown.esc.stop.prevent="finishRename(item, false)"
                    @blur="finishRename(item, true, true)"
                  />
                  <span
                    v-if="nameError"
                    class="n-file-explorer-error"
                    role="alert"
                    >{{ nameError }}</span
                  >
                </template>
                <slot
                  v-else
                  name="item"
                  :item="item"
                  :selected="selected.includes(item.value)"
                  :rename="() => startRename(item)"
                >
                  <span class="n-file-explorer-label">{{ item.label }}</span>
                  <span
                    v-if="item.description"
                    class="n-file-explorer-description"
                    >{{ item.description }}</span
                  >
                </slot>
              </div>
            </div>
            <div class="n-file-explorer-size" role="gridcell">
              {{ sizeOf(item) }}
            </div>
            <div class="n-file-explorer-modified" role="gridcell">
              {{
                item.modified
                  ? new Date(item.modified).toLocaleDateString()
                  : "—"
              }}
            </div>
            <div class="n-file-explorer-actions" role="gridcell">
              <NMenu
                :items="actions(item)"
                placement="bottom-end"
                :label="`Actions for ${item.label}`"
                @click.stop
                @dblclick.stop
              >
                <NButton
                  size="xs"
                  shape="circle"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-ellipsis"
                  :aria-label="`Actions for ${item.label}`"
                />
              </NMenu>
            </div>
          </div>
        </div>
        <div v-else class="n-file-explorer-state">
          <slot name="empty">
            <NIcon name="i-lucide-folder-open" class="n-file-explorer-empty" />
            <span>{{
              search ? "Nothing matches your search" : emptyText
            }}</span>
            <span v-if="showUpload && !search" class="n-file-explorer-sub"
              >Drag files here or use Upload.</span
            >
          </slot>
        </div>
      </div>

      <p v-if="showUpload" class="n-file-explorer-footer">
        <NIcon name="i-lucide-upload-cloud" />
        Drag files from your computer here to upload them to
        <strong>{{ targetName(currentFolder) }}</strong>.
      </p>

      <div v-if="hint" class="n-file-explorer-hint" role="status">
        {{ hint }}
      </div>

      <input
        ref="uploadInput"
        class="n-file-explorer-upload-input"
        type="file"
        multiple
        tabindex="-1"
        aria-hidden="true"
        :accept="accept"
        :disabled="disabled"
        @change="onUpload"
      />
    </div>
  </section>
</template>
