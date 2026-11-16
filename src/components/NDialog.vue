<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
  type PropType,
} from "vue";
import { lockScroll, unlockScroll } from "../internal/scroll-lock";
import type {
  ButtonIcon,
  DialogPlacement,
  DialogProps,
  DialogSize,
} from "../types";
import NButton from "./NButton.vue";

defineOptions({ name: "NDialog" });

const props = defineProps({
  title: { type: String, default: undefined },
  description: { type: String, default: undefined },
  label: { type: String, default: undefined },
  placement: {
    type: String as PropType<DialogPlacement>,
    default: "center",
  },
  size: { type: String as PropType<DialogSize>, default: "md" },
  dismissible: { type: Boolean, default: true },
  close: { type: Boolean, default: true },
  closeIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-x",
  },
  closeLabel: { type: String, default: "Close" },
  to: {
    type: [String, Object, Boolean] as PropType<DialogProps["to"]>,
    default: "body",
  },
});

const open = defineModel<boolean>("open", { default: false });

defineSlots<{
  /** Content of the dialog */
  default?: () => unknown;
  /** Replaces the `title` and `description` */
  header?: () => unknown;
  /** Actions at the bottom, e.g. a cancel and a confirm button */
  footer?: () => unknown;
}>();

const root = ref<HTMLElement>();
const panel = ref<HTMLElement>();
const id = useId();

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let opener: HTMLElement | null = null;
let locked = false;

function focusables() {
  return Array.from(
    panel.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
  );
}

function onOpened() {
  opener = document.activeElement as HTMLElement | null;
  if (!locked) {
    lockScroll();
    locked = true;
  }
  const target =
    panel.value?.querySelector<HTMLElement>("[autofocus]") ?? panel.value;
  target?.focus({ preventScroll: true });
}

// The page keeps its scroll lock until the leave transition ends, so the scrollbar doesn't reappear under the fading dialog
function releaseScroll() {
  if (!locked || open.value) return;
  unlockScroll();
  locked = false;
}

function onClosed() {
  const element = opener;
  opener = null;
  if (element?.isConnected)
    nextTick(() => element.focus({ preventScroll: true }));
}

watch(open, (isOpen) => (isOpen ? onOpened() : onClosed()), { flush: "post" });

// Rendered only after mounting, so the server and the first client render match (a `Teleport` can't be hydrated)
const mounted = ref(false);

onMounted(async () => {
  mounted.value = true;
  if (!open.value) return;
  await nextTick();
  onOpened();
});

onBeforeUnmount(() => {
  if (locked) unlockScroll();
});

function dismiss() {
  open.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    if (!props.dismissible) return;
    event.preventDefault();
    event.stopPropagation();
    dismiss();
    return;
  }
  if (event.key !== "Tab") return;

  const items = focusables();
  const active = document.activeElement;
  if (!items.length) {
    event.preventDefault();
    panel.value?.focus();
    return;
  }
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const outside = active === panel.value || active === root.value;
  if (event.shiftKey && (active === first || outside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault();
    first.focus();
  }
}

// A press that starts inside the panel (a text selection) and ends outside it is not a click on the backdrop
let pressedBackdrop = false;

function onPointerDown(event: PointerEvent) {
  pressedBackdrop = event.target === root.value;
}

function onClick(event: MouseEvent) {
  if (props.dismissible && pressedBackdrop && event.target === root.value)
    dismiss();
  pressedBackdrop = false;
}
</script>

<template>
  <Teleport v-if="mounted" :to="to || 'body'" :disabled="to === false">
    <Transition name="n-dialog" @after-leave="releaseScroll">
      <div
        v-if="open"
        ref="root"
        class="n-dialog"
        tabindex="-1"
        :data-placement="placement"
        :data-size="size"
        @keydown="onKeydown"
        @pointerdown="onPointerDown"
        @click="onClick"
      >
        <div
          ref="panel"
          class="n-dialog-panel"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-label="title ? undefined : label"
          :aria-labelledby="title ? `${id}-title` : undefined"
          :aria-describedby="description ? `${id}-description` : undefined"
        >
          <div
            v-if="title || description || $slots.header || close"
            class="n-dialog-header"
          >
            <div class="n-dialog-heading">
              <slot name="header">
                <h2 v-if="title" :id="`${id}-title`" class="n-dialog-title">
                  {{ title }}
                </h2>
                <p
                  v-if="description"
                  :id="`${id}-description`"
                  class="n-dialog-description"
                >
                  {{ description }}
                </p>
              </slot>
            </div>
            <NButton
              v-if="close"
              class="n-dialog-close"
              variant="ghost"
              color="neutral"
              shape="circle"
              size="sm"
              :icon="closeIcon"
              :aria-label="closeLabel"
              @click="dismiss"
            />
          </div>
          <div v-if="$slots.default" class="n-dialog-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="n-dialog-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
