<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
  type PropType,
} from "vue";
import { lockScroll, unlockScroll } from "../internal/scroll-lock";
import type { CommandItem } from "../types";
import NEmptyState from "./NEmptyState.vue";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NCommandPalette" });

const props = defineProps({
  items: {
    type: Array as PropType<readonly CommandItem[]>,
    default: () => [],
  },
  placeholder: { type: String, default: "Search commands…" },
  label: { type: String, default: "Command palette" },
  emptyTitle: { type: String, default: "No commands found" },
  emptyDescription: {
    type: String,
    default: "Try a different search term.",
  },
  closeLabel: { type: String, default: "Close" },
  dismissible: { type: Boolean, default: true },
  filter: { type: Boolean, default: true },
});

const open = defineModel<boolean>("open", { default: false });
const search = defineModel<string>("search", { default: "" });
const emit = defineEmits<{
  select: [item: CommandItem, event: Event];
}>();

defineSlots<{
  item?: (props: { item: CommandItem; active: boolean }) => unknown;
  empty?: () => unknown;
}>();

const mounted = ref(false);
const input = ref<HTMLInputElement>();
const list = ref<HTMLElement>();
const active = ref(-1);
const rootId = useId();
let locked = false;
let opener: HTMLElement | null = null;

const shown = computed(() => {
  const term = search.value.trim().toLocaleLowerCase();
  if (!props.filter || !term) return props.items;
  return props.items.filter((item) => {
    const haystack = [
      item.label,
      item.description,
      item.group,
      ...(item.keywords ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return haystack.includes(term);
  });
});

const groups = computed(() => {
  const result: { label?: string; items: CommandItem[] }[] = [];
  for (const item of shown.value) {
    const last = result.at(-1);
    if (last && last.label === item.group) last.items.push(item);
    else result.push({ label: item.group, items: [item] });
  }
  return result;
});

const flat = computed(() => groups.value.flatMap((group) => group.items));
const enabledIndexes = () =>
  flat.value.flatMap((item, index) => (item.disabled ? [] : [index]));
const itemId = (index: number) => `n-command-item-${rootId}-${index}`;

function syncActive() {
  if (active.value >= 0 && !flat.value[active.value]?.disabled) return;
  active.value = enabledIndexes()[0] ?? -1;
}

watch(shown, syncActive);

function close() {
  if (!open.value) return;
  open.value = false;
}

function choose(index: number, event: Event) {
  const item = flat.value[index];
  if (!item || item.disabled) return;
  item.onSelect?.(event);
  emit("select", item, event);
  if (!event.defaultPrevented) close();
}

function move(step: 1 | -1) {
  const indexes = enabledIndexes();
  if (!indexes.length) return;
  const position = indexes.indexOf(active.value);
  const next =
    position < 0
      ? step === 1
        ? 0
        : indexes.length - 1
      : (position + step + indexes.length) % indexes.length;
  active.value = indexes[next]!;
  nextTick(() =>
    document
      .getElementById(itemId(active.value))
      ?.scrollIntoView?.({ block: "nearest" }),
  );
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Tab") {
    const controls = Array.from(
      document
        .getElementById(`${rootId}-dialog`)
        ?.querySelectorAll<HTMLElement>(
          'input:not([disabled]), button:not([disabled]):not([tabindex="-1"])',
        ) ?? [],
    );
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
    return;
  }
  if (event.key === "ArrowDown") move(1);
  else if (event.key === "ArrowUp") move(-1);
  else if (event.key === "Enter" && active.value >= 0)
    choose(active.value, event);
  else if (event.key === "Escape" && props.dismissible) close();
  else return;
  event.preventDefault();
}

function onBackdropClick(event: MouseEvent) {
  if (props.dismissible && event.target === event.currentTarget) close();
}

async function syncOpen(isOpen: boolean) {
  if (!mounted.value) return;
  if (isOpen) {
    opener = document.activeElement as HTMLElement | null;
    if (!locked) {
      lockScroll();
      locked = true;
    }
    syncActive();
    await nextTick();
    input.value?.focus();
  } else if (locked) {
    unlockScroll();
    locked = false;
    nextTick(
      () => opener?.isConnected && opener.focus({ preventScroll: true }),
    );
  }
}

watch(open, syncOpen, { flush: "post" });

onMounted(async () => {
  mounted.value = true;
  await nextTick();
  await syncOpen(open.value);
});

onBeforeUnmount(() => {
  if (locked) unlockScroll();
});
</script>

<template>
  <Teleport v-if="mounted" to="body">
    <Transition name="n-command-palette">
      <div
        v-if="open"
        :id="`${rootId}-dialog`"
        class="n-command-palette"
        role="dialog"
        aria-modal="true"
        :aria-label="label"
        @mousedown.self="onBackdropClick"
        @keydown="onKeydown"
      >
        <div class="n-command-palette-panel">
          <div class="n-command-palette-search">
            <NIcon
              name="i-lucide-search"
              class="n-command-palette-search-icon"
            />
            <input
              ref="input"
              v-model="search"
              class="n-command-palette-input"
              type="search"
              autocomplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              :aria-label="placeholder"
              :aria-controls="`${rootId}-list`"
              :aria-expanded="open ? 'true' : 'false'"
              :aria-activedescendant="active >= 0 ? itemId(active) : undefined"
              :placeholder="placeholder"
            />
            <button
              class="n-command-palette-close"
              type="button"
              :aria-label="closeLabel"
              @click="close"
            >
              <span class="n-command-palette-shortcut">Esc</span>
            </button>
          </div>

          <div
            :id="`${rootId}-list`"
            ref="list"
            class="n-command-palette-list"
            role="listbox"
            :aria-label="label"
          >
            <template
              v-for="(group, groupIndex) in groups"
              :key="group.label ?? groupIndex"
            >
              <p v-if="group.label" class="n-command-palette-group">
                {{ group.label }}
              </p>
              <button
                v-for="item in group.items"
                :id="itemId(flat.indexOf(item))"
                :key="item.value ?? item.label"
                class="n-command-palette-item"
                role="option"
                type="button"
                tabindex="-1"
                :aria-selected="
                  active === flat.indexOf(item) ? 'true' : 'false'
                "
                :aria-disabled="item.disabled ? 'true' : undefined"
                :data-active="active === flat.indexOf(item) ? '' : undefined"
                :disabled="item.disabled"
                @mouseenter="!item.disabled && (active = flat.indexOf(item))"
                @click="choose(flat.indexOf(item), $event)"
              >
                <slot
                  name="item"
                  :item="item"
                  :active="active === flat.indexOf(item)"
                >
                  <NIcon
                    v-if="item.icon"
                    :name="item.icon"
                    class="n-command-palette-item-icon"
                  />
                  <span class="n-command-palette-item-copy">
                    <span class="n-command-palette-item-label">{{
                      item.label
                    }}</span>
                    <span
                      v-if="item.description"
                      class="n-command-palette-item-description"
                    >
                      {{ item.description }}
                    </span>
                  </span>
                  <span
                    v-if="item.shortcut"
                    class="n-command-palette-item-shortcut"
                  >
                    {{ item.shortcut }}
                  </span>
                </slot>
              </button>
            </template>
            <div v-if="!flat.length" class="n-command-palette-empty">
              <slot name="empty">
                <NEmptyState
                  size="sm"
                  icon="i-lucide-search-x"
                  :title="emptyTitle"
                  :description="emptyDescription"
                />
              </slot>
            </div>
          </div>
          <div class="n-command-palette-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
