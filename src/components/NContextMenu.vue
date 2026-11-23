<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
  type PropType,
} from "vue";
import type { ContextMenuProps, MenuItem } from "../types";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NContextMenu" });

const props = defineProps({
  items: {
    type: Array as PropType<MenuItem[] | MenuItem[][]>,
    default: () => [],
  },
  linkAs: {
    type: [String, Object, Function] as PropType<string | object>,
    default: "a",
  },
  label: { type: String, default: undefined },
  to: {
    type: [String, Object, Boolean] as PropType<ContextMenuProps["to"]>,
    default: "body",
  },
  disabled: { type: Boolean, default: false },
});

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{ select: [item: MenuItem] }>();

defineSlots<{
  /** The area that opens the menu on right click, long press, `Shift+F10` or the context menu key */
  default?: (props: { open: boolean }) => unknown;
  /** Content above the items */
  header?: () => unknown;
  /** Replaces the content of an item */
  item?: (props: { item: MenuItem }) => unknown;
}>();

const root = ref<HTMLElement>();
const panel = ref<HTMLElement>();
const panelId = `n-context-menu-${useId()}`;
const mounted = ref(false);
const position = ref({ x: 0, y: 0 });
const panelStyle = ref<Record<string, string>>({});

const EDGE_GAP = 8;
const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP = 10;

let focusOnOpen: "panel" | "first" = "panel";
let returnFocusTo: HTMLElement | null = null;
let keyboardOpenedAt = 0;
let pressTimer: ReturnType<typeof setTimeout> | undefined;
let pressOrigin = { x: 0, y: 0 };

// An array of arrays is a list of groups, which get a separator between them
const entries = computed<MenuItem[]>(() => {
  const items = props.items;
  if (!items.some(Array.isArray)) return items as MenuItem[];
  return (items as (MenuItem | MenuItem[])[]).flatMap((group, index) => [
    ...(index > 0 ? [{ type: "separator" as const }] : []),
    ...(Array.isArray(group) ? group : [group]),
  ]);
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

function enabledItems() {
  return Array.from(
    panel.value?.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"])',
    ) ?? [],
  );
}

// Opens the menu with its corner at the given viewport point. Opening again while open moves it there
async function openAt(x: number, y: number, focus: typeof focusOnOpen) {
  if (props.disabled) return;
  if (!open.value) returnFocusTo = document.activeElement as HTMLElement | null;
  focusOnOpen = focus;
  position.value = { x, y };
  panelStyle.value = { left: `${x}px`, top: `${y}px` };
  const wasOpen = open.value;
  open.value = true;
  if (wasOpen) {
    await nextTick();
    fit();
    focusInitial();
  }
}

function close(returnFocus = false) {
  if (!open.value) return;
  open.value = false;
  if (returnFocus) {
    const target = returnFocusTo;
    nextTick(() => target?.focus({ preventScroll: true }));
  }
}

function clearPress() {
  clearTimeout(pressTimer);
  pressTimer = undefined;
}

function onContextMenu(event: MouseEvent) {
  // A nested context menu has already handled it
  if (props.disabled || event.defaultPrevented) return;
  event.preventDefault();
  // A keyboard shortcut was handled on keydown, and some browsers still send this event afterwards
  if (Date.now() - keyboardOpenedAt < 500) return;
  clearPress();
  openAt(event.clientX, event.clientY, "panel");
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (props.disabled || event.defaultPrevented) return;
  if (event.key !== "ContextMenu" && !(event.key === "F10" && event.shiftKey))
    return;
  event.preventDefault();
  keyboardOpenedAt = Date.now();
  const anchor = (
    event.target instanceof HTMLElement ? event.target : root.value
  )?.getBoundingClientRect();
  if (!anchor) return;
  openAt(
    anchor.left + anchor.width / 2,
    anchor.top + anchor.height / 2,
    "first",
  );
}

// Touch screens have no right click: a long press opens the menu
function onPointerDown(event: PointerEvent) {
  if (props.disabled || event.pointerType !== "touch") return;
  clearPress();
  pressOrigin = { x: event.clientX, y: event.clientY };
  pressTimer = setTimeout(() => {
    pressTimer = undefined;
    openAt(pressOrigin.x, pressOrigin.y, "panel");
  }, LONG_PRESS_MS);
}

function onPointerMove(event: PointerEvent) {
  if (
    pressTimer &&
    Math.hypot(event.clientX - pressOrigin.x, event.clientY - pressOrigin.y) >
      LONG_PRESS_SLOP
  )
    clearPress();
}

function fit() {
  const panelEl = panel.value;
  if (!panelEl) return;
  const width = panelEl.offsetWidth;
  const height = panelEl.offsetHeight;
  const { x, y } = position.value;

  // Opens towards the cursor's other side when there's no room, like native menus
  let left = x + width + EDGE_GAP > window.innerWidth ? x - width : x;
  let top = y + height + EDGE_GAP > window.innerHeight ? y - height : y;
  left = Math.min(
    Math.max(EDGE_GAP, left),
    Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP),
  );
  top = Math.min(
    Math.max(EDGE_GAP, top),
    Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP),
  );
  panelStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    "--n-context-menu-origin": `${x < left + width / 2 ? "left" : "right"} ${y < top + height / 2 ? "top" : "bottom"}`,
  };
}

function focusInitial() {
  const target = focusOnOpen === "first" ? enabledItems()[0] : undefined;
  (target ?? panel.value)?.focus({ preventScroll: true });
}

watch(open, async (isOpen) => {
  if (!isOpen) return;
  await nextTick();
  fit();
  await nextTick();
  focusInitial();
});

watch(
  () => props.disabled,
  (disabled) => disabled && close(),
);

function onPanelKeydown(event: KeyboardEvent) {
  const { key } = event;
  if (key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    close(true);
    return;
  }
  if (key === "Tab") {
    close(true);
    return;
  }

  const items = enabledItems();
  const current = items.indexOf(document.activeElement as HTMLElement);
  let next: HTMLElement | undefined;
  if (key === "ArrowDown") next = items[(current + 1) % items.length];
  else if (key === "ArrowUp")
    next = items[current <= 0 ? items.length - 1 : current - 1];
  else if (key === "Home") next = items[0];
  else if (key === "End") next = items[items.length - 1];
  else return;
  event.preventDefault();
  next?.focus();
}

function onItemClick(item: MenuItem, event: MouseEvent) {
  if (item.disabled) {
    event.preventDefault();
    return;
  }
  item.onSelect?.(event);
  emit("select", item);
  if (!event.defaultPrevented) close(true);
}

function onItemHover(item: MenuItem, event: MouseEvent) {
  if (!item.disabled)
    (event.currentTarget as HTMLElement).focus({ preventScroll: true });
}

function onDocumentPointerDown(event: PointerEvent) {
  if (open.value && !panel.value?.contains(event.target as Node)) close();
}

// A right click that lands outside of the menu closes it; one on the area itself reopens it from `onContextMenu`
function onDocumentContextMenu(event: MouseEvent) {
  if (
    open.value &&
    !panel.value?.contains(event.target as Node) &&
    !root.value?.contains(event.target as Node)
  )
    close();
}

// The target of `resize` and `blur` is the window, which isn't a node
function onDismiss(event: Event) {
  const target = event.target;
  if (open.value && !(target instanceof Node && panel.value?.contains(target)))
    close();
}

onMounted(() => {
  mounted.value = true;
  document.addEventListener("pointerdown", onDocumentPointerDown);
  document.addEventListener("contextmenu", onDocumentContextMenu);
  window.addEventListener("resize", onDismiss);
  window.addEventListener("scroll", onDismiss, true);
  window.addEventListener("blur", onDismiss);
});

onBeforeUnmount(() => {
  clearPress();
  document.removeEventListener("pointerdown", onDocumentPointerDown);
  document.removeEventListener("contextmenu", onDocumentContextMenu);
  window.removeEventListener("resize", onDismiss);
  window.removeEventListener("scroll", onDismiss, true);
  window.removeEventListener("blur", onDismiss);
});
</script>

<template>
  <div
    ref="root"
    class="n-context-menu"
    :data-open="open ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
    @contextmenu="onContextMenu"
    @keydown="onTriggerKeydown"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="clearPress"
    @pointercancel="clearPress"
  >
    <slot :open="open" />
  </div>
  <Teleport v-if="mounted" :to="to || 'body'" :disabled="to === false">
    <Transition name="n-context-menu">
      <div
        v-if="open"
        :id="panelId"
        ref="panel"
        class="n-context-menu-panel"
        role="menu"
        tabindex="-1"
        :aria-label="label"
        :style="panelStyle"
        @keydown="onPanelKeydown"
        @contextmenu.prevent
      >
        <div v-if="$slots.header" class="n-menu-header">
          <slot name="header" />
        </div>
        <template v-for="(item, index) in entries" :key="index">
          <div
            v-if="item.type === 'separator'"
            class="n-menu-separator"
            role="separator"
          />
          <div v-else-if="item.type === 'label'" class="n-menu-label">
            <span class="n-menu-label-text">{{ item.label }}</span>
            <span v-if="item.description" class="n-menu-label-description">{{
              item.description
            }}</span>
          </div>
          <component
            :is="item.to ? linkAs : 'button'"
            v-else
            class="n-menu-item"
            role="menuitem"
            tabindex="-1"
            :type="item.to ? undefined : 'button'"
            :aria-disabled="item.disabled ? 'true' : undefined"
            :data-color="item.color"
            :data-variant="item.variant"
            v-bind="item.to ? linkAttrs(item.to, item.target) : undefined"
            @click="onItemClick(item, $event)"
            @mouseenter="onItemHover(item, $event)"
          >
            <slot name="item" :item="item">
              <NIcon v-if="item.icon" :name="item.icon" class="n-menu-icon" />
              <span class="n-menu-item-label">{{ item.label }}</span>
              <span v-if="item.shortcut" class="n-menu-shortcut">{{
                item.shortcut
              }}</span>
            </slot>
          </component>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>
