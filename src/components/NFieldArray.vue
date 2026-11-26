<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  provide,
  ref,
  toRaw,
  useId,
  type PropType,
} from "vue";
import { FIELD_KEY, FORM_KEY } from "../internal/form-context";
import type {
  ButtonIcon,
  ButtonSize,
  FieldArrayAlign,
  FieldArrayErrors,
  FieldArraySize,
  FieldArrayVariant,
  FormErrors,
} from "../types";
import NButton from "./NButton.vue";

defineOptions({ name: "NFieldArray" });

const props = defineProps({
  /** Accessible name of the group */
  label: { type: String, default: undefined },
  /** Path of the list in the surrounding `NForm`'s schema (`"contacts"`): the errors of `contacts.0.email` reach row 0 as `errors.email`. Row `n` is `"contacts.n"` in the slot's `name` */
  name: { type: String, default: undefined },
  /** Errors to show next to the rows, in addition to the `NForm`'s: an array by row, or an object by path (`"0.email"`) */
  errors: {
    type: [Array, Object] as PropType<FieldArrayErrors>,
    default: undefined,
  },
  /** What a new row starts with: a value (objects and arrays are cloned), or a function called for each new row */
  defaultItem: {
    type: null as unknown as PropType<unknown>,
    default: (): unknown => "",
  },
  /** Shows buttons that move a row up and down. Alt+ArrowUp and Alt+ArrowDown on a row's buttons do the same */
  sortable: { type: Boolean, default: false },
  /** Rows that can't be removed. The model is not padded up to it */
  min: { type: Number, default: 0 },
  /** Rows that can be added. No limit by default */
  max: { type: Number, default: undefined },
  addLabel: { type: String, default: "Add" },
  addIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-plus",
  },
  removeIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: "i-lucide-trash-2",
  },
  /** Name of the remove button, followed by the row's name (`"Remove Item 2"` with `itemLabel`) */
  removeLabel: { type: String, default: "Remove" },
  moveUpLabel: { type: String, default: "Move up" },
  moveDownLabel: { type: String, default: "Move down" },
  /** Names a row for screen readers */
  itemLabel: { type: String, default: "Item" },
  /** Shown next to the add button once `max` is reached */
  maxLabel: { type: String, default: undefined },
  variant: { type: String as PropType<FieldArrayVariant>, default: "plain" },
  size: { type: String as PropType<FieldArraySize>, default: "md" },
  /** Where the row's buttons sit next to its fields: with the first line, or in the middle */
  align: { type: String as PropType<FieldArrayAlign>, default: "start" },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  /** Disables the buttons and, as a `fieldset`, the native fields in the rows */
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits<{
  add: [item: unknown, index: number];
  remove: [item: unknown, index: number];
  move: [from: number, to: number];
}>();

const model = defineModel<unknown[]>({ default: () => [] });
const field = inject(FIELD_KEY, null);
const form = inject(FORM_KEY, null);
// The group carries the field's id and messages once, not the inputs in its rows
provide(FIELD_KEY, null);

const uid = `n-field-array-${useId()}`;
const root = ref<HTMLElement>();
const list = ref<HTMLElement>();
const addArea = ref<HTMLElement>();

// Row keys: objects keep theirs by identity, primitives by position and value, so
// inputs keep their state and focus when rows move or others are removed
let sequence = 0;
let keys: string[] = [];
let known: unknown[] = [];
const objectKeys = new WeakMap<object, string>();
const newKey = () => `${uid}-${sequence++}`;
const isObject = (value: unknown): value is object =>
  (typeof value === "object" && value !== null) || typeof value === "function";

function reconcile(items: readonly unknown[]) {
  const raw = items.map(toRaw);
  if (
    raw.length === known.length &&
    raw.every((value, i) => Object.is(value, known[i]))
  )
    return keys;

  const next: (string | undefined)[] = Array(raw.length).fill(undefined);
  const taken = new Set<number>();
  const used = new Set<string>();
  const take = (i: number, j: number) => {
    next[i] = keys[j];
    taken.add(j);
    used.add(keys[j]!);
  };
  raw.forEach((value, i) => {
    if (!isObject(value)) return;
    const key = objectKeys.get(value);
    if (key && !used.has(key)) {
      next[i] = key;
      used.add(key);
    }
  });
  const free = (j: number) => !taken.has(j) && !isObject(known[j]);
  raw.forEach((value, i) => {
    if (next[i] || isObject(value)) return;
    if (free(i) && Object.is(known[i], value)) take(i, i);
    else {
      const j = known.findIndex((old, k) => free(k) && Object.is(old, value));
      if (j >= 0) take(i, j);
    }
  });
  // A primitive edited from outside keeps its row
  raw.forEach((value, i) => {
    if (!next[i] && !isObject(value) && i < known.length && free(i)) take(i, i);
  });
  next.forEach((key, i) => {
    if (key) return;
    next[i] = newKey();
    if (isObject(raw[i])) objectKeys.set(raw[i] as object, next[i]!);
  });
  keys = next as string[];
  known = raw;
  return keys;
}

const rows = computed(() => {
  const items = model.value ?? [];
  const rowKeys = reconcile(items);
  return items.map((item, index) => ({ item, index, key: rowKeys[index]! }));
});

const count = computed(() => rows.value.length);
const atMax = computed(
  () => props.max !== undefined && count.value >= props.max,
);
const canAdd = computed(() => !props.disabled && !atMax.value);
const canRemove = computed(() => !props.disabled && count.value > props.min);

function commit(items: unknown[], nextKeys: string[]) {
  keys = nextKeys;
  known = items.map(toRaw);
  items.forEach((item, i) => {
    const value = toRaw(item);
    if (isObject(value)) objectKeys.set(value, nextKeys[i]!);
  });
  model.value = items;
}

const FOCUSABLE =
  'input:not([type="hidden"]), select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])';

function focusFirst(container: Element | null | undefined) {
  const target = Array.from(
    container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
  ).find((el) => !el.matches(":disabled"));
  target?.focus();
  return Boolean(target);
}

const rowAt = (index: number) => list.value?.children[index] ?? null;

function clone(value: unknown) {
  if (typeof value === "function") return (value as () => unknown)();
  if (!isObject(value)) return value;
  try {
    return structuredClone(toRaw(value));
  } catch {
    return value;
  }
}

function add(item?: unknown) {
  if (!canAdd.value) return;
  const value = item === undefined ? clone(props.defaultItem) : item;
  const index = count.value;
  commit([...(model.value ?? []), value], [...keys, newKey()]);
  emit("add", value, index);
  nextTick(() => {
    const row = rowAt(index);
    if (!focusFirst(row?.querySelector(".n-field-array-content")))
      focusFirst(row);
  });
}

function remove(index: number) {
  if (!canRemove.value || index < 0 || index >= count.value) return;
  const items = [...model.value];
  const [removed] = items.splice(index, 1);
  commit(
    items,
    keys.filter((_, i) => i !== index),
  );
  emit("remove", removed, index);
  nextTick(() => {
    if (!items.length) focusFirst(addArea.value);
    else focusFirst(rowAt(Math.min(index, items.length - 1)));
  });
}

function update(index: number, next: unknown) {
  if (index < 0 || index >= count.value) return;
  const items = [...model.value];
  items[index] = next;
  commit(items, [...keys]);
}

function move(from: number, to: number, action?: string) {
  if (props.disabled || from === to) return;
  if (from < 0 || from >= count.value || to < 0 || to >= count.value) return;
  const items = [...model.value];
  const order = [...keys];
  items.splice(to, 0, items.splice(from, 1)[0]);
  order.splice(to, 0, order.splice(from, 1)[0]!);
  commit(items, order);
  emit("move", from, to);
  // Moving a focused node in the DOM drops its focus, so put it back
  nextTick(() => {
    const row = rowAt(to);
    const wanted = [action, "up", "down"];
    for (const name of wanted) {
      const el = name
        ? row?.querySelector<HTMLElement>(`[data-action="${name}"]`)
        : null;
      if (el && !el.matches(":disabled")) return el.focus();
    }
    focusFirst(row);
  });
}

function onActionsKeydown(event: KeyboardEvent, index: number) {
  if (!props.sortable || props.disabled) return;
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const delta =
    event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
  if (!delta) return;
  event.preventDefault();
  const action = (event.target as HTMLElement)
    .closest<HTMLElement>("[data-action]")
    ?.getAttribute("data-action");
  move(index, index + delta, action ?? undefined);
}

// Messages by row ("" is the row itself) and for the whole list
const problems = computed(() => {
  const byRow = new Map<number, FormErrors>();
  const whole: string[] = [];
  const put = (index: number, key: string, messages: readonly string[]) => {
    const row = byRow.get(index) ?? {};
    const list = (row[key] ??= []);
    for (const message of messages)
      if (!list.includes(message)) list.push(message);
    byRow.set(index, row);
  };
  const route = (path: string, value: string | readonly string[]) => {
    const messages = typeof value === "string" ? [value] : value;
    if (path === "") {
      for (const message of messages)
        if (!whole.includes(message)) whole.push(message);
      return;
    }
    const match = /^(\d+)(?:\.(.+))?$/.exec(path);
    if (match) put(Number(match[1]), match[2] ?? "", messages);
  };

  const prefix = props.name ? `${props.name}.` : "";
  if (props.name) {
    for (const [path, messages] of Object.entries(form?.errors.value ?? {})) {
      if (path === props.name) route("", messages);
      else if (path.startsWith(prefix))
        route(path.slice(prefix.length), messages);
    }
  }

  const given = props.errors;
  if (Array.isArray(given)) {
    given.forEach((entry, index) => {
      if (!entry) return;
      if (typeof entry === "string" || Array.isArray(entry))
        put(index, "", typeof entry === "string" ? [entry] : entry);
      else
        for (const [key, messages] of Object.entries(entry))
          put(index, key, typeof messages === "string" ? [messages] : messages);
    });
  } else if (given) {
    for (const [path, messages] of Object.entries(given))
      route(
        props.name && path === props.name
          ? ""
          : prefix && path.startsWith(prefix)
            ? path.slice(prefix.length)
            : path,
        messages,
      );
  }
  return { byRow, whole };
});

const noErrors: FormErrors = {};
const errorsOf = (index: number) => problems.value.byRow.get(index) ?? noErrors;
const listError = computed(() => problems.value.whole[0]);
const isInvalid = computed(
  () =>
    props.invalid || Boolean(field?.invalid.value) || Boolean(listError.value),
);

const errorId = `${uid}-error`;
const hintId = `${uid}-hint`;
const describedBy = computed(() => {
  const ids = [
    field?.describedBy.value,
    listError.value ? errorId : "",
    atMax.value && props.maxLabel ? hintId : "",
  ].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
});

const buttonSize = computed<ButtonSize>(
  () => ({ sm: "xs", md: "sm", lg: "md" })[props.size] as ButtonSize,
);
const addSize = computed<ButtonSize>(() => props.size);
const rowName = (index: number) => `${props.itemLabel} ${index + 1}`;

function rowProps(row: (typeof rows.value)[number]) {
  return {
    item: row.item,
    index: row.index,
    key: row.key,
    name: props.name ? `${props.name}.${row.index}` : undefined,
    errors: errorsOf(row.index),
    disabled: props.disabled,
    update: (next: unknown) => update(row.index, next),
    remove: () => remove(row.index),
    move: (to: number) => move(row.index, to),
  };
}

defineExpose({
  add,
  remove,
  move: (from: number, to: number) => move(from, to),
  focus: () => focusFirst(root.value),
});
</script>

<template>
  <fieldset
    ref="root"
    class="n-field-array"
    :id="field?.id"
    :disabled="disabled"
    :aria-label="label"
    :aria-invalid="isInvalid ? 'true' : undefined"
    :aria-describedby="describedBy"
    :data-variant="variant"
    :data-size="size"
    :data-align="align"
    :data-disabled="disabled ? '' : undefined"
    :data-invalid="isInvalid ? '' : undefined"
  >
    <div v-if="$slots.header" class="n-field-array-header">
      <slot name="header" :add="add" :count="count" :disabled="!canAdd" />
    </div>

    <ul v-if="rows.length" ref="list" class="n-field-array-list" role="list">
      <li
        v-for="row in rows"
        :key="row.key"
        class="n-field-array-row"
        :data-invalid="Object.keys(errorsOf(row.index)).length ? '' : undefined"
      >
        <div class="n-field-array-content">
          <slot v-bind="rowProps(row)" />
        </div>
        <div
          class="n-field-array-actions"
          @keydown="onActionsKeydown($event, row.index)"
        >
          <slot name="row-actions" v-bind="rowProps(row)" />
          <template v-if="sortable">
            <NButton
              variant="ghost"
              color="neutral"
              :size="buttonSize"
              icon="i-lucide-chevron-up"
              data-action="up"
              :aria-label="`${moveUpLabel} ${rowName(row.index)}`"
              :disabled="disabled || row.index === 0"
              @click="move(row.index, row.index - 1, 'up')"
            />
            <NButton
              variant="ghost"
              color="neutral"
              :size="buttonSize"
              icon="i-lucide-chevron-down"
              data-action="down"
              :aria-label="`${moveDownLabel} ${rowName(row.index)}`"
              :disabled="disabled || row.index === count - 1"
              @click="move(row.index, row.index + 1, 'down')"
            />
          </template>
          <NButton
            variant="ghost"
            color="neutral"
            :size="buttonSize"
            :icon="removeIcon"
            data-action="remove"
            :aria-label="`${removeLabel} ${rowName(row.index)}`"
            :disabled="!canRemove"
            @click="remove(row.index)"
          />
        </div>
      </li>
    </ul>
    <div v-else-if="$slots.empty" class="n-field-array-empty">
      <slot name="empty" :add="add" :disabled="!canAdd" />
    </div>

    <p v-if="listError" :id="errorId" class="n-field-array-error" role="alert">
      {{ listError }}
    </p>

    <div class="n-field-array-footer">
      <div ref="addArea" class="n-field-array-add">
        <slot name="add" :add="add" :disabled="!canAdd">
          <NButton
            variant="outline"
            color="neutral"
            :size="addSize"
            :icon="addIcon"
            :label="addLabel"
            :disabled="!canAdd"
            @click="add()"
          />
        </slot>
      </div>
      <p v-if="atMax && maxLabel" :id="hintId" class="n-field-array-hint">
        {{ maxLabel }}
      </p>
      <slot name="footer" :add="add" :count="count" :disabled="!canAdd" />
    </div>
  </fieldset>
</template>
