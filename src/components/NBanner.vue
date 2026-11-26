<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  ref,
  useSlots,
  type PropType,
} from "vue";
import type {
  BannerAlign,
  BannerPlacement,
  BannerPosition,
  BannerProps,
  BannerSize,
  BannerVariant,
  ButtonColor,
  ButtonIcon,
} from "../types";
import NButton from "./NButton.vue";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NBanner" });

const props = defineProps({
  title: { type: String, default: undefined },
  description: { type: String, default: undefined },
  /** Leading icon. Unlike `NAlert`, there is none unless you set it (or use the `leading` slot) */
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  variant: { type: String as PropType<BannerVariant>, default: "solid" },
  /** Makes the message a link to this URL (a `to` for a router link, see `linkAs`) */
  to: { type: String, default: undefined },
  /** Same as `to`; `to` wins when both are set */
  href: { type: String, default: undefined },
  target: { type: String, default: undefined },
  /** Element or component for the link, e.g. a router link (it gets `to`) */
  linkAs: {
    type: [String, Object, Function] as PropType<BannerProps["linkAs"]>,
    default: "a",
  },
  /** The arrow after a linked message: `false` hides it, an icon replaces it */
  linkIcon: {
    type: [Boolean, String, Object, Function] as PropType<boolean | ButtonIcon>,
    default: true,
  },
  actions: {
    type: Array as PropType<BannerProps["actions"]>,
    default: undefined,
  },
  close: { type: Boolean, default: false },
  closeIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-x",
  },
  closeLabel: { type: String, default: "Dismiss" },
  /** Accessible name of the banner's `region` landmark */
  label: { type: String, default: "Announcement" },
  /** Remembers a dismissal in `localStorage` (`noofpi-ui:banner:<persistKey>`) */
  persistKey: { type: String, default: undefined },
  position: { type: String as PropType<BannerPosition>, default: "static" },
  placement: { type: String as PropType<BannerPlacement>, default: "top" },
  align: { type: String as PropType<BannerAlign>, default: "center" },
  size: { type: String as PropType<BannerSize>, default: "md" },
});

const open = defineModel<boolean>("open", { default: true });

const emit = defineEmits<{ close: [] }>();

const slots = useSlots();

const STORAGE_PREFIX = "noofpi-ui:banner:";

const href = computed(() => props.to ?? props.href);

const linkAttrs = computed(() => {
  const rel = props.target === "_blank" ? "noopener noreferrer" : undefined;
  if (props.linkAs === "a")
    return { href: href.value, target: props.target, rel };
  return { to: href.value, target: props.target, rel };
});

const arrow = computed(() =>
  props.linkIcon === true ? "i-lucide-arrow-right" : props.linkIcon,
);

const hasActions = computed(
  () => Boolean(props.actions?.length) || Boolean(slots.actions),
);

// On a solid banner the accent is the background, so buttons switch to inverted neutral
const solid = computed(() => props.variant === "solid");

// Restoring a stored dismissal skips the collapse animation, so it doesn't play on every page load
const instant = ref(false);

// Storage can be missing or blocked (private mode, disabled cookies), then dismissal just isn't remembered
function isDismissed() {
  if (!props.persistKey) return false;
  try {
    return (
      window.localStorage.getItem(STORAGE_PREFIX + props.persistKey) === "1"
    );
  } catch {
    return false;
  }
}

function rememberDismissal() {
  if (!props.persistKey) return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + props.persistKey, "1");
  } catch {
    // Not remembered, the banner is still dismissed for this page view
  }
}

// The server and the first client render are always open (no hydration mismatch); a stored dismissal hides it after mount
onMounted(() => {
  if (!open.value || !isDismissed()) return;
  instant.value = true;
  open.value = false;
  nextTick(() => (instant.value = false));
});

function dismiss() {
  open.value = false;
  rememberDismissal();
  emit("close");
}
</script>

<template>
  <Transition name="n-banner" :css="!instant">
    <div
      v-if="open"
      class="n-banner"
      role="region"
      :aria-label="label"
      :data-variant="variant"
      :data-color="color"
      :data-position="position"
      :data-placement="placement"
      :data-align="align"
      :data-size="size"
      :data-closable="close || $slots.close ? '' : undefined"
    >
      <div class="n-banner-inner">
        <div class="n-banner-content">
          <slot name="leading">
            <NIcon v-if="icon" :name="icon" class="n-banner-icon" />
          </slot>
          <component
            :is="href ? linkAs : 'div'"
            :class="['n-banner-message', href && 'n-banner-link']"
            v-bind="href ? linkAttrs : undefined"
          >
            <span v-if="title || $slots.title" class="n-banner-title">
              <slot name="title">{{ title }}</slot>
            </span>
            <span
              v-if="description || $slots.default"
              class="n-banner-description"
            >
              <slot>{{ description }}</slot>
            </span>
            <NIcon
              v-if="href && arrow"
              :name="arrow"
              class="n-banner-link-icon"
            />
          </component>
          <div v-if="hasActions" class="n-banner-actions">
            <slot name="actions">
              <NButton
                v-for="(action, index) in actions"
                :key="index"
                size="xs"
                :variant="solid ? 'solid' : 'outline'"
                :color="solid ? 'neutral' : color"
                v-bind="action"
              />
            </slot>
          </div>
          <slot name="trailing" />
        </div>
        <div v-if="close || $slots.close" class="n-banner-close">
          <slot name="close" :dismiss="dismiss">
            <NButton
              variant="ghost"
              color="neutral"
              shape="circle"
              size="xs"
              :icon="closeIcon"
              :aria-label="closeLabel"
              @click="dismiss"
            />
          </slot>
        </div>
      </div>
    </div>
  </Transition>
</template>
