<script setup lang="ts">
import { computed, type PropType } from "vue";
import { useToast } from "../composables/useToast";
import type { ToastPosition } from "../types";
import NToast from "./NToast.vue";

defineOptions({ name: "NToaster" });

const props = defineProps({
  position: {
    type: String as PropType<ToastPosition>,
    default: "bottom-right",
  },
  /** Default `duration` of toasts that don't set their own */
  duration: { type: Number, default: 5000 },
  /** Toasts shown at once; the oldest ones wait until there is room */
  max: { type: Number, default: 5 },
});

const { toasts, remove } = useToast();

const visible = computed(() =>
  props.max > 0 ? toasts.value.slice(0, props.max) : toasts.value,
);
</script>

<template>
  <div class="n-toaster" :data-position="position">
    <TransitionGroup name="n-toaster" tag="div" class="n-toaster-list">
      <NToast
        v-for="toast in visible"
        :key="toast.id"
        v-bind="{ duration, ...toast, id: undefined, onClose: undefined }"
        @close="remove(toast.id)"
      />
    </TransitionGroup>
  </div>
</template>
