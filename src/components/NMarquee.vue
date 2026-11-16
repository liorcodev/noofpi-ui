<script setup lang="ts">
import { computed, type PropType } from "vue";
import type {
  MarqueeItem,
  MarqueeOrientation,
  MarqueeProps,
  MarqueeSize,
} from "../types";
import { BREAKPOINTS, type Responsive } from "../utils/responsive";

defineOptions({ name: "NMarquee" });

const props = defineProps({
  as: {
    type: [String, Object, Function] as PropType<MarqueeProps["as"]>,
    default: "div",
  },
  items: { type: Array as PropType<MarqueeItem[]>, default: () => [] },
  duration: { type: Number, default: 40 },
  reverse: { type: Boolean, default: false },
  pauseOnHover: { type: Boolean, default: true },
  fade: { type: Boolean, default: true },
  grayscale: { type: Boolean, default: true },
  monochrome: { type: Boolean, default: false },
  size: {
    type: [String, Object] as PropType<Responsive<MarqueeSize>>,
    default: "md",
  },
  orientation: {
    type: String as PropType<MarqueeOrientation>,
    default: "horizontal",
  },
  label: { type: String, default: undefined },
});

// Two identical groups slide by one group's width, so the loop has no seam.
// The second is a visual clone and is hidden from assistive tech.
const groups = [false, true];

// The size below the first breakpoint is `data-size`; each breakpoint is an `md:n-marquee-size-lg` class
// from noofpi-ui's CSS, which enumerates them (Tailwind can't see classes assembled here)
const baseSize = computed(() =>
  typeof props.size === "object" ? (props.size.base ?? "md") : props.size,
);

const sizeClasses = computed(() => {
  const size = props.size;
  if (typeof size !== "object") return [];
  return BREAKPOINTS.flatMap((breakpoint) =>
    size[breakpoint]
      ? [`${breakpoint}:n-marquee-size-${size[breakpoint]}`]
      : [],
  );
});

const style = computed(() => ({
  "--n-marquee-duration": `${props.duration}s`,
}));
</script>

<template>
  <component
    :is="as"
    class="n-marquee"
    :class="sizeClasses"
    role="region"
    :aria-label="label"
    :data-orientation="orientation"
    :data-size="baseSize"
    :data-reverse="reverse || undefined"
    :data-pause="pauseOnHover || undefined"
    :data-fade="fade || undefined"
    :data-grayscale="grayscale || undefined"
    :data-monochrome="monochrome || undefined"
    :style="style"
  >
    <div class="n-marquee-track">
      <div
        v-for="clone in groups"
        :key="String(clone)"
        class="n-marquee-group"
        :aria-hidden="clone || undefined"
        :data-clone="clone || undefined"
      >
        <slot>
          <component
            :is="item.href ? 'a' : 'div'"
            v-for="(item, i) in items"
            :key="i"
            class="n-marquee-item"
            :href="item.href"
            :target="item.target"
            :rel="item.target === '_blank' ? 'noopener noreferrer' : undefined"
            :tabindex="clone && item.href ? -1 : undefined"
          >
            <img
              v-if="item.src"
              class="n-marquee-logo"
              :src="item.src"
              :alt="clone ? '' : (item.alt ?? '')"
              loading="lazy"
              draggable="false"
            />
            <span v-if="item.label" class="n-marquee-label">{{
              item.label
            }}</span>
          </component>
        </slot>
      </div>
    </div>
  </component>
</template>
