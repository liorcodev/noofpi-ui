<script setup lang="ts">
import { watch, type PropType } from "vue";
import type { ButtonIcon, InboxBreakpoint } from "../types";
import NButton from "./NButton.vue";

defineOptions({ name: "NInbox" });

defineProps({
  breakpoint: { type: String as PropType<InboxBreakpoint>, default: "lg" },
  railBreakpoint: { type: String as PropType<InboxBreakpoint>, default: "xl" },
  border: { type: Boolean, default: true },
  label: { type: String, default: "Inbox" },
  backLabel: { type: String, default: "Back to list" },
  closeLabel: { type: String, default: "Close message" },
  expandLabel: { type: String, default: "Full width" },
  restoreLabel: { type: String, default: "Show list" },
  showRailLabel: { type: String, default: "Show folders" },
  hideRailLabel: { type: String, default: "Hide folders" },
  hideRailIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-panel-left-close",
  },
  showRailIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-panel-left-open",
  },
});

const emit = defineEmits<{
  /** The user closed the message: the back or close button, or Escape */
  close: [];
}>();

const open = defineModel<boolean>("open", { default: false });
const expanded = defineModel<boolean>("expanded", { default: false });
const rail = defineModel<boolean>("rail", { default: true });

defineSlots<{
  /** Above the rail's content, e.g. a compose button. Next to it sits the button that hides the rail */
  "rail-header"?: () => unknown;
  /** The rail, usually the folders and labels. Scrolls on its own */
  rail?: () => unknown;
  /** Pinned to the bottom of the rail, e.g. a storage quota */
  "rail-footer"?: () => unknown;
  /** Above the list, e.g. a search field. Where the rail is hidden it also holds the button that shows it */
  "list-header"?: () => unknown;
  /** The list of messages. Scrolls on its own */
  list?: () => unknown;
  /** Next to the back and close buttons at the top of the reader, usually the subject */
  "reader-header"?: () => unknown;
  /** The message. Scrolls on its own */
  default?: () => unknown;
}>();

// Expanding only makes sense for an open message
watch(open, (value) => {
  if (!value) expanded.value = false;
});

function close() {
  open.value = false;
  emit("close");
}

function onReaderKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && open.value && !event.defaultPrevented) close();
}
</script>

<template>
  <div
    class="n-inbox"
    role="group"
    :aria-label="label"
    :data-breakpoint="breakpoint"
    :data-rail-breakpoint="railBreakpoint"
    :data-border="border ? '' : undefined"
    :data-open="open ? '' : undefined"
    :data-expanded="open && expanded ? '' : undefined"
    :data-rail-closed="rail ? undefined : ''"
  >
    <div class="n-inbox-body">
      <aside v-if="$slots.rail" class="n-inbox-rail">
        <div class="n-inbox-rail-inner">
          <div class="n-inbox-rail-top">
            <div class="n-inbox-rail-header">
              <slot name="rail-header" />
            </div>
            <NButton
              variant="ghost"
              color="neutral"
              size="sm"
              :icon="hideRailIcon"
              :aria-label="hideRailLabel"
              :aria-expanded="rail ? 'true' : 'false'"
              @click="rail = false"
            />
          </div>
          <div class="n-inbox-rail-content">
            <slot name="rail" />
          </div>
          <div v-if="$slots['rail-footer']" class="n-inbox-rail-footer">
            <slot name="rail-footer" />
          </div>
        </div>
      </aside>

      <section class="n-inbox-list">
        <div class="n-inbox-list-inner">
          <div v-if="$slots['list-header']" class="n-inbox-list-header">
            <NButton
              v-if="$slots.rail"
              class="n-inbox-rail-show"
              variant="ghost"
              color="neutral"
              size="sm"
              :icon="showRailIcon"
              :aria-label="showRailLabel"
              :aria-expanded="rail ? 'true' : 'false'"
              @click="rail = true"
            />
            <div class="n-inbox-list-header-content">
              <slot name="list-header" />
            </div>
          </div>
          <div class="n-inbox-list-content">
            <slot name="list" />
          </div>
        </div>
      </section>

      <section class="n-inbox-reader" :inert="!open" @keydown="onReaderKeydown">
        <div class="n-inbox-reader-inner">
          <div class="n-inbox-reader-top">
            <NButton
              class="n-inbox-back"
              variant="ghost"
              color="neutral"
              size="sm"
              icon="i-lucide-arrow-left"
              :aria-label="backLabel"
              @click="close"
            />
            <div class="n-inbox-reader-header">
              <slot name="reader-header" />
            </div>
            <NButton
              class="n-inbox-expand"
              variant="ghost"
              color="neutral"
              size="sm"
              :icon="expanded ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
              :aria-label="expanded ? restoreLabel : expandLabel"
              :aria-pressed="expanded ? 'true' : 'false'"
              @click="expanded = !expanded"
            />
            <NButton
              class="n-inbox-close"
              variant="ghost"
              color="neutral"
              size="sm"
              icon="i-lucide-x"
              :aria-label="closeLabel"
              @click="close"
            />
          </div>
          <div class="n-inbox-reader-content">
            <slot />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
