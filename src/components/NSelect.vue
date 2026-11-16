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
import type { BadgeVariant, ButtonColor, SelectItem } from "../types";
import NBadge from "./NBadge.vue";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NSelect" });

const props = defineProps({
  items: { type: Array as PropType<readonly SelectItem[]>, required: true },
  /** Shown while nothing is selected */
  placeholder: { type: String, default: undefined },
  /** Native `name`: a hidden input submits the selected value with a surrounding `<form>` */
  name: { type: String, default: undefined },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** Accessible name when there is no `NFormField` label */
  label: { type: String, default: undefined },
  /** Several options can be selected: `v-model` is an array of values and the list stays open while picking */
  multiple: { type: Boolean, default: false },
  /** With `multiple`: shows the chosen options as badges (wrapping onto more lines) instead of comma-separated text */
  badges: { type: Boolean, default: false },
  badgeVariant: { type: String as PropType<BadgeVariant>, default: "subtle" },
  badgeColor: { type: String as PropType<ButtonColor>, default: "primary" },
});

const model = defineModel<unknown>();
const open = ref(false);
const active = ref(-1);

const field = inject(FIELD_KEY, null);

defineSlots<{
  /** Replaces the content of the trigger and of each option */
  item?: (props: { item: SelectItem; selected: boolean }) => unknown;
}>();

const root = ref<HTMLElement>();
const trigger = ref<HTMLElement>();
const listbox = ref<HTMLElement>();
const baseId = useId();
const listId = `n-select-list-${baseId}`;
const optionId = (index: number) => `n-select-option-${baseId}-${index}`;

const values = computed<unknown[]>(() =>
  props.multiple
    ? Array.isArray(model.value)
      ? model.value
      : []
    : [model.value],
);

const isSelected = (item: SelectItem) => values.value.includes(item.value);

const selectedItems = computed(() => props.items.filter(isSelected));
const selected = computed(() => selectedItems.value[0]);

const isInvalid = computed(() => props.invalid || !!field?.invalid.value);

function enabledIndexes() {
  return props.items.flatMap((item, index) => (item.disabled ? [] : [index]));
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
  const index = props.items.findIndex(
    (item) => isSelected(item) && !item.disabled,
  );
  active.value = index === -1 ? (enabledIndexes()[0] ?? -1) : index;
  open.value = true;
}

function close() {
  open.value = false;
}

function choose(index: number) {
  const item = props.items[index];
  if (!item || item.disabled) return;
  if (props.multiple) {
    model.value = isSelected(item)
      ? values.value.filter((value) => value !== item.value)
      : [...values.value, item.value];
    return;
  }
  model.value = item.value;
  close();
  trigger.value?.focus();
}

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

let typed = "";
let typedTimer: ReturnType<typeof setTimeout> | undefined;

function typeahead(char: string) {
  clearTimeout(typedTimer);
  typed += char.toLowerCase();
  typedTimer = setTimeout(() => (typed = ""), 500);
  // A first letter looks after the active option, so repeating it cycles through the matches
  const from =
    typed.length === 1 ? active.value + 1 : Math.max(active.value, 0);
  const count = props.items.length;
  for (let step = 0; step < count; step++) {
    const index = (from + step) % count;
    const item = props.items[index]!;
    if (item.disabled || !item.label.toLowerCase().startsWith(typed)) continue;
    if (!open.value) show();
    active.value = index;
    return;
  }
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return;
  const { key } = event;

  if (!open.value) {
    if (
      key === "ArrowDown" ||
      key === "ArrowUp" ||
      key === "Enter" ||
      key === " "
    ) {
      event.preventDefault();
      show();
    } else if (
      key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      typeahead(key);
    }
    return;
  }

  if (key === "ArrowDown") move(1);
  else if (key === "ArrowUp") move(-1);
  else if (key === "Home") active.value = enabledIndexes()[0] ?? -1;
  else if (key === "End") active.value = enabledIndexes().at(-1) ?? -1;
  else if (key === "Enter" || key === " ") choose(active.value);
  else if (key === "Escape") close();
  else if (key === "Tab") {
    close();
    return;
  } else if (
    key.length === 1 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  ) {
    typeahead(key);
    return;
  } else return;
  event.preventDefault();
}

function onPointerDown(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) close();
}

onMounted(() => document.addEventListener("pointerdown", onPointerDown));
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onPointerDown);
  clearTimeout(typedTimer);
});
</script>

<template>
  <div
    ref="root"
    class="n-select"
    :data-open="open ? '' : undefined"
    :data-side="side"
    :data-disabled="disabled ? '' : undefined"
  >
    <button
      :id="field?.id"
      ref="trigger"
      class="n-select-trigger"
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="open ? listId : undefined"
      :aria-activedescendant="
        open && active >= 0 ? optionId(active) : undefined
      "
      :aria-label="label"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="field?.describedBy.value"
      :disabled="disabled"
      :data-placeholder="selected ? undefined : ''"
      :data-badges="multiple && badges ? '' : undefined"
      @click="open ? close() : show()"
      @keydown="onKeydown"
    >
      <span class="n-select-value">
        <template v-if="multiple && badges && selected">
          <NBadge
            v-for="item in selectedItems"
            :key="String(item.value)"
            :label="item.label"
            :icon="item.icon"
            :variant="badgeVariant"
            :color="badgeColor"
            size="sm"
          />
        </template>
        <span v-else-if="multiple && selected" class="n-select-label">{{
          selectedItems.map((item) => item.label).join(", ")
        }}</span>
        <slot
          v-else-if="selected"
          name="item"
          :item="selected"
          :selected="true"
        >
          <NIcon
            v-if="selected.icon"
            :name="selected.icon"
            class="n-select-icon"
          />
          <span class="n-select-label">{{ selected.label }}</span>
        </slot>
        <span v-else class="n-select-label">{{ placeholder }}</span>
      </span>
      <NIcon name="i-lucide-chevron-down" class="n-select-chevron" />
    </button>
    <template v-if="name">
      <input
        v-for="item in multiple ? selectedItems : [selected ?? null]"
        :key="String(item?.value)"
        type="hidden"
        :name="name"
        :value="item ? String(item.value) : ''"
        :disabled="disabled"
      />
    </template>
    <Transition name="n-select">
      <ul
        v-if="open"
        :id="listId"
        ref="listbox"
        class="n-select-list"
        role="listbox"
        :aria-multiselectable="multiple ? 'true' : undefined"
        :aria-label="label"
        @mousedown.prevent
      >
        <li
          v-for="(item, index) in items"
          :id="optionId(index)"
          :key="String(item.value)"
          class="n-select-option"
          role="option"
          :aria-selected="isSelected(item) ? 'true' : 'false'"
          :aria-disabled="item.disabled ? 'true' : undefined"
          :data-active="index === active ? '' : undefined"
          @click="choose(index)"
          @mouseenter="!item.disabled && (active = index)"
        >
          <slot name="item" :item="item" :selected="isSelected(item)">
            <NIcon v-if="item.icon" :name="item.icon" class="n-select-icon" />
            <span class="n-select-option-text">
              <span class="n-select-label">{{ item.label }}</span>
              <span v-if="item.description" class="n-select-description">{{
                item.description
              }}</span>
            </span>
          </slot>
          <NIcon
            v-if="isSelected(item)"
            name="i-lucide-check"
            class="n-select-check"
          />
        </li>
      </ul>
    </Transition>
  </div>
</template>
