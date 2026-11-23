<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
  type PropType,
} from "vue";
import {
  ACCESSIBILITY_FONT_SIZES,
  ACCESSIBILITY_TOGGLES,
  type AccessibilityContrast,
  type AccessibilityFeature,
  type AccessibilityLabels,
  type AccessibilityPlacement,
  type AccessibilitySettings,
  type AccessibilityToggle,
} from "../types";
import {
  ACCESSIBILITY_LABELS,
  applyAccessibilitySettings,
  clearAccessibilitySettings,
  defaultAccessibilitySettings,
  matchesShortcut,
  normalizeAccessibilitySettings,
} from "../utils/accessibility";
import NButton from "./NButton.vue";
import NIcon from "./NIcon.vue";

defineOptions({ name: "NAccessibility", inheritAttrs: false });

const props = defineProps({
  features: {
    type: Array as PropType<AccessibilityFeature[]>,
    default: () => ["fontSize", "contrast", ...ACCESSIBILITY_TOGGLES],
  },
  placement: {
    type: String as PropType<AccessibilityPlacement>,
    default: "bottom-start",
  },
  statementUrl: { type: String, default: undefined },
  skipTo: { type: String, default: undefined },
  shortcut: { type: String, default: "Alt+A" },
  storageKey: {
    type: [String, Boolean] as PropType<string | false>,
    default: "n-accessibility",
  },
  labels: {
    type: Object as PropType<Partial<AccessibilityLabels>>,
    default: () => ({}),
  },
});

const open = defineModel<boolean>("open", { default: false });
const settings = defineModel<AccessibilitySettings>("settings", {
  default: () => defaultAccessibilitySettings(),
});

defineSlots<{
  /** Extra content at the bottom of the menu, e.g. the contact details of the accessibility coordinator */
  footer?: () => unknown;
}>();

const id = useId();
const dock = ref<HTMLElement>();
const panel = ref<HTMLElement>();

const text = computed(() => ({ ...ACCESSIBILITY_LABELS, ...props.labels }));
const offers = (feature: AccessibilityFeature) =>
  props.features.includes(feature);

const TOGGLE_ICONS: Record<AccessibilityToggle, string> = {
  grayscale: "i-lucide-droplets",
  highlightLinks: "i-lucide-link",
  highlightHeadings: "i-lucide-heading",
  readableFont: "i-lucide-type",
  textSpacing: "i-lucide-space",
  largeCursor: "i-lucide-mouse-pointer-2",
  highlightFocus: "i-lucide-focus",
  readingGuide: "i-lucide-ruler",
  stopAnimations: "i-lucide-circle-pause",
  hideImages: "i-lucide-image-off",
};

const CONTRASTS = [
  { value: "dark", icon: "i-lucide-moon", label: "contrastDark" },
  { value: "light", icon: "i-lucide-sun", label: "contrastLight" },
  { value: "invert", icon: "i-lucide-contrast", label: "contrastInvert" },
] as const;

const toggles = computed(() =>
  ACCESSIBILITY_TOGGLES.filter((toggle) => offers(toggle)),
);

function update(patch: Partial<AccessibilitySettings>) {
  settings.value = { ...settings.value, ...patch };
}

function stepFontSize(direction: 1 | -1) {
  const sizes = ACCESSIBILITY_FONT_SIZES;
  const index = sizes.indexOf(settings.value.fontSize) + direction;
  update({ fontSize: sizes[Math.min(Math.max(index, 0), sizes.length - 1)]! });
}

function chooseContrast(contrast: AccessibilityContrast) {
  update({
    contrast: settings.value.contrast === contrast ? "none" : contrast,
  });
}

const reset = () => (settings.value = defaultAccessibilitySettings());

const isDefault = computed(() => {
  const defaults = defaultAccessibilitySettings();
  return (Object.keys(defaults) as (keyof AccessibilitySettings)[]).every(
    (key) => settings.value[key] === defaults[key],
  );
});

function trigger() {
  return dock.value?.querySelector<HTMLElement>(".n-accessibility-trigger");
}

function close() {
  open.value = false;
  trigger()?.focus({ preventScroll: true });
}

watch(open, (isOpen) => isOpen && panel.value?.focus({ preventScroll: true }), {
  flush: "post",
});

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  event.stopPropagation();
  close();
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (!props.shortcut || !matchesShortcut(event, props.shortcut)) return;
  event.preventDefault();
  open.value = !open.value;
}

function skip(event: MouseEvent) {
  let target: HTMLElement | null = null;
  try {
    target = document.querySelector<HTMLElement>(props.skipTo!);
  } catch {
    return;
  }
  if (!target) return;
  event.preventDefault();
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus();
}

// The adjustments live in the page: attributes on `<html>` that `accessibility.css` reacts to
function sync(value: AccessibilitySettings) {
  applyAccessibilitySettings(document.documentElement, value);
  const key = props.storageKey;
  if (!key) return;
  try {
    if (isDefault.value) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked (private mode, disabled cookies): the adjustments just don't outlive the page
  }
}

function restore() {
  const key = props.storageKey;
  if (!key) return;
  try {
    const stored = localStorage.getItem(key);
    if (stored)
      settings.value = normalizeAccessibilitySettings(JSON.parse(stored));
  } catch {
    // Unreadable or blocked storage: start from the current settings
  }
}

const guideY = ref<number>();

function moveGuide(event: PointerEvent) {
  guideY.value = event.clientY;
}

function followFocus(event: FocusEvent) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || target.closest(".n-accessibility"))
    return;
  const rect = target.getBoundingClientRect();
  guideY.value = rect.top + rect.height / 2;
}

function toggleGuide(on: boolean) {
  document.removeEventListener("pointermove", moveGuide);
  document.removeEventListener("focusin", followFocus);
  if (!on) return (guideY.value = undefined);
  document.addEventListener("pointermove", moveGuide, { passive: true });
  document.addEventListener("focusin", followFocus);
}

onMounted(() => {
  restore();
  sync(settings.value);
  toggleGuide(settings.value.readingGuide);
  document.addEventListener("keydown", onDocumentKeydown);
});

watch(settings, (value, old) => {
  sync(value);
  if (value.readingGuide !== old.readingGuide) toggleGuide(value.readingGuide);
});

onBeforeUnmount(() => {
  toggleGuide(false);
  document.removeEventListener("keydown", onDocumentKeydown);
  clearAccessibilitySettings(document.documentElement);
});
</script>

<template>
  <div class="n-accessibility" :data-placement="placement">
    <a v-if="skipTo" class="n-accessibility-skip" :href="skipTo" @click="skip">
      {{ text.skip }}
    </a>

    <div ref="dock" class="n-accessibility-dock">
      <NButton
        v-bind="$attrs"
        class="n-accessibility-trigger"
        shape="circle"
        size="lg"
        icon="i-lucide-accessibility"
        aria-haspopup="dialog"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="`${id}-panel`"
        :aria-label="text.open"
        :title="text.open"
        @click="open = !open"
      />

      <Transition name="n-accessibility">
        <div
          v-if="open"
          :id="`${id}-panel`"
          ref="panel"
          class="n-accessibility-panel"
          role="dialog"
          tabindex="-1"
          :aria-labelledby="`${id}-title`"
          @keydown="onPanelKeydown"
        >
          <div class="n-accessibility-header">
            <h2 :id="`${id}-title`" class="n-accessibility-title">
              {{ text.title }}
            </h2>
            <NButton
              variant="ghost"
              color="neutral"
              size="sm"
              shape="circle"
              icon="i-lucide-x"
              :aria-label="text.close"
              :title="text.close"
              @click="close"
            />
          </div>

          <div class="n-accessibility-body">
            <div
              v-if="offers('fontSize')"
              class="n-accessibility-section"
              role="group"
              :aria-labelledby="`${id}-font-size`"
            >
              <span :id="`${id}-font-size`" class="n-accessibility-heading">
                {{ text.fontSize }}
              </span>
              <div class="n-accessibility-stepper">
                <NButton
                  variant="outline"
                  color="neutral"
                  icon="i-lucide-a-arrow-down"
                  :aria-label="text.decreaseFontSize"
                  :title="text.decreaseFontSize"
                  @click="stepFontSize(-1)"
                />
                <output class="n-accessibility-value" aria-live="polite">
                  {{ settings.fontSize }}%
                </output>
                <NButton
                  variant="outline"
                  color="neutral"
                  icon="i-lucide-a-arrow-up"
                  :aria-label="text.increaseFontSize"
                  :title="text.increaseFontSize"
                  @click="stepFontSize(1)"
                />
              </div>
            </div>

            <div
              v-if="offers('contrast')"
              class="n-accessibility-section"
              role="group"
              :aria-labelledby="`${id}-contrast`"
            >
              <span :id="`${id}-contrast`" class="n-accessibility-heading">
                {{ text.contrast }}
              </span>
              <div class="n-accessibility-options">
                <button
                  v-for="option in CONTRASTS"
                  :key="option.value"
                  type="button"
                  class="n-accessibility-option"
                  :aria-pressed="
                    settings.contrast === option.value ? 'true' : 'false'
                  "
                  @click="chooseContrast(option.value)"
                >
                  <NIcon :name="option.icon" />
                  <span class="n-accessibility-option-label">
                    {{ text[option.label] }}
                  </span>
                  <NIcon
                    v-if="settings.contrast === option.value"
                    name="i-lucide-check"
                    class="n-accessibility-check"
                  />
                </button>
              </div>
            </div>

            <div v-if="toggles.length" class="n-accessibility-options">
              <button
                v-for="toggle in toggles"
                :key="toggle"
                type="button"
                class="n-accessibility-option"
                :aria-pressed="settings[toggle] ? 'true' : 'false'"
                @click="update({ [toggle]: !settings[toggle] })"
              >
                <NIcon :name="TOGGLE_ICONS[toggle]" />
                <span class="n-accessibility-option-label">
                  {{ text[toggle] }}
                </span>
                <NIcon
                  v-if="settings[toggle]"
                  name="i-lucide-check"
                  class="n-accessibility-check"
                />
              </button>
            </div>

            <slot name="footer" />
          </div>

          <div class="n-accessibility-footer">
            <a
              v-if="statementUrl"
              class="n-accessibility-link"
              :href="statementUrl"
            >
              <NIcon name="i-lucide-file-text" />
              {{ text.statement }}
            </a>
            <NButton
              variant="outline"
              color="neutral"
              size="sm"
              icon="i-lucide-rotate-ccw"
              :label="text.reset"
              @click="reset"
            />
          </div>
        </div>
      </Transition>
    </div>

    <div
      v-if="settings.readingGuide && guideY !== undefined"
      class="n-accessibility-guide"
      aria-hidden="true"
      :style="{ translate: `0 ${guideY}px` }"
    />
  </div>
</template>
