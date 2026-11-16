<script setup lang="ts">
import { useSlots, type PropType } from "vue";
import type { HeroPageLayout, HeroPageProps } from "../types";

defineOptions({ name: "NHeroPage" });

defineProps({
  as: {
    type: [String, Object, Function] as PropType<HeroPageProps["as"]>,
    default: "section",
  },
  eyebrow: { type: String, default: undefined },
  title: { type: String, default: undefined },
  description: { type: String, default: undefined },
  image: { type: String, default: undefined },
  imageAlt: { type: String, default: "" },
  layout: { type: String as PropType<HeroPageLayout>, default: "vertical" },
  reverse: { type: Boolean, default: false },
  headingAs: { type: String, default: "h1" },
});

const slots = useSlots();
</script>

<template>
  <component
    :is="as"
    class="n-hero-page"
    :data-layout="layout"
    :data-reverse="reverse || undefined"
  >
    <div class="n-hero-page-body">
      <div v-if="eyebrow || slots.eyebrow" class="n-hero-page-eyebrow">
        <slot name="eyebrow">{{ eyebrow }}</slot>
      </div>
      <component
        :is="headingAs"
        v-if="title || slots.title"
        class="n-hero-page-title"
      >
        <slot name="title">{{ title }}</slot>
      </component>
      <p
        v-if="description || slots.description"
        class="n-hero-page-description"
      >
        <slot name="description">{{ description }}</slot>
      </p>
      <div v-if="slots.actions" class="n-hero-page-actions">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="image || slots.media" class="n-hero-page-media">
      <slot name="media">
        <img :src="image" :alt="imageAlt" class="n-hero-page-image" />
      </slot>
    </div>
  </component>
</template>
