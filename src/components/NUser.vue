<script setup lang="ts">
import { useSlots, type PropType } from "vue";
import type { AvatarProps, AvatarSize, UserProps } from "../types";
import NAvatar from "./NAvatar.vue";

defineOptions({ name: "NUser" });

defineProps({
  as: {
    type: [String, Object, Function] as PropType<UserProps["as"]>,
    default: "div",
  },
  name: { type: String, default: undefined },
  description: { type: String, default: undefined },
  avatar: {
    type: Object as PropType<AvatarProps>,
    default: undefined,
  },
  size: { type: String as PropType<AvatarSize>, default: "md" },
});

const slots = useSlots();
</script>

<template>
  <component :is="as" class="n-user" :data-size="size">
    <slot name="avatar">
      <NAvatar
        v-if="avatar"
        v-bind="avatar"
        :alt="avatar.alt ?? name"
        :size="avatar.size ?? size"
      />
    </slot>
    <div
      v-if="name || description || slots.name || slots.description"
      class="n-user-text"
    >
      <div v-if="name || slots.name" class="n-user-name">
        <slot name="name">{{ name }}</slot>
      </div>
      <div v-if="description || slots.description" class="n-user-description">
        <slot name="description">{{ description }}</slot>
      </div>
    </div>
  </component>
</template>
