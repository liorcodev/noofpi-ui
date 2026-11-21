<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  useId,
  watch,
  type PropType,
} from "vue";
import type { MenuItem, MenuPlacement, MenuProps } from "../types";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NMenu" });

const props = defineProps({
  items: {
    type: Array as PropType<MenuItem[] | MenuItem[][]>,
    default: () => [],
  },
  placement: {
    type: String as PropType<MenuPlacement>,
    default: "bottom-start",
  },
  linkAs: {
    type: [String, Object, Function] as PropType<string | object>,
    default: "a",
  },
  label: { type: String, default: undefined },
  to: {
    type: [String, Object, Boolean] as PropType<MenuProps["to"]>,
    default: "body",
  },
  disabled: { type: Boolean, default: false },
});

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{ select: [item: MenuItem] }>();

defineSlots<{
  /** The trigger: an `NButton`, an `NAvatar`, or anything else. Gets `aria-haspopup` and `aria-expanded` */
  default?: (props: { open: boolean }) => unknown;
  /** Content above the items, e.g. the signed-in user */
  header?: () => unknown;
  /** Replaces the content of an item */
  item?: (props: { item: MenuItem }) => unknown;
}>();

const root = ref<HTMLElement>();
const trigger = ref<HTMLElement>();
const panel = ref<HTMLElement>();
const panelId = useId();
// Rendered only after mounting, so the server and the first client render match (a `Teleport` can't be hydrated)
const mounted = ref(false);
const panelStyle = ref<Record<string, string>>({});

// An array of arrays is a list of groups, which get a separator between them
const entries = computed<MenuItem[]>(() => {
  const items = props.items;
  if (!items.some(Array.isArray)) return items as MenuItem[];
  return (items as (MenuItem | MenuItem[])[]).flatMap((group, index) => [
    ...(index > 0 ? [{ type: "separator" as const }] : []),
    ...(Array.isArray(group) ? group : [group]),
  ]);
});

const FOCUSABLE =
  'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// The element that opens the menu: the first focusable thing in the trigger slot (an `NButton`), or, for
// content that isn't focusable (an `NAvatar`), the wrapper itself
function triggerElement() {
  return trigger.value?.querySelector<HTMLElement>(FOCUSABLE) ?? trigger.value;
}

function syncTrigger() {
  const wrapper = trigger.value;
  const element = triggerElement();
  if (!wrapper || !element) return;
  if (element === wrapper) {
    wrapper.setAttribute("role", "button");
    wrapper.setAttribute("tabindex", props.disabled ? "-1" : "0");
  }
  element.setAttribute("aria-haspopup", "menu");
  element.setAttribute("aria-expanded", String(open.value));
  if (open.value) element.setAttribute("aria-controls", panelId);
  else element.removeAttribute("aria-controls");
  if (props.disabled) element.setAttribute("aria-disabled", "true");
  else if (element === wrapper) element.removeAttribute("aria-disabled");
}

onMounted(syncTrigger);
onUpdated(syncTrigger);

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

let focusOnOpen: "panel" | "first" | "last" = "panel";

const EDGE_GAP = 8;
const resolvedPlacement = ref<MenuPlacement>(props.placement);
watch(
  () => props.placement,
  (placement) => (resolvedPlacement.value = placement),
);

// Places the menu next to its trigger and keeps it inside the viewport: opens on the other side when there's no
// room, and aligns to the other edge of the trigger when it would overflow sideways. The panel is `fixed`
// (and teleported), so no ancestor's `overflow` clips it
function fit() {
  const panelEl = panel.value;
  const anchor = root.value?.getBoundingClientRect();
  if (!panelEl || !anchor || !open.value) return;

  const requested = props.placement;
  const width = panelEl.offsetWidth;
  const height = panelEl.offsetHeight;
  const rtl = getComputedStyle(root.value!).direction === "rtl";

  let side = requested.startsWith("top") ? "top" : "bottom";
  const below = window.innerHeight - anchor.bottom;
  const above = anchor.top;
  const needed = height + EDGE_GAP;
  if (side === "bottom" && below < needed && above > below) side = "top";
  else if (side === "top" && above < needed && below > above) side = "bottom";

  const logical = requested.endsWith("start")
    ? "start"
    : requested.endsWith("end")
      ? "end"
      : "center";
  const physical =
    logical === "center"
      ? "center"
      : (logical === "start") !== rtl
        ? "left"
        : "right";
  const left = {
    left: anchor.left,
    right: anchor.right - width,
    center: anchor.left + anchor.width / 2 - width / 2,
  };
  const fits = (align: keyof typeof left) =>
    left[align] >= EDGE_GAP &&
    left[align] + width <= window.innerWidth - EDGE_GAP;
  const align =
    [physical, "left", "right"].find((a) => fits(a as keyof typeof left)) ??
    physical;

  const suffix =
    align === "center" ? "" : (align === "left") !== rtl ? "-start" : "-end";
  resolvedPlacement.value = `${side}${suffix}` as MenuPlacement;

  const x = Math.min(
    Math.max(EDGE_GAP, left[align as keyof typeof left]),
    Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP),
  );
  const y = side === "top" ? anchor.top - height : anchor.bottom;
  panelStyle.value = {
    left: `${Math.round(x)}px`,
    top: `${Math.round(y)}px`,
    minWidth: `max(var(--n-menu-min-w), ${Math.round(anchor.width)}px)`,
  };
}

watch(open, async (isOpen) => {
  if (!isOpen) {
    window.removeEventListener("resize", fit);
    window.removeEventListener("scroll", fit, true);
    return;
  }
  resolvedPlacement.value = props.placement;
  window.addEventListener("resize", fit);
  window.addEventListener("scroll", fit, true);
  await nextTick();
  fit();
  await nextTick();
  const items = enabledItems();
  const target =
    focusOnOpen === "last"
      ? items[items.length - 1]
      : focusOnOpen === "first"
        ? items[0]
        : undefined;
  (target ?? panel.value)?.focus({ preventScroll: true });
});

function show(focus: typeof focusOnOpen) {
  if (props.disabled) return;
  focusOnOpen = focus;
  open.value = true;
}

function close(returnFocus = false) {
  if (!open.value) return;
  open.value = false;
  if (returnFocus) nextTick(() => triggerElement()?.focus());
}

function onTriggerClick(event: MouseEvent) {
  if (props.disabled) return;
  if (open.value) close();
  // A click without a pointer (`detail` is 0) comes from the keyboard
  else show(event.detail === 0 ? "first" : "panel");
}

function onKeydown(event: KeyboardEvent) {
  const { key } = event;
  const target = event.target as Node;
  const onTrigger = !!trigger.value?.contains(target);

  if (key === "Escape") {
    if (open.value) {
      event.preventDefault();
      close(true);
    }
    return;
  }

  if (onTrigger) {
    // A native button turns Enter and Space into a click; the avatar wrapper has to do it itself
    if (
      (key === "Enter" || key === " ") &&
      target === trigger.value &&
      !props.disabled
    ) {
      event.preventDefault();
      if (open.value) close();
      else show("first");
    } else if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      if (!open.value) show(key === "ArrowDown" ? "first" : "last");
      else {
        const items = enabledItems();
        (key === "ArrowDown" ? items[0] : items[items.length - 1])?.focus();
      }
    }
    return;
  }

  if (!panel.value?.contains(target)) return;
  if (key === "Tab") {
    // The panel can be teleported away from the trigger, so Tab continues from the trigger instead
    triggerElement()?.focus();
    close();
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

// A panel rendered in place (`:to="false"`) also bubbles its keys to the root, which the panel has handled already
function onRootKeydown(event: KeyboardEvent) {
  if (!panel.value?.contains(event.target as Node)) onKeydown(event);
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

function onPointerDown(event: PointerEvent) {
  const target = event.target as Node;
  if (
    open.value &&
    !root.value?.contains(target) &&
    !panel.value?.contains(target)
  )
    close();
}

onMounted(async () => {
  mounted.value = true;
  document.addEventListener("pointerdown", onPointerDown);
  if (open.value) {
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", fit, true);
    await nextTick();
    fit();
  }
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onPointerDown);
  window.removeEventListener("resize", fit);
  window.removeEventListener("scroll", fit, true);
});
</script>

<template>
  <div
    ref="root"
    class="n-menu"
    :data-placement="resolvedPlacement"
    :data-open="open ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
    @keydown="onRootKeydown"
  >
    <span ref="trigger" class="n-menu-trigger" @click="onTriggerClick">
      <slot :open="open" />
    </span>
    <Teleport v-if="mounted" :to="to || 'body'" :disabled="to === false">
      <Transition name="n-menu">
        <div
          v-if="open"
          :id="panelId"
          ref="panel"
          class="n-menu-panel"
          role="menu"
          tabindex="-1"
          :aria-label="label"
          :data-placement="resolvedPlacement"
          :style="panelStyle"
          @keydown="onKeydown"
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
  </div>
</template>
