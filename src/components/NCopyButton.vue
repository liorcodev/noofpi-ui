<script setup lang="ts">
import { computed, onBeforeUnmount, ref, type PropType } from "vue";
import type { ButtonIcon, ButtonVariant } from "../types";
import NButton from "./NButton.vue";

defineOptions({ name: "NCopyButton" });

// Other props (`color`, `size`, `shape`, `disabled`, ...) fall through to `NButton`
const props = defineProps({
  /** The text put on the clipboard */
  text: { type: String, required: true },
  /** Shown next to the icon. Without it the button is icon-only */
  label: { type: String, default: undefined },
  /** The label while copied. Default: `"Copied"` */
  copiedLabel: { type: String, default: "Copied" },
  /** Accessible name of an icon-only button */
  ariaLabel: { type: String, default: "Copy" },
  variant: { type: String as PropType<ButtonVariant>, default: "ghost" },
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-copy",
  },
  /** Replaces the icon for `duration` ms after copying */
  copiedIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-check",
  },
  /** Milliseconds the check stays */
  duration: { type: Number, default: 2000 },
});

const emit = defineEmits<{
  /** The text was copied */
  copy: [text: string];
  /** The browser refused to copy */
  error: [error: unknown];
}>();

const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

// `navigator.clipboard` only exists in secure contexts, so fall back to a selected textarea
async function writeText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
  document.body.appendChild(area);
  area.select();
  try {
    if (!document.execCommand("copy")) throw new Error("Copy failed");
  } finally {
    area.remove();
  }
}

async function copy() {
  try {
    await writeText(props.text);
  } catch (error) {
    emit("error", error);
    return;
  }
  copied.value = true;
  emit("copy", props.text);
  clearTimeout(timer);
  timer = setTimeout(() => (copied.value = false), props.duration);
}

onBeforeUnmount(() => clearTimeout(timer));

const shownLabel = computed(() =>
  props.label ? (copied.value ? props.copiedLabel : props.label) : undefined,
);

defineExpose({ copy });
</script>

<template>
  <NButton
    :variant="variant"
    :label="shownLabel"
    :icon="copied ? copiedIcon : icon"
    :aria-label="label ? undefined : copied ? copiedLabel : ariaLabel"
    :title="label ? undefined : copied ? copiedLabel : ariaLabel"
    :data-copied="copied ? '' : undefined"
    @click="copy"
  />
</template>
