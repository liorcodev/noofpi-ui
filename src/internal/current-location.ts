import { onBeforeUnmount, onMounted, ref } from "vue";

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

  return { isCurrent };
}
