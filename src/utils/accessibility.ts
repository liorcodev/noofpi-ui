import {
  ACCESSIBILITY_CONTRASTS,
  ACCESSIBILITY_FONT_SIZES,
  ACCESSIBILITY_TOGGLES,
  type AccessibilityLabels,
  type AccessibilitySettings,
} from "../types";

export const ACCESSIBILITY_LABELS: AccessibilityLabels = {
  open: "Accessibility menu",
  title: "Accessibility",
  close: "Close",
  reset: "Reset settings",
  statement: "Accessibility statement",
  skip: "Skip to main content",
  fontSize: "Text size",
  increaseFontSize: "Increase text size",
  decreaseFontSize: "Decrease text size",
  contrast: "Contrast",
  contrastDark: "Dark contrast",
  contrastLight: "Light contrast",
  contrastInvert: "Inverted colors",
  grayscale: "Grayscale",
  highlightLinks: "Highlight links",
  highlightHeadings: "Highlight headings",
  readableFont: "Readable font",
  textSpacing: "Text spacing",
  largeCursor: "Large cursor",
  highlightFocus: "Highlight focus",
  readingGuide: "Reading guide",
  stopAnimations: "Stop animations",
  hideImages: "Hide images",
};

export const ACCESSIBILITY_LABELS_HE: AccessibilityLabels = {
  open: "תפריט נגישות",
  title: "נגישות",
  close: "סגירה",
  reset: "איפוס הגדרות",
  statement: "הצהרת נגישות",
  skip: "דילוג לתוכן הראשי",
  fontSize: "גודל טקסט",
  increaseFontSize: "הגדלת טקסט",
  decreaseFontSize: "הקטנת טקסט",
  contrast: "ניגודיות",
  contrastDark: "ניגודיות כהה",
  contrastLight: "ניגודיות בהירה",
  contrastInvert: "היפוך צבעים",
  grayscale: "גווני אפור",
  highlightLinks: "הדגשת קישורים",
  highlightHeadings: "הדגשת כותרות",
  readableFont: "גופן קריא",
  textSpacing: "ריווח טקסט",
  largeCursor: "סמן גדול",
  highlightFocus: "הדגשת מיקוד",
  readingGuide: "סרגל קריאה",
  stopAnimations: "עצירת אנימציות",
  hideImages: "הסתרת תמונות",
};

export function defaultAccessibilitySettings(): AccessibilitySettings {
  return {
    fontSize: 100,
    contrast: "none",
    grayscale: false,
    highlightLinks: false,
    highlightHeadings: false,
    readableFont: false,
    textSpacing: false,
    largeCursor: false,
    highlightFocus: false,
    readingGuide: false,
    stopAnimations: false,
    hideImages: false,
  };
}

/** Keeps what is valid in `value` (e.g. parsed from storage) and falls back to the defaults for the rest */
export function normalizeAccessibilitySettings(
  value: unknown,
): AccessibilitySettings {
  const settings = defaultAccessibilitySettings();
  if (!value || typeof value !== "object") return settings;
  const stored = value as Record<string, unknown>;
  const fontSize = ACCESSIBILITY_FONT_SIZES.find((s) => s === stored.fontSize);
  if (fontSize) settings.fontSize = fontSize;
  const contrast = ACCESSIBILITY_CONTRASTS.find((c) => c === stored.contrast);
  if (contrast) settings.contrast = contrast;
  for (const key of ACCESSIBILITY_TOGGLES)
    if (typeof stored[key] === "boolean") settings[key] = stored[key];
  return settings;
}

const kebab = (key: string) =>
  key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** The attributes `applyAccessibilitySettings` puts on the root element, for the CSS to react to */
export function accessibilityAttributes(settings: AccessibilitySettings) {
  const attributes: Record<string, string | null> = {
    "data-n-a11y-font":
      settings.fontSize === 100 ? null : `${settings.fontSize}`,
    "data-n-a11y-contrast":
      settings.contrast === "none" ? null : settings.contrast,
  };
  for (const key of ACCESSIBILITY_TOGGLES)
    attributes[`data-n-a11y-${kebab(key)}`] = settings[key] ? "" : null;
  return attributes;
}

export function applyAccessibilitySettings(
  root: HTMLElement,
  settings: AccessibilitySettings,
) {
  for (const [name, value] of Object.entries(accessibilityAttributes(settings)))
    if (value === null) root.removeAttribute(name);
    else root.setAttribute(name, value);
}

export function clearAccessibilitySettings(root: HTMLElement) {
  applyAccessibilitySettings(root, defaultAccessibilitySettings());
}

/** Whether `event` is the `Alt+A`-style `shortcut`. The key is compared by its position too, so it works on any keyboard layout */
export function matchesShortcut(event: KeyboardEvent, shortcut: string) {
  const parts = shortcut
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  const key = parts.pop();
  if (!key) return false;
  const has = (...names: string[]) => names.some((n) => parts.includes(n));
  if (
    event.altKey !== has("alt", "option") ||
    event.ctrlKey !== has("ctrl", "control") ||
    event.shiftKey !== has("shift") ||
    event.metaKey !== has("meta", "cmd", "command")
  )
    return false;
  const code = /^\d$/.test(key) ? `digit${key}` : `key${key}`;
  return (
    event.key.toLowerCase() === key ||
    event.code.toLowerCase() === (key.length === 1 ? code : key)
  );
}
