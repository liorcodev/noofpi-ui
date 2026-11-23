<script setup lang="ts">
import { computed, inject, ref, useTemplateRef, type PropType } from "vue";
import { FIELD_KEY } from "../internal/form-context";
import type { BadgeVariant, ButtonColor } from "../types";
import NBadge from "./NBadge.vue";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NTagsInput" });

const props = defineProps({
  /** Shown while there are no tags and nothing is typed */
  placeholder: { type: String, default: undefined },
  /** Native `name`: one hidden input per tag submits them with a surrounding `<form>` */
  name: { type: String, default: undefined },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** Accessible name when there is no `NFormField` label */
  label: { type: String, default: undefined },
  /** Maximum number of tags. Further ones are refused */
  max: { type: Number, default: undefined },
  /** Typing (or pasting) one of these characters ends a tag. `Enter` always does. Default: `[","]` */
  delimiters: {
    type: Array as PropType<readonly string[]>,
    default: () => [","],
  },
  /** Accept the same tag twice. Default: `false` */
  allowDuplicates: { type: Boolean, default: false },
  /** Turn the text left in the field into a tag when it loses focus. Default: `false` */
  addOnBlur: { type: Boolean, default: false },
  /** Return `false` to refuse a tag. A refused tag stays in the field */
  validate: {
    type: Function as PropType<(tag: string) => boolean>,
    default: undefined,
  },
  /** Default: `"subtle"` */
  variant: { type: String as PropType<BadgeVariant>, default: "subtle" },
  /** Default: `"primary"` */
  color: { type: String as PropType<ButtonColor>, default: "primary" },
  /** Prefix of the accessible name of a remove button, followed by the tag. Default: `"Remove"` */
  removeLabel: { type: String, default: "Remove" },
});

const model = defineModel<string[]>({ default: () => [] });
const field = inject(FIELD_KEY, null);
const input = useTemplateRef<HTMLInputElement>("input");
const draft = ref("");

const isInvalid = computed(() => props.invalid || field?.invalid.value);

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const splitter = computed(() => {
  const chars = props.delimiters.filter(Boolean).map(escape);
  return chars.length ? new RegExp(chars.join("|")) : null;
});

// Adds the tags it can in one update and returns the ones it refused (invalid, or no room left)
function commit(candidates: string[]) {
  const next = [...model.value];
  const refused: string[] = [];
  for (const raw of candidates) {
    const tag = raw.trim();
    if (!tag) continue;
    if (!props.allowDuplicates && next.includes(tag)) continue;
    if (
      (props.max !== undefined && next.length >= props.max) ||
      props.validate?.(tag) === false
    ) {
      refused.push(raw);
      continue;
    }
    next.push(tag);
  }
  if (next.length !== model.value.length) model.value = next;
  return refused;
}

function onInput(event: Event) {
  draft.value = (event.target as HTMLInputElement).value;
  if (!splitter.value?.test(draft.value)) return;
  const parts = draft.value.split(new RegExp(splitter.value, "g"));
  const rest = parts.pop() ?? "";
  // A refused tag stays in the field, in front of whatever follows the last delimiter
  draft.value = [...commit(parts), rest].join(props.delimiters[0] ?? "");
}

function flush() {
  draft.value = commit([draft.value]).join("");
}

function remove(index: number) {
  if (props.disabled) return;
  model.value = model.value.filter((_, i) => i !== index);
  input.value?.focus();
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return;
  if (event.key === "Enter") {
    // Keeps the surrounding form from submitting while a tag is being typed
    if (draft.value.trim()) {
      event.preventDefault();
      flush();
    }
  } else if (event.key === "Backspace" && !draft.value && model.value.length) {
    model.value = model.value.slice(0, -1);
  }
}

function onBlur() {
  if (props.addOnBlur) flush();
}

function onPointerdown(event: PointerEvent) {
  if (props.disabled || event.target === input.value) return;
  if ((event.target as HTMLElement).closest("button")) return;
  // Clicking the empty space of the field focuses the text field
  event.preventDefault();
  input.value?.focus();
}
</script>

<template>
  <div
    class="n-tags"
    role="group"
    :aria-label="label"
    :data-disabled="disabled ? '' : undefined"
    :data-invalid="isInvalid ? '' : undefined"
    @pointerdown="onPointerdown"
  >
    <slot
      v-for="(tag, index) in model"
      :key="`${index}-${tag}`"
      name="tag"
      :tag="tag"
      :index="index"
    >
      <NBadge
        class="n-tags-tag"
        :label="tag"
        :variant="variant"
        :color="color"
        size="sm"
      >
        <template v-if="!disabled" #trailing>
          <button
            type="button"
            class="n-tags-remove"
            :aria-label="`${removeLabel} ${tag}`"
            @click="remove(index)"
          >
            <NIcon name="i-lucide-x" />
          </button>
        </template>
      </NBadge>
    </slot>
    <input
      :id="field?.id"
      ref="input"
      :value="draft"
      class="n-tags-input"
      type="text"
      autocomplete="off"
      :placeholder="model.length ? undefined : placeholder"
      :disabled="disabled"
      :aria-label="label"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="field?.describedBy.value"
      @input="onInput"
      @keydown="onKeydown"
      @blur="onBlur"
    />
    <template v-if="name">
      <input
        v-for="(tag, index) in model"
        :key="`${index}-${tag}`"
        type="hidden"
        :name="name"
        :value="tag"
      />
    </template>
  </div>
</template>
