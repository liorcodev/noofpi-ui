<script setup lang="ts">
import { computed, type PropType } from "vue";
import type {
  ButtonIcon,
  FooterBrandAlign,
  FooterButton,
  FooterColumn,
  FooterCopyrightAlign,
} from "../types";
import NButton from "./NButton.vue";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NFooter" });

const props = defineProps({
  title: { type: String, default: undefined },
  logo: {
    type: [String, Object, Function] as PropType<ButtonIcon>,
    default: undefined,
  },
  to: { type: String, default: "/" },
  description: { type: String, default: undefined },
  columns: { type: Array as PropType<FooterColumn[]>, default: () => [] },
  buttons: { type: Array as PropType<FooterButton[]>, default: () => [] },
  copyright: { type: String, default: undefined },
  brandAlign: { type: String as PropType<FooterBrandAlign>, default: "left" },
  copyrightAlign: {
    type: String as PropType<FooterCopyrightAlign>,
    default: "left",
  },
  border: { type: Boolean, default: true },
  container: { type: Boolean, default: true },
  linkAs: {
    type: [String, Object, Function] as PropType<string | object>,
    default: "a",
  },
});

const slots = defineSlots<{
  /** Replaces the whole brand block: logo, description and buttons */
  brand?: () => unknown;
  /** Replaces the `columns` */
  columns?: () => unknown;
  /** Replaces the `copyright` text */
  bottom?: () => unknown;
}>();

const hasBrand = computed(
  () =>
    !!(props.title || props.logo || props.description) ||
    props.buttons.length > 0 ||
    !!slots.brand,
);
const hasMain = computed(
  () => hasBrand.value || props.columns.length > 0 || !!slots.columns,
);

function linkAttrs(to?: string, target?: string) {
  if (props.linkAs === "a")
    return {
      href: to,
      target,
      rel: target === "_blank" ? "noopener noreferrer" : undefined,
    };
  return { to, target };
}

function buttonAttrs({ to, ...button }: FooterButton) {
  if (!to) return button;
  return { ...button, as: button.as ?? props.linkAs, ...linkAttrs(to) };
}
</script>

<template>
  <footer
    class="n-footer"
    :data-brand-align="brandAlign"
    :data-copyright-align="copyrightAlign"
    :data-border="border ? '' : undefined"
    :data-container="container ? '' : undefined"
  >
    <div v-if="hasMain" class="n-footer-main">
      <div v-if="hasBrand" class="n-footer-brand-block">
        <slot name="brand">
          <component
            :is="linkAs"
            v-if="title || logo"
            class="n-footer-brand"
            v-bind="linkAttrs(to)"
          >
            <NIcon v-if="logo" :name="logo" class="n-footer-logo" />
            <span v-if="title" class="n-footer-title">{{ title }}</span>
          </component>
          <p v-if="description" class="n-footer-description">
            {{ description }}
          </p>
          <div v-if="buttons.length" class="n-footer-buttons">
            <NButton
              v-for="(button, index) in buttons"
              :key="index"
              variant="ghost"
              color="neutral"
              size="sm"
              v-bind="buttonAttrs(button)"
            />
          </div>
        </slot>
      </div>

      <div v-if="columns.length || slots.columns" class="n-footer-columns">
        <slot name="columns">
          <nav
            v-for="(column, index) in columns"
            :key="index"
            class="n-footer-column"
            :aria-label="column.title"
          >
            <p v-if="column.title" class="n-footer-column-title">
              {{ column.title }}
            </p>
            <component
              :is="linkAs"
              v-for="item in column.items"
              :key="item.label"
              class="n-footer-link"
              :aria-current="item.active ? 'page' : undefined"
              :aria-disabled="item.disabled ? 'true' : undefined"
              :data-active="item.active ? '' : undefined"
              v-bind="linkAttrs(item.to, item.target)"
            >
              <NIcon v-if="item.icon" :name="item.icon" />
              {{ item.label }}
            </component>
          </nav>
        </slot>
      </div>
    </div>

    <div v-if="copyright || slots.bottom" class="n-footer-bottom">
      <div class="n-footer-bottom-inner">
        <slot name="bottom">
          <p class="n-footer-copyright">{{ copyright }}</p>
        </slot>
      </div>
    </div>
  </footer>
</template>
