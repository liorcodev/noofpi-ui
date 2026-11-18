<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  useSlots,
  watch,
  type PropType,
} from "vue";
import type {
  ButtonColor,
  TooltipPlacement,
  TooltipProps,
  TooltipVariant,
} from "../types";

defineOptions({ name: "NTooltip" });

const props = defineProps({
  text: { type: String, default: undefined },
  placement: {
    type: String as PropType<TooltipPlacement>,
    default: "top",
  },
  variant: { type: String as PropType<TooltipVariant>, default: "solid" },
  color: { type: String as PropType<ButtonColor>, default: "neutral" },
  delay: { type: Number, default: 350 },
  hideDelay: { type: Number, default: 100 },
  disabled: { type: Boolean, default: false },
  arrow: { type: Boolean, default: true },
  maxWidth: { type: String, default: "16rem" },
  to: {
    type: [String, Object, Boolean] as PropType<TooltipProps["to"]>,
    default: "body",
  },
});

const open = defineModel<boolean>("open", { default: false });

defineSlots<{
  /** The element the tooltip describes */
  default?: () => unknown;
  /** Custom tooltip content, used instead of `text` */
  content?: () => unknown;
}>();

const root = ref<HTMLElement>();
const panel = ref<HTMLElement>();
const mounted = ref(false);
const slots = useSlots();
const resolvedPlacement = ref<TooltipPlacement>(props.placement);
const panelStyle = ref<Record<string, string>>({});
const id = `n-tooltip-${useId()}`;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let trigger: HTMLElement | undefined;
let previousDescription: string | null = null;

const FOCUSABLE =
  'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const GAP = 10;
const hasContent = computed(
  () => Boolean(props.text) || Boolean(slots.content),
);

function clearTimers() {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  showTimer = undefined;
  hideTimer = undefined;
}

function show(immediate = false) {
  if (props.disabled || !hasContent.value) return;
  clearTimeout(hideTimer);
  hideTimer = undefined;
  if (open.value || showTimer) return;
  if (immediate || props.delay <= 0) open.value = true;
  else showTimer = setTimeout(() => (open.value = true), props.delay);
}

function hide(immediate = false) {
  clearTimeout(showTimer);
  showTimer = undefined;
  if (!open.value || hideTimer) return;
  if (immediate || props.hideDelay <= 0) open.value = false;
  else hideTimer = setTimeout(() => (open.value = false), props.hideDelay);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape" || !open.value) return;
  event.preventDefault();
  event.stopPropagation();
  hide(true);
}

function syncTrigger() {
  const next = root.value?.querySelector<HTMLElement>(FOCUSABLE) ?? root.value;
  if (trigger !== next) {
    if (trigger) {
      if (previousDescription === null)
        trigger.removeAttribute("aria-describedby");
      else trigger.setAttribute("aria-describedby", previousDescription);
    }
    trigger = next;
    previousDescription = trigger?.getAttribute("aria-describedby") ?? null;
  }
  if (!trigger) return;
  const ids = (previousDescription ?? "").split(/\s+/).filter(Boolean);
  if (open.value && !ids.includes(id)) ids.push(id);
  if (ids.length) trigger.setAttribute("aria-describedby", ids.join(" "));
  else trigger.removeAttribute("aria-describedby");
}

function fit() {
  const anchor = trigger?.getBoundingClientRect();
  const tooltip = panel.value;
  if (!anchor || !tooltip || !open.value) return;

  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  const gap = GAP;
  const fits = {
    top: anchor.top >= height + gap,
    right: anchor.right + width + gap <= window.innerWidth,
    bottom: anchor.bottom + height + gap <= window.innerHeight,
    left: anchor.left >= width + gap,
  };
  let placement = props.placement;
  if (!fits[placement]) {
    const opposites = {
      top: "bottom",
      right: "left",
      bottom: "top",
      left: "right",
    } as const;
    if (fits[opposites[placement]]) placement = opposites[placement];
  }

  let left = anchor.left + anchor.width / 2 - width / 2;
  let top = anchor.top + anchor.height / 2 - height / 2;
  if (placement === "top") top = anchor.top - height - gap;
  else if (placement === "bottom") top = anchor.bottom + gap;
  else if (placement === "left") left = anchor.left - width - gap;
  else left = anchor.right + gap;

  left = Math.min(
    Math.max(GAP, left),
    Math.max(GAP, window.innerWidth - width - GAP),
  );
  top = Math.min(
    Math.max(GAP, top),
    Math.max(GAP, window.innerHeight - height - GAP),
  );
  resolvedPlacement.value = placement;
  panelStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    "--n-tooltip-arrow-x": `${Math.min(
      Math.max(anchor.left + anchor.width / 2 - left, 12),
      width - 12,
    )}px`,
    "--n-tooltip-arrow-y": `${Math.min(
      Math.max(anchor.top + anchor.height / 2 - top, 12),
      height - 12,
    )}px`,
    maxWidth: `min(${props.maxWidth}, calc(100vw - ${GAP * 2}px))`,
  };
}

watch(
  () => open.value,
  async (isOpen) => {
    clearTimers();
    syncTrigger();
    if (!isOpen) return;
    resolvedPlacement.value = props.placement;
    await nextTick();
    fit();
  },
);

watch(
  [() => props.placement, () => props.maxWidth],
  () => open.value && nextTick(fit),
);
watch(
  () => props.disabled,
  (disabled) => disabled && hide(true),
);

function onFocusOut(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node)) hide();
}

onMounted(async () => {
  mounted.value = true;
  await nextTick();
  syncTrigger();
  if (open.value) fit();
  window.addEventListener("resize", fit);
  window.addEventListener("scroll", fit, true);
});

onBeforeUnmount(() => {
  clearTimers();
  window.removeEventListener("resize", fit);
  window.removeEventListener("scroll", fit, true);
  if (trigger) {
    if (previousDescription === null)
      trigger.removeAttribute("aria-describedby");
    else trigger.setAttribute("aria-describedby", previousDescription);
  }
});
</script>

<template>
  <span
    ref="root"
    class="n-tooltip-trigger"
    @mouseenter="show()"
    @mouseleave="hide()"
    @focusin="show(true)"
    @focusout="onFocusOut"
    @keydown="onKeydown"
  >
    <slot />
  </span>
  <Teleport v-if="mounted" :to="to || 'body'" :disabled="to === false">
    <Transition name="n-tooltip">
      <div
        v-if="open && !disabled && hasContent"
        :id="id"
        ref="panel"
        class="n-tooltip"
        role="tooltip"
        :data-color="color"
        :data-variant="variant"
        :data-placement="resolvedPlacement"
        :style="panelStyle"
        @mouseenter="clearTimers"
        @mouseleave="hide()"
      >
        <slot name="content">{{ text }}</slot>
        <span v-if="arrow" class="n-tooltip-arrow" aria-hidden="true" />
      </div>
    </Transition>
  </Teleport>
</template>
