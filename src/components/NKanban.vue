<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  useId,
  watch,
  type PropType,
} from "vue";
import type {
  KanbanColumn,
  KanbanItem,
  KanbanLabels,
  KanbanMoveEvent,
  KanbanSize,
  KanbanVariant,
} from "../types";
import KanbanCardContent from "../internal/KanbanCardContent.vue";
import NBadge from "./NBadge.vue";
import NButton from "./NButton.vue";

defineOptions({ name: "NKanban" });

const props = defineProps({
  /** `"soft"` puts the columns on a tinted surface, `"outline"` draws them with a border */
  variant: { type: String as PropType<KanbanVariant>, default: "soft" },
  size: { type: String as PropType<KanbanSize>, default: "md" },
  /** Refuses drops into a column that has reached its `limit` */
  enforceLimit: { type: Boolean, default: false },
  /** Shows the built-in "Add card" button under every column, which emits `add` */
  addable: { type: Boolean, default: false },
  /** Shows a grip on each card. Touch screens drag by it, as the rest of the card scrolls the board */
  handle: { type: Boolean, default: true },
  /** Makes the board read-only: nothing can be moved or added */
  disabled: { type: Boolean, default: false },
  /** Accessible name of the board */
  label: { type: String, default: undefined },
  /** Text of the built-in add button */
  addLabel: { type: String, default: "Add card" },
  /** Shown in a column without cards */
  emptyLabel: { type: String, default: "No cards" },
  /** Overrides the screen reader texts. `{item}`, `{column}`, `{position}` and `{total}` are replaced */
  labels: { type: Object as PropType<KanbanLabels>, default: undefined },
});

const emit = defineEmits<{
  /** A card was dropped in another place. The model has already been updated */
  move: [event: KanbanMoveEvent];
  /** The built-in "Add card" button of a column was clicked */
  add: [column: KanbanColumn];
}>();

/** The columns and their cards (`v-model:columns`) */
const columnsModel = defineModel<KanbanColumn[] | undefined>("columns");
/** Same as `columns` for a plain `v-model` */
const valueModel = defineModel<KanbanColumn[] | undefined>();

defineSlots<{
  /** The content of a card (its handle and edge stay). `dragging` is `true` for the copy that follows the pointer */
  card?: (props: {
    item: KanbanItem;
    column: KanbanColumn;
    index: number;
    dragging: boolean;
  }) => unknown;
  /** Replaces the title and the count in a column's header */
  "column-header"?: (props: {
    column: KanbanColumn;
    count: number;
    exceeded: boolean;
  }) => unknown;
  /** Content under a column's cards, above the built-in add button */
  "column-footer"?: (props: { column: KanbanColumn }) => unknown;
  /** Shown in a column without cards */
  empty?: (props: { column: KanbanColumn }) => unknown;
}>();

const DEFAULT_LABELS: Required<KanbanLabels> = {
  hint: "Press Space or Enter to pick up this card",
  lift: "Picked up {item}, position {position} of {total} in {column}. Use the arrow keys to move it, Space to drop it and Escape to cancel.",
  move: "{column}, position {position} of {total}",
  drop: "Dropped {item}, position {position} of {total} in {column}",
  cancel:
    "Move cancelled, {item} is back in {column}, position {position} of {total}",
  refused: "{column} is full",
};

// A press that starts on one of these belongs to it, unless it starts on the grip
const NO_DRAG = "button, a, input, textarea, select, label, [contenteditable]";
const THRESHOLD = 4;
const EDGE = 56;

interface Lift {
  id: KanbanItem["id"];
  column: number;
  index: number;
  mode: "pointer" | "keyboard";
}
interface Slot {
  column: number;
  index: number;
}

const uid = useId();
const hintId = `n-kanban-hint-${uid}`;
const root = ref<HTMLElement>();
const scroller = ref<HTMLElement>();

const board = computed(() => columnsModel.value ?? valueModel.value ?? []);
const lift = ref<Lift | null>(null);
// Where the lifted card would land: its column and its index among the cards that stay
const target = ref<Slot | null>(null);
const ghost = ref<{
  item: KanbanItem;
  column: KanbanColumn;
  index: number;
  x: number;
  y: number;
  width: number;
} | null>(null);
const message = ref("");
const focusedId = ref<KanbanItem["id"]>();

function commit(next: KanbanColumn[]) {
  if (columnsModel.value === undefined && valueModel.value !== undefined)
    valueModel.value = next;
  else columnsModel.value = next;
}

const isLocked = (column: KanbanColumn, item: KanbanItem) =>
  props.disabled || Boolean(column.disabled) || Boolean(item.disabled);

const tabStopId = computed(() => {
  const items = board.value.flatMap((column) => column.items);
  const focused = items.find((item) => item.id === focusedId.value);
  return (focused ?? items[0])?.id;
});

const liftedItem = computed(() => {
  const l = lift.value;
  return l ? board.value[l.column]?.items[l.index] : undefined;
});

const refused = computed(() =>
  target.value ? !canDrop(target.value.column) : false,
);

// The index in `items` the drop indicator goes before; `items.length` is the end
const indicator = computed(() => {
  const l = lift.value;
  const t = target.value;
  if (!l || !t || refused.value) return null;
  const items = board.value[t.column]?.items ?? [];
  if (t.column === l.column && t.index === l.index) return null;
  const staying = items.flatMap((_, i) =>
    t.column === l.column && i === l.index ? [] : [i],
  );
  return { column: t.column, before: staying[t.index] ?? items.length };
});

function text(key: keyof KanbanLabels, vars: Record<string, string | number>) {
  const template = props.labels?.[key] ?? DEFAULT_LABELS[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

function announce(
  key: keyof KanbanLabels,
  item: KanbanItem,
  slot: Slot,
  total?: number,
) {
  const column = board.value[slot.column];
  message.value = text(key, {
    item: item.title,
    column: column?.title ?? "",
    position: slot.index + 1,
    total: total ?? column?.items.length ?? 0,
  });
}

// How many cards a column holds while the lifted one is out of it
function staying(columnIndex: number) {
  const count = board.value[columnIndex]?.items.length ?? 0;
  return lift.value?.column === columnIndex ? count - 1 : count;
}

function canLift(column: KanbanColumn, item: KanbanItem) {
  return !isLocked(column, item);
}

function canDrop(columnIndex: number) {
  const l = lift.value;
  const column = board.value[columnIndex];
  if (!l || !column || column.disabled) return false;
  if (columnIndex === l.column) return true;
  return (
    !props.enforceLimit ||
    column.limit === undefined ||
    column.items.length < column.limit
  );
}

function isRtl() {
  return root.value ? getComputedStyle(root.value).direction === "rtl" : false;
}

function cards() {
  return Array.from(
    root.value?.querySelectorAll<HTMLElement>("[data-item-id]") ?? [],
  );
}

function focusItem(id: KanbanItem["id"]) {
  cards()
    .find((card) => card.dataset.itemId === String(id))
    ?.focus();
}

// --- Moving ------------------------------------------------------------------------------------------------------
function startLift(
  columnIndex: number,
  index: number,
  mode: Lift["mode"],
): Lift | null {
  const column = board.value[columnIndex];
  const item = column?.items[index];
  if (!column || !item || lift.value || !canLift(column, item)) return null;
  lift.value = { id: item.id, column: columnIndex, index, mode };
  target.value = { column: columnIndex, index };
  return lift.value;
}

function endLift() {
  lift.value = null;
  target.value = null;
  ghost.value = null;
  stopPointer();
}

function cancel() {
  const l = lift.value;
  const item = liftedItem.value;
  if (!l || !item) return endLift();
  const keyboard = l.mode === "keyboard";
  endLift();
  if (keyboard)
    announce(
      "cancel",
      item,
      { column: l.column, index: l.index },
      board.value[l.column]?.items.length,
    );
}

function drop() {
  const l = lift.value;
  const t = target.value;
  const item = liftedItem.value;
  if (!l || !item) return endLift();
  const keyboard = l.mode === "keyboard";
  const accepted = t !== null && canDrop(t.column);
  const columns = board.value;
  endLift();

  if (!t || !accepted) {
    if (keyboard)
      announce("cancel", item, { column: l.column, index: l.index });
    return;
  }
  const from = columns[l.column]!;
  const to = columns[t.column]!;
  if (t.column === l.column && t.index === l.index) {
    if (keyboard) announce("drop", item, t);
    return;
  }

  const next = columns.map((column) => ({ ...column }));
  const source = [...from.items];
  source.splice(l.index, 1);
  if (t.column === l.column) {
    source.splice(t.index, 0, item);
    next[l.column]!.items = source;
  } else {
    const destination = [...to.items];
    destination.splice(t.index, 0, item);
    next[l.column]!.items = source;
    next[t.column]!.items = destination;
  }
  commit(next);
  emit("move", {
    item,
    from: { column: from.id, index: l.index },
    to: { column: to.id, index: t.index },
  });
  message.value = text("drop", {
    item: item.title,
    column: to.title,
    position: t.index + 1,
    total: next[t.column]!.items.length,
  });
  if (keyboard) nextTick(() => focusItem(item.id));
}

watch(board, () => {
  const l = lift.value;
  if (l && board.value[l.column]?.items[l.index]?.id !== l.id) endLift();
});
watch(
  () => props.disabled,
  (disabled) => disabled && cancel(),
);

// --- Keyboard ----------------------------------------------------------------------------------------------------
function moveTarget(slot: Slot, item: KanbanItem) {
  target.value = slot;
  announce("move", item, slot, staying(slot.column) + 1);
}

function onKeydown(event: KeyboardEvent, columnIndex: number, index: number) {
  if (event.target !== event.currentTarget || event.altKey || event.ctrlKey)
    return;
  const l = lift.value;
  const t = target.value;
  const horizontal = isRtl() ? -1 : 1;
  const columns = board.value;
  const item = columns[columnIndex]!.items[index]!;

  if (l) {
    if (l.mode !== "keyboard" || !t || item.id !== l.id) {
      if (event.key === "Escape") cancel();
      return;
    }
    const last = staying(t.column);
    const goTo = (index: number) => {
      const clamped = Math.min(Math.max(index, 0), last);
      if (clamped !== t.index)
        moveTarget({ column: t.column, index: clamped }, item);
    };
    let handled = true;
    if (event.key === "ArrowUp") goTo(t.index - 1);
    else if (event.key === "ArrowDown") goTo(t.index + 1);
    else if (event.key === "Home") goTo(0);
    else if (event.key === "End") goTo(last);
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const step = event.key === "ArrowRight" ? horizontal : -horizontal;
      let c = t.column + step;
      while (c >= 0 && c < columns.length && !canDrop(c)) c += step;
      if (c >= 0 && c < columns.length)
        moveTarget({ column: c, index: Math.min(t.index, staying(c)) }, item);
      else if (columns[t.column + step])
        message.value = text("refused", {
          item: item.title,
          column: columns[t.column + step]!.title,
          position: t.index + 1,
          total: staying(t.column) + 1,
        });
    } else if (event.key === "Enter" || event.key === " ") drop();
    else if (event.key === "Escape") cancel();
    else handled = false;
    if (handled) event.preventDefault();
    return;
  }

  const column = columns[columnIndex]!;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (startLift(columnIndex, index, "keyboard"))
      announce(
        "lift",
        item,
        { column: columnIndex, index },
        column.items.length,
      );
    return;
  }

  let next: KanbanItem | undefined;
  if (event.key === "ArrowUp") next = column.items[index - 1];
  else if (event.key === "ArrowDown") next = column.items[index + 1];
  else if (event.key === "Home") next = column.items[0];
  else if (event.key === "End") next = column.items[column.items.length - 1];
  else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    const step = event.key === "ArrowRight" ? horizontal : -horizontal;
    for (let c = columnIndex + step; columns[c]; c += step) {
      const items = columns[c]!.items;
      if (items.length) {
        next = items[Math.min(index, items.length - 1)];
        break;
      }
    }
  } else return;
  event.preventDefault();
  if (next) focusItem(next.id);
}

function onFocusout(event: FocusEvent) {
  const card = event.currentTarget as HTMLElement;
  if (
    lift.value?.mode === "keyboard" &&
    !card.contains(event.relatedTarget as Node | null)
  )
    cancel();
}

// --- Pointer -----------------------------------------------------------------------------------------------------
interface Pending {
  pointerId: number;
  startX: number;
  startY: number;
  column: number;
  index: number;
  offsetX: number;
  offsetY: number;
  width: number;
}

let pending: Pending | null = null;
let pointer = { x: 0, y: 0 };
let frame = 0;
let suppressClick = false;

function onPointerdown(
  event: PointerEvent,
  columnIndex: number,
  index: number,
) {
  const column = board.value[columnIndex];
  const item = column?.items[index];
  if (!column || !item || lift.value || pending) return;
  if (event.button !== 0 || event.isPrimary === false) return;
  if (!canLift(column, item)) return;

  const card = event.currentTarget as HTMLElement;
  const origin = event.target as Element;
  const inner = origin.closest(NO_DRAG);
  if (
    inner &&
    inner !== card &&
    card.contains(inner) &&
    !origin.closest(".n-kanban-handle")
  )
    return;

  const rect = card.getBoundingClientRect();
  pending = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    column: columnIndex,
    index,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    width: rect.width,
  };
  pointer = { x: event.clientX, y: event.clientY };
  window.addEventListener("pointermove", onPointermove, { passive: false });
  window.addEventListener("pointerup", onPointerup);
  window.addEventListener("pointercancel", onPointercancel);
  window.addEventListener("keydown", onWindowKeydown);
}

function stopPointer() {
  if (typeof window === "undefined") return;
  window.removeEventListener("pointermove", onPointermove);
  window.removeEventListener("pointerup", onPointerup);
  window.removeEventListener("pointercancel", onPointercancel);
  window.removeEventListener("keydown", onWindowKeydown);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  if (suppressClick) setTimeout(() => (suppressClick = false));
  pending = null;
}

function onPointermove(event: PointerEvent) {
  if (!pending || event.pointerId !== pending.pointerId) return;
  pointer = { x: event.clientX, y: event.clientY };
  if (!lift.value) {
    if (
      Math.hypot(pointer.x - pending.startX, pointer.y - pending.startY) <
      THRESHOLD
    )
      return;
    const l = startLift(pending.column, pending.index, "pointer");
    if (!l) return stopPointer();
    suppressClick = true;
    window.getSelection?.()?.removeAllRanges();
    ghost.value = {
      item: liftedItem.value!,
      column: board.value[l.column]!,
      index: l.index,
      x: 0,
      y: 0,
      width: pending.width,
    };
    frame = requestAnimationFrame(autoScroll);
  }
  event.preventDefault();
  if (ghost.value) {
    ghost.value.x = pointer.x - pending.offsetX;
    ghost.value.y = pointer.y - pending.offsetY;
  }
  updateTarget();
}

function onPointerup(event: PointerEvent) {
  if (!pending || event.pointerId !== pending.pointerId) return;
  if (lift.value) drop();
  else stopPointer();
}

function onPointercancel(event: PointerEvent) {
  if (!pending || event.pointerId !== pending.pointerId) return;
  if (lift.value) cancel();
  else stopPointer();
}

function onWindowKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape" || !lift.value) return;
  event.preventDefault();
  cancel();
}

function onClickCapture(event: MouseEvent) {
  if (!suppressClick) return;
  event.stopPropagation();
  event.preventDefault();
}

function locate(x: number, y: number): Slot | null {
  const area = scroller.value?.getBoundingClientRect();
  const elements = Array.from(
    root.value?.querySelectorAll<HTMLElement>(".n-kanban-column") ?? [],
  );
  if (!area || !elements.length) return null;
  if (x < area.left || x > area.right || y < area.top || y > area.bottom)
    return null;

  let column = 0;
  let distance = Infinity;
  elements.forEach((element, i) => {
    const rect = element.getBoundingClientRect();
    const gap = Math.max(rect.left - x, x - rect.right, 0);
    if (gap < distance) {
      distance = gap;
      column = i;
    }
  });
  const inColumn = Array.from(
    elements[column]!.querySelectorAll<HTMLElement>(
      "[data-item-id]:not([data-dragging])",
    ),
  );
  const index = inColumn.filter((card) => {
    const rect = card.getBoundingClientRect();
    return y > rect.top + rect.height / 2;
  }).length;
  return { column, index };
}

function updateTarget() {
  const next = locate(pointer.x, pointer.y);
  const current = target.value;
  if (next?.column === current?.column && next?.index === current?.index)
    return;
  target.value = next;
}

const edgeSpeed = (toStart: number, toEnd: number) => {
  const speed = (near: number) =>
    Math.ceil((Math.min(EDGE, EDGE - Math.max(near, 0)) / EDGE) * 16);
  if (toStart < EDGE) return -speed(toStart);
  if (toEnd < EDGE) return speed(toEnd);
  return 0;
};

// Scrolls the board, or the column under the pointer, while a card is held near its edge
function autoScroll() {
  frame = 0;
  if (lift.value?.mode !== "pointer") return;
  let moved = false;
  const area = scroller.value;
  if (area) {
    const rect = area.getBoundingClientRect();
    const dx = edgeSpeed(pointer.x - rect.left, rect.right - pointer.x);
    if (dx) {
      const before = area.scrollLeft;
      area.scrollLeft += dx;
      moved = area.scrollLeft !== before;
    }
  }
  const body =
    target.value &&
    root.value?.querySelectorAll<HTMLElement>(".n-kanban-body")[
      target.value.column
    ];
  if (body) {
    const rect = body.getBoundingClientRect();
    const dy = edgeSpeed(pointer.y - rect.top, rect.bottom - pointer.y);
    if (dy) {
      const before = body.scrollTop;
      body.scrollTop += dy;
      moved ||= body.scrollTop !== before;
    }
  }
  if (moved) updateTarget();
  frame = requestAnimationFrame(autoScroll);
}

onBeforeUnmount(stopPointer);

const hint = computed(() => text("hint", {}));
</script>

<template>
  <div
    ref="root"
    class="n-kanban"
    role="group"
    :aria-label="label"
    :data-variant="variant"
    :data-size="size"
    :data-disabled="disabled ? '' : undefined"
    :data-dragging="lift?.mode === 'pointer' ? '' : undefined"
  >
    <div ref="scroller" class="n-kanban-scroller">
      <div
        v-for="(column, columnIndex) in board"
        :key="column.id"
        class="n-kanban-column"
        role="group"
        :aria-label="column.title"
        :data-color="column.color"
        :data-exceeded="
          column.limit !== undefined && column.items.length > column.limit
            ? ''
            : undefined
        "
        :data-disabled="column.disabled ? '' : undefined"
        :data-over="
          target?.column === columnIndex && lift && !refused ? '' : undefined
        "
        :data-refused="
          target?.column === columnIndex && lift && refused ? '' : undefined
        "
      >
        <div class="n-kanban-header">
          <slot
            name="column-header"
            :column="column"
            :count="column.items.length"
            :exceeded="
              column.limit !== undefined && column.items.length > column.limit
            "
          >
            <span v-if="column.color" class="n-kanban-dot" aria-hidden="true" />
            <h3 class="n-kanban-title">{{ column.title }}</h3>
            <NBadge
              class="n-kanban-count"
              size="sm"
              variant="soft"
              pill
              :color="
                column.limit !== undefined && column.items.length > column.limit
                  ? 'error'
                  : 'neutral'
              "
              :label="
                column.limit === undefined
                  ? column.items.length
                  : `${column.items.length}/${column.limit}`
              "
            />
          </slot>
        </div>

        <div class="n-kanban-body">
          <ul class="n-kanban-list">
            <template v-for="(item, index) in column.items" :key="item.id">
              <li
                v-if="
                  indicator &&
                  indicator.column === columnIndex &&
                  indicator.before === index
                "
                class="n-kanban-indicator"
                aria-hidden="true"
              />
              <li
                class="n-kanban-card"
                :tabindex="tabStopId === item.id ? 0 : -1"
                :aria-describedby="isLocked(column, item) ? undefined : hintId"
                :aria-disabled="isLocked(column, item) ? 'true' : undefined"
                :data-item-id="item.id"
                :data-color="item.color"
                :data-draggable="isLocked(column, item) ? undefined : ''"
                :data-dragging="
                  lift?.mode === 'pointer' && lift.id === item.id
                    ? ''
                    : undefined
                "
                :data-lifted="
                  lift?.mode === 'keyboard' && lift.id === item.id
                    ? ''
                    : undefined
                "
                @pointerdown="onPointerdown($event, columnIndex, index)"
                @keydown="onKeydown($event, columnIndex, index)"
                @focusin="focusedId = item.id"
                @focusout="onFocusout"
                @click.capture="onClickCapture"
                @dragstart.prevent
              >
                <span
                  v-if="handle && !isLocked(column, item)"
                  class="n-kanban-handle"
                  aria-hidden="true"
                >
                  <span class="n-kanban-handle-icon i-lucide-grip-vertical" />
                </span>
                <div class="n-kanban-card-body">
                  <slot
                    name="card"
                    :item="item"
                    :column="column"
                    :index="index"
                    :dragging="false"
                  >
                    <KanbanCardContent :item="item" />
                  </slot>
                </div>
              </li>
            </template>
            <li
              v-if="
                indicator &&
                indicator.column === columnIndex &&
                indicator.before >= column.items.length
              "
              class="n-kanban-indicator"
              aria-hidden="true"
            />
          </ul>
          <div
            v-if="!column.items.length && !(indicator?.column === columnIndex)"
            class="n-kanban-empty"
          >
            <slot name="empty" :column="column">{{ emptyLabel }}</slot>
          </div>
        </div>

        <div v-if="$slots['column-footer'] || addable" class="n-kanban-footer">
          <slot name="column-footer" :column="column" />
          <NButton
            v-if="addable"
            variant="ghost"
            color="neutral"
            size="sm"
            block
            icon="i-lucide-plus"
            :label="addLabel"
            :disabled="disabled || column.disabled"
            @click="emit('add', column)"
          />
        </div>
      </div>
    </div>

    <div
      v-if="ghost"
      class="n-kanban-ghost"
      aria-hidden="true"
      :style="{
        width: `${ghost.width}px`,
        transform: `translate(${ghost.x}px, ${ghost.y}px)`,
      }"
    >
      <div class="n-kanban-card" data-ghost :data-color="ghost.item.color">
        <span v-if="handle" class="n-kanban-handle">
          <span class="n-kanban-handle-icon i-lucide-grip-vertical" />
        </span>
        <div class="n-kanban-card-body">
          <slot
            name="card"
            :item="ghost.item"
            :column="ghost.column"
            :index="ghost.index"
            :dragging="true"
          >
            <KanbanCardContent :item="ghost.item" />
          </slot>
        </div>
      </div>
    </div>

    <p :id="hintId" class="n-kanban-sr">{{ hint }}</p>
    <div class="n-kanban-sr" role="status" aria-live="assertive">
      {{ message }}
    </div>
  </div>
</template>
