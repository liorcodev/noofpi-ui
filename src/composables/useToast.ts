import { computed, shallowRef } from "vue";
import type { Toast, ToastOptions } from "../types";

// Shared by every `useToast()` caller and the `NToaster` that renders it
const toasts = shallowRef<Toast[]>([]);
const list = computed(() => toasts.value);
let counter = 0;

function add(options: ToastOptions): Toast {
  const id = options.id ?? `n-toast-${++counter}`;
  const toast: Toast = { ...options, id };
  const index = toasts.value.findIndex((item) => item.id === id);
  toasts.value =
    index === -1
      ? [...toasts.value, toast]
      : toasts.value.map((item, i) => (i === index ? toast : item));
  return toast;
}

function update(id: Toast["id"], patch: Partial<ToastOptions>) {
  toasts.value = toasts.value.map((item) =>
    item.id === id ? { ...item, ...patch, id } : item,
  );
}

function remove(id: Toast["id"]) {
  const toast = toasts.value.find((item) => item.id === id);
  if (!toast) return;
  toasts.value = toasts.value.filter((item) => item.id !== id);
  toast.onClose?.();
}

function clear() {
  const removed = toasts.value;
  toasts.value = [];
  for (const toast of removed) toast.onClose?.();
}

/**
 * Shows toasts rendered by `<NToaster />` (mount it once, e.g. in `app.vue`):
 * `toast.add({ title: "Saved", color: "success" })`
 *
 * Imported bindings are typed correctly in templates by vue-tsc, unlike a local `const toast = useToast()`
 * read through a property (`toast.add`), so prefer importing `toast` there.
 */
export const toast = { toasts: list, add, update, remove, clear };

/** Same object as `toast`, for code that prefers a composable */
export function useToast() {
  return toast;
}
