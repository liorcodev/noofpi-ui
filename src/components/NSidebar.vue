<script setup lang="ts">
import { computed, inject, type PropType } from "vue";
import { DASHBOARD_KEY } from "../internal/dashboard-context";
import { useCurrentLocation } from "../internal/current-location";
import type { HeaderItem, SidebarGroup } from "../types";
import NButton from "./NButton.vue";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NSidebar" });

const props = defineProps({
  items: { type: Array as PropType<HeaderItem[]>, default: () => [] },
  groups: { type: Array as PropType<SidebarGroup[]>, default: () => [] },
  border: { type: Boolean, default: true },
  collapsible: { type: Boolean, default: false },
  linkAs: {
    type: [String, Object, Function] as PropType<string | object>,
    default: "a",
  },
  label: { type: String, default: "Sidebar" },
  collapseLabel: { type: String, default: "Collapse sidebar" },
  expandLabel: { type: String, default: "Expand sidebar" },
});

const collapsed = defineModel<boolean>("collapsed", { default: false });

defineSlots<{
  /** Above the links, e.g. a team switcher. `collapsed` tells when only the icon rail is shown */
  header?: (props: { collapsed: boolean }) => unknown;
  /** Replaces the `items` and `groups` */
  default?: (props: { collapsed: boolean }) => unknown;
  /** Below the links, pinned to the bottom, e.g. the user */
  footer?: (props: { collapsed: boolean }) => unknown;
}>();

const dashboard = inject(DASHBOARD_KEY, undefined);

// In a dashboard's drawer (below its breakpoint) the sidebar is always full width
const canCollapse = computed(
  () => props.collapsible && (dashboard?.desktop.value ?? true),
);
const rail = computed(() => canCollapse.value && collapsed.value);

const { isCurrent } = useCurrentLocation();

function isActive(item: HeaderItem) {
  if (item.active !== undefined) return item.active;
  return props.linkAs === "a" && isCurrent(item.to);
}

function linkAttrs(item: HeaderItem) {
  const active = isActive(item);
  const attrs: Record<string, unknown> =
    props.linkAs === "a"
      ? {
          href: item.to,
          target: item.target,
          rel: item.target === "_blank" ? "noopener noreferrer" : undefined,
        }
      : { to: item.to, target: item.target };
  if (active) {
    attrs["aria-current"] = "page";
    attrs["data-active"] = "";
  }
  if (item.disabled) attrs["aria-disabled"] = "true";
  return attrs;
}
</script>

<template>
  <nav
    class="n-sidebar"
    :aria-label="label"
    :data-border="border ? '' : undefined"
    :data-collapsed="rail ? '' : undefined"
  >
    <div v-if="$slots.header" class="n-sidebar-header">
      <slot name="header" :collapsed="rail" />
    </div>

    <div class="n-sidebar-content">
      <slot :collapsed="rail">
        <template v-for="(group, index) in [{ items }, ...groups]" :key="index">
          <section v-if="group.items.length" class="n-sidebar-group">
            <h2
              v-if="'label' in group && group.label"
              class="n-sidebar-group-label"
            >
              <span>{{ group.label }}</span>
            </h2>
            <component
              :is="linkAs"
              v-for="item in group.items"
              :key="item.label"
              class="n-sidebar-link"
              :title="rail ? item.label : undefined"
              v-bind="linkAttrs(item)"
            >
              <NIcon v-if="item.icon" :name="item.icon" />
              <span
                v-else-if="rail"
                class="n-sidebar-initial"
                aria-hidden="true"
                >{{ item.label.charAt(0) }}</span
              >
              <span class="n-sidebar-label">{{ item.label }}</span>
            </component>
          </section>
        </template>
      </slot>
    </div>

    <div v-if="$slots.footer" class="n-sidebar-footer">
      <slot name="footer" :collapsed="rail" />
    </div>

    <NButton
      v-if="canCollapse"
      class="n-sidebar-collapse"
      variant="outline"
      color="neutral"
      size="xxs"
      shape="pill"
      :icon="rail ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'"
      :aria-label="rail ? expandLabel : collapseLabel"
      :aria-expanded="rail ? 'false' : 'true'"
      @click="collapsed = !collapsed"
    />
  </nav>
</template>
