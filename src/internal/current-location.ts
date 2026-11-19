import { onBeforeUnmount, onMounted, ref } from "vue";
import type { HeaderItem } from "../types";

// Where the page is now, to mark the plain `a` links; a router component marks its own
export function useCurrentLocation() {
  const current = ref("");

  function read() {
    current.value = location.pathname + location.search + location.hash;
  }

  onMounted(() => {
    read();
    addEventListener("hashchange", read);
    addEventListener("popstate", read);
  });

  onBeforeUnmount(() => {
    removeEventListener("hashchange", read);
    removeEventListener("popstate", read);
  });

  function isCurrent(to?: string) {
    if (!to || !current.value) return false;
    try {
      const url = new URL(to, location.href);
      return url.pathname + url.search + url.hash === current.value;
    } catch {
      return false;
    }
  }

  function activeItem(items: readonly HeaderItem[], automatic = true) {
    if (automatic) {
      const current = items.find(
        (item) => item.active !== false && isCurrent(item.to),
      );
      if (current) return current;
    }
    return items.find((item) => item.active);
  }

  return { activeItem };
}
