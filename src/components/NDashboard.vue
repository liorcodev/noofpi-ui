<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  useId,
  type PropType,
} from "vue";
import { DASHBOARD_KEY } from "../internal/dashboard-context";
import type { DashboardBreakpoint } from "../types";

defineOptions({ name: "NDashboard" });

const props = defineProps({
  breakpoint: {
    type: String as PropType<DashboardBreakpoint>,
    default: "lg",
  },
});

const open = defineModel<boolean>("open", { default: false });

const slots = defineSlots<{
  /** The top bar, usually an `NHeader` (it gets the sidebar button) */
  header?: () => unknown;
  /** The sidebar, usually an `NSidebar` */
  sidebar?: () => unknown;
  /** The main content */
  default?: () => unknown;
}>();

const panelId = useId();
// Assumes a wide viewport until mounted: a drawer that's hidden anyway needs no correction
const desktop = ref(true);

// The width of Tailwind's breakpoints, at which the CSS shows the sidebar permanently
const BREAKPOINT_REM = { sm: 40, md: 48, lg: 64, xl: 80 } as const;

provide(DASHBOARD_KEY, {
  open,
  hasSidebar: computed(() => !!slots.sidebar),
  desktop,
  panelId,
  toggle: () => (open.value = !open.value),
});

function onSidebarClick(event: MouseEvent) {
  if ((event.target as Element).closest("a")) open.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") open.value = false;
}

let query: MediaQueryList | undefined;
function onQueryChange(event: MediaQueryListEvent) {
  desktop.value = event.matches;
  if (event.matches) open.value = false;
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  query = window.matchMedia(
    `(min-width: ${BREAKPOINT_REM[props.breakpoint]}rem)`,
  );
  query.addEventListener("change", onQueryChange);
  desktop.value = query.matches;
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  query?.removeEventListener("change", onQueryChange);
});
</script>

<template>
  <div
    class="n-dashboard"
    :data-breakpoint="breakpoint"
    :data-open="open ? '' : undefined"
  >
    <slot name="header" />

    <div class="n-dashboard-body">
      <div
        v-if="slots.sidebar"
        :id="panelId"
        class="n-dashboard-sidebar"
        @click="onSidebarClick"
      >
        <slot name="sidebar" />
      </div>
      <div class="n-dashboard-backdrop" @click="open = false" />

      <main class="n-dashboard-main">
        <slot />
      </main>
    </div>
  </div>
</template>
