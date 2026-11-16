<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  useSlots,
  watch,
  type PropType,
} from "vue";
import type { ButtonColor, ButtonIcon, ToastProps } from "../types";
import NButton from "./NButton.vue";

defineOptions({ name: "NToast" });

const props = defineProps({
  title: { type: String, default: undefined },
  description: { type: String, default: undefined },
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  close: { type: Boolean, default: true },
  closeIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-x",
  },
  actions: {
    type: Array as PropType<ToastProps["actions"]>,
    default: undefined,
  },
  duration: { type: Number, default: 5000 },
});

const emit = defineEmits<{ close: [] }>();

const slots = useSlots();

const COLOR_ICONS: Partial<Record<ButtonColor, string>> = {
  success: "i-lucide-circle-check",
  info: "i-lucide-info",
  warning: "i-lucide-triangle-alert",
  error: "i-lucide-circle-alert",
};

const leadingIcon = computed(() => props.icon ?? COLOR_ICONS[props.color]);

const hasActions = computed(
  () => Boolean(props.actions?.length) || Boolean(slots.actions),
);

let timer: ReturnType<typeof setTimeout> | undefined;
let startedAt = 0;
let remaining = props.duration;

function start() {
  if (props.duration <= 0 || remaining <= 0) return;
  stop();
  startedAt = Date.now();
  timer = setTimeout(() => emit("close"), remaining);
}

function stop() {
  clearTimeout(timer);
  timer = undefined;
}

function pause() {
  if (!timer) return;
  stop();
  remaining = Math.max(0, remaining - (Date.now() - startedAt));
}

function onFocusOut(event: FocusEvent) {
  const root = event.currentTarget as HTMLElement;
  if (!root.contains(event.relatedTarget as Node | null)) start();
}

// An updated toast (same id, new content) gets its full time again
watch(
  () => [props.duration, props.title, props.description, props.color],
  () => {
    remaining = props.duration;
    start();
  },
);

onMounted(start);
onBeforeUnmount(stop);
</script>

<template>
  <div
    class="n-toast"
    :data-color="color"
    :role="color === 'error' || color === 'warning' ? 'alert' : 'status'"
    @mouseenter="pause"
    @mouseleave="start"
    @focusin="pause"
    @focusout="onFocusOut"
  >
    <slot name="leading">
      <span
        v-if="typeof leadingIcon === 'string'"
        :class="['n-toast-icon', leadingIcon]"
        aria-hidden="true"
      />
      <component
        :is="leadingIcon"
        v-else-if="leadingIcon"
        class="n-toast-icon"
        aria-hidden="true"
      />
    </slot>
    <div class="n-toast-body">
      <p v-if="title || $slots.title" class="n-toast-title">
        <slot name="title">{{ title }}</slot>
      </p>
      <p v-if="description || $slots.description" class="n-toast-description">
        <slot name="description">{{ description }}</slot>
      </p>
      <div v-if="hasActions" class="n-toast-actions">
        <slot name="actions">
          <NButton
            v-for="(action, index) in actions"
            :key="index"
            size="xs"
            variant="outline"
            :color="color"
            v-bind="action"
          />
        </slot>
      </div>
    </div>
    <NButton
      v-if="close"
      class="n-toast-close"
      variant="ghost"
      color="neutral"
      shape="circle"
      size="xs"
      :icon="closeIcon"
      aria-label="Close"
      @click="emit('close')"
    />
  </div>
</template>
