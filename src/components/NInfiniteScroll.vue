<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type PropType,
} from "vue";
import type { InfiniteScrollDirection } from "../types";
import NButton from "./NButton.vue";

defineOptions({ name: "NInfiniteScroll" });

const props = defineProps({
  /** Your request is in flight; you own it. Blocks further `load` events */
  loading: { type: Boolean, default: false },
  /** Nothing more to load: stops observing and shows the finished status */
  finished: { type: Boolean, default: false },
  /** The last load failed. A string is shown as the message. Stops `load` until it is cleared or retried */
  error: {
    type: [Boolean, String] as PropType<boolean | string>,
    default: false,
  },
  disabled: { type: Boolean, default: false },
  /** `"down"` loads at the end; `"up"` at the start and keeps the scroll position when items are prepended */
  direction: {
    type: String as PropType<InfiniteScrollDirection>,
    default: "down",
  },
  /** How early to load before the edge is in view: pixels, or a `px`/`%` string */
  distance: {
    type: [Number, String] as PropType<number | string>,
    default: 200,
  },
  /** The scroll container to observe: a CSS selector or an element. Left out, it is the nearest scrolling ancestor, or the page */
  root: {
    type: [String, Object] as PropType<string | HTMLElement>,
    default: undefined,
  },
  /** Makes the component its own scroll container of this height (a number is pixels) */
  height: {
    type: [Number, String] as PropType<number | string>,
    default: undefined,
  },
  /** Shows a "Load more" button instead of loading by itself. It is also the fallback without `IntersectionObserver` */
  manual: { type: Boolean, default: false },
  loadingLabel: { type: String, default: "Loading…" },
  /** An empty string hides it */
  finishedLabel: { type: String, default: "No more items" },
  errorLabel: { type: String, default: "Something went wrong" },
  retryLabel: { type: String, default: "Try again" },
  loadMoreLabel: { type: String, default: "Load more" },
});

const emit = defineEmits<{
  /** The edge came into view while idle (or "Load more" was used). Fetch the next page and set `loading` */
  load: [];
  /** The retry button was used; `load` follows it, so one `@load` handler is enough */
  retry: [];
}>();

defineSlots<{
  default(): unknown;
  /** Replaces the loading status */
  loading(): unknown;
  /** Replaces the finished status */
  finished(): unknown;
  /** Replaces the error status; call `retry` to ask for the page again */
  error(props: { retry: () => void; message: string }): unknown;
}>();

const el = ref<HTMLElement>();
const supported = ref(true);

// A function ref: the footer sits inside a `v-for`
let sentinel: HTMLElement | null = null;
const setSentinel = (node: unknown) => {
  sentinel = node as HTMLElement | null;
};

const ownScroller = computed(
  () => props.height !== undefined && props.height !== "",
);
const hasError = computed(() => props.error !== false && props.error !== "");
const errorMessage = computed(() =>
  typeof props.error === "string" && props.error
    ? props.error
    : props.errorLabel,
);
const useButton = computed(() => props.manual || !supported.value);
const state = computed(() =>
  props.loading
    ? "loading"
    : hasError.value
      ? "error"
      : props.finished
        ? "finished"
        : "idle",
);
const canLoad = computed(
  () => state.value === "idle" && !props.disabled && !useButton.value,
);
const order = computed(() =>
  props.direction === "up" ? ["footer", "items"] : ["items", "footer"],
);
const heightStyle = computed(() =>
  ownScroller.value
    ? {
        height:
          typeof props.height === "number" ? `${props.height}px` : props.height,
      }
    : undefined,
);

const toLength = (value: number | string) =>
  typeof value === "number" || /^-?[\d.]+$/.test(value) ? `${value}px` : value;

let observer: IntersectionObserver | undefined;
// Set after a `load` so one stay in view emits once; cleared when the state changes or the edge leaves the view
let fired = false;
let snapshot: { height: number; top: number } | undefined;

function findScrollParent(node: HTMLElement | null): HTMLElement | null {
  for (
    let parent = node?.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    if (/(auto|scroll|overlay)/.test(getComputedStyle(parent).overflowY))
      return parent;
  }
  return null;
}

// The element observed against; `null` is the page
function resolveRoot(): HTMLElement | null {
  if (ownScroller.value) return el.value ?? null;
  if (typeof props.root === "string") return document.querySelector(props.root);
  if (props.root) return props.root;
  return findScrollParent(el.value ?? null);
}

function scroller(): HTMLElement | null {
  return resolveRoot() ?? (document.scrollingElement as HTMLElement | null);
}

function takeSnapshot() {
  const target = scroller();
  snapshot = target
    ? { height: target.scrollHeight, top: target.scrollTop }
    : undefined;
}

function request() {
  fired = true;
  if (props.direction === "up") takeSnapshot();
  emit("load");
}

function onIntersect(entries: IntersectionObserverEntry[]) {
  const entry = entries[entries.length - 1];
  if (!entry?.isIntersecting) {
    fired = false;
    return;
  }
  if (canLoad.value && !fired) request();
}

function observe() {
  observer?.disconnect();
  observer = undefined;
  if (!sentinel || useButton.value || props.finished) return;
  const distance = toLength(props.distance);
  observer = new IntersectionObserver(onIntersect, {
    root: resolveRoot(),
    rootMargin:
      props.direction === "up"
        ? `${distance} 0px 0px 0px`
        : `0px 0px ${distance} 0px`,
  });
  observer.observe(sentinel);
}

// Observing again makes the browser report the current visibility
function check() {
  fired = false;
  if (!observer || !sentinel) return observe();
  observer.unobserve(sentinel);
  observer.observe(sentinel);
}

function retry() {
  emit("retry");
  request();
}

function loadMore() {
  if (state.value === "idle" && !props.disabled) request();
}

async function restoreScroll() {
  const saved = snapshot;
  snapshot = undefined;
  await nextTick();
  const target = scroller();
  if (!saved || !target) return;
  const delta = target.scrollHeight - saved.height;
  if (delta > 0) target.scrollTop = saved.top + delta;
}

watch(
  () => props.loading,
  (loading, was) => {
    if (loading && props.direction === "up") takeSnapshot();
    if (!loading && was) {
      if (snapshot) restoreScroll();
      check();
    }
  },
);

watch(
  () => [props.finished, hasError.value, props.disabled],
  (now, before) => {
    if (before.some((value, i) => value && !now[i])) check();
  },
);

watch(
  () => [
    props.direction,
    props.distance,
    props.root,
    props.height,
    useButton.value,
  ],
  () => nextTick(observe),
);

onMounted(() => {
  supported.value = typeof IntersectionObserver !== "undefined";
  observe();
});

onBeforeUnmount(() => observer?.disconnect());

defineExpose({
  /** Re-evaluates whether the edge is in view and emits `load` if it is and nothing blocks it */
  check,
});
</script>

<template>
  <div
    ref="el"
    class="n-infinite-scroll"
    :data-direction="direction"
    :data-state="state"
    :data-scroller="ownScroller || undefined"
    :style="heightStyle"
    :aria-busy="loading"
  >
    <template v-for="part in order" :key="part">
      <slot v-if="part === 'items'" />
      <div v-else class="n-infinite-scroll-footer">
        <div
          :ref="setSentinel"
          class="n-infinite-scroll-sentinel"
          aria-hidden="true"
        />
        <div class="n-infinite-scroll-status" aria-live="polite">
          <slot v-if="state === 'loading'" name="loading">
            <span
              class="n-infinite-scroll-spinner i-lucide-loader-circle"
              aria-hidden="true"
            />
            <span>{{ loadingLabel }}</span>
          </slot>
          <slot
            v-else-if="state === 'error'"
            name="error"
            :retry="retry"
            :message="errorMessage"
          >
            <span
              class="n-infinite-scroll-icon i-lucide-circle-x"
              aria-hidden="true"
            />
            <span>{{ errorMessage }}</span>
            <NButton
              size="sm"
              variant="soft"
              color="error"
              :label="retryLabel"
              @click="retry"
            />
          </slot>
          <slot v-else-if="state === 'finished'" name="finished">
            <span v-if="finishedLabel">{{ finishedLabel }}</span>
          </slot>
          <NButton
            v-else-if="useButton"
            size="sm"
            variant="outline"
            color="neutral"
            :label="loadMoreLabel"
            :disabled="disabled"
            @click="loadMore"
          />
        </div>
      </div>
    </template>
  </div>
</template>
