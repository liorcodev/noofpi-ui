let locks = 0;
let previous: { overflow: string; gutter: string } | undefined;

// Stops the page behind an overlay from scrolling. When it had a scrollbar, the space of the scrollbar stays
// reserved, so neither the page nor fixed elements (a header, `NScrollToTop`) shift when it disappears.
// Counted, so stacked overlays release the lock only when the last one closes.
export function lockScroll() {
  if (typeof document === "undefined") return;
  if (locks++ > 0) return;
  const root = document.documentElement;
  previous = {
    overflow: root.style.overflow,
    gutter: root.style.getPropertyValue("scrollbar-gutter"),
  };
  if (window.innerWidth > root.clientWidth)
    root.style.setProperty("scrollbar-gutter", "stable");
  root.style.overflow = "hidden";
}

export function unlockScroll() {
  if (typeof document === "undefined" || locks === 0) return;
  if (--locks > 0 || !previous) return;
  const root = document.documentElement;
  root.style.overflow = previous.overflow;
  if (previous.gutter)
    root.style.setProperty("scrollbar-gutter", previous.gutter);
  else root.style.removeProperty("scrollbar-gutter");
  previous = undefined;
}
