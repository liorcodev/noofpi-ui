<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  ref,
  useId,
  watch,
  type PropType,
} from "vue";
import type { DateRange, FilterBarFilter, FilterBarOption } from "../types";
import NCalendar from "../components/NCalendar.vue";
import NCheckbox from "../components/NCheckbox.vue";
import NIcon from "../components/NIcon.vue";
import NInput from "../components/NInput.vue";
import NNumberInput from "../components/NNumberInput.vue";
import NRadioGroup from "../components/NRadioGroup.vue";

// The editor of one filter of `NFilterBar`: the panel and the chips' popovers both render it

defineOptions({ name: "FilterBarEditor" });

const props = defineProps({
  filter: { type: Object as PropType<FilterBarFilter>, required: true },
  yesLabel: { type: String, default: "Yes" },
  noLabel: { type: String, default: "No" },
});

/** `undefined` removes the filter */
const model = defineModel<unknown>();

const set = (value: unknown) => (model.value = value);

const name = `n-filter-bar-${useId()}`;
const options = computed(() => props.filter.options ?? []);

const selected = computed<unknown[]>(() =>
  Array.isArray(model.value) ? model.value : [],
);

function toggle(option: FilterBarOption, on: boolean) {
  const rest = selected.value.filter((value) => value !== option.value);
  set(on ? [...selected.value, option.value] : rest);
}

// Text and date ranges are only applied once they are finished: Enter, leaving the field, a complete range
const text = ref(typeof model.value === "string" ? model.value : "");
const range = ref<DateRange>(asRange(model.value));

function asRange(value: unknown): DateRange {
  const { start = null, end = null } = (value ?? {}) as Partial<DateRange>;
  return { start, end };
}

// The last text sent up, so Enter followed by the field's `change` doesn't send it twice
let sent = text.value;

watch(
  () => model.value,
  (value) => {
    text.value = sent = typeof value === "string" ? value : "";
    range.value = asRange(value);
  },
);

function commitText() {
  const value = text.value.trim();
  if (value === sent) return;
  sent = value;
  set(value || undefined);
}

// The popover closing unmounts the editor: what was typed isn't lost
onBeforeUnmount(() => {
  if (props.filter.type === "text") commitText();
});

function onRange(value: string | DateRange | null | undefined) {
  range.value = asRange(value);
  if (range.value.start && range.value.end) {
    set({ ...range.value });
  }
}

const bound = (value: number | string | undefined) =>
  value === undefined || value === "" ? undefined : Number(value);

const booleanItems = computed(() => [
  { label: props.yesLabel, value: true },
  { label: props.noLabel, value: false },
]);
</script>

<template>
  <div class="n-filter-bar-editor" role="group" :aria-label="filter.label">
    <slot name="custom">
      <fieldset
        v-if="filter.type === 'select'"
        class="n-filter-bar-options"
        role="radiogroup"
      >
        <label
          v-for="option in options"
          :key="String(option.value)"
          class="n-checkbox n-filter-bar-option"
        >
          <input
            class="n-checkbox-input"
            type="radio"
            :name="name"
            :checked="model === option.value"
            @change="set(option.value)"
          />
          <span class="n-checkbox-label n-filter-bar-option-label">
            <NIcon v-if="option.icon" :name="option.icon" />
            <span
              v-else-if="option.color"
              class="n-filter-bar-dot"
              :data-color="option.color"
              aria-hidden="true"
            />
            {{ option.label }}
          </span>
        </label>
      </fieldset>

      <fieldset
        v-else-if="filter.type === 'multiselect'"
        class="n-filter-bar-options"
      >
        <NCheckbox
          v-for="option in options"
          :key="String(option.value)"
          class="n-filter-bar-option"
          :model-value="selected.includes(option.value)"
          @update:model-value="toggle(option, Boolean($event))"
        >
          <span class="n-filter-bar-option-label">
            <NIcon v-if="option.icon" :name="option.icon" />
            <span
              v-else-if="option.color"
              class="n-filter-bar-dot"
              :data-color="option.color"
              aria-hidden="true"
            />
            {{ option.label }}
          </span>
        </NCheckbox>
      </fieldset>

      <NRadioGroup
        v-else-if="filter.type === 'boolean'"
        :model-value="model"
        :items="booleanItems"
        @update:model-value="set($event)"
      />

      <NCalendar
        v-else-if="filter.type === 'date'"
        :model-value="typeof model === 'string' ? model : null"
        :min="filter.min !== undefined ? String(filter.min) : undefined"
        :max="filter.max !== undefined ? String(filter.max) : undefined"
        :label="filter.label"
        @update:model-value="set($event || undefined)"
      />

      <NCalendar
        v-else-if="filter.type === 'daterange'"
        range
        :model-value="range"
        :min="filter.min !== undefined ? String(filter.min) : undefined"
        :max="filter.max !== undefined ? String(filter.max) : undefined"
        :label="filter.label"
        @update:model-value="onRange"
      />

      <NNumberInput
        v-else-if="filter.type === 'number'"
        :model-value="typeof model === 'number' ? model : undefined"
        :min="bound(filter.min)"
        :max="bound(filter.max)"
        :placeholder="filter.placeholder"
        :aria-label="filter.label"
        @update:model-value="set($event)"
      />

      <NInput
        v-else
        v-model="text"
        :placeholder="filter.placeholder"
        :aria-label="filter.label"
        autocomplete="off"
        @keydown.enter.prevent="commitText"
        @change="commitText"
      />
    </slot>
  </div>
</template>
