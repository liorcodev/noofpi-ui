<script setup lang="ts">
import type { PropType } from "vue";
import type { KanbanItem } from "../types";
import NAvatar from "../components/NAvatar.vue";
import NBadge from "../components/NBadge.vue";

defineOptions({ name: "NKanbanCardContent" });

defineProps({
  item: { type: Object as PropType<KanbanItem>, required: true },
});
</script>

<template>
  <NBadge
    v-if="item.badge"
    class="n-kanban-card-badge"
    size="xs"
    variant="soft"
    :color="item.color ?? 'neutral'"
    :label="item.badge"
  />
  <p class="n-kanban-card-title">{{ item.title }}</p>
  <p v-if="item.description" class="n-kanban-card-text">
    {{ item.description }}
  </p>
  <div v-if="item.assignee || item.avatar" class="n-kanban-card-meta">
    <NAvatar size="xs" :src="item.avatar" :alt="item.assignee" />
    <span v-if="item.assignee">{{ item.assignee }}</span>
  </div>
</template>
