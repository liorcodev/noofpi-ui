<script setup lang="ts" generic="T = unknown">
import { computed, reactive, ref, watch, type PropType } from "vue";
import type {
  AuthField,
  AuthProvider,
  ButtonIcon,
  FormErrors,
  FormSchema,
  NoofpiFormLike,
} from "../types";
import NButton from "./NButton.vue";
import NCheckbox from "./NCheckbox.vue";
import NForm from "./NForm.vue";
import NFormField from "./NFormField.vue";
import NIcon from "./NIcon.vue";
import NInput from "./NInput.vue";

defineOptions({ name: "NAuthForm" });

const props = defineProps({
  /** The inputs, in order: `{ name: "email", type: "email", label: "Email" }` */
  fields: { type: Array as PropType<readonly AuthField[]>, required: true },
  title: { type: String, default: undefined },
  description: { type: String, default: undefined },
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  /** Buttons above the fields, e.g. "Continue with GitHub" */
  providers: { type: Array as PropType<AuthProvider[]>, default: () => [] },
  /** Text between the providers and the fields */
  separator: { type: String, default: "or" },
  submitLabel: { type: String, default: "Continue" },
  /** Spinner on the submit button and no resubmitting, for a submit handled outside `form` */
  loading: { type: Boolean, default: false },
  /** A failure to show above the submit button, e.g. "Wrong email or password" */
  error: { type: String, default: undefined },
  /** Toggle it (`true` to `false` or back) to empty the inputs and clear the errors, e.g. after a failed sign in. With `form`, calls its `reset()` */
  clear: { type: Boolean, default: false },
  /** The result of `useDoofpiForm()`; its `values` are the inputs' state */
  form: {
    type: Object as PropType<NoofpiFormLike & { values: object }>,
    default: undefined,
  },
  /** A Zod schema validated on submit. Ignored with `form` */
  /** A Zod schema validated on submit. Ignored with `form`. Its output type is the type of `submit`'s data */
  schema: { type: Object as PropType<FormSchema<T>>, default: undefined },
});

const emit = defineEmits<{
  /** The parsed data (`schema`), what `onSubmit` returned (`form`), or the plain values with neither */
  submit: [data: T];
  error: [errors: FormErrors];
}>();

const emptyValues = () =>
  Object.fromEntries(
    props.fields.map((field) => [
      field.name,
      field.type === "checkbox" ? false : "",
    ]),
  );
const own = reactive<Record<string, unknown>>(emptyValues());
const values = computed(
  () => (props.form?.values ?? own) as Record<string, unknown>,
);

const passthrough: FormSchema<unknown> = {
  safeParse: (value) => ({ success: true, data: { ...(value as object) } }),
};

const formRef = ref<InstanceType<typeof NForm>>();

watch(
  () => props.clear,
  () => {
    if (!props.form) Object.assign(own, emptyValues());
    formRef.value?.reset();
  },
);
</script>

<template>
  <NForm
    ref="formRef"
    class="n-auth"
    :form="form"
    :schema="schema ?? passthrough"
    :state="values"
    :disabled="loading"
    @submit="emit('submit', $event as T)"
    @error="emit('error', $event)"
  >
    <template #default="{ failure, submitting }">
      <div
        v-if="title || description || icon || $slots.header"
        class="n-auth-header"
      >
        <slot name="header">
          <NIcon v-if="icon" :name="icon" class="n-auth-icon" />
          <h2 v-if="title" class="n-auth-title">{{ title }}</h2>
          <p v-if="description" class="n-auth-description">{{ description }}</p>
        </slot>
      </div>

      <template v-if="providers.length">
        <div class="n-auth-providers">
          <NButton
            v-for="provider in providers"
            :key="provider.label"
            variant="outline"
            color="neutral"
            block
            :icon="provider.icon"
            :label="provider.label"
            :disabled="provider.disabled"
            @click="provider.onClick?.()"
          />
        </div>
        <div v-if="fields.length" class="n-auth-separator" role="separator">
          {{ separator }}
        </div>
      </template>

      <NFormField
        v-for="field in fields"
        :key="field.name"
        :name="field.name"
        :label="field.type === 'checkbox' ? undefined : field.label"
        :description="field.description"
        :help="field.help"
        :required="field.required"
      >
        <template #default>
          <NCheckbox
            v-if="field.type === 'checkbox'"
            v-model="values[field.name] as boolean"
            :name="field.name"
            :label="field.label"
          />
          <NInput
            v-else
            :model-value="values[field.name] as string"
            :type="field.type ?? 'text'"
            :name="field.name"
            :placeholder="field.placeholder"
            :autocomplete="field.autocomplete"
            @update:model-value="values[field.name] = $event"
          />
        </template>
      </NFormField>

      <p v-if="error || failure" class="n-auth-alert" role="alert">
        {{ error || failure }}
      </p>

      <NButton
        type="submit"
        block
        :label="submitLabel"
        :loading="loading || submitting"
      />

      <div v-if="$slots.footer" class="n-auth-footer">
        <slot name="footer" />
      </div>
    </template>
  </NForm>
</template>
