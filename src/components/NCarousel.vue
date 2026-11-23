<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type PropType,
} from "vue";
import type { ButtonColor, CarouselItem } from "../types";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NCarousel" });

const props = defineProps({
  items: { type: Array as PropType<CarouselItem[]>, default: () => [] },
  perView: { type: Number, default: 1 },
  gap: { type: String, default: "1rem" },
  aspect: { type: String, default: "16 / 9" },
  loop: { type: Boolean, default: false },
  /** Milliseconds between automatic slides, `0` turns it off */
  autoplay: { type: Number, default: 0 },
  pauseOnHover: { type: Boolean, default: true },
  arrows: { type: Boolean, default: true },
  indicators: { type: Boolean, default: true },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  label: { type: String, default: undefined },
  prevLabel: { type: String, default: "Previous slide" },
  nextLabel: { type: String, default: "Next slide" },
  pauseLabel: { type: String, default: "Pause slideshow" },
  playLabel: { type: String, default: "Start slideshow" },
  indicatorLabel: {
    type: Function as PropType<(position: number, total: number) => string>,
    default: (position: number) => `Go to slide ${position}`,
  },
  slideLabel: {
    type: Function as PropType<(position: number, total: number) => string>,
    default: (position: number, total: number) => `${position} of ${total}`,
  },
});

const model = defineModel<number>({ default: 0 });

const visibleCount = computed(() =>
  Math.max(1, Math.floor(props.perView) || 1),
);
const maxIndex = computed(() =>
  Math.max(props.items.length - visibleCount.value, 0),
);
const current = computed(() =>
  Math.min(Math.max(Math.floor(model.value) || 0, 0), maxIndex.value),
);
const scrollable = computed(() => maxIndex.value > 0);
const atStart = computed(() => !props.loop && current.value <= 0);
const atEnd = computed(() => !props.loop && current.value >= maxIndex.value);

const viewport = ref<HTMLElement>();
const reducedMotion = ref(false);
const playing = ref(true);
const hovered = ref(false);
const focused = ref(false);

const autoplaying = computed(
  () => props.autoplay > 0 && scrollable.value && !reducedMotion.value,
);

function isVisible(index: number) {
  return index >= current.value && index < current.value + visibleCount.value;
}

const rtl = () =>
  !!viewport.value && getComputedStyle(viewport.value).direction === "rtl";

// A slide's offset from the start edge of the viewport, in scroll pixels
function offsetOf(slide: Element) {
  const view = viewport.value!.getBoundingClientRect();
  const box = slide.getBoundingClientRect();
  return rtl() ? box.right - view.right : box.left - view.left;
}

function nearestIndex() {
  const slides = viewport.value?.children;
  if (!slides?.length) return 0;
  let best = 0;
  let distance = Infinity;
  for (let i = 0; i < slides.length; i++) {
    const d = Math.abs(offsetOf(slides[i]!));
    if (d < distance) {
      distance = d;
      best = i;
    }
  }
  return Math.min(best, maxIndex.value);
}

// While we scroll to a slide ourselves, the scroll events on the way must not change the model
let target: number | null = null;
let targetTimer: ReturnType<typeof setTimeout> | undefined;

function scrollToIndex(index: number) {
  const slide = viewport.value?.children[index];
  if (!viewport.value || !slide) return;
  const delta = offsetOf(slide);
  if (Math.abs(delta) < 1) return;
  target = index;
  clearTimeout(targetTimer);
  targetTimer = setTimeout(() => (target = null), 1000);
  viewport.value.scrollTo({
    left: viewport.value.scrollLeft + delta,
    behavior: reducedMotion.value ? "auto" : "smooth",
  });
}

let frame = 0;
function onScroll() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const index = nearestIndex();
    if (target !== null) {
      if (index !== target) return;
      target = null;
      clearTimeout(targetTimer);
    }
    if (index !== current.value) model.value = index;
  });
}

watch(current, (index) => {
  if (nearestIndex() !== index) scrollToIndex(index);
});

function goTo(index: number) {
  if (!scrollable.value) return;
  model.value = props.loop
    ? index < 0
      ? maxIndex.value
      : index > maxIndex.value
        ? 0
        : index
    : Math.min(Math.max(index, 0), maxIndex.value);
}

const prev = () => goTo(current.value - 1);
const next = () => goTo(current.value + 1);

function onKeydown(event: KeyboardEvent) {
  if (event.target !== viewport.value || event.altKey || event.ctrlKey) return;
  const flipped = rtl();
  if (event.key === "ArrowLeft") flipped ? next() : prev();
  else if (event.key === "ArrowRight") flipped ? prev() : next();
  else if (event.key === "Home") goTo(0);
  else if (event.key === "End") goTo(maxIndex.value);
  else return;
  event.preventDefault();
}

// Autoplay restarts after every slide change, so a manual move gets a full interval
let timer: ReturnType<typeof setInterval> | undefined;
function syncAutoplay() {
  clearInterval(timer);
  timer = undefined;
  const paused = props.pauseOnHover && (hovered.value || focused.value);
  if (!autoplaying.value || !playing.value || paused) return;
  timer = setInterval(() => {
    if (document.hidden) return;
    model.value = current.value >= maxIndex.value ? 0 : current.value + 1;
  }, props.autoplay);
}

watch(
  [
    () => props.autoplay,
    () => props.pauseOnHover,
    autoplaying,
    playing,
    hovered,
    focused,
    current,
  ],
  syncAutoplay,
);

let motion: MediaQueryList | undefined;
const onMotionChange = () => (reducedMotion.value = !!motion?.matches);

onMounted(() => {
  motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  onMotionChange();
  motion.addEventListener("change", onMotionChange);
  scrollToIndex(current.value);
  syncAutoplay();
});

onBeforeUnmount(() => {
  clearInterval(timer);
  clearTimeout(targetTimer);
  if (frame) cancelAnimationFrame(frame);
  motion?.removeEventListener("change", onMotionChange);
});

const style = computed(() => ({
  "--n-carousel-per-view": visibleCount.value,
  "--n-carousel-gap": props.gap,
  "--n-carousel-aspect": props.aspect,
}));
</script>

<template>
  <div
    class="n-carousel"
    role="region"
    aria-roledescription="carousel"
    :aria-label="label"
    :data-color="color"
    :style="style"
    @pointerenter="hovered = true"
    @pointerleave="hovered = false"
    @focusin="focused = true"
    @focusout="focused = false"
  >
    <div class="n-carousel-frame">
      <div
        ref="viewport"
        class="n-carousel-viewport"
        tabindex="0"
        @scroll.passive="onScroll"
        @keydown="onKeydown"
      >
        <div
          v-for="(item, index) in items"
          :key="index"
          class="n-carousel-slide"
          role="group"
          aria-roledescription="slide"
          :aria-label="slideLabel(index + 1, items.length)"
          :aria-hidden="isVisible(index) ? undefined : 'true'"
          :data-active="isVisible(index) ? '' : undefined"
        >
          <slot
            name="slide"
            :item="item"
            :index="index"
            :active="isVisible(index)"
          >
            <img
              v-if="item.src"
              class="n-carousel-image"
              :src="item.src"
              :alt="item.alt ?? ''"
              :loading="index < visibleCount ? undefined : 'lazy'"
              draggable="false"
            />
            <div
              v-if="item.title || item.description"
              class="n-carousel-caption"
            >
              <span v-if="item.title" class="n-carousel-title">{{
                item.title
              }}</span>
              <span v-if="item.description" class="n-carousel-description">{{
                item.description
              }}</span>
            </div>
          </slot>
        </div>
      </div>
      <template v-if="arrows && scrollable">
        <button
          class="n-carousel-arrow"
          data-direction="prev"
          type="button"
          :aria-label="prevLabel"
          :disabled="atStart"
          @click="prev"
        >
          <NIcon name="i-lucide-chevron-left" />
        </button>
        <button
          class="n-carousel-arrow"
          data-direction="next"
          type="button"
          :aria-label="nextLabel"
          :disabled="atEnd"
          @click="next"
        >
          <NIcon name="i-lucide-chevron-right" />
        </button>
      </template>
    </div>
    <div
      v-if="scrollable && (indicators || autoplaying)"
      class="n-carousel-footer"
    >
      <button
        v-if="autoplaying"
        class="n-carousel-toggle"
        type="button"
        :aria-label="playing ? pauseLabel : playLabel"
        @click="playing = !playing"
      >
        <NIcon :name="playing ? 'i-lucide-pause' : 'i-lucide-play'" />
      </button>
      <div v-if="indicators" class="n-carousel-indicators">
        <button
          v-for="position in maxIndex + 1"
          :key="position"
          class="n-carousel-indicator"
          type="button"
          :aria-label="indicatorLabel(position, maxIndex + 1)"
          :aria-current="position - 1 === current ? 'true' : undefined"
          @click="model = position - 1"
        />
      </div>
    </div>
  </div>
</template>
