<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  type PropType,
} from "vue";
import { DASHBOARD_KEY } from "../internal/dashboard-context";
import { useCurrentLocation } from "../internal/current-location";
import type {
  ButtonIcon,
  HeaderBreakpoint,
  HeaderButton,
  HeaderItem,
  HeaderNavAlign,
  HeaderShadow,
} from "../types";
import NButton from "./NButton.vue";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NHeader" });

const props = defineProps({
  title: { type: String, default: undefined },
  logo: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  to: { type: String, default: "/" },
  items: { type: Array as PropType<HeaderItem[]>, default: () => [] },
  buttons: { type: Array as PropType<HeaderButton[]>, default: () => [] },
  shadow: {
    type: [Boolean, String] as PropType<boolean | HeaderShadow>,
    default: false,
  },
  sticky: { type: Boolean, default: false },
  border: { type: Boolean, default: true },
  container: { type: Boolean, default: true },
  breakpoint: { type: String as PropType<HeaderBreakpoint>, default: "md" },
  navAlign: { type: String as PropType<HeaderNavAlign>, default: "left" },
  linkAs: {
    type: [String, Object, Function] as PropType<string | object>,
    default: "a",
  },
  navLabel: { type: String, default: "Main" },
  menuLabel: { type: String, default: "Menu" },
  sidebarLabel: { type: String, default: "Sidebar" },
  sidebarIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-panel-left",
  },
  sidebarOpenIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-panel-left-close",
  },
});

const open = defineModel<boolean>("open", { default: false });

const slots = defineSlots<{
  /** Replaces the logo and title */
  logo?: () => unknown;
  /** Replaces the `items` links (desktop bar and mobile menu) */
  nav?: () => unknown;
  /** Replaces the `buttons`. Always in the bar, also on phones, e.g. an avatar menu */
  right?: () => unknown;
  /** Replaces everything in the mobile menu */
  mobile?: () => unknown;
}>();

const root = ref<HTMLElement>();
const dashboard = inject(DASHBOARD_KEY, undefined);
const hasSidebar = computed(() => !!dashboard?.hasSidebar.value);
// The buttons always stay in the bar, so the menu holds the navigation only. Without anything to show there's no menu button
const hasMenu = computed(
  () => props.items.length > 0 || !!slots.nav || !!slots.mobile,
);
const toggle = ref<InstanceType<typeof NButton>>();
const panelId = useId();
const scrolled = ref(false);
const { activeItem } = useCurrentLocation();

function isActive(item: HeaderItem) {
  return activeItem(props.items, props.linkAs === "a") === item;
}

// The width of Tailwind's breakpoints, at which the CSS swaps the menu button for the navigation
const BREAKPOINT_REM = { sm: 40, md: 48, lg: 64, xl: 80 } as const;

const shadowSize = computed(() => {
  if (props.shadow === true) return "md";
  if (props.shadow === "scroll") return scrolled.value ? "md" : "none";
  return props.shadow || "none";
});

function linkAttrs(to?: string, target?: string) {
  if (props.linkAs === "a")
    return {
      href: to,
      target,
      rel: target === "_blank" ? "noopener noreferrer" : undefined,
    };
  return { to, target };
}

function buttonAttrs({ to, ...button }: HeaderButton) {
  if (!to) return button;
  return { ...button, as: button.as ?? props.linkAs, ...linkAttrs(to) };
}

function close(returnFocus = false) {
  if (!open.value) return;
  open.value = false;
  if (returnFocus) nextTick(() => toggle.value?.$el.focus());
}

function onPanelClick(event: MouseEvent) {
  if ((event.target as Element).closest("a")) close();
}

function onPointerDown(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) close();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") close(true);
}

// `scroll` doesn't bubble, so it's caught in the capture phase to also see an inner scroll container
function onScroll(event?: Event) {
  const target = event?.target;
  if (target instanceof Element) {
    if (target.contains(root.value ?? null))
      scrolled.value = target.scrollTop > 0;
    return;
  }
  scrolled.value = window.scrollY > 0;
}

let query: MediaQueryList | undefined;
function onQueryChange(event: MediaQueryListEvent) {
  if (event.matches) close();
}

onMounted(() => {
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("scroll", onScroll, {
    capture: true,
    passive: true,
  });
  onScroll();
  query = window.matchMedia(
    `(min-width: ${BREAKPOINT_REM[props.breakpoint]}rem)`,
  );
  query.addEventListener("change", onQueryChange);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onPointerDown);
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("scroll", onScroll, { capture: true });
  query?.removeEventListener("change", onQueryChange);
});
</script>

<template>
  <header
    ref="root"
    class="n-header"
    :data-shadow="shadowSize"
    :data-sticky="sticky ? '' : undefined"
    :data-border="border ? '' : undefined"
    :data-container="container ? '' : undefined"
    :data-breakpoint="breakpoint"
    :data-nav-align="navAlign"
    :data-open="open ? '' : undefined"
    :data-sidebar="hasSidebar ? '' : undefined"
  >
    <div class="n-header-bar">
      <slot name="logo">
        <component
          :is="linkAs"
          v-if="title || logo"
          class="n-header-brand"
          v-bind="linkAttrs(to)"
        >
          <NIcon v-if="logo" :name="logo" class="n-header-logo" />
          <span v-if="title" class="n-header-title">{{ title }}</span>
        </component>
      </slot>

      <nav class="n-header-nav" :aria-label="navLabel">
        <slot name="nav">
          <component
            :is="linkAs"
            v-for="item in items"
            :key="item.label"
            class="n-header-link"
            :aria-current="isActive(item) ? 'page' : undefined"
            :aria-disabled="item.disabled ? 'true' : undefined"
            :data-active="isActive(item) ? '' : undefined"
            v-bind="linkAttrs(item.to, item.target)"
          >
            <NIcon v-if="item.icon" :name="item.icon" />
            {{ item.label }}
          </component>
        </slot>
      </nav>

      <div class="n-header-right">
        <slot name="right">
          <NButton
            v-for="button in buttons"
            :key="button.label"
            v-bind="buttonAttrs(button)"
          />
        </slot>
      </div>

      <NButton
        v-if="hasMenu"
        ref="toggle"
        class="n-header-toggle"
        variant="ghost"
        color="neutral"
        :icon="open ? 'i-lucide-x' : 'i-lucide-menu'"
        :aria-label="menuLabel"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="panelId"
        @click="open = !open"
      />

      <NButton
        v-if="dashboard?.hasSidebar.value"
        class="n-header-sidebar-toggle"
        variant="ghost"
        color="neutral"
        :icon="dashboard.open.value ? sidebarOpenIcon : sidebarIcon"
        :aria-label="sidebarLabel"
        :aria-expanded="dashboard.open.value ? 'true' : 'false'"
        :aria-controls="dashboard.panelId"
        @click="dashboard.toggle()"
      />
    </div>

    <Transition name="n-header-panel">
      <div
        v-if="open && hasMenu"
        :id="panelId"
        class="n-header-panel"
        @click="onPanelClick"
      >
        <slot name="mobile">
          <nav class="n-header-panel-nav" :aria-label="navLabel">
            <slot name="nav">
              <component
                :is="linkAs"
                v-for="item in items"
                :key="item.label"
                class="n-header-link"
                :aria-current="isActive(item) ? 'page' : undefined"
                :aria-disabled="item.disabled ? 'true' : undefined"
                :data-active="isActive(item) ? '' : undefined"
                v-bind="linkAttrs(item.to, item.target)"
              >
                <NIcon v-if="item.icon" :name="item.icon" />
                {{ item.label }}
              </component>
            </slot>
          </nav>
        </slot>
      </div>
    </Transition>
  </header>
</template>
