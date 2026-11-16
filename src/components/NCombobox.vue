<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
  type PropType,
} from "vue";
import { FIELD_KEY } from "../internal/form-context";
import type { SelectItem } from "../types";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NCombobox" });

const props = defineProps({
  items: { type: Array as PropType<readonly SelectItem[]>, required: true },
  /** Shown while the input is empty */
  placeholder: { type: String, default: undefined },
  /** Native `name`: a hidden input submits the selected value with a surrounding `<form>` */
  name: { type: String, default: undefined },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** Accessible name when there is no `NFormField` label */
  label: { type: String, default: undefined },
  /** Filters the options by label while typing. Turn it off to filter them yourself, e.g. from a server, with `v-model:search-term` */
  filter: { type: Boolean, default: true },
  /** Shows a button that clears the selection */
  clearable: { type: Boolean, default: false },
  /** Shown in the list when no option matches */
  emptyText: { type: String, default: "No results" },
  /** Accessible name of the clear button */
  clearLabel: { type: String, default: "Clear" },
});

const model = defineModel<unknown>();
/** What the user typed; empty again once the list closes */
const searchTerm = defineModel<string>("searchTerm", { default: "" });
const open = ref(false);
const active = ref(-1);
// True from the first keystroke until the list closes, so opening the list shows every option
const typing = ref(false);

const field = inject(FIELD_KEY, null);

defineSlots<{
  /** Replaces the content of each option */
  item?: (props: { item: SelectItem; selected: boolean }) => unknown;
}>();

const root = ref<HTMLElement>();
const input = ref<HTMLInputElement>();
const listbox = ref<HTMLElement>();
const baseId = useId();
const listId = `n-combobox-list-${baseId}`;
const optionId = (index: number) => `n-combobox-option-${baseId}-${index}`;

const selected = computed(() =>
  props.items.find((item) => item.value === model.value),
);

const shown = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  if (!props.filter || !typing.value || !term) return props.items;
  return props.items.filter((item) => item.label.toLowerCase().includes(term));
});

const text = computed(() =>
  typing.value ? searchTerm.value : (selected.value?.label ?? ""),
);

const isInvalid = computed(() => props.invalid || !!field?.invalid.value);

function enabledIndexes() {
  return shown.value.flatMap((item, index) => (item.disabled ? [] : [index]));
}

// Moves the active option by `step` among the enabled ones, wrapping around
function move(step: 1 | -1) {
  const indexes = enabledIndexes();
  if (!indexes.length) return;
  const position = indexes.indexOf(active.value);
  const next =
    position === -1
      ? step === 1
        ? 0
        : indexes.length - 1
      : (position + step + indexes.length) % indexes.length;
  active.value = indexes[next]!;
}

function show() {
  if (props.disabled || open.value) return;
  const index = shown.value.findIndex(
    (item) => item.value === model.value && !item.disabled,
  );
  active.value = index === -1 ? (enabledIndexes()[0] ?? -1) : index;
  open.value = true;
}

function close() {
  open.value = false;
  typing.value = false;
  searchTerm.value = "";
}

function choose(index: number) {
  const item = shown.value[index];
  if (!item || item.disabled) return;
  model.value = item.value;
  close();
  input.value?.focus();
}

function clear() {
  model.value = undefined;
  close();
  input.value?.focus();
}

function onInput(event: Event) {
  typing.value = true;
  searchTerm.value = (event.target as HTMLInputElement).value;
  show();
}

// The matches change while typing, so the active option goes back to the first enabled one
watch(shown, () => {
  if (open.value && typing.value) active.value = enabledIndexes()[0] ?? -1;
});

const side = ref<"bottom" | "top">("bottom");

// Opens upward when there's no room below and more room above
function fit() {
  const anchor = root.value?.getBoundingClientRect();
  const height = listbox.value?.offsetHeight;
  if (!anchor || !height) return;
  const below = window.innerHeight - anchor.bottom;
  side.value = below < height + 8 && anchor.top > below ? "top" : "bottom";
}

watch(open, async (isOpen) => {
  if (!isOpen) return;
  side.value = "bottom";
  await nextTick();
  fit();
});

watch([active, open], async () => {
  if (!open.value) return;
  await nextTick();
  document
    .getElementById(optionId(active.value))
    ?.scrollIntoView?.({ block: "nearest" });
});

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return;
  const { key } = event;

  if (!open.value) {
    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      show();
    }
    return;
  }

  if (key === "ArrowDown") move(1);
  else if (key === "ArrowUp") move(-1);
  else if (key === "Enter") choose(active.value);
  else if (key === "Escape") close();
  else if (key === "Tab") close();
  else return;
  if (key !== "Tab") event.preventDefault();
}

function onControlClick() {
  if (props.disabled) return;
  input.value?.focus();
  show();
}

function onPointerDown(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) close();
}

onMounted(() => document.addEventListener("pointerdown", onPointerDown));
onBeforeUnmount(() =>
  document.removeEventListener("pointerdown", onPointerDown),
);
</script>

<template>
  <div
    ref="root"
    class="n-select n-combobox"
    :data-open="open ? '' : undefined"
    :data-side="side"
    :data-disabled="disabled ? '' : undefined"
  >
    <div
      class="n-combobox-control"
      :data-invalid="isInvalid ? '' : undefined"
      :data-disabled="disabled ? '' : undefined"
      @click="onControlClick"
    >
      <input
        :id="field?.id"
        ref="input"
        class="n-combobox-input"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="open ? listId : undefined"
        :aria-activedescendant="
          open && active >= 0 ? optionId(active) : undefined
        "
        :aria-label="label"
        :aria-invalid="isInvalid ? 'true' : undefined"
        :aria-describedby="field?.describedBy.value"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="text"
        @input="onInput"
        @keydown="onKeydown"
      />
      <button
        v-if="clearable && selected && !disabled"
        type="button"
        class="n-combobox-clear"
        tabindex="-1"
        :aria-label="clearLabel"
        @mousedown.prevent
        @click.stop="clear"
      >
        <NIcon name="i-lucide-x" />
      </button>
      <NIcon name="i-lucide-chevron-down" class="n-select-chevron" />
    </div>
    <input
      v-if="name"
      type="hidden"
      :name="name"
      :value="selected ? String(selected.value) : ''"
      :disabled="disabled"
    />
    <Transition name="n-select">
      <ul
        v-if="open"
        :id="listId"
        ref="listbox"
        class="n-select-list"
        role="listbox"
        :aria-label="label"
        @mousedown.prevent
      >
        <li
          v-for="(item, index) in shown"
          :id="optionId(index)"
          :key="String(item.value)"
          class="n-select-option"
          role="option"
          :aria-selected="item.value === model ? 'true' : 'false'"
          :aria-disabled="item.disabled ? 'true' : undefined"
          :data-active="index === active ? '' : undefined"
          @click="choose(index)"
          @mouseenter="!item.disabled && (active = index)"
        >
          <slot name="item" :item="item" :selected="item.value === model">
            <NIcon v-if="item.icon" :name="item.icon" class="n-select-icon" />
            <span class="n-select-option-text">
              <span class="n-select-label">{{ item.label }}</span>
              <span v-if="item.description" class="n-select-description">{{
                item.description
              }}</span>
            </span>
          </slot>
          <NIcon
            v-if="item.value === model"
            name="i-lucide-check"
            class="n-select-check"
          />
        </li>
        <li v-if="!shown.length" class="n-combobox-empty" role="presentation">
          {{ emptyText }}
        </li>
      </ul>
    </Transition>
  </div>
</template>
