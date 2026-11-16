<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue";
import type { ButtonColor } from "../types";

defineOptions({ name: "NLoadingIndicator" });

const props = defineProps({
  /** `true` starts the bar, `false` completes it. Left out, it follows the page load */
  loading: { type: Boolean, default: undefined },
  /** Controls the bar from `0` to `100` instead of the automatic trickle */
  value: { type: Number, default: undefined },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  /** Accessible name of the bar */
  label: { type: String, default: "Loading page" },
});

const visible = ref(false);
const progress = ref(0);

let trickle: ReturnType<typeof setInterval> | undefined;
let hide: ReturnType<typeof setTimeout> | undefined;

const clear = () => {
  clearInterval(trickle);
  clearTimeout(hide);
  trickle = hide = undefined;
};

const start = () => {
  clear();
  visible.value = true;
  progress.value = 8;
  trickle = setInterval(() => {
    progress.value += (92 - progress.value) * 0.08;
  }, 200);
};

const finish = () => {
  if (!visible.value) return;
  clear();
  progress.value = 100;
  hide = setTimeout(() => (visible.value = false), 350);
};

const onPageLoad = () => finish();

watch(
  () => props.loading,
  (loading) => {
    if (loading === undefined) return;
    if (loading) start();
    else finish();
  },
  { immediate: true },
);

watch(
  () => props.value,
  (value) => {
    if (value === undefined || Number.isNaN(value)) return;
    if (value >= 100) return finish();
    clear();
    visible.value = true;
    progress.value = Math.max(value, 0);
  },
  { immediate: true },
);

onMounted(() => {
  if (props.loading !== undefined || props.value !== undefined) return;
  if (document.readyState === "complete") return;
  start();
  window.addEventListener("load", onPageLoad, { once: true });
});

onBeforeUnmount(() => {
  clear();
  window.removeEventListener("load", onPageLoad);
});
</script>

<template>
  <Transition name="n-loading-indicator" @after-leave="progress = 0">
    <div
      v-if="visible"
      class="n-loading-indicator"
      :data-color="color"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(progress)"
      :aria-label="label"
    >
      <div class="n-loading-indicator-bar" :style="{ width: `${progress}%` }" />
    </div>
  </Transition>
</template>
