<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, type PropType } from "vue";
import type { ButtonIcon } from "../types";
import NButton from "./NButton.vue";

defineOptions({ name: "NScrollToTop", inheritAttrs: false });

const props = defineProps({
  /** Pixels scrolled before the button shows up */
  threshold: { type: Number, default: 400 },
  /** Accessible name of the button */
  label: { type: String, default: "Scroll to top" },
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-arrow-up",
  },
  smooth: { type: Boolean, default: true },
});

const visible = ref(false);
const update = () => {
  visible.value = window.scrollY > props.threshold;
};
const scrollToTop = () =>
  window.scrollTo({ top: 0, behavior: props.smooth ? "smooth" : "auto" });

onMounted(() => {
  update();
  window.addEventListener("scroll", update, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener("scroll", update));
</script>

<template>
  <Transition name="n-scroll-to-top">
    <NButton
      v-if="visible"
      v-bind="$attrs"
      class="n-scroll-to-top"
      :icon="icon"
      :aria-label="label"
      :title="label"
      @click="scrollToTop"
    />
  </Transition>
</template>
