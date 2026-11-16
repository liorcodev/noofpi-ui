<script setup lang="ts">
import { computed, inject, provide, useId, type PropType } from "vue";
import {
  FIELD_KEY,
  FORM_KEY,
  type FieldContext,
} from "../internal/form-context";

defineOptions({ name: "NFormField" });

const props = defineProps({
  /** The field's path in the schema (`"email"`, `"user.email"`); its errors come from the surrounding `NForm` */
  name: { type: String, default: undefined },
  label: { type: String, default: undefined },
  description: { type: String, default: undefined },
  /** Shown next to the label, e.g. "Optional" */
  hint: { type: String, default: undefined },
  /** Shown under the control while there is no error */
  help: { type: String, default: undefined },
  /** A message that replaces the form's, or `true` to mark the field invalid without one */
  error: {
    type: [String, Boolean] as PropType<string | boolean>,
    default: undefined,
  },
  required: { type: Boolean, default: false },
});

const form = inject(FORM_KEY, null);
const id = `n-field-${useId()}`;

const message = computed(() => {
  if (typeof props.error === "string") return props.error || undefined;
  if (props.error !== undefined) return undefined;
  return props.name ? form?.errors.value[props.name]?.[0] : undefined;
});
const invalid = computed(() => props.error === true || Boolean(message.value));

const bottomId = `${id}-message`;
const descriptionId = `${id}-description`;
const describedBy = computed(() => {
  const ids = [
    props.description ? descriptionId : "",
    message.value || props.help ? bottomId : "",
  ].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
});

const context: FieldContext = { id, invalid, describedBy };
provide(FIELD_KEY, context);
</script>

<template>
  <div class="n-field" :data-invalid="invalid ? '' : undefined">
    <div
      v-if="label || hint || $slots.label || $slots.hint"
      class="n-field-head"
    >
      <label class="n-field-label" :for="id">
        <slot name="label">{{ label }}</slot>
        <span v-if="required" class="n-field-required" aria-hidden="true"
          >*</span
        >
      </label>
      <span v-if="hint || $slots.hint" class="n-field-hint">
        <slot name="hint">{{ hint }}</slot>
      </span>
    </div>
    <p
      v-if="description || $slots.description"
      :id="descriptionId"
      class="n-field-description"
    >
      <slot name="description">{{ description }}</slot>
    </p>
    <slot
      :id="id"
      :invalid="invalid"
      :error="message"
      :described-by="describedBy"
    />
    <p
      v-if="message || help || $slots.help"
      :id="bottomId"
      :class="message ? 'n-field-error' : 'n-field-help'"
      :role="message ? 'alert' : undefined"
    >
      <slot v-if="message" name="error" :error="message">{{ message }}</slot>
      <slot v-else name="help">{{ help }}</slot>
    </p>
  </div>
</template>
