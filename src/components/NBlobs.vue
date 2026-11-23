<script setup lang="ts">
import { computed, type PropType } from "vue";
import type { BlobBlend, BlobForm, BlobsProps } from "../types";
import { clamp, createRandom, resolveColor, round } from "../utils/background";

defineOptions({ name: "NBlobs" });

const props = defineProps({
  as: {
    type: [String, Object, Function] as PropType<BlobsProps["as"]>,
    default: "div",
  },
  count: { type: Number, default: 5 },
  colors: {
    type: Array as PropType<string[]>,
    default: () => ["primary", "secondary"],
  },
  shade: { type: Number, default: 500 },
  minSize: { type: Number, default: 30 },
  maxSize: { type: Number, default: 60 },
  blur: { type: Number, default: 60 },
  opacity: { type: Number, default: 0.6 },
  blend: { type: String as PropType<BlobBlend>, default: "normal" },
  form: { type: String as PropType<BlobForm>, default: "organic" },
  gradient: { type: Boolean, default: false },
  seed: { type: Number, default: 1 },
  animate: { type: Boolean, default: true },
  duration: { type: Number, default: 24 },
});

const blobs = computed(() => {
  const rand = createRandom(props.seed);
  const colors = props.colors.length ? props.colors : ["primary"];
  const low = Math.min(props.minSize, props.maxSize);
  const high = Math.max(props.minSize, props.maxSize);
  const duration = Math.max(1, props.duration);
  const radius = () => Math.round(35 + rand() * 35);

  return Array.from(
    { length: Math.round(clamp(props.count, 0, 60)) },
    (_, i) => {
      const size = low + rand() * (high - low);
      return {
        "--n-blob-color": resolveColor(colors[i % colors.length]!, props.shade),
        left: `${round(rand() * 100)}%`,
        top: `${round(rand() * 100)}%`,
        width: `${round(size)}%`,
        aspectRatio:
          props.form === "circle" ? "1" : `${round(0.8 + rand() * 0.5)}`,
        borderRadius:
          props.form === "circle"
            ? "50%"
            : `${radius()}% ${radius()}% ${radius()}% ${radius()}% / ${radius()}% ${radius()}% ${radius()}% ${radius()}%`,
        "--n-blob-dx": `${round((rand() - 0.5) * 70)}%`,
        "--n-blob-dy": `${round((rand() - 0.5) * 70)}%`,
        "--n-blob-scale": `${round(0.85 + rand() * 0.4)}`,
        "--n-blob-rotate": `${Math.round((rand() - 0.5) * 120)}deg`,
        "--n-blob-duration": `${round(duration * (0.7 + rand() * 0.6))}s`,
        "--n-blob-delay": `${round(-rand() * duration)}s`,
      };
    },
  );
});

const style = computed(() => ({
  "--n-blobs-blur": `${Math.max(0, props.blur)}px`,
  "--n-blobs-opacity": `${clamp(props.opacity, 0, 1)}`,
  "--n-blobs-blend": props.blend,
}));
</script>

<template>
  <component
    :is="as"
    class="n-blobs"
    :data-animate="animate || undefined"
    :data-gradient="gradient || undefined"
    :data-empty="$slots.default ? undefined : ''"
    :style="style"
  >
    <div class="n-blobs-layer" aria-hidden="true">
      <span v-for="(blob, i) in blobs" :key="i" class="n-blob" :style="blob" />
    </div>
    <div v-if="$slots.default" class="n-blobs-content">
      <slot />
    </div>
  </component>
</template>
