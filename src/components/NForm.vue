<script setup lang="ts">
import { computed, provide, ref, type PropType } from "vue";
import { FORM_KEY } from "../internal/form-context";
import type {
  FormErrors,
  FormIssue,
  FormSchema,
  NoofpiFormLike,
} from "../types";

defineOptions({ name: "NForm" });

const props = defineProps({
  /** The result of noofpi's `useDoofpiForm(schema, { initial, onSubmit })` */
  form: {
    type: Object as PropType<NoofpiFormLike>,
    default: undefined,
  },
  /** A Zod schema (3 or 4), validated against `state` on submit. Ignored with `form` */
  schema: {
    type: Object as PropType<FormSchema<unknown>>,
    default: undefined,
  },
  /** The reactive values to validate. Ignored with `form` */
  state: { type: Object as PropType<object>, default: undefined },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits<{
  /** The parsed data (`schema` + `state`), or what `onSubmit` returned (`form`) */
  submit: [data: unknown];
  /** Validation failed: field errors by path, `""` for the whole value */
  error: [errors: FormErrors];
}>();

const localErrors = ref<FormErrors>({});

const errors = computed<FormErrors>(() =>
  props.form ? props.form.errors.value : localErrors.value,
);
const failure = computed(() => props.form?.failure.value ?? null);
const submitting = computed(() => props.form?.submitting.value ?? false);

provide(FORM_KEY, { errors });

// Same grouping as noofpi's `issuesToErrors`, so errors look the same with and without `form`
function groupIssues(issues: readonly FormIssue[]): FormErrors {
  const grouped: FormErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    (grouped[key] ??= []).push(issue.message);
  }
  return grouped;
}

function check() {
  if (!props.schema) throw new Error("<NForm> needs a `form`, or a `schema`");
  const result = props.schema.safeParse(props.state);
  localErrors.value = result.success ? {} : groupIssues(result.error.issues);
  return result;
}

/** Validates without submitting. Returns whether the values are valid */
function validate(): boolean {
  return props.form ? props.form.validate() : check().success;
}

function reset() {
  if (props.form) props.form.reset();
  else localErrors.value = {};
}

/** Validates, then submits; the outcome is also emitted as `submit` or `error` */
async function submit() {
  if (props.disabled) return;
  if (props.form) {
    const outcome = await props.form.submit();
    if (outcome.ok) emit("submit", outcome.result);
    else if (Object.keys(outcome.errors).length) emit("error", outcome.errors);
    return;
  }
  const result = check();
  if (result.success) emit("submit", result.data);
  else emit("error", localErrors.value);
}

defineExpose({ submit, validate, reset, errors });
</script>

<template>
  <form
    class="n-form"
    novalidate
    :aria-busy="submitting ? 'true' : undefined"
    :data-invalid="Object.keys(errors).length ? '' : undefined"
    @submit.prevent="submit"
    @reset.prevent="reset"
  >
    <slot
      :errors="errors"
      :failure="failure"
      :submitting="submitting"
      :submit="submit"
      :validate="validate"
      :reset="reset"
    />
  </form>
</template>
