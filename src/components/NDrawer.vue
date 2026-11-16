<script setup lang="ts">
import type { PropType } from "vue";
import type { DrawerPlacement } from "../types";
import NDialog from "./NDialog.vue";

defineOptions({ name: "NDrawer" });

// Everything else (`title`, `size`, `dismissible`, ...) falls through to `NDialog`
defineProps({
  placement: { type: String as PropType<DrawerPlacement>, default: "end" },
});

const open = defineModel<boolean>("open", { default: false });

defineSlots<{
  /** Content of the drawer */
  default?: () => unknown;
  /** Replaces the `title` and `description` */
  header?: () => unknown;
  /** Actions at the bottom */
  footer?: () => unknown;
}>();
</script>

<template>
  <NDialog v-model:open="open" :placement="placement">
    <template v-if="$slots.header" #header><slot name="header" /></template>
    <template v-if="$slots.default" #default><slot /></template>
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </NDialog>
</template>
