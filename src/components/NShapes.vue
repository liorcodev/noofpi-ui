<script setup lang="ts">
import { computed, type PropType } from "vue";
import {
  SHAPE_KINDS,
  type ShapeAnimation,
  type ShapeKind,
  type ShapeLayout,
  type ShapesProps,
  type ShapeVariant,
} from "../types";
import { clamp, createRandom, resolveColor, round } from "../utils/background";
import { SHAPE_PATHS } from "../utils/shapes";

defineOptions({ name: "NShapes" });

const props = defineProps({
  as: {
    type: [String, Object, Function] as PropType<ShapesProps["as"]>,
    default: "div",
  },
  shapes: {
    type: Array as PropType<ShapeKind[]>,
    default: () => [...SHAPE_KINDS],
  },
  count: { type: Number, default: 14 },
  colors: {
    type: Array as PropType<string[]>,
    default: () => ["primary", "secondary"],
  },
  shade: { type: Number, default: 500 },
  minSize: { type: Number, default: 24 },
  maxSize: { type: Number, default: 72 },
  variant: { type: String as PropType<ShapeVariant>, default: "outline" },
  strokeWidth: { type: Number, default: 2 },
  opacity: { type: Number, default: 0.5 },
  blur: { type: Number, default: 0 },
  rotate: { type: Boolean, default: true },
  layout: { type: String as PropType<ShapeLayout>, default: "even" },
  seed: { type: Number, default: 1 },
  animation: { type: String as PropType<ShapeAnimation>, default: "float" },
  duration: { type: Number, default: 14 },
});

const items = computed(() => {
  const rand = createRandom(props.seed);
  const kinds = props.shapes.filter((kind) => kind in SHAPE_PATHS);
  if (!kinds.length) return [];
  const colors = props.colors.length ? props.colors : ["primary"];
  const count = Math.round(clamp(props.count, 0, 200));
  const low = Math.min(props.minSize, props.maxSize);
  const high = Math.max(props.minSize, props.maxSize);
  const duration = Math.max(1, props.duration);

  // "even": a jittered grid with a random pick of its cells, so shapes spread out instead of clumping
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * 1.6)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const cells = Array.from({ length: columns * rows }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cells[i], cells[j]] = [cells[j]!, cells[i]!];
  }

  return Array.from({ length: count }, (_, i) => {
    const shape = SHAPE_PATHS[kinds[Math.floor(rand() * kinds.length)]!];
    const cell = cells[i]!;
    const x =
      props.layout === "even"
        ? ((cell % columns) + 0.15 + rand() * 0.7) / columns
        : rand();
    const y =
      props.layout === "even"
        ? (Math.floor(cell / columns) + 0.15 + rand() * 0.7) / rows
        : rand();
    const filled =
      props.variant === "fill" || (props.variant === "mixed" && rand() < 0.5);
    const mode =
      shape.mode === "line"
        ? "stroke"
        : shape.mode === "dots" || filled
          ? "fill"
          : "stroke";
    const size = low + rand() * (high - low);

    return {
      d: shape.d,
      evenodd: shape.evenodd,
      mode,
      style: {
        "--n-shape-color": resolveColor(
          colors[i % colors.length]!,
          props.shade,
        ),
        left: `${round(x * 100)}%`,
        top: `${round(y * 100)}%`,
        width: `${round(size)}px`,
        height: `${round(size)}px`,
        rotate: props.rotate
          ? `${Math.round((rand() - 0.5) * 90)}deg`
          : undefined,
        opacity: round(props.opacity * (0.6 + rand() * 0.4)),
        "--n-shape-dx": `${Math.round((rand() - 0.5) * 40)}px`,
        "--n-shape-dy": `${Math.round((rand() - 0.5) * 40)}px`,
        "--n-shape-sway": `${Math.round((rand() - 0.5) * 40)}deg`,
        "--n-shape-duration": `${round(duration * (0.7 + rand() * 0.6))}s`,
        "--n-shape-delay": `${round(-rand() * duration)}s`,
      },
    };
  });
});

const style = computed(() => ({
  "--n-shapes-stroke": `${Math.max(0, props.strokeWidth)}px`,
  "--n-shapes-blur": `${Math.max(0, props.blur)}px`,
}));
</script>

<template>
  <component
    :is="as"
    class="n-shapes"
    :data-animation="animation"
    :data-empty="$slots.default ? undefined : ''"
    :style="style"
  >
    <div class="n-shapes-layer" aria-hidden="true">
      <span
        v-for="(item, i) in items"
        :key="i"
        class="n-shape"
        :style="item.style"
      >
        <svg viewBox="0 0 100 100" focusable="false">
          <path
            :d="item.d"
            :fill="item.mode === 'fill' ? 'currentColor' : 'none'"
            :stroke="item.mode === 'stroke' ? 'currentColor' : 'none'"
            :fill-rule="item.evenodd ? 'evenodd' : undefined"
          />
        </svg>
      </span>
    </div>
    <div v-if="$slots.default" class="n-shapes-content">
      <slot />
    </div>
  </component>
</template>
