<script setup lang="ts">
import { computed, ref, watch, type PropType } from "vue";
import type {
  AvatarProps,
  AvatarShape,
  AvatarSize,
  ButtonColor,
  ButtonIcon,
} from "../types";

defineOptions({ name: "NAvatar" });

const props = defineProps({
  src: { type: String, default: undefined },
  alt: { type: String, default: undefined },
  text: { type: String, default: undefined },
  icon: {
    type: [String, Object, Function] as PropType<AvatarProps["icon"]>,
    default: undefined,
  },
  size: { type: String as PropType<AvatarSize>, default: "md" },
  shape: { type: String as PropType<AvatarShape>, default: "circle" },
  color: { type: String as PropType<ButtonColor>, default: "neutral" },
  bordered: { type: Boolean, default: false },
});

const failed = ref(false);
watch(
  () => props.src,
  () => (failed.value = false),
);

const showImage = computed(() => Boolean(props.src) && !failed.value);

const initials = computed(() => {
  if (props.text) return props.text;
  const words = (props.alt ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const letters = [words[0], words.length > 1 ? words[words.length - 1] : ""];
  return letters.map((word) => Array.from(word!)[0] ?? "").join("");
});

const fallbackIcon = computed<ButtonIcon>(() => props.icon ?? "i-lucide-user");
</script>

<template>
  <span
    class="n-avatar"
    :data-size="size"
    :data-shape="shape"
    :data-color="color"
    :data-bordered="bordered ? '' : undefined"
    :role="showImage ? undefined : alt ? 'img' : undefined"
    :aria-label="showImage ? undefined : alt"
    :aria-hidden="!showImage && !alt ? 'true' : undefined"
  >
    <img
      v-if="showImage"
      class="n-avatar-image"
      :src="src"
      :alt="alt ?? ''"
      @error="failed = true"
    />
    <span v-else-if="initials" class="n-avatar-text" aria-hidden="true">{{
      initials
    }}</span>
    <span
      v-else-if="typeof fallbackIcon === 'string'"
      :class="['n-avatar-icon', fallbackIcon]"
      aria-hidden="true"
    />
    <component
      :is="fallbackIcon"
      v-else
      class="n-avatar-icon"
      aria-hidden="true"
    />
  </span>
</template>
