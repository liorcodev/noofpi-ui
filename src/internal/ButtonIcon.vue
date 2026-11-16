<script setup lang="ts">
import type { ButtonIcon } from "../types";

defineProps<{ icon: ButtonIcon; spin?: boolean }>();
</script>

<template>
  <span
    v-if="typeof icon === 'string'"
    :class="['n-button-icon', icon, spin && 'n-spin']"
    aria-hidden="true"
  />
  <component
    :is="icon"
    v-else
    :class="['n-button-icon', spin && 'n-spin']"
    aria-hidden="true"
  />
</template>
