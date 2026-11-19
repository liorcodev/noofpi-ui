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
import type { PopoverPlacement, PopoverProps, PopoverTrigger } from "../types";

defineOptions({ name: "NPopover" });

const props = defineProps({
  placement: {
    type: String as PropType<PopoverPlacement>,
    default: "bottom-start",
  },
  trigger: { type: String as PropType<PopoverTrigger>, default: "click" },
  label: { type: String, default: "Popover" },
  dismissible: { type: Boolean, default: true },
  arrow: { type: Boolean, default: true },
  offset: { type: Number, default: 8 },
  delay: { type: Number, default: 100 },
  hideDelay: { type: Number, default: 100 },
  maxWidth: { type: String, default: "20rem" },
  to: {
    type: [String, Object, Boolean] as PropType<PopoverProps["to"]>,
    default: "body",
  },
  disabled: { type: Boolean, default: false },
});

const open = defineModel<boolean>("open", { default: false });

defineSlots<{
  default?: (props: { open: boolean }) => unknown;
  trigger?: (props: { open: boolean }) => unknown;
  content?: (props: { close: () => void }) => unknown;
}>();

const root = ref<HTMLElement>();
const panel = ref<HTMLElement>();
const panelId = `n-popover-${useId()}`;
const mounted = ref(false);
const resolvedPlacement = ref<PopoverPlacement>(props.placement);
const panelStyle = ref<Record<string, string>>({});
let showTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

const FOCUSABLE =
  'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const EDGE_GAP = 8;

const side = computed(() => resolvedPlacement.value.split("-")[0]);

function triggerElement() {
  return root.value?.querySelector<HTMLElement>(FOCUSABLE) ?? root.value;
}

function syncTrigger() {
  const element = triggerElement();
  if (!element) return;
  if (element === root.value) {
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", props.disabled ? "-1" : "0");
  }
  element.setAttribute("aria-haspopup", "dialog");
  element.setAttribute("aria-expanded", String(open.value));
  if (open.value) element.setAttribute("aria-controls", panelId);
  else element.removeAttribute("aria-controls");
  if (props.disabled) element.setAttribute("aria-disabled", "true");
  else element.removeAttribute("aria-disabled");
}

function clearTimers() {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  showTimer = undefined;
  hideTimer = undefined;
}

function show(immediate = false) {
  if (props.disabled || open.value || showTimer) return;
  clearTimeout(hideTimer);
  hideTimer = undefined;
  if (immediate || props.trigger !== "hover" || props.delay <= 0)
    open.value = true;
  else showTimer = setTimeout(() => (open.value = true), props.delay);
}

function hide(returnFocus = false) {
  if (!open.value || !props.dismissible) return;
  open.value = false;
  if (returnFocus) nextTick(() => triggerElement()?.focus());
}

function close(returnFocus = true) {
  open.value = false;
  if (returnFocus) nextTick(() => triggerElement()?.focus());
}

function scheduleHide() {
  clearTimeout(showTimer);
  showTimer = undefined;
  if (!open.value || hideTimer || props.trigger !== "hover") return;
  if (props.hideDelay <= 0) close(false);
  else hideTimer = setTimeout(() => close(false), props.hideDelay);
}

function onTriggerClick(event: MouseEvent) {
  if (props.trigger !== "click" || props.disabled) return;
  if (open.value) close(false);
  else {
    show(true);
    if (event.detail === 0) nextTick(() => panel.value?.focus());
  }
}

function onTriggerEnter() {
  if (props.trigger === "hover") show();
}

function onTriggerLeave() {
  if (props.trigger === "hover") scheduleHide();
}

function onTriggerFocusOut(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node)) onTriggerLeave();
}

function onPanelFocusOut(event: FocusEvent) {
  if (!panel.value?.contains(event.relatedTarget as Node)) onTriggerLeave();
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && open.value && props.dismissible) {
    event.preventDefault();
    hide(true);
    return;
  }
  if (
    event.target === root.value &&
    props.trigger === "click" &&
    (event.key === "Enter" || event.key === " ")
  ) {
    event.preventDefault();
    if (open.value) close();
    else {
      show(true);
      nextTick(() => panel.value?.focus());
    }
  }
}

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape" || !props.dismissible || !open.value) return;
  event.preventDefault();
  event.stopPropagation();
  hide(true);
}

function fit() {
  const anchor = triggerElement()?.getBoundingClientRect();
  const overlay = panel.value;
  if (!anchor || !overlay || !open.value) return;

  const width = overlay.offsetWidth;
  const height = overlay.offsetHeight;
  const [requestedSide, requestedAlign = "center"] = props.placement.split("-");
  const rtl = getComputedStyle(root.value!).direction === "rtl";
  const opposite = {
    top: "bottom",
    right: "left",
    bottom: "top",
    left: "right",
  } as const;
  let currentSide = requestedSide as keyof typeof opposite;
  const vertical = currentSide === "top" || currentSide === "bottom";
  const needed = (vertical ? height : width) + props.offset + EDGE_GAP;
  const available = {
    top: anchor.top,
    right: window.innerWidth - anchor.right,
    bottom: window.innerHeight - anchor.bottom,
    left: anchor.left,
  };
  if (available[currentSide] < needed) currentSide = opposite[currentSide];

  let align = requestedAlign;
  let left = anchor.left + anchor.width / 2 - width / 2;
  let top = anchor.top + anchor.height / 2 - height / 2;

  if (currentSide === "top") top = anchor.top - height - props.offset;
  else if (currentSide === "bottom") top = anchor.bottom + props.offset;
  else if (currentSide === "left") left = anchor.left - width - props.offset;
  else left = anchor.right + props.offset;

  if (currentSide === "top" || currentSide === "bottom") {
    const start = rtl ? anchor.right - width : anchor.left;
    const end = rtl ? anchor.left : anchor.right - width;
    if (requestedAlign === "start") left = start;
    else if (requestedAlign === "end") left = end;
  } else {
    if (requestedAlign === "start") top = anchor.top;
    else if (requestedAlign === "end") top = anchor.bottom - height;
  }

  const unclampedLeft = left;
  left = Math.min(
    Math.max(EDGE_GAP, left),
    Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP),
  );
  top = Math.min(
    Math.max(EDGE_GAP, top),
    Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP),
  );

  if (
    (currentSide === "top" || currentSide === "bottom") &&
    left !== unclampedLeft &&
    align !== "center"
  ) {
    align = "center";
  }

  const suffix = align === "center" ? "" : `-${align}`;
  resolvedPlacement.value = `${currentSide}${suffix}` as PopoverPlacement;
  panelStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    maxWidth: `min(${props.maxWidth}, calc(100vw - ${EDGE_GAP * 2}px))`,
    "--n-popover-arrow-x": `${Math.min(
      Math.max(anchor.left + anchor.width / 2 - left, 12),
      width - 12,
    )}px`,
    "--n-popover-arrow-y": `${Math.min(
      Math.max(anchor.top + anchor.height / 2 - top, 12),
      height - 12,
    )}px`,
  };
}

function onPointerDown(event: PointerEvent) {
  if (
    open.value &&
    !root.value?.contains(event.target as Node) &&
    !panel.value?.contains(event.target as Node)
  )
    hide();
}

watch(open, async (isOpen) => {
  clearTimers();
  syncTrigger();
  if (!isOpen) return;
  resolvedPlacement.value = props.placement;
  await nextTick();
  fit();
});

watch(
  [() => props.placement, () => props.offset, () => props.maxWidth],
  () => open.value && nextTick(fit),
);
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) close();
    syncTrigger();
  },
);

onMounted(async () => {
  mounted.value = true;
  syncTrigger();
  document.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("resize", fit);
  window.addEventListener("scroll", fit, true);
  if (open.value) {
    await nextTick();
    fit();
  }
});

onUpdated(syncTrigger);
onBeforeUnmount(() => {
  clearTimers();
  document.removeEventListener("pointerdown", onPointerDown);
  window.removeEventListener("resize", fit);
  window.removeEventListener("scroll", fit, true);
});
</script>

<template>
  <span
    ref="root"
    class="n-popover-trigger"
    :data-disabled="disabled ? '' : undefined"
    @click="onTriggerClick"
    @mouseenter="onTriggerEnter"
    @mouseleave="onTriggerLeave"
    @focusin="trigger === 'hover' && show(true)"
    @focusout="onTriggerFocusOut"
    @keydown="onTriggerKeydown"
  >
    <slot name="trigger" :open="open">
      <slot :open="open" />
    </slot>
  </span>
  <Teleport v-if="mounted" :to="to || 'body'" :disabled="to === false">
    <Transition name="n-popover">
      <div
        v-if="open"
        :id="panelId"
        ref="panel"
        class="n-popover"
        role="dialog"
        tabindex="-1"
        :aria-label="label"
        :data-placement="resolvedPlacement"
        :data-side="side"
        :style="panelStyle"
        @mouseenter="clearTimers"
        @mouseleave="onTriggerLeave"
        @focusin="clearTimers"
        @focusout="onPanelFocusOut"
        @keydown="onPanelKeydown"
      >
        <slot name="content" :close="close" />
        <span v-if="arrow" class="n-popover-arrow" aria-hidden="true" />
      </div>
    </Transition>
  </Teleport>
</template>
