<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  type PropType,
} from "vue";
import FilterBarEditor from "../internal/FilterBarEditor.vue";
import type {
  DateRange,
  FilterBarFilter,
  FilterBarProps,
  FilterBarSort,
  FilterBarSortOption,
  FilterBarValue,
  FilterBarView,
  MenuItem,
} from "../types";
import { formatDate, parseISO } from "../utils/date";
import NButton from "./NButton.vue";
import NIcon from "./NIcon.vue";
import NInput from "./NInput.vue";
import NMenu from "./NMenu.vue";
import NPopover from "./NPopover.vue";

defineOptions({ name: "NFilterBar" });

const props = defineProps({
  /** The filters the user can set */
  filters: { type: Array as PropType<FilterBarFilter[]>, default: () => [] },
  /** Shows the search field */
  searchable: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: "Search…" },
  /** Milliseconds to wait after typing before the search reaches `v-model`. Enter and clearing apply it at once */
  debounce: { type: Number, default: 300 },
  /** The columns the user can sort by. Without them there is no sort menu */
  sortOptions: {
    type: Array as PropType<FilterBarSortOption[]>,
    default: () => [],
  },
  /** Saved views the user can switch to */
  views: { type: Array as PropType<FilterBarView[]>, default: () => [] },
  /** Lets the user save the current value as a view: the views menu gets a save item that emits `save-view` */
  saveable: { type: Boolean, default: false },
  /** Turns a filter's value into the text of its chip. Return `undefined` to use the default: option labels, `Intl` for dates and numbers */
  formatValue: {
    type: Function as PropType<FilterBarProps["formatValue"]>,
    default: undefined,
  },
  /** BCP 47 tag of the dates and numbers in the chips. Default: the browser's */
  locale: { type: String, default: undefined },
  /** Accessible name of the bar */
  label: { type: String, default: "Filter bar" },
  searchLabel: { type: String, default: "Search" },
  clearSearchLabel: { type: String, default: "Clear search" },
  filtersLabel: { type: String, default: "Filters" },
  clearLabel: { type: String, default: "Clear all" },
  resetLabel: { type: String, default: "Reset" },
  doneLabel: { type: String, default: "Done" },
  /** Start of the accessible name of a chip's remove button: "Remove filter: Status" */
  removeLabel: { type: String, default: "Remove filter" },
  sortLabel: { type: String, default: "Sort" },
  ascendingLabel: { type: String, default: "Ascending" },
  descendingLabel: { type: String, default: "Descending" },
  /** Item of the sort menu that removes the sorting */
  defaultSortLabel: { type: String, default: "Default order" },
  viewsLabel: { type: String, default: "Views" },
  saveViewLabel: { type: String, default: "Save current view" },
  yesLabel: { type: String, default: "Yes" },
  noLabel: { type: String, default: "No" },
  disabled: { type: Boolean, default: false },
});

/** The search, the filters and the sort. It is never mutated, a new object is emitted */
const model = defineModel<FilterBarValue | undefined>();
/** The `id` of the current view. It is cleared when the value is edited */
const view = defineModel<string | number | null>("view", { default: null });

const emit = defineEmits<{
  /** The search was applied: after the debounce, on Enter, or when it was cleared */
  search: [term: string];
  /** Clear all was used. `v-model` already holds the empty search and filters (the sort is kept) */
  clear: [];
  /** The save item of the views menu was used (`saveable`). Store the value and add it to `views` */
  "save-view": [value: FilterBarValue];
}>();

defineSlots<{
  /** Content before the search field */
  leading?: () => unknown;
  /** Content after the controls, e.g. a button that exports the list */
  trailing?: () => unknown;
  /** Buttons at the very end of the row, after `trailing` */
  actions?: () => unknown;
  /** Shown on the chips line while no filter is set, e.g. a hint */
  empty?: () => unknown;
  /** Replaces the content of a chip. `remove` takes the filter off */
  chip?: (props: {
    filter: FilterBarFilter;
    value: unknown;
    text: string;
    remove: () => void;
  }) => unknown;
  /** Replaces the value text of a chip, after its name */
  value?: (props: {
    filter: FilterBarFilter;
    value: unknown;
    text: string;
  }) => unknown;
  /** Replaces the editor of the filter with that `key`, in the filters panel and in its chip's popover. `update` sets the value, `undefined` removes the filter */
  [name: `filter-${string}`]: (props: {
    value: unknown;
    update: (value: unknown) => void;
    close: () => void;
  }) => unknown;
}>();

const current = computed<FilterBarValue>(() => ({
  search: model.value?.search ?? "",
  filters: model.value?.filters ?? {},
  sort: model.value?.sort ?? null,
}));

// --- Search -----------------------------------------------------------------------------------------------------

const searchText = ref(current.value.search);
let timer: ReturnType<typeof setTimeout> | undefined;

// A value from outside replaces the text, unless more was typed since (the new value is still on its way)
watch(
  () => current.value.search,
  (search) => {
    if (timer === undefined) searchText.value = search;
  },
);

function stopTimer() {
  clearTimeout(timer);
  timer = undefined;
}

onBeforeUnmount(stopTimer);

// What was emitted in this tick: `v-model` only catches up after it, and a second change in the same tick (a view being applied, two clicks) must build on the first
let latest: FilterBarValue | undefined;
const base = () => latest ?? current.value;

function emitValue(next: FilterBarValue) {
  latest = next;
  model.value = next;
  nextTick(() => (latest = undefined));
}

function update(patch: Partial<FilterBarValue>) {
  // Typing that is still waiting for its debounce goes along with any other change, or it would be lost
  const pending = timer !== undefined;
  if (pending) {
    stopTimer();
    emit("search", searchText.value);
  }
  emitValue({
    ...base(),
    ...(pending ? { search: searchText.value } : {}),
    ...patch,
  });
  view.value = null;
}

function applySearch(always = false) {
  stopTimer();
  const changed = searchText.value !== base().search;
  if (changed || always) emit("search", searchText.value);
  if (changed) update({ search: searchText.value });
}

function onSearchInput(value: string | number | undefined) {
  searchText.value = String(value ?? "");
  stopTimer();
  if (props.debounce <= 0) applySearch();
  else timer = setTimeout(applySearch, props.debounce);
}

function clearSearch() {
  searchText.value = "";
  applySearch();
}

// --- Filters ----------------------------------------------------------------------------------------------------

function isEmpty(value: unknown) {
  if (value === undefined || value === null || value === "") return true;
  if (typeof value === "number") return Number.isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    const { start, end } = value as Partial<DateRange>;
    return !start && !end;
  }
  return false;
}

function setFilter(key: string, value: unknown) {
  const filters = { ...base().filters };
  if (isEmpty(value)) delete filters[key];
  else filters[key] = value;
  update({ filters });
}

function format(filter: FilterBarFilter, value: unknown): string {
  const custom = props.formatValue?.(filter, value);
  if (custom !== undefined) return custom;
  const optionLabel = (item: unknown) =>
    filter.options?.find((option) => option.value === item)?.label ??
    String(item);
  const date = (iso: unknown) =>
    typeof iso === "string" && parseISO(iso)
      ? formatDate(iso, props.locale, { dateStyle: "medium" })
      : String(iso ?? "");

  switch (filter.type) {
    case "select":
      return optionLabel(value);
    case "multiselect":
      return (Array.isArray(value) ? value : [value])
        .map(optionLabel)
        .join(", ");
    case "boolean":
      return value ? props.yesLabel : props.noLabel;
    case "date":
      return date(value);
    case "daterange": {
      const { start, end } = value as DateRange;
      if (start && end && start !== end) return `${date(start)} – ${date(end)}`;
      return date(start || end);
    }
    case "number":
      return new Intl.NumberFormat(props.locale).format(Number(value));
    default:
      return String(value);
  }
}

const active = computed(() =>
  props.filters.flatMap((filter) => {
    const value = current.value.filters[filter.key];
    return isEmpty(value)
      ? []
      : [{ filter, value, text: format(filter, value) }];
  }),
);

function clearAll() {
  stopTimer();
  const hadSearch = searchText.value !== "";
  searchText.value = "";
  update({ search: "", filters: {} });
  if (hadSearch) emit("search", "");
  emit("clear");
}

// --- Sorting ----------------------------------------------------------------------------------------------------

const sortItems = computed<MenuItem[][]>(() => {
  const { sort } = current.value;
  const first = props.sortOptions[0];
  const groups: MenuItem[][] = [
    props.sortOptions.map((option) => ({
      label: option.label,
      color: sort?.key === option.key ? "primary" : undefined,
      shortcut: sort?.key === option.key ? "✓" : undefined,
      onSelect: () =>
        update({
          sort: { key: option.key, direction: sort?.direction ?? "asc" },
        }),
    })),
    (["asc", "desc"] as const).map((direction) => ({
      label: direction === "asc" ? props.ascendingLabel : props.descendingLabel,
      icon: direction === "asc" ? "i-lucide-arrow-up" : "i-lucide-arrow-down",
      color: sort?.direction === direction ? "primary" : undefined,
      shortcut: sort?.direction === direction ? "✓" : undefined,
      disabled: !sort && !first,
      onSelect: () =>
        update({ sort: { key: sort?.key ?? first!.key, direction } }),
    })),
  ];
  if (sort) {
    groups.push([
      {
        label: props.defaultSortLabel,
        icon: "i-lucide-x",
        onSelect: () => update({ sort: null }),
      },
    ]);
  }
  return groups;
});

const sortedBy = computed(() =>
  props.sortOptions.find((option) => option.key === current.value.sort?.key),
);

// --- Views ------------------------------------------------------------------------------------------------------

const snapshot = (value: FilterBarValue): FilterBarValue => ({
  search: value.search ?? "",
  filters: { ...value.filters },
  sort: value.sort ? { ...value.sort } : null,
});

function applyView(item: FilterBarView) {
  stopTimer();
  const next = snapshot(item.value);
  searchText.value = next.search;
  emitValue(next);
  view.value = item.id;
}

const currentView = computed(() =>
  props.views.find((item) => item.id === view.value),
);

const viewItems = computed<MenuItem[][]>(() => {
  const groups: MenuItem[][] = [];
  if (props.views.length) {
    groups.push(
      props.views.map((item) => ({
        label: item.label,
        icon: "i-lucide-bookmark",
        color: item.id === view.value ? "primary" : undefined,
        shortcut: item.id === view.value ? "✓" : undefined,
        onSelect: () => applyView(item),
      })),
    );
  }
  if (props.saveable) {
    groups.push([
      {
        label: props.saveViewLabel,
        icon: "i-lucide-bookmark-plus",
        onSelect: () =>
          emit(
            "save-view",
            snapshot({
              ...base(),
              search: timer === undefined ? base().search : searchText.value,
            }),
          ),
      },
    ]);
  }
  return groups;
});

const hasViews = computed(() => props.views.length > 0 || props.saveable);
</script>

<template>
  <div
    class="n-filter-bar"
    role="search"
    :aria-label="label"
    :data-disabled="disabled ? '' : undefined"
  >
    <div class="n-filter-bar-row">
      <slot name="leading" />

      <NInput
        v-if="searchable"
        class="n-filter-bar-search"
        icon="i-lucide-search"
        autocomplete="off"
        enterkeyhint="search"
        :model-value="searchText"
        :placeholder="searchPlaceholder"
        :aria-label="searchLabel"
        :disabled="disabled"
        @update:model-value="onSearchInput"
        @keydown.enter.prevent="applySearch(true)"
      >
        <template #trailing>
          <span class="n-filter-bar-search-end">
            <button
              v-if="searchText"
              type="button"
              class="n-filter-bar-search-clear"
              :aria-label="clearSearchLabel"
              :disabled="disabled"
              @click="clearSearch"
            >
              <NIcon name="i-lucide-x" />
            </button>
          </span>
        </template>
      </NInput>

      <NPopover
        v-if="filters.length"
        :label="filtersLabel"
        :disabled="disabled"
        max-width="24rem"
        :arrow="false"
      >
        <NButton
          class="n-filter-bar-filters"
          variant="outline"
          color="neutral"
          icon="i-lucide-list-filter"
          :label="filtersLabel"
          :disabled="disabled"
        >
          <template #trailing>
            <span v-if="active.length" class="n-filter-bar-count">
              {{ active.length }}
            </span>
          </template>
        </NButton>
        <template #content="{ close }">
          <div class="n-filter-bar-panel">
            <section
              v-for="filter in filters"
              :key="filter.key"
              class="n-filter-bar-section"
            >
              <div class="n-filter-bar-section-head">
                <span class="n-filter-bar-section-label">
                  <NIcon v-if="filter.icon" :name="filter.icon" />
                  {{ filter.label }}
                </span>
                <button
                  v-if="!isEmpty(current.filters[filter.key])"
                  type="button"
                  class="n-filter-bar-link"
                  @click="setFilter(filter.key, undefined)"
                >
                  {{ resetLabel }}
                </button>
              </div>
              <FilterBarEditor
                :filter="filter"
                :model-value="current.filters[filter.key]"
                :yes-label="yesLabel"
                :no-label="noLabel"
                @update:model-value="setFilter(filter.key, $event)"
              >
                <template v-if="$slots[`filter-${filter.key}`]" #custom>
                  <slot
                    :name="`filter-${filter.key}`"
                    :value="current.filters[filter.key]"
                    :update="(value: unknown) => setFilter(filter.key, value)"
                    :close="close"
                  />
                </template>
              </FilterBarEditor>
            </section>
            <div class="n-filter-bar-footer">
              <NButton
                size="sm"
                variant="ghost"
                color="neutral"
                :label="clearLabel"
                :disabled="!active.length"
                @click="clearAll"
              />
              <NButton size="sm" :label="doneLabel" @click="close()" />
            </div>
          </div>
        </template>
      </NPopover>

      <NMenu
        v-if="sortOptions.length"
        class="n-filter-bar-sort"
        placement="bottom-end"
        :items="sortItems"
        :label="sortLabel"
        :disabled="disabled"
      >
        <NButton
          variant="outline"
          color="neutral"
          :icon="
            current.sort?.direction === 'desc'
              ? 'i-lucide-arrow-down'
              : current.sort
                ? 'i-lucide-arrow-up'
                : 'i-lucide-arrow-up-down'
          "
          :label="sortedBy ? `${sortLabel}: ${sortedBy.label}` : sortLabel"
          :disabled="disabled"
        />
      </NMenu>

      <NMenu
        v-if="hasViews"
        class="n-filter-bar-views"
        placement="bottom-end"
        :items="viewItems"
        :label="viewsLabel"
        :disabled="disabled"
      >
        <NButton
          variant="outline"
          color="neutral"
          icon="i-lucide-bookmark"
          :label="currentView?.label ?? viewsLabel"
          :disabled="disabled"
        />
      </NMenu>

      <slot name="trailing" />
      <slot name="actions" />
    </div>

    <div
      v-if="active.length || $slots.empty"
      class="n-filter-bar-chips"
      :data-empty="active.length ? undefined : ''"
    >
      <template v-if="active.length">
        <ul class="n-filter-bar-chip-list" :aria-label="filtersLabel">
          <li
            v-for="item in active"
            :key="item.filter.key"
            class="n-filter-bar-chip"
            :data-filter="item.filter.key"
          >
            <slot
              name="chip"
              :filter="item.filter"
              :value="item.value"
              :text="item.text"
              :remove="() => setFilter(item.filter.key, undefined)"
            >
              <NPopover
                :label="item.filter.label"
                :disabled="disabled"
                max-width="24rem"
                :arrow="false"
              >
                <button
                  type="button"
                  class="n-filter-bar-chip-edit"
                  :disabled="disabled"
                >
                  <NIcon v-if="item.filter.icon" :name="item.filter.icon" />
                  <span class="n-filter-bar-chip-name">
                    {{ item.filter.label }}:
                  </span>
                  <span class="n-filter-bar-chip-value">
                    <slot
                      name="value"
                      :filter="item.filter"
                      :value="item.value"
                      :text="item.text"
                    >
                      {{ item.text }}
                    </slot>
                  </span>
                </button>
                <template #content="{ close }">
                  <div class="n-filter-bar-panel">
                    <FilterBarEditor
                      :filter="item.filter"
                      :model-value="item.value"
                      :yes-label="yesLabel"
                      :no-label="noLabel"
                      @update:model-value="setFilter(item.filter.key, $event)"
                    >
                      <template
                        v-if="$slots[`filter-${item.filter.key}`]"
                        #custom
                      >
                        <slot
                          :name="`filter-${item.filter.key}`"
                          :value="item.value"
                          :update="
                            (value: unknown) =>
                              setFilter(item.filter.key, value)
                          "
                          :close="close"
                        />
                      </template>
                    </FilterBarEditor>
                    <div class="n-filter-bar-footer">
                      <NButton
                        size="sm"
                        variant="ghost"
                        color="neutral"
                        :label="resetLabel"
                        @click="setFilter(item.filter.key, undefined)"
                      />
                      <NButton size="sm" :label="doneLabel" @click="close()" />
                    </div>
                  </div>
                </template>
              </NPopover>
              <button
                type="button"
                class="n-filter-bar-chip-remove"
                :aria-label="`${removeLabel}: ${item.filter.label}`"
                :disabled="disabled"
                @click="setFilter(item.filter.key, undefined)"
              >
                <NIcon name="i-lucide-x" />
              </button>
            </slot>
          </li>
        </ul>
        <button
          type="button"
          class="n-filter-bar-link n-filter-bar-clear"
          :disabled="disabled"
          @click="clearAll"
        >
          {{ clearLabel }}
        </button>
      </template>
      <slot v-else name="empty" />
    </div>
  </div>
</template>
