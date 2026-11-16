<script setup lang="ts">
import { computed, inject, useAttrs, useSlots, type PropType } from "vue";
import type { ButtonIcon } from "../types";
import { FIELD_KEY } from "../internal/form-context";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NInput", inheritAttrs: false });

const props = defineProps({
  type: { type: String as PropType<string>, default: "text" },
  /** Mark invalid without an `NFormField` around it */
  invalid: { type: Boolean, default: false },
  /** Icon before the text (an icon class or a component) */
  icon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  /** Icon after the text (an icon class or a component) */
  trailingIcon: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  /** Text in a shaded block before the input, sharing its border (or use the `prepend` slot) */
  prepend: { type: String, default: undefined },
  /** Text in a shaded block after the input, sharing its border (or use the `append` slot) */
  append: { type: String, default: undefined },
});

const model = defineModel<string | number>();
const field = inject(FIELD_KEY, null);
const slots = useSlots();
const attrs = useAttrs();

const hasLeading = computed(
  () => Boolean(props.icon) || Boolean(slots.leading),
);
const hasTrailing = computed(
  () => Boolean(props.trailingIcon) || Boolean(slots.trailing),
);
const hasPrepend = computed(
  () => Boolean(props.prepend) || Boolean(slots.prepend),
);
const hasAppend = computed(
  () => Boolean(props.append) || Boolean(slots.append),
);
// `class` and `style` style the wrapper, everything else is a native attribute of the `<input>`
const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});
</script>

<template>
  <span
    class="n-input-wrap"
    :class="attrs.class"
    :style="attrs.style as any"
    :data-addon="hasPrepend || hasAppend ? '' : undefined"
  >
    <span v-if="hasPrepend" class="n-input-addon n-input-prepend">
      <slot name="prepend">{{ prepend }}</slot>
    </span>
    <span
      class="n-input-field"
      :data-leading="hasLeading ? '' : undefined"
      :data-trailing="hasTrailing ? '' : undefined"
    >
      <input
        v-model="model"
        class="n-input"
        :type="type"
        :id="field?.id"
        :aria-invalid="invalid || field?.invalid.value ? 'true' : undefined"
        :aria-describedby="field?.describedBy.value"
        v-bind="inputAttrs"
      />
      <span v-if="hasLeading" class="n-input-leading">
        <slot name="leading"><NIcon :name="icon!" /></slot>
      </span>
      <span v-if="hasTrailing" class="n-input-trailing">
        <slot name="trailing"><NIcon :name="trailingIcon!" /></slot>
      </span>
    </span>
    <span v-if="hasAppend" class="n-input-addon n-input-append">
      <slot name="append">{{ append }}</slot>
    </span>
  </span>
</template>
